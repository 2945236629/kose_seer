import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { BattleStatus } from '../../../../../../shared/models/BattleModel';

/**
 * 条件状态光环参数接口
 */
export interface IConditionalStatusAuraParams {
  /** 持续回合数 */
  duration: number;
  /** 状态类型 */
  status: BattleStatus;
  /** 状态持续回合 */
  statusDuration: number;
  /** 触发概率 */
  chance: number;
  /** 条件类型 */
  condition: 'first_strike' | 'hp_below' | 'stat_boosted';
  /** 条件参数 */
  conditionValue?: number;
}

/**
 * 条件状态光环效果
 * 
 * 满足特定条件时，持续有概率施加异常状态
 * 
 * @category Special
 * @example
 * // 持续先手害怕
 * {
 *   duration: 5,
 *   status: BattleStatus.FEAR,
 *   statusDuration: 2,
 *   chance: 0.5,
 *   condition: 'first_strike'
 * }
 */
export class ConditionalStatusAura extends BaseAtomicEffect {
  private duration: number;
  private status: BattleStatus;
  private statusDuration: number;
  private chance: number;
  private condition: string;
  private conditionValue?: number;

  constructor(params: IConditionalStatusAuraParams) {
    super(AtomicEffectType.SPECIAL, 'ConditionalStatusAura', []);
    this.duration = params.duration;
    this.status = params.status;
    this.statusDuration = params.statusDuration;
    this.chance = params.chance;
    this.condition = params.condition;
    this.conditionValue = params.conditionValue;
  }

  public validate(params: any): boolean {
    return this.duration > 0 && this.chance > 0 && this.chance <= 1;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker, defender } = context;

    // 检查条件是否满足
    const conditionMet = this.checkCondition(context);

    if (!conditionMet) {
      return [this.createResult(
        false,
        'defender',
        'conditional_status_aura',
        '条件不满足'
      )];
    }

    // 概率判定
    const roll = Math.random();
    if (roll > this.chance) {
      return [this.createResult(
        false,
        'defender',
        'conditional_status_aura',
        `概率判定失败（${(roll * 100).toFixed(1)}% > ${(this.chance * 100).toFixed(1)}%）`
      )];
    }

    // 施加状态
    defender.status = this.status;
    defender.statusTurns = this.statusDuration;

    // 更新状态持续时间数组
    if (!defender.statusDurations) {
      defender.statusDurations = new Array(20).fill(0);
    }
    defender.statusDurations[this.status] = this.statusDuration;

    return [this.createResult(
      true,
      'defender',
      'conditional_status_aura',
      `条件状态施加（${BattleStatus[this.status]}，${this.statusDuration}回合）`,
      this.statusDuration,
      {
        status: this.status,
        statusDuration: this.statusDuration,
        condition: this.condition,
        duration: this.duration
      }
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
