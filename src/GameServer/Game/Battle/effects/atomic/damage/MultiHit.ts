import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

export interface IMultiHitParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'multi_hit';
  minHits: number;
  maxHits: number;
}

/**
 * 连续攻击原子效果
 * 在一回合内连续攻击X~Y次
 * 
 * @example
 * // 连续攻击2-5次
 * { type: 'special', specialType: 'multi_hit', minHits: 2, maxHits: 5 }
 */
export class MultiHit extends BaseAtomicEffect {
  private params: IMultiHitParams;

  constructor(params: IMultiHitParams) {
    super(AtomicEffectType.SPECIAL, 'Multi Hit', [EffectTiming.BEFORE_DAMAGE_CALC]);
    this.params = params;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const hitCount = Math.floor(Math.random() * (this.params.maxHits - this.params.minHits + 1) + this.params.minHits);

    if (!context.effectData) context.effectData = {};
    context.effectData.multiHitCount = hitCount;

    results.push(this.createResult(
      true,
      'both',
      'multi_hit',
      `将连续攻击${hitCount}次`,
      hitCount
    ));
    return results;
  }

  public validate(params: any): boolean {
    return params && params.type === AtomicEffectType.SPECIAL &&
           params.specialType === 'multi_hit' &&
           typeof params.minHits === 'number' && params.minHits >= 1 &&
           typeof params.maxHits === 'number' && params.maxHits >= params.minHits;
  }
}
