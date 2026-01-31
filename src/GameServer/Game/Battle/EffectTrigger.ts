/**
 * 技能效果触发器
 * 负责在战斗中触发和应用技能效果
 * 
 * 集成效果系统到战斗流程
 * 
 * 支持多效果技能：
 * - 单效果: SideEffect="4", SideEffectArg="0 100 1"
 * - 多效果: SideEffect="4 4 4", SideEffectArg="0 100 1 1 100 1 2 100 1"
 */

import { Logger } from '../../../shared/utils';
import { IBattlePet } from '../../../shared/models/BattleModel';
import { ISkillConfig } from '../../../shared/models/SkillModel';
import { EffectRegistry } from './effects/core/EffectRegistry';
import { EffectTiming, createEffectContext, IEffectResult } from './effects/core/EffectContext';
import { SkillEffectConfig } from '../../../shared/config/game/SkillEffectConfig';

/**
 * 效果参数数量映射
 * 根据客户端 Effect_X.as 中的 _argsNum 定义
 */
const EFFECT_ARGS_NUM_MAP: Record<number, number> = {
  // 能力变化类 (3个参数: 能力索引, 触发概率, 等级变化)
  4: 3,   // Effect_4: 自身能力等级变化
  5: 3,   // Effect_5: 对方能力等级变化
  
  // 状态类 (1个参数: 触发概率)
  11: 1,  // Effect_11: 中毒
  12: 1,  // Effect_12: 烧伤
  14: 1,  // Effect_14: 冻伤
  
  // 吸取类 (1个参数: 回合数)
  13: 1,  // Effect_13: 吸取
  
  // 默认: 无参数
};

/**
 * 效果触发器类
 */
export class EffectTrigger {

  /**
   * 触发技能的所有附加效果（支持多效果）
   * 
   * @param skill 技能配置
   * @param attacker 攻击方
   * @param defender 防守方
   * @param damage 造成的伤害
   * @param timing 触发时机
   * @returns 效果结果数组
   */
  public static TriggerSkillEffect(
    skill: ISkillConfig,
    attacker: IBattlePet,
    defender: IBattlePet,
    damage: number,
    timing: EffectTiming
  ): IEffectResult[] {
    // 如果技能没有附加效果，直接返回
    if (!skill.sideEffect || skill.sideEffect === 0) {
      return [];
    }

    // 检查是否为多效果技能
    const sideEffectStr = skill.sideEffect.toString();
    if (sideEffectStr.includes(' ')) {
      // 多效果技能
      return this.TriggerMultipleSkillEffects(skill, attacker, defender, damage, timing);
    } else {
      // 单效果技能
      return this.TriggerSingleSkillEffect(skill, attacker, defender, damage, timing);
    }
  }

  /**
   * 触发单个技能效果
   * 
   * @param skill 技能配置
   * @param attacker 攻击方
   * @param defender 防守方
   * @param damage 造成的伤害
   * @param timing 触发时机
   * @returns 效果结果数组
   */
  private static TriggerSingleSkillEffect(
    skill: ISkillConfig,
    attacker: IBattlePet,
    defender: IBattlePet,
    damage: number,
    timing: EffectTiming
  ): IEffectResult[] {
    const results: IEffectResult[] = [];

    try {
      const effectId = typeof skill.sideEffect === 'number' 
        ? skill.sideEffect 
        : parseInt(skill.sideEffect.toString());

      // 1. 从配置获取效果信息
      const effectConfig = SkillEffectConfig.GetEffect(effectId);
      if (!effectConfig) {
        Logger.Warn(`[EffectTrigger] 效果配置不存在: effectId=${effectId}`);
        return [];
      }

      // 2. 从注册表获取效果实例
      const effect = EffectRegistry.getInstance().getEffect(effectConfig.eid);
      if (!effect) {
        Logger.Warn(`[EffectTrigger] 效果未注册: eid=${effectConfig.eid}`);
        return [];
      }

      // 3. 检查是否在正确的时机触发
      if (!effect.canTrigger(timing)) {
        return [];
      }

      // 4. 解析效果参数
      const effectArgs = this.ParseEffectArgs(skill.sideEffectArg || effectConfig.args);

      // 5. 创建效果上下文
      const context = createEffectContext(attacker, defender, skill.id, damage, timing);
      context.effectId = effectId;
      context.effectArgs = effectArgs;
      context.skillType = skill.type;
      context.skillCategory = skill.category;
      context.skillPower = skill.power;

      // 6. 执行效果
      const effectResults = effect.execute(context);
      results.push(...effectResults);

      // 7. 记录日志
      if (effectResults.length > 0) {
        Logger.Debug(
          `[EffectTrigger] 触发效果: ${effect.getEffectName()} (Eid=${effectConfig.eid}), ` +
          `结果数: ${effectResults.length}`
        );
      }

    } catch (error) {
      Logger.Error(`[EffectTrigger] 单效果执行失败: ${error}`);
    }

    return results;
  }

