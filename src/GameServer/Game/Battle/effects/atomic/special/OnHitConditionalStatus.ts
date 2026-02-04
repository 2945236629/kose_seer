import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { BattleStatus } from '../../../../../../shared/models/BattleModel';

/**
 * 受击条件状态参数接口
 */
export interface IOnHitConditionalStatusParams {
  /** 持续回合数 */
  duration: number;
  /** 状态类型 */
  status: BattleStatus;
  /** 状态持续回合 */
  statusDuration: number;
  /** 触发概率 */
  chance: number;
  /** 伤害阈值 */
  damageThreshold: number;
}

/**
 * 受击条件状态效果
 * 
 * 受到特定伤害时，有概率施加异常状态
 * 
 * @category Special
 * @example
 * // 受高伤异常状态
 * {
 *   duration: 5,
 *   status: BattleStatus.BURN,
 *   statusDuration: 3,
 *   chance: 0.5,
 *   damageThreshold: 100
 * }
 */
export class OnHitConditionalStatus extends BaseAtomicEffect {
  private duration: number;
  private status: BattleStatus;
  private statusDuration: number;
  private chance: number;
  private damageThreshold: number;

  constructor(params: IOnHitConditionalStatusParams) {
    super(AtomicEffectType.SPECIAL, 'OnHitConditionalStatus', []);
    this.duration = params.duration;
    this.status = params.status;
    this.statusDuration = params.statusDuration;
    this.chance = params.chance;
    this.damageThreshold = params.damageThreshold;
  }

  public validate(params: any): boolean {
    return this.duration > 0 && this.chance > 0 && this.chance <= 1;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker, defender, damage } = context;

    // 检查伤害是否达到阈值
    if (!damage || damage < this.damageThreshold) {
      return [this.createResult(
        false,
        'attacker',
        'on_hit_conditional_status',
        `伤害未达到阈值（${damage || 0} < ${this.damageThreshold}）`
      )];
    }

    // 概率判定
    const roll = Math.random();
    if (roll > this.chance) {
      return [this.createResult(
        false,
        'attacker',
        'on_hit_conditional_status',
        `概率判定失败（${(roll * 100).toFixed(1)}% > ${(this.chance * 100).toFixed(1)}%）`
      )];
    }

    // 施加状态到攻击者
    attacker.status = this.status;
    attacker.statusTurns = this.statusDuration;

    // 更新状态持续时间数组
    if (!attacker.statusDurations) {
      attacker.statusDurations = new Array(20).fill(0);
    }
    attacker.statusDurations[this.status] = this.statusDuration;

    return [this.createResult(
      true,
      'attacker',
      'on_hit_conditional_status',
      `受击状态施加（${BattleStatus[this.status]}，${this.statusDuration}回合）`,
      this.statusDuration,
      {
        status: this.status,
        statusDuration: this.statusDuration,
        damageThreshold: this.damageThreshold,
        actualDamage: damage,
        duration: this.duration
      }
    )];
  }
}
