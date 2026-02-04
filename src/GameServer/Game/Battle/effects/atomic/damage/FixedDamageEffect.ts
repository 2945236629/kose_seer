import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType, IFixedDamageParams } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 固定伤害原子效果
 * 造成固定数值的伤害，不受能力值影响
 * 
 * @example
 * // 秒杀对方
 * { type: 'fixed_damage', target: 'opponent', mode: 'instant_kill' }
 * 
 * // 造成固定40点伤害
 * { type: 'fixed_damage', target: 'opponent', mode: 'fixed', value: 40 }
 * 
 * // 造成对方最大HP的50%伤害
 * { type: 'fixed_damage', target: 'opponent', mode: 'percent', value: 0.5 }
 */
export class FixedDamageEffect extends BaseAtomicEffect {
  private params: IFixedDamageParams;

  constructor(params: IFixedDamageParams) {
    super(AtomicEffectType.FIXED_DAMAGE, 'Fixed Damage', [EffectTiming.BEFORE_DAMAGE_CALC]);
    this.params = params;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const target = this.getTarget(context, this.params.target);
    if (!target) return results;

    let damage = 0;
    if (this.params.mode === 'instant_kill') {
      damage = target.hp;
    } else if (this.params.mode === 'fixed') {
      damage = this.params.value || 0;
    } else if (this.params.mode === 'percent') {
      damage = Math.floor(target.maxHp * (this.params.value || 0));
    }

    damage = Math.min(damage, target.hp);
    if (damage > 0) {
      target.hp -= damage;
      results.push(this.createResult(
        true,
        this.params.target === 'self' ? 'attacker' : 'defender',
        'fixed_damage',
        `造成${damage}点固定伤害`,
        damage
      ));
    }
    return results;
  }

  public validate(params: any): boolean {
    return params && params.type === AtomicEffectType.FIXED_DAMAGE &&
           ['self', 'opponent'].includes(params.target) &&
           ['instant_kill', 'fixed', 'percent'].includes(params.mode);
  }
}
