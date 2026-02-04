import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 战斗奖励参数接口
 */
export interface IBattleRewardParams {
  /** 奖励类型 */
  rewardType: 'coins' | 'exp' | 'items';
  /** 奖励数量 */
  amount: number;
  /** 每日上限 */
  dailyLimit?: number;
}

/**
 * 战斗奖励效果
 * 
 * 使用后在战斗结束时可以获得额外奖励
 * 
 * @category Special
 * @example
 * // 战斗奖励赛尔豆
 * {
 *   rewardType: 'coins',
 *   amount: 100,
 *   dailyLimit: 5000
 * }
 */
export class BattleReward extends BaseAtomicEffect {
  private rewardType: string;
  private amount: number;
  private dailyLimit?: number;

  constructor(params: IBattleRewardParams) {
    super(AtomicEffectType.SPECIAL, 'BattleReward', []);
    this.rewardType = params.rewardType;
    this.amount = params.amount;
    this.dailyLimit = params.dailyLimit;
  }

  public validate(params: any): boolean {
    return this.amount > 0;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker } = context;

    // 设置战斗奖励标记（需要在战斗结束时处理）
    if (!attacker.effectCounters) {
      attacker.effectCounters = {};
    }

    const rewardKey = `battle_reward_${this.rewardType}`;
    attacker.effectCounters[rewardKey] = this.amount;

    if (this.dailyLimit) {
      attacker.effectCounters[`${rewardKey}_limit`] = this.dailyLimit;
    }

    return [this.createResult(
      true,
      'attacker',
      'battle_reward',
      `战斗奖励标记（${this.rewardType}: ${this.amount}）`,
      this.amount,
      {
        rewardType: this.rewardType,
        amount: this.amount,
        dailyLimit: this.dailyLimit
      }
    )];
  }
}