  /**
   * 触发多个技能效果
   * 
   * 示例：
   * SideEffect="4 4 4 4 4 4"
   * SideEffectArg="0 100 1 1 100 1 2 100 1 3 100 1 4 100 1 5 100 1"
   * 
   * @param skill 技能配置
   * @param attacker 攻击方
   * @param defender 防守方
   * @param damage 造成的伤害
   * @param timing 触发时机
   * @returns 效果结果数组
   */
  private static TriggerMultipleSkillEffects(
    skill: ISkillConfig,
    attacker: IBattlePet,
    defender: IBattlePet,
    damage: number,
    timing: EffectTiming
  ): IEffectResult[] {
    const allResults: IEffectResult[] = [];

    try {
      // 1. 解析多个效果ID
      const sideEffectStr = skill.sideEffect.toString();
      const effectIds = sideEffectStr.split(' ').map(id => parseInt(id.trim())).filter(id => id > 0);
      
      if (effectIds.length === 0) {
        return [];
      }

      // 2. 解析所有参数
      const allArgs = this.ParseEffectArgs(skill.sideEffectArg || '');
      
      Logger.Debug(
        `[EffectTrigger] 多效果技能: ${skill.name} (ID=${skill.id}), ` +
        `效果数: ${effectIds.length}, 参数数: ${allArgs.length}`
      );

      // 3. 按顺序处理每个效果
      let argIndex = 0;
      
      for (let i = 0; i < effectIds.length; i++) {
        const effectId = effectIds[i];
        
        // 获取效果配置
        const effectConfig = SkillEffectConfig.GetEffect(effectId);
        if (!effectConfig) {
          Logger.Warn(`[EffectTrigger] 效果配置不存在: effectId=${effectId}`);
          continue;
        }

        // 获取效果实例
        const effect = EffectRegistry.getInstance().getEffect(effectConfig.eid);
        if (!effect) {
          Logger.Warn(`[EffectTrigger] 效果未注册: eid=${effectConfig.eid}`);
          continue;
        }

        // 检查触发时机
        if (!effect.canTrigger(timing)) {
          continue;
        }

        // 获取该效果需要的参数数量
        const argsNum = this.GetEffectArgsNum(effectConfig.eid);
        
        // 提取该效果的参数
        const effectArgs = allArgs.slice(argIndex, argIndex + argsNum);
        argIndex += argsNum;

        Logger.Debug(
          `[EffectTrigger] 效果 ${i + 1}/${effectIds.length}: ` +
          `Eid=${effectConfig.eid}, 参数=${effectArgs.join(' ')}`
        );

        // 创建效果上下文
        const context = createEffectContext(attacker, defender, skill.id, damage, timing);
        context.effectId = effectId;
        context.effectArgs = effectArgs;
        context.skillType = skill.type;
        context.skillCategory = skill.category;
        context.skillPower = skill.power;

        // 执行效果
        const effectResults = effect.execute(context);
        allResults.push(...effectResults);

        if (effectResults.length > 0) {
          Logger.Debug(
            `[EffectTrigger] 效果执行成功: ${effect.getEffectName()}, ` +
            `结果数: ${effectResults.length}`
          );
        }
      }

      Logger.Info(
        `[EffectTrigger] 多效果技能执行完成: ${skill.name}, ` +
        `总结果数: ${allResults.length}`
      );

    } catch (error) {
      Logger.Error(`[EffectTrigger] 多效果执行失败: ${error}`);
    }

    return allResults;
  }

  /**
   * 获取效果需要的参数数量
   * 
   * @param eid 效果类型ID
   * @returns 参数数量
   */
  private static GetEffectArgsNum(eid: number): number {
    return EFFECT_ARGS_NUM_MAP[eid] || 0;
  }

