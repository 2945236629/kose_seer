import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

export interface IImmuneParams {
  type: AtomicEffectType.IMMUNE;
  target: 'self' | 'opponent';
  immuneType: 'damage' | 'status' | 'stat_change';
}

/**
 * 免疫效果原子效果
 * 使目标免疫特定类型的效果
 */
export class ImmuneEffect extends BaseAtomicEffect {
  private params: IImmuneParams;

  constructor(params: IImmuneParams) {
    super(AtomicEffectType.IMMUNE, 'Immune Effect', [EffectTiming.BEFORE_DAMAGE_APPLY]);
    this.params = params;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const target = this.getTarget(context, this.params.target);
    if (!target) return results;

    if (this.params.immuneType === 'damage' && context.damage) {
      context.damage = 0;
      results.push(this.createResult(true, this.params.target === 'self' ? 'attacker' : 'defender', 'immune', '免疫伤害', 0));
    }
    return results;
  }

  public validate(params: any): boolean {
    return params && params.type === AtomicEffectType.IMMUNE &&
           ['self', 'opponent'].includes(params.target) &&
           ['damage', 'status', 'stat_change'].includes(params.immuneType);
  }
}
