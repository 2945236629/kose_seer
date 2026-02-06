import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 低血秒杀先手 (2023)
 * 自身体力降到N以下时，每次攻击必定秒杀对方且必定先手
 * effectArgs: [thresholdHigh, thresholdLow]
 */
export class LowHpOhkoPriorityPassive extends BaseAtomicEffect {
  constructor(params: any = {}) {
    super('special' as AtomicEffectType, 'LowHpOhkoPriorityPassive', [EffectTiming.BEFORE_SPEED_CHECK, EffectTiming.BEFORE_DAMAGE_CALC]);
  }

  public validate(params: any): boolean { return true; }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const attacker = this.getAttacker(context);
    const thresholdHigh = context.effectArgs?.[0] || 0;
    const thresholdLow = context.effectArgs?.[1] || 0;
    const threshold = (thresholdHigh << 16) | thresholdLow;

    if (attacker.hp > 0 && attacker.hp < threshold) {
      if (context.timing === EffectTiming.BEFORE_SPEED_CHECK) {
        context.alwaysFirst = true;
        context.priorityModifier += 999;
        results.push(this.createResult(true, 'attacker', 'low_hp_priority',
          `${attacker.name} 低血必先手`, 0, { threshold }));
      } else if (context.timing === EffectTiming.BEFORE_DAMAGE_CALC) {
        const defender = this.getDefender(context);
        context.instantKill = true;
        context.damage = defender.hp;
        this.log(`低血秒杀先手: ${attacker.name} HP=${attacker.hp} < ${threshold}, 秒杀`, 'info');
        results.push(this.createResult(true, 'attacker', 'low_hp_ohko',
          `${attacker.name} 发动秒杀`, defender.hp, { threshold }));
      }
    }
    return results;
  }
}
