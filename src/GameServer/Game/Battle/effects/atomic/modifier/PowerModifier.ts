import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType, IPowerModifierParams } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 威力修正原子效果
 * 修改技能的威力值
 * 
 * @example
 * // 威力翻倍
 * { type: 'power_modifier', mode: 'multiply', value: 2 }
 * 
 * // 威力增加30
 * { type: 'power_modifier', mode: 'add', value: 30 }
 * 
 * // 威力固定为120
 * { type: 'power_modifier', mode: 'set', value: 120 }
 */
export class PowerModifier extends BaseAtomicEffect {
  private params: IPowerModifierParams;

  constructor(params: IPowerModifierParams) {
    super(
      AtomicEffectType.POWER_MODIFIER,
      'Power Modifier',
      [EffectTiming.BEFORE_DAMAGE_CALC]
    );
    this.params = params;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];

    if (!context.skill) {
      this.log('技能信息不存在', 'warn');
      return results;
    }

    const oldPower = context.skill.power || 0;
    let newPower = oldPower;

    // 根据模式修正威力
    switch (this.params.mode) {
      case 'multiply':
        newPower = Math.floor(oldPower * this.params.value);
        break;
      case 'add':
        newPower = oldPower + this.params.value;
        break;
      case 'set':
        newPower = this.params.value;
        break;
    }

    // 确保威力不为负数
    newPower = Math.max(0, newPower);
    context.skill.power = newPower;

    results.push(
      this.createResult(
        true,
        'both',
        'power_modifier',
        `威力从${oldPower}修正为${newPower}`,
        newPower,
        { oldPower, newPower, mode: this.params.mode }
      )
    );

    this.log(`威力修正: ${oldPower} -> ${newPower} (${this.params.mode})`);
    return results;
  }

  public validate(params: any): boolean {
    if (!params || params.type !== AtomicEffectType.POWER_MODIFIER) {
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
