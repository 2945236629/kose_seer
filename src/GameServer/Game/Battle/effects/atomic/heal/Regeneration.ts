import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 持续回复参数接口
 */
export interface IRegenerationParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'regeneration';
  target: 'self' | 'opponent';
  duration: number;
  healRatio?: number;
  healAmount?: number;
}

/**
 * 持续回复原子效果
 * 每回合回复一定比例或固定值的HP
 * 
 * @example
 * // 每回合回复最大HP的1/16，持续5回合
 * { type: 'special', specialType: 'regeneration', target: 'self', duration: 5, healRatio: 0.0625 }
 * 
 * // 每回合回复50HP，持续3回合
 * { type: 'special', specialType: 'regeneration', target: 'self', duration: 3, healAmount: 50 }
 */
export class Regeneration extends BaseAtomicEffect {
  private params: IRegenerationParams;

  constructor(params: IRegenerationParams) {
    super(AtomicEffectType.SPECIAL, 'Regeneration', [EffectTiming.TURN_END]);
    this.params = params;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const target = this.getTarget(context, this.params.target);
    if (!target) return results;

    let healAmount = 0;
    if (this.params.healRatio !== undefined) {
      healAmount = Math.floor(target.maxHp * this.params.healRatio);
    } else if (this.params.healAmount !== undefined) {
      healAmount = this.params.healAmount;
    } else {
      healAmount = Math.floor(target.maxHp / 16);
    }

    healAmount = Math.max(1, healAmount);
    const actualHeal = Math.min(healAmount, target.maxHp - target.hp);

    if (actualHeal > 0) {
      target.hp += actualHeal;
      results.push(this.createResult(
        true,
        this.params.target === 'self' ? 'attacker' : 'defender',
        'regeneration',
        `回复了${actualHeal}点HP`,
        actualHeal
      ));
    }
    return results;
  }

  public validate(params: any): boolean {
    return params && params.type === AtomicEffectType.SPECIAL &&
           params.specialType === 'regeneration' &&
           ['self', 'opponent'].includes(params.target) &&
           typeof params.duration === 'number' && params.duration >= 1;
  }
}
