import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

export interface IRandomPowerParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'random_power';
  minPower: number;
  maxPower: number;
}

/**
 * 随机威力原子效果
 * 技能威力在指定范围内随机
 * 
 * @example
 * // 威力在50-150之间随机
 * { type: 'special', specialType: 'random_power', minPower: 50, maxPower: 150 }
 */
export class RandomPower extends BaseAtomicEffect {
  private params: IRandomPowerParams;

  constructor(params: IRandomPowerParams) {
    super(AtomicEffectType.SPECIAL, 'Random Power', [EffectTiming.BEFORE_DAMAGE_CALC]);
    this.params = params;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const power = Math.floor(Math.random() * (this.params.maxPower - this.params.minPower + 1) + this.params.minPower);

    if (!context.effectData) context.effectData = {};
    context.effectData.randomPower = power;

    if (context.skill) context.skill.power = power;

    results.push(this.createResult(
      true,
      'both',
      'random_power',
      `技能威力随机为${power}`,
      power
    ));
    return results;
  }

  public validate(params: any): boolean {
    return params && params.type === AtomicEffectType.SPECIAL &&
           params.specialType === 'random_power' &&
           typeof params.minPower === 'number' && params.minPower >= 0 &&
           typeof params.maxPower === 'number' && params.maxPower >= params.minPower;
  }
}
