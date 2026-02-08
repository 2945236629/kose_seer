/**
 * 被动特性执行器
 *
 * 将BOSS被动特性统一接入战斗效果管线：
 * - 技能效果由 EffectTrigger 从 skill.sideEffect 驱动
 * - 被动特性由 PassiveEffectRunner 从 pet.effectCounters 驱动
 * - 两者共用 AtomicEffectFactory 执行原子效果
 *
 * 触发方式：
 * - BattleEffectIntegration 在每个时机调用 TriggerAtTiming()
 * - PassiveEffectRunner 遍历精灵身上注册的被动特性
 * - 匹配时机 + 角色条件后，通过原子效果工厂执行
 */

import { Logger } from '../../../shared/utils';
import { IBattlePet } from '../../../shared/models/BattleModel';
import { ISkillConfig } from '../../../shared/models/SkillModel';
import { EffectTiming, IEffectContext, IEffectResult, createEffectContext } from './effects/core/EffectContext';
import { AtomicEffectFactory } from './effects/atomic/core/AtomicEffectFactory';
import { IAtomicEffectParams } from './effects/atomic/core/IAtomicEffect';
import { SkillEffectsConfig } from '../../../shared/config/game/SkillEffectsConfig';
import { IAbilityEntry } from './BossAbility/BossAbilityConfig';

// ==================== 接口定义 ====================

/**
 * 注册在精灵身上的被动特性
 */
export interface IRegisteredPassive {
  effectId: number;             // 特性ID (如 1902, 1904)
  name: string;                 // 特性名称
  timings: EffectTiming[];      // 触发时机列表
  role: PassiveRole;            // 触发角色条件
  atoms: IAtomicEffectParams[]; // 原子效果配置
  argValues: number[];          // 已解析的参数值
  immuneFlags?: IImmuneFlags;   // 免疫标记（初始化时一次性设置）
}

/**
 * 被动特性的角色条件
 * - attacker: 仅当特性持有者是攻击方时触发（如必中、暴击提升）
 * - defender: 仅当特性持有者是防守方时触发（如伤害减免、反弹）
 * - any: 无论攻守都触发（如每回合回血、免疫类）
 */
export type PassiveRole = 'attacker' | 'defender' | 'any';

/**
 * 免疫标记
 */
export interface IImmuneFlags {
  statDown?: boolean;     // 免疫能力下降
  status?: boolean;       // 免疫异常状态
}

/**
 * 被动特性触发上下文
 */
export interface IPassiveTriggerContext {
  attacker: IBattlePet;
  defender: IBattlePet;
  skill?: ISkillConfig;
  damage?: number;
  turn?: number;
}

// ==================== 存储键 ====================

const PASSIVE_KEY = '_registered_passives';

// ==================== 核心类 ====================

/**
 * 被动特性执行器
 */
export class PassiveEffectRunner {

  /**
   * 为精灵注册被动特性
   *
   * 从 skill_effects_v2.json 读取特性配置，解析为原子效果组合，
   * 存储在精灵的 effectCounters 中。
   * 支持通过 IAbilityEntry.args 覆盖默认参数。
   *
   * 对于免疫类特性，同时设置 immuneFlags 以供快速判断。
   */
  public static RegisterPassives(pet: IBattlePet, abilityEntries: IAbilityEntry[]): void {
    if (!pet.effectCounters) {
      pet.effectCounters = {};
    }
    if (!pet.immuneFlags) {
      pet.immuneFlags = {};
    }

    const passives: IRegisteredPassive[] = [];

    for (const entry of abilityEntries) {
      const passive = this.BuildPassiveFromConfig(entry.id, entry.args);
      if (!passive) continue;

      passives.push(passive);

      // 免疫类特性：设置 immuneFlags 快速标记
      if (passive.immuneFlags) {
        if (passive.immuneFlags.statDown) {
          pet.immuneFlags.statDown = true;
        }
        if (passive.immuneFlags.status) {
          pet.immuneFlags.status = true;
        }
      }

      Logger.Info(
        `[PassiveEffectRunner] 注册被动特性: ${pet.name} - ${passive.name} ` +
        `(ID=${entry.id}, 时机=[${passive.timings.join(',')}], 角色=${passive.role})`
      );
    }

    pet.effectCounters[PASSIVE_KEY] = passives;

    Logger.Info(
      `[PassiveEffectRunner] ${pet.name} 共注册 ${passives.length} 个被动特性`
    );
  }

