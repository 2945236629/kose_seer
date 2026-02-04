import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 条件持续伤害参数接口
 */
export interface IConditionalContinuousDamageParams {
  /** 持续回合数 */
  duration: number;
  /** 每回合固定伤害 */
  damagePerTurn: number;
  /** 条件类型 */
  condition: 'self_weakened' | 'target_boosted' | 'hp_below';
  /** 条件参数 */
  conditionValue?: number;
}

/**
 * 条件持续伤害效果
 * 
 * 满足特定条件时，对目标造成持续伤害
 * 
 * @category Special
 * @example
 * // 自身弱化对方持续伤害
 * {
 *   duration: 5,
 *   damagePerTurn: 50,
 *   condition: 'self_weakened'
 * }
 */
export class ConditionalContinuousDamage extends BaseAtomicEffect {
  private duration: number;
  private damagePerTurn: number;
  private condition: string;
  private conditionValue?: number;

  constructor(params: IConditionalContinuousDamageParams) {
    super(AtomicEffectType.SPECIAL, 'ConditionalContinuousDamage', []);
    this.duration = params.duration;
    this.damagePerTurn = params.damagePerTurn;
    this.condition = params.condition;
    this.conditionValue = params.conditionValue;
  }

  public validate(params: any): boolean {
    return this.duration > 0 && this.damagePerTurn > 0;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker, defender } = context;

    // 检查条件是否满足
    const conditionMet = this.checkCondition(context);

    if (!conditionMet) {
      return [this.createResult(
        false,
        'defender',
        'conditional_continuous_damage',
        '条件不满足'
      )];
    }

    // 造成持续伤害
    const actualDamage = Math.min(this.damagePerTurn, defender.hp);
    defender.hp = Math.max(0, defender.hp - actualDamage);

    return [this.createResult(
      true,
      'defender',
      'conditional_continuous_damage',
      `条件持续伤害（${actualDamage}点）`,
      actualDamage,
      {
        damagePerTurn: this.damagePerTurn,
        condition: this.condition,
        duration: this.duration
      }
    )];
  }

  private checkCondition(context: IEffectContext): boolean {
    const { attacker, defender } = context;

    switch (this.condition) {
      case 'self_weakened':
        // 检查自身是否处于能力下降或异常状态
        const hasStatDown = attacker.battleLevels?.some(level => level < 0) || false;
        const hasStatus = attacker.status !== undefined && attacker.status !== BattleStatus.NONE;
        return hasStatDown || hasStatus;

      case 'target_boosted':
        // 检查目标是否有能力提升
        if (defender.battleLevels) {
          return defender.battleLevels.some(level => level > 0);
        }
        return false;

      case 'hp_below':
        // 检查目标HP是否低于指定百分比
        if (this.conditionValue) {
          const hpPercent = defender.hp / defender.maxHp;
          return hpPercent <= this.conditionValue;
        }
        return false;

      default:
        return false;
    }
  }
}

// 导入BattleStatus枚举
import { BattleStatus } from '../../../../../../shared/models/BattleModel';
