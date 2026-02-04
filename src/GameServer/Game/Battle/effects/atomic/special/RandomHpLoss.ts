import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 随机HP削减参数接口
 */
export interface IRandomHpLossParams {
  /** 对方削减比例 */
  opponentRatio: number;
  /** 对方削减概率 */
  opponentChance: number;
  /** 自己削减比例 */
  selfRatio: number;
  /** 自己削减概率 */
  selfChance: number;
}

/**
 * 随机HP削减效果
 * 
 * 随机削减对方或自己的HP
 * 
 * @category Special
 * @example
 * // 随机HP削减
 * {
 *   opponentRatio: 0.5,
 *   opponentChance: 0.5,
 *   selfRatio: 0.5,
 *   selfChance: 0.5
 * }
 */
export class RandomHpLoss extends BaseAtomicEffect {
  private opponentRatio: number;
  private opponentChance: number;
  private selfRatio: number;
  private selfChance: number;

  constructor(params: IRandomHpLossParams) {
    super(AtomicEffectType.SPECIAL, 'RandomHpLoss', []);
    this.opponentRatio = params.opponentRatio;
    this.opponentChance = params.opponentChance;
    this.selfRatio = params.selfRatio;
    this.selfChance = params.selfChance;
  }

  public validate(params: any): boolean {
    return this.opponentChance + this.selfChance <= 1;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker, defender } = context;

    const roll = Math.random();

    if (roll < this.opponentChance) {
      // 削减对方HP
      const loss = Math.floor(defender.maxHp * this.opponentRatio);
      defender.hp = Math.max(1, defender.hp - loss);

      return [this.createResult(
        true,
        'defender',
        'random_hp_loss',
        `对方HP削减（${loss}点）`,
        loss,
        {
          target: 'opponent',
          loss
        }
      )];
    } else if (roll < this.opponentChance + this.selfChance) {
      // 削减自己HP
      const loss = Math.floor(attacker.maxHp * this.selfRatio);
      attacker.hp = Math.max(1, attacker.hp - loss);

      return [this.createResult(
        true,
        'attacker',
        'random_hp_loss',
        `自己HP削减（${loss}点）`,
        loss,
        {
          target: 'self',
          loss
        }
      )];
    }

    return [this.createResult(
      false,
      'attacker',
      'random_hp_loss',
      '未触发HP削减'
    )];
  }
}
