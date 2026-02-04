import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 命中修正参数接口
 */
export interface IAccuracyModifierParams {
  type: AtomicEffectType.ACCURACY_MODIFIER;
  mode: 'multiply' | 'add' | 'set';  // 修正模式：乘法、加法、设置
  value: number;                      // 修正值
}

/**
 * 命中修正原子效果
 * 修改技能的命中率
 * 
 * @example
 * // 命中率提升20%
 * { type: 'accuracy_modifier', mode: 'add', value: 20 }
 * 
 * // 命中率翻倍
 * { type: 'accuracy_modifier', mode: 'multiply', value: 2 }
 * 
 * // 必中
 * { type: 'accuracy_modifier', mode: 'set', value: 100 }
 */
export class AccuracyModifier extends BaseAtomicEffect {
  private params: IAccuracyModifierParams;

  constructor(params: IAccuracyModifierParams) {
    super(
      AtomicEffectType.ACCURACY_MODIFIER,
      'Accuracy Modifier',
      [EffectTiming.BEFORE_HIT_CHECK]
    );
    this.params = params;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];

    if (!context.skill) {
      this.log('技能信息不存在', 'warn');
      return results;
    }

    const oldAccuracy = context.skill.accuracy || 100;
    let newAccuracy = oldAccuracy;

    // 根据模式修正命中率
    switch (this.params.mode) {
      case 'multiply':
        newAccuracy = oldAccuracy * this.params.value;
        break;
      case 'add':
        newAccuracy = oldAccuracy + this.params.value;
        break;
      case 'set':
        newAccuracy = this.params.value;
        break;
    }

    // 限制命中率范围 0-100
    newAccuracy = Math.max(0, Math.min(100, newAccuracy));
    context.skill.accuracy = newAccuracy;

    results.push(
      this.createResult(
        true,
        'both',
        'accuracy_modifier',
        `命中率从${oldAccuracy}%修正为${newAccuracy}%`,
        newAccuracy,
        { oldAccuracy, newAccuracy, mode: this.params.mode }
      )
    );

    this.log(`命中率修正: ${oldAccuracy}% -> ${newAccuracy}% (${this.params.mode})`);
    return results;
  }

  public validate(params: any): boolean {
    if (!params || params.type !== AtomicEffectType.ACCURACY_MODIFIER) {
      return false;
    }

    if (!['multiply', 'add', 'set'].includes(params.mode)) {
      this.log(`无效的修正模式: ${params.mode}`, 'error');
      return false;
    }

    if (typeof params.value !== 'number') {
      this.log(`无效的修正值: ${params.value}`, 'error');
      return false;
    }

    return true;
  }
}
