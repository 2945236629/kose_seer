import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

export interface IReflectParams {
  type: AtomicEffectType.REFLECT;
  reflectRatio: number;
}

/**
 * 反弹效果原子效果
 * 将受到的伤害按比例反弹给攻击者
 */
export class ReflectEffect extends BaseAtomicEffect {
  private params: IReflectParams;

  constructor(params: IReflectParams) {
    super(AtomicEffectType.REFLECT, 'Reflect Effect', [EffectTiming.AFTER_DAMAGE_APPLY]);
    this.params = params;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    if (!context.damage || context.damage <= 0) return results;

    const reflectDamage = Math.floor(context.damage * this.params.reflectRatio);
    if (reflectDamage > 0 && context.attacker) {
      context.attacker.hp = Math.max(0, context.attacker.hp - reflectDamage);
      results.push(this.createResult(true, 'attacker', 'reflect', `反弹${reflectDamage}点伤害`, reflectDamage));
    }
    return results;
  }

  public validate(params: any): boolean {
    return params && params.type === AtomicEffectType.REFLECT &&
           typeof params.reflectRatio === 'number' && params.reflectRatio > 0 && params.reflectRatio <= 1;
  }
}
