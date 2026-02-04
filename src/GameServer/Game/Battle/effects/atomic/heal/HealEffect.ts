import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType, IHealParams } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 回复效果原子效果
 * 回复目标的HP
 * 
 * @example
 * // 回复自身最大HP的50%
 * { type: 'heal', target: 'self', mode: 'percent', value: 0.5 }
 * 
 * // 回复固定100点HP
 * { type: 'heal', target: 'self', mode: 'fixed', value: 100 }
 * 
 * // 回复造成伤害的50%
 * { type: 'heal', target: 'self', mode: 'damage_percent', value: 0.5 }
 */
export class HealEffect extends BaseAtomicEffect {
  private params: IHealParams;

  constructor(params: IHealParams) {
    super(AtomicEffectType.HEAL, 'Heal Effect', [EffectTiming.AFTER_SKILL, EffectTiming.AFTER_DAMAGE_APPLY]);
    this.params = params;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const target = this.getTarget(context, this.params.target);
    if (!target) return results;

    let healAmount = 0;
    if (this.params.mode === 'percent') {
      healAmount = Math.floor(target.maxHp * this.params.value);
    } else if (this.params.mode === 'fixed') {
      healAmount = this.params.value;
    } else if (this.params.mode === 'damage_percent' && context.damage) {
      healAmount = Math.floor(context.damage * this.params.value);
    }

    const actualHeal = Math.min(healAmount, target.maxHp - target.hp);
    if (actualHeal > 0) {
      target.hp += actualHeal;
      results.push(this.createResult(
        true,
        this.params.target === 'self' ? 'attacker' : 'defender',
        'heal',
        `回复${actualHeal}HP`,
        actualHeal
      ));
    }
    return results;
  }

  public validate(params: any): boolean {
    return params && params.type === AtomicEffectType.HEAL &&
           ['self', 'opponent'].includes(params.target) &&
           ['percent', 'fixed', 'damage_percent'].includes(params.mode) &&
           typeof params.value === 'number';
  }
}
