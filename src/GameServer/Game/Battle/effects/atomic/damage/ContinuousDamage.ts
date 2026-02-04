import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

export interface IContinuousDamageParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'continuous_damage';
  target: 'self' | 'opponent';
  duration: number;
  damageRatio?: number;
  damageAmount?: number;
}

/**
 * 持续伤害原子效果
 * 每回合对目标造成固定伤害或比例伤害
 * 
 * @example
 * // 每回合造成最大HP的1/8伤害，持续5回合
 * { type: 'special', specialType: 'continuous_damage', target: 'opponent', duration: 5, damageRatio: 0.125 }
 */
export class ContinuousDamage extends BaseAtomicEffect {
  private params: IContinuousDamageParams;

  constructor(params: IContinuousDamageParams) {
    super(AtomicEffectType.SPECIAL, 'Continuous Damage', [EffectTiming.TURN_END]);
    this.params = params;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const target = this.getTarget(context, this.params.target);
    if (!target) return results;

    let damageAmount = 0;
    if (this.params.damageRatio !== undefined) {
      damageAmount = Math.floor(target.maxHp * this.params.damageRatio);
    } else if (this.params.damageAmount !== undefined) {
      damageAmount = this.params.damageAmount;
    } else {
      damageAmount = Math.floor(target.maxHp / 8);
    }

    damageAmount = Math.max(1, damageAmount);
    const actualDamage = Math.min(damageAmount, target.hp);

    if (actualDamage > 0) {
      target.hp -= actualDamage;
      results.push(this.createResult(
        true,
        this.params.target === 'self' ? 'attacker' : 'defender',
        'continuous_damage',
        `受到${actualDamage}点持续伤害`,
        actualDamage
      ));
    }
    return results;
  }

  public validate(params: any): boolean {
    return params && params.type === AtomicEffectType.SPECIAL &&
           params.specialType === 'continuous_damage' &&
           ['self', 'opponent'].includes(params.target) &&
           typeof params.duration === 'number' && params.duration >= 1;
  }
}
