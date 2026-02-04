import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 延迟全回复参数接口
 */
export interface IDelayedFullHealParams {
  /** 立即回复量 */
  immediateHeal: number;
  /** 延迟回合数 */
  delayTurns: number;
}

/**
 * 延迟全回复效果
 * 
 * 立刻恢复部分体力，延迟回合后恢复全部体力
 * 
 * @category Special
 * @example
 * // 立即回复延迟全回复
 * {
 *   immediateHeal: 50,
 *   delayTurns: 3
 * }
 */
export class DelayedFullHeal extends BaseAtomicEffect {
  private immediateHeal: number;
  private delayTurns: number;

  constructor(params: IDelayedFullHealParams) {
    super(AtomicEffectType.SPECIAL, 'DelayedFullHeal', []);
    this.immediateHeal = params.immediateHeal;
    this.delayTurns = params.delayTurns;
  }

  public validate(params: any): boolean {
    return this.immediateHeal >= 0 && this.delayTurns > 0;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker } = context;

    // 立即回复
    const beforeHp = attacker.hp;
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + this.immediateHeal);
    const actualHeal = attacker.hp - beforeHp;

    // 设置延迟全回复标记（需要在战斗系统中处理）
    if (!attacker.effectCounters) {
      attacker.effectCounters = {};
    }
    attacker.effectCounters['delayed_full_heal'] = this.delayTurns;

    return [this.createResult(
      true,
      'attacker',
      'delayed_full_heal',
      `立即回复${actualHeal}HP，${this.delayTurns}回合后全回复`,
      actualHeal,
      {
        immediateHeal: actualHeal,
        delayTurns: this.delayTurns
      }
    )];
  }
}
