import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 伤害削弱效果参数接口
 */
export interface IDamageReductionParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'damage_reduction';
  /** 削弱倍率（如0.5表示伤害减少50%） */
  multiplier: number;
  /** 持续回合数（可选，默认永久） */
  duration?: number;
  /** 是否仅对特定技能类别生效（可选：physical/special） */
  skillCategory?: 'physical' | 'special';
  /** 是否仅对特定属性生效（可选） */
  skillType?: number;
}

/**
 * 伤害削弱效果
 * 
 * 功能：
 * - 降低受到的伤害
 * - 可设置持续回合数或永久生效
 * - 可限制特定技能类别或属性
 * - 与DamageShield的区别：DamageReduction是百分比削弱，DamageShield是固定减免
 * 
 * 使用场景：
 * - 防御强化（所有伤害减少30%）
 * - 物理防护（物理伤害减少50%）
 * - 火焰抗性（火属性伤害减少50%）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "damage_reduction",
 *   "multiplier": 0.5,
 *   "duration": 5,
 *   "skillCategory": "physical"
 * }
 * ```
 * 
 * 状态数据结构：
 * ```typescript
 * {
 *   multiplier: number;         // 削弱倍率
 *   remainingTurns?: number;    // 剩余回合数
 *   isActive: boolean;          // 是否激活
 *   skillCategory?: string;     // 限制类别
 *   skillType?: number;         // 限制属性
 * }
 * ```
 * 
 * 与DamageShield的区别：
 * - DamageShield: 固定减免（如减少50点伤害）
 * - DamageReduction: 百分比削弱（如减少50%伤害）
 */
export class DamageReduction extends BaseAtomicEffect {
  private multiplier: number;
  private duration?: number;
  private skillCategory?: 'physical' | 'special';
  private skillType?: number;

  constructor(params: IDamageReductionParams) {
    super(
      AtomicEffectType.SPECIAL,
      'DamageReduction',
      [EffectTiming.AFTER_SKILL, EffectTiming.AFTER_DAMAGE_CALC, EffectTiming.TURN_END]
    );

    this.multiplier = params.multiplier;
    this.duration = params.duration;
    this.skillCategory = params.skillCategory;
    this.skillType = params.skillType;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const defender = this.getDefender(context);

    // 在AFTER_SKILL时机激活光环
    if (context.timing === EffectTiming.AFTER_SKILL) {
      const reductionState = this.getReductionState(defender);
      reductionState.isActive = true;
      reductionState.multiplier = this.multiplier;
      reductionState.skillCategory = this.skillCategory;
      reductionState.skillType = this.skillType;
      if (this.duration !== undefined) {
        reductionState.remainingTurns = this.duration;
      }

      results.push(
        this.createResult(
          true,
          'defender',
          'damage_reduction_activate',
          `伤害削弱激活！受到伤害减少${Math.round((1 - this.multiplier) * 100)}%`,
          this.multiplier,
          { duration: this.duration }
        )
      );

      this.log(
        `伤害削弱激活: ×${this.multiplier}, 持续${this.duration ?? '永久'}回合` +
        (this.skillCategory ? `, 限制类别: ${this.skillCategory}` : '') +
        (this.skillType !== undefined ? `, 限制属性: ${this.skillType}` : '')
      );
    }

    // 在AFTER_DAMAGE_CALC时机应用削弱
    if (context.timing === EffectTiming.AFTER_DAMAGE_CALC) {
      const reductionState = this.getReductionState(defender);

      if (!reductionState.isActive) {
        return results;
      }

      // 检查技能类别限制
      if (reductionState.skillCategory) {
        const categoryValue = this.getSkillCategoryValue(reductionState.skillCategory as 'physical' | 'special');
        if (context.skillCategory !== categoryValue) {
          return results;
        }
      }

      // 检查技能属性限制
      if (reductionState.skillType !== undefined && context.skillType !== reductionState.skillType) {
        return results;
      }

      // 应用伤害削弱
      const originalDamage = context.damage;
      context.damage = Math.floor(context.damage * reductionState.multiplier);

      results.push(
        this.createResult(
          true,
          'defender',
          'damage_reduction',
          `伤害削弱！${originalDamage}→${context.damage}`,
          originalDamage - context.damage,
          {
            originalDamage,
            newDamage: context.damage,
            multiplier: reductionState.multiplier
          }
        )
      );

      this.log(`伤害削弱: ${originalDamage}→${context.damage} (×${reductionState.multiplier})`);
    }

    // 在TURN_END时机检查持续时间
    if (context.timing === EffectTiming.TURN_END) {
      const reductionState = this.getReductionState(defender);

      if (reductionState.isActive && reductionState.remainingTurns !== undefined) {
        reductionState.remainingTurns--;
        if (reductionState.remainingTurns <= 0) {
          // 光环结束
          reductionState.isActive = false;

          results.push(
            this.createResult(
              true,
              'defender',
              'damage_reduction_end',
              `伤害削弱结束了！`,
              0
            )
          );

          this.log(`伤害削弱结束`);
        }
      }
    }

    return results;
  }

  public validate(params: any): boolean {
    if (params.multiplier === undefined || params.multiplier < 0 || params.multiplier > 1) {
      this.log('multiplier必须在0-1之间', 'error');
      return false;
    }
    if (params.skillCategory && !['physical', 'special'].includes(params.skillCategory)) {
      this.log('skillCategory必须是physical或special', 'error');
      return false;
    }
    return true;
  }

  /**
   * 获取削弱状态
   */
  private getReductionState(pet: any): {
    multiplier: number;
    remainingTurns?: number;
    isActive: boolean;
    skillCategory?: string;
    skillType?: number;
  } {
    if (!pet.effectStates) {
      pet.effectStates = {};
    }
    if (!pet.effectStates.damageReduction) {
      pet.effectStates.damageReduction = {
        multiplier: 1.0,
        isActive: false
      };
    }
    return pet.effectStates.damageReduction;
  }

  /**
   * 获取技能类别数值
   */
  private getSkillCategoryValue(category: 'physical' | 'special'): number {
    return category === 'physical' ? 1 : 2;
  }
}