  /**
   * 应用效果结果到战斗精灵
   * 
   * @param results 效果结果数组
   * @param attacker 攻击方
   * @param defender 防守方
   */
  public static ApplyEffectResults(
    results: IEffectResult[],
    attacker: IBattlePet,
    defender: IBattlePet
  ): void {
    for (const result of results) {
      if (!result.success) {
        continue;
      }

      const target = result.target === 'attacker' ? attacker : defender;

      switch (result.type) {
        case 'heal':
        case 'absorb':
          // 回复HP
          if (result.value && result.value > 0) {
            target.hp = Math.min(target.maxHp, target.hp + result.value);
            Logger.Info(`[效果应用] ${result.target} 回复 ${result.value} HP`);
          }
          break;

        case 'damage':
        case 'recoil':
          // 造成伤害
          if (result.value && result.value > 0) {
            target.hp = Math.max(0, target.hp - result.value);
            Logger.Info(`[效果应用] ${result.target} 受到 ${result.value} 点伤害`);
          }
          break;

        case 'status':
          // 应用状态效果
          if (result.data && result.data.status !== undefined) {
            if (!target.statusDurations) {
              target.statusDurations = new Array(20).fill(0);
            }
            target.statusDurations[result.data.status] = result.data.duration || 3;
            target.status = result.data.status;
            target.statusTurns = result.data.duration || 3;
            Logger.Info(
              `[效果应用] ${result.target} 进入状态: ${result.data.statusName}, ` +
              `持续 ${result.data.duration} 回合`
            );
          }
          break;

        case 'stat_change':
          // 能力等级变化
          if (result.data && result.data.stat !== undefined && result.data.stages !== undefined) {
            if (!target.battleLv) {
              target.battleLv = [0, 0, 0, 0, 0, 0];
            }
            const statIndex = result.data.stat;
            const oldStage = target.battleLv[statIndex] || 0;
            const newStage = Math.max(-6, Math.min(6, oldStage + result.data.stages));
            target.battleLv[statIndex] = newStage;
            
            const statNames = ['攻击', '防御', '特攻', '特防', '速度', '命中'];
            const change = result.data.stages > 0 ? '提升' : '降低';
            Logger.Info(
              `[效果应用] ${result.target} ${statNames[statIndex]}${change} ` +
              `${Math.abs(result.data.stages)} 级 (${oldStage} → ${newStage})`
            );
          }
          break;

        case 'multi_hit':
          // 连续攻击（在伤害计算时处理）
          Logger.Info(`[效果应用] 连续攻击 ${result.value} 次`);
          break;

        case 'hp_equal':
          // 同生共死
          defender.hp = attacker.hp;
          Logger.Info(`[效果应用] 同生共死: 对方HP变为 ${defender.hp}`);
          break;

        case 'mercy':
          // 手下留情
          if (defender.hp <= 0) {
            defender.hp = 1;
            Logger.Info(`[效果应用] 手下留情: 对方HP保留1点`);
          }
          break;

        case 'encore':
          // 克制
          if (result.data && result.data.turns) {
            defender.encore = true;
            defender.encoreTurns = result.data.turns;
            Logger.Info(`[效果应用] 克制: 对方被迫使用上次技能 ${result.data.turns} 回合`);
          }
          break;

        case 'pp_reduce':
          // 减少PP
          if (defender.lastMove && defender.skillPP) {
            const skillIndex = defender.skills.indexOf(defender.lastMove);
            if (skillIndex >= 0 && defender.skillPP[skillIndex]) {
              defender.skillPP[skillIndex] = Math.max(0, defender.skillPP[skillIndex] - 1);
              Logger.Info(`[效果应用] 减少对方技能PP`);
            }
          }
          break;

        default:
          Logger.Debug(`[效果应用] 未处理的效果类型: ${result.type}`);
      }
    }
  }

  /**
   * 解析效果参数字符串
   * 格式: "arg1 arg2 arg3" 或 "arg1,arg2,arg3"
   */
  private static ParseEffectArgs(argsStr: string): number[] {
    if (!argsStr || argsStr.trim() === '') {
      return [];
    }

    const args: number[] = [];
    const matches = argsStr.match(/(-?\d+)/g);

    if (matches) {
      for (const match of matches) {
        args.push(parseInt(match, 10));
      }
    }

    return args;
  }

  /**
   * 批量触发效果（用于多个时机）
   */
  public static TriggerMultipleEffects(
    skill: ISkillConfig,
    attacker: IBattlePet,
    defender: IBattlePet,
    damage: number,
    timings: EffectTiming[]
  ): IEffectResult[] {
    const allResults: IEffectResult[] = [];

    for (const timing of timings) {
      const results = this.TriggerSkillEffect(skill, attacker, defender, damage, timing);
      allResults.push(...results);
    }

    return allResults;
  }

  /**
   * 检查效果是否应该触发（概率判定）
   */
  public static ShouldTrigger(chance: number): boolean {
    return Math.random() * 100 < chance;
  }
}
