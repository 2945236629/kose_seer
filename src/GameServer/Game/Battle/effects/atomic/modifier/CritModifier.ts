import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 暴击修正参数接口
 */
export interface ICritModifierParams {
  type: AtomicEffectType.CRIT_MODIFIER;
  mode: 'multiply' | 'add' | 'set';  // 修正模式：乘法、加法、设置
  value: number;                      // 修正值
}

/**
 * 暴击修正原子效果
 * 修改技能的暴击率
 * 
 * @example
 * // 暴击率提升25%
 * { type: 'crit_modifier', mode: 'add', value: 25 }
 * 
 * // 暴击率翻倍
 * { type: 'crit_modifier', mode: 'multiply', value: 2 }
 * 
 * // 必定暴击
 * { type: 'crit_modifier', mode: 'set', value: 100 }
 */
export class CritModifier extends BaseAtomicEffect {
  private params: ICritModifierParams;

  constructor(params: ICritModifierParams) {
    super(
      AtomicEffectType.CRIT_MODIFIER,
      'Crit Modifier',
      [EffectTiming.BEFORE_CRIT_CHECK]
    );
    this.params = params;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];

    // 获取当前暴击率（默认为0）
    const oldCritRate = context.critRate || 0;
    let newCritRate = oldCritRate;

    // 根据模式修正暴击率
    switch (this.params.mode) {
      case 'multiply':
        newCritRate = oldCritRate * this.params.value;
        break;
      case 'add':
        newCritRate = oldCritRate + this.params.value;
        break;
      case 'set':
        newCritRate = this.params.value;
        break;
    }

    // 限制暴击率范围 0-100
    newCritRate = Math.max(0, Math.min(100, newCritRate));
    context.critRate = newCritRate;

    results.push(
      this.createResult(
        true,
        'both',
        'crit_modifier',
        `暴击率从${oldCritRate}%修正为${newCritRate}%`,
        newCritRate,
        { oldCritRate, newCritRate, mode: this.params.mode }
      )
    );

    this.log(`暴击率修正: ${oldCritRate}% -> ${newCritRate}% (${this.params.mode})`);
    return results;
  }

  public validate(params: any): boolean {
    if (!params || params.type !== AtomicEffectType.CRIT_MODIFIER) {
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
