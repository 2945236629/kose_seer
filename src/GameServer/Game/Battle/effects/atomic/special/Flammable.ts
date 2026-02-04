import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { BattleStatus } from '../../../../../../shared/models/BattleModel';

/**
 * 易燃状态参数接口
 */
export interface IFlammableParams {
  /** 触发概率 */
  chance: number;
  /** 易燃持续回合 */
  duration: number;
}

/**
 * 易燃状态效果
 * 
 * 命中后有概率令对方易燃
 * 易燃状态下受到火属性攻击伤害加倍
 * 
 * @category Special
 * @example
 * // 概率易燃
 * {
 *   chance: 0.3,
 *   duration: 3
 * }
 */
export class Flammable extends BaseAtomicEffect {
  private chance: number;
  private duration: number;

  constructor(params: IFlammableParams) {
    super(AtomicEffectType.SPECIAL, 'Flammable', []);
    this.chance = params.chance;
    this.duration = params.duration;
  }

  public validate(params: any): boolean {
    return this.chance > 0 && this.chance <= 1 && this.duration > 0;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { defender } = context;

    // 概率判定
    const roll = Math.random();
    if (roll > this.chance) {
      return [this.createResult(
        false,
        'defender',
        'flammable',
        `概率判定失败（${(roll * 100).toFixed(1)}% > ${(this.chance * 100).toFixed(1)}%）`
      )];
    }

    // 施加易燃状态
    defender.status = BattleStatus.FLAMMABLE;
    defender.statusTurns = this.duration;

    // 更新状态持续时间数组
    if (!defender.statusDurations) {
      defender.statusDurations = new Array(20).fill(0);
    }
    defender.statusDurations[BattleStatus.FLAMMABLE] = this.duration;

    return [this.createResult(
      true,
      'defender',
      'flammable',
      `易燃状态（${this.duration}回合）`,
      this.duration,
      {
        status: BattleStatus.FLAMMABLE,
        duration: this.duration
      }
    )];
  }
}