  /**
   * 在指定时机触发精灵的所有匹配被动特性
   *
   * @param owner 被动特性持有者
   * @param opponent 对手
   * @param timing 当前触发时机
   * @param ctx 触发上下文（包含攻守关系、技能、伤害等）
   * @returns 效果结果数组
   */
  public static TriggerAtTiming(
    owner: IBattlePet,
    opponent: IBattlePet,
    timing: EffectTiming,
    ctx: IPassiveTriggerContext
  ): IEffectResult[] {
    const passives = this.GetRegisteredPassives(owner);
    if (passives.length === 0) return [];

    const results: IEffectResult[] = [];

    // 判断 owner 在当前攻击中的角色
    const isOwnerAttacker = (owner === ctx.attacker);

    for (const passive of passives) {
      // 1. 时机匹配
      if (!passive.timings.includes(timing)) continue;

      // 2. 角色匹配
      if (passive.role === 'attacker' && !isOwnerAttacker) continue;
      if (passive.role === 'defender' && isOwnerAttacker) continue;

      // 3. 免疫类特性不走原子效果管线（已通过 immuneFlags 生效）
      if (passive.immuneFlags) continue;

      // 4. 构建效果上下文
      const effectContext = createEffectContext(
        ctx.attacker,
        ctx.defender,
        ctx.skill?.id || 0,
        ctx.damage || 0,
        timing
      );
      effectContext.turn = ctx.turn || 0;
      effectContext.effectId = passive.effectId;
      effectContext.skillType = ctx.skill?.type || 0;
      effectContext.skillCategory = ctx.skill?.category || 0;
      effectContext.skillPower = ctx.skill?.power || 0;
      effectContext.effectArgs = passive.argValues;

      // 5. 执行原子效果
      const passiveResults = this.ExecuteAtoms(passive, effectContext);
      results.push(...passiveResults);
    }

    return results;
  }

  /**
   * 检查精灵是否有已注册的被动特性
   */
  public static HasPassives(pet: IBattlePet): boolean {
    const passives = this.GetRegisteredPassives(pet);
    return passives.length > 0;
  }

  /**
   * 清理精灵上的所有被动特性
   */
  public static CleanupPassives(pet: IBattlePet): void {
    if (pet.effectCounters) {
      delete pet.effectCounters[PASSIVE_KEY];
    }
    if (pet.immuneFlags) {
      pet.immuneFlags = {};
    }

    Logger.Debug(`[PassiveEffectRunner] 清理被动特性: ${pet.name}`);
  }

  // ==================== 内部方法 ====================

  /**
   * 获取精灵身上注册的被动特性列表
   */
  private static GetRegisteredPassives(pet: IBattlePet): IRegisteredPassive[] {
    if (!pet.effectCounters || !pet.effectCounters[PASSIVE_KEY]) {
      return [];
    }
    return pet.effectCounters[PASSIVE_KEY] as IRegisteredPassive[];
  }

  /**
   * 从 JSON 配置构建一个被动特性
   *
   * @param abilityId 特性ID
   * @param overrideArgs 覆盖参数（来自 boss_abilities.json）
   */
  private static BuildPassiveFromConfig(abilityId: number, overrideArgs?: number[]): IRegisteredPassive | null {
    const config = SkillEffectsConfig.Instance.GetEffectById(abilityId);
    if (!config) {
      Logger.Warn(`[PassiveEffectRunner] 特性配置不存在: ${abilityId}`);
      return null;
    }

    if (config.category !== 'passive') {
      Logger.Warn(`[PassiveEffectRunner] 效果不是被动特性: ${abilityId} (category=${config.category})`);
      return null;
    }

    // 解析触发时机
    const timings = this.ParseTimings(config.timing || []);
    if (timings.length === 0) {
      Logger.Warn(`[PassiveEffectRunner] 特性没有有效的触发时机: ${abilityId}`);
      return null;
    }

    // 解析角色条件
    const passiveConfig = (config as any).passiveConfig;
    const role: PassiveRole = passiveConfig?.role || this.InferRole(config);

    // 解析免疫标记
    const immuneFlags = this.ParseImmuneFlags(config);

    // 解析原子效果配置
    const atoms = this.ParseAtoms(config);

    // 解析参数值（overrideArgs 优先于默认值）
    const argValues = this.ResolveArgValues(config, overrideArgs);

    return {
      effectId: abilityId,
      name: config.name,
      timings,
      role,
      atoms,
      argValues,
      immuneFlags: immuneFlags || undefined
    };
  }

  /**
   * 解析触发时机字符串为枚举
   */
  private static ParseTimings(timingStrs: string[]): EffectTiming[] {
    const validTimings: EffectTiming[] = [];
    for (const str of timingStrs) {
      if (Object.values(EffectTiming).includes(str as EffectTiming)) {
        validTimings.push(str as EffectTiming);
      }
    }
    return validTimings;
  }

