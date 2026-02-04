import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 伤害增强效果参数接口
 */
export interface IDamageBoostParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'damage_boost';
  /** 增强倍率（如1.5表示伤害提升50%） */
  multiplier: number;
  /** 持续回合数（可选，默认永久） */
  duration?: number;
  /** 是否仅对特定技能类别生效（可选：physical/special） */
  skillCategory?: 'physical' | 'special';
  /** 是否仅对特定属性生效（可选） */
  skillType?: number;
}

/**
 * 伤害增强效果
 * 
 * 功能：
 * - 提升造成的伤害
 * - 可设置持续回合数或永久生效
 * - 可限制特定技能类别或属性
 * - 与DamageModifier的区别：DamageBoost是持续性光环效果
 * 
 * 使用场景：
 * - 力量强化（所有伤害提升50%）
 * - 物理强化（物理伤害提升30%）
 * - 火焰强化（火属性伤害提升50%）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "damage_boost",
 *   "multiplier": 1.5,
 *   "duration": 5,
 *   "skillCategory": "physical"
 * }
 * ```
 * 
 * 状态数据结构：
 * ```typescript
 * {
 *   multiplier: number;         // 增强倍率
 *   remainingTurns?: number;    // 剩余回合数
 *   isActive: boolean;          // 是否激活
 *   skillCategory?: string;     // 限制类别
 *   skillType?: number;         // 限制属性
 * }
 * ```
 * 
 * 与DamageModifier的区别：
 * - DamageModifier: 即时修正，单次生效
 * - DamageBoost: 持续光环，多回合生效
 */
export class DamageBoost extends BaseAtomicEffect {
  private multiplier: number;
  private duration?: number;
  private skillCategory?: 'physical' | 'special';
  private skillType?: number;

  constructor(params: IDamageBoostParams) {
    super(
      AtomicEffectType.SPECIAL,
      'DamageBoost',
      [EffectTiming.AFTER_SKILL, EffectTiming.AFTER_DAMAGE_CALC, EffectTiming.TURN_END]
    );

    this.multiplier = params.multiplier;
    this.duration = params.duration;
    this.skillCategory = params.skillCategory;
    this.skillType = params.skillType;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const attacker = this.getAttacker(context);

    // 在AFTER_SKILL时机激活光环
    if (context.timing === EffectTiming.AFTER_SKILL) {
      const boostState = this.getBoostState(attacker);
      boostState.isActive = true;
      boostState.multiplier = this.multiplier;
      boostState.skillCategory = this.skillCategory;
      boostState.skillType = this.skillType;
      if (this.duration !== undefined) {
        boostState.remainingTurns = this.duration;
      }

      results.push(
        this.createResult(
          true,
          'attacker',
          'damage_boost_activate',
          `伤害增强激活！伤害提升${Math.round((this.multiplier - 1) * 100)}%`,
          this.multiplier,
          { duration: this.duration }
        )
      );

      this.log(
        `伤害增强激活: ×${this.multiplier}, 持续${this.duration ?? '永久'}回合` +
        (this.skillCategory ? `, 限制类别: ${this.skillCategory}` : '') +
        (this.skillType !== undefined ? `, 限制属性: ${this.skillType}` : '')
      );
    }

    // 在AFTER_DAMAGE_CALC时机应用增强
    if (context.timing === EffectTiming.AFTER_DAMAGE_CALC) {
      const boostState = this.getBoostState(attacker);

      if (!boostState.isActive) {
        return results;
      }

      // 检查技能类别限制
      if (boostState.skillCategory) {
        const categoryValue = this.getSkillCategoryValue(boostState.skillCategory as 'physical' | 'special');
        if (context.skillCategory !== categoryValue) {
          return results;
        }
      }

      // 检查技能属性限制
      if (boostState.skillType !== undefined && context.skillType !== boostState.skillType) {
        return results;
      }

      // 应用伤害增强
      const originalDamage = context.damage;
      context.damage = Math.floor(context.damage * boostState.multiplier);

      results.push(
        this.createResult(
          true,
          'attacker',
          'damage_boost',
          `伤害增强！${originalDamage}→${context.damage}`,
          context.damage - originalDamage,
          {
            originalDamage,
            newDamage: context.damage,
            multiplier: boostState.multiplier
          }
        )
      );

      this.log(`伤害增强: ${originalDamage}→${context.damage} (×${boostState.multiplier})`);
    }

    // 在TURN_END时机检查持续时间
    if (context.timing === EffectTiming.TURN_END) {
      const boostState = this.getBoostState(attacker);

      if (boostState.isActive && boostState.remainingTurns !== undefined) {
        boostState.remainingTurns--;
        if (boostState.remainingTurns <= 0) {
          // 光环结束
          boostState.isActive = false;

          results.push(
            this.createResult(
              true,
              'attacker',
              'damage_boost_end',
              `伤害增强结束了！`,
              0
            )
          );

          this.log(`伤害增强结束`);
        }
      }
    }

    return results;
  }

  public validate(params: any): boolean {
    if (params.multiplier === undefined || params.multiplier <= 0) {
      this.log('multiplier必须大于0', 'error');
      return false;
    }
    if (params.skillCategory && !['physical', 'special'].includes(params.skillCategory)) {
      this.log('skillCategory必须是physical或special', 'error');
      return false;
    }
    return true;
  }

  /**
   * 获取增强状态
   */
  private getBoostState(pet: any): {
    multiplier: number;
    remainingTurns?: number;
    isActive: boolean;
    skillCategory?: string;
    skillType?: number;
  } {
    if (!pet.effectStates) {
      pet.effectStates = {};
    }
    if (!pet.effectStates.damageBoost) {
      pet.effectStates.damageBoost = {
        multiplier: 1.0,
        isActive: false
      };
    }
    return pet.effectStates.damageBoost;
  }

  /**
   * 获取技能类别数值
   */
  private getSkillCategoryValue(category: 'physical' | 'special'): number {
    return category === 'physical' ? 1 : 2;
  }
}
