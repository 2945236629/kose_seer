import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 条件吸血光环参数接口
 */
export interface IConditionalDrainAuraParams {
  /** 持续回合数 */
  duration: number;
  /** 吸血比例 */
  drainRatio: number;
  /** 条件类型 */
  condition: 'first_strike' | 'hp_below' | 'stat_boosted';
  /** 条件参数 */
  conditionValue?: number;
}

/**
 * 条件吸血光环效果
 * 
 * 满足特定条件时，持续获得吸血效果
 * 
 * @category Special
 * @example
 * // 持续先手吸血
 * {
 *   duration: 3,
 *   drainRatio: 0.5,
 *   condition: 'first_strike'
 * }
 */
export class ConditionalDrainAura extends BaseAtomicEffect {
  private duration: number;
  private drainRatio: number;
  private condition: string;
  private conditionValue?: number;

  constructor(params: IConditionalDrainAuraParams) {
    super(AtomicEffectType.SPECIAL, 'ConditionalDrainAura', []);
    this.duration = params.duration;
    this.drainRatio = params.drainRatio;
    this.condition = params.condition;
    this.conditionValue = params.conditionValue;
  }

  public validate(params: any): boolean {
    return this.duration > 0 && this.drainRatio > 0;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker, defender, damage } = context;

    // 检查条件是否满足
    const conditionMet = this.checkCondition(context);

    if (!conditionMet) {
      return [this.createResult(
        false,
        'attacker',
        'conditional_drain_aura',
        '条件不满足'
      )];
    }

    // 计算吸血量
    const drainAmount = damage ? Math.floor(damage * this.drainRatio) : 0;

    if (drainAmount > 0) {
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + drainAmount);

      return [this.createResult(
        true,
        'attacker',
        'conditional_drain_aura',
        `条件吸血（回复${drainAmount}HP）`,
        drainAmount,
        {
          drainAmount,
          condition: this.condition,
          duration: this.duration
        }
      )];
    }

    return [this.createResult(
      false,
      'attacker',
      'conditional_drain_aura',
      '无伤害，无法吸血'
    )];
  }

  private checkCondition(context: IEffectContext): boolean {
    const { attacker, defender } = context;

    switch (this.condition) {
      case 'first_strike':
        // 检查是否先手（速度更快）
        return attacker.speed > defender.speed;

      case 'hp_below':
        // 检查HP是否低于指定百分比
        if (this.conditionValue) {
          const hpPercent = attacker.hp / attacker.maxHp;
          return hpPercent <= this.conditionValue;
        }
        return false;

      case 'stat_boosted':
        // 检查是否有能力提升
        if (attacker.battleLevels) {
          return attacker.battleLevels.some(level => level > 0);
        }
        return false;

      default:
        return false;
    }
  }
}