  /**
   * 根据特性类型推断角色条件
   *
   * 如果 JSON 中没有显式配置 passiveConfig.role，
   * 则根据触发时机和原子效果类型推断：
   * - AFTER_DAMAGE_CALC / BEFORE_DAMAGE_APPLY + 伤害减免/吸收 → defender
   * - BEFORE_CRIT_CHECK / BEFORE_HIT_CHECK + 命中/暴击增加 → attacker
   * - TURN_START / TURN_END → any
   * - BATTLE_START → any
   */
  private static InferRole(config: any): PassiveRole {
    const timings: string[] = config.timing || [];

    // 回合/战斗级别的时机，不区分攻守
    if (timings.includes('TURN_START') || timings.includes('TURN_END') || timings.includes('BATTLE_START')) {
      return 'any';
    }

    // 伤害计算相关的时机，检查具体效果
    const atoms = config.atomicComposition?.atoms || [];
    for (const atom of atoms) {
      const type = atom.type;
      const specialType = atom.specialType;

      // 减伤/吸收/反弹 → defender
      if (specialType === 'damage_reduction_passive' ||
          specialType === 'same_type_absorb' ||
          specialType === 'type_immunity' ||
          type === 'reflect') {
        return 'defender';
      }

      // 暴击/命中/威力 增强 → attacker
      if (type === 'crit_modifier' ||
          type === 'accuracy_modifier' ||
          type === 'power_modifier' ||
          type === 'priority_modifier') {
        return 'attacker';
      }
    }

    return 'any';
  }

  /**
   * 解析免疫标记
   */
  private static ParseImmuneFlags(config: any): IImmuneFlags | null {
    // 优先使用新的 passiveConfig.immuneFlags
    if (config.passiveConfig?.immuneFlags) {
      return config.passiveConfig.immuneFlags;
    }

    // 兼容旧的 abilityConfig.flags
    const abilityConfig = config.abilityConfig;
    if (!abilityConfig?.flags) return null;

    const flags = abilityConfig.flags as string[];
    const immuneFlags: IImmuneFlags = {};
    let hasFlags = false;

    if (flags.includes('boss_stat_down_immunity')) {
      immuneFlags.statDown = true;
      hasFlags = true;
    }
    if (flags.includes('boss_status_immunity')) {
      immuneFlags.status = true;
      hasFlags = true;
    }

    return hasFlags ? immuneFlags : null;
  }

  /**
   * 解析原子效果配置
   */
  private static ParseAtoms(config: any): IAtomicEffectParams[] {
    if (!config.atomicComposition?.atoms) return [];
    return config.atomicComposition.atoms as IAtomicEffectParams[];
  }

  /**
   * 解析参数值
   *
   * 优先使用 overrideArgs（来自 boss_abilities.json），
   * 未提供时回退到 config.args[].default。
   */
  private static ResolveArgValues(config: any, overrideArgs?: number[]): number[] {
    if (!config.args || config.args.length === 0) return [];

    return config.args.map((arg: any, index: number) => {
      // 优先使用覆盖参数
      if (overrideArgs && index < overrideArgs.length) {
        return overrideArgs[index];
      }
      // 回退到默认值
      const val = arg.default;
      return typeof val === 'number' ? val : 0;
    });
  }

  /**
   * 执行被动特性的原子效果
   */
  private static ExecuteAtoms(
    passive: IRegisteredPassive,
    context: IEffectContext
  ): IEffectResult[] {
    const results: IEffectResult[] = [];

    for (const atomConfig of passive.atoms) {
      // 将参数值覆盖到原子效果配置中
      const resolvedConfig = this.ApplyArgValues(atomConfig, passive);

      const atom = AtomicEffectFactory.getInstance().create(resolvedConfig);
      if (!atom) {
        Logger.Warn(
          `[PassiveEffectRunner] 创建原子效果失败: ${passive.name}, ` +
          `type=${atomConfig.type}`
        );
        continue;
      }

      // 检查原子效果是否支持当前时机
      if (!atom.canTriggerAt(context.timing)) continue;

      const atomResults = atom.execute(context);
      results.push(...atomResults);

      if (atomResults.length > 0) {
        Logger.Debug(
          `[PassiveEffectRunner] 被动特性触发: ${passive.name} (ID=${passive.effectId}), ` +
          `原子=${atom.name}, 结果数=${atomResults.length}`
        );
      }
    }

    return results;
  }

  /**
   * 将参数值应用到原子效果配置
   *
   * 如果 atomConfig 中的某个字段值为 "$argN" 格式或者参数名匹配，
   * 则用 argValues[N] 替换。
   *
   * 同时根据 effect config 中的 args 定义，将参数值按 name 覆盖到配置中。
   */
  private static ApplyArgValues(
    atomConfig: IAtomicEffectParams,
    passive: IRegisteredPassive
  ): IAtomicEffectParams {
    if (passive.argValues.length === 0) return atomConfig;

    const resolved = { ...atomConfig };

    // 遍历配置中的所有字段，替换参数引用
    for (const [key, value] of Object.entries(resolved)) {
      if (key === 'type') continue;

      // 字符串格式的参数引用: "$arg0", "$arg1", ...
      if (typeof value === 'string' && value.startsWith('$arg')) {
        const argIndex = parseInt(value.substring(4));
        if (!isNaN(argIndex) && argIndex < passive.argValues.length) {
          (resolved as any)[key] = passive.argValues[argIndex];
        }
      }
    }

    return resolved;
  }
}
