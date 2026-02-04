import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

export interface ISpecialParams {
  type: AtomicEffectType.SPECIAL;
  specialType: string;
  [key: string]: any;
}

/**
 * 特殊效果原子效果
 * 用于实现各种特殊的、不属于其他分类的效果
 */
export class SpecialEffect extends BaseAtomicEffect {
  private params: ISpecialParams;

  constructor(params: ISpecialParams) {
    super(AtomicEffectType.SPECIAL, 'Special Effect', []);
    this.params = params;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    this.log(`执行特殊效果: ${this.params.specialType}`, 'debug');
    return results;
  }

  public validate(params: any): boolean {
    return params && params.type === AtomicEffectType.SPECIAL && typeof params.specialType === 'string';
  }
}
