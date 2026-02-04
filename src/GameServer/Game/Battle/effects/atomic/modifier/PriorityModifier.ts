import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 优先级修正参数接口
 */
export interface IPriorityModifierParams {
  type: AtomicEffectType.PRIORITY_MODIFIER;
  mode: 'add' | 'set';  // 修正模式：加法、设置
  value: number;         // 修正值
}

/**
 * 优先级修正原子效果
 * 修改技能的优先级（先制度）
 * 
 * @example
 * // 优先级+1（先制攻击）
 * { type: 'priority_modifier', mode: 'add', value: 1 }
 * 
 * // 优先级-1（后手攻击）
 * { type: 'priority_modifier', mode: 'add', value: -1 }
 * 
 * // 优先级固定为2
 * { type: 'priority_modifier', mode: 'set', value: 2 }
 */
export class PriorityModifier extends BaseAtomicEffect {
  private params: IPriorityModifierParams;

  constructor(params: IPriorityModifierParams) {
    super(
      AtomicEffectType.PRIORITY_MODIFIER,
      'Priority Modifier',
      [EffectTiming.BEFORE_SPEED_CHECK]
    );
    this.params = params;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];

    if (!context.skill) {
      this.log('技能信息不存在', 'warn');
      return results;
    }

    const oldPriority = context.skill.priority || 0;
    let newPriority = oldPriority;

    // 根据模式修正优先级
    switch (this.params.mode) {
      case 'add':
        newPriority = oldPriority + this.params.value;
        break;
      case 'set':
        newPriority = this.params.value;
        break;
    }

    // 限制优先级范围 -7 到 +7
    newPriority = Math.max(-7, Math.min(7, newPriority));
    context.skill.priority = newPriority;

    results.push(
      this.createResult(
        true,
        'both',
        'priority_modifier',
        `优先级从${oldPriority}修正为${newPriority}`,
        newPriority,
        { oldPriority, newPriority, mode: this.params.mode }
      )
    );

    this.log(`优先级修正: ${oldPriority} -> ${newPriority} (${this.params.mode})`);
    return results;
  }

  public validate(params: any): boolean {
    if (!params || params.type !== AtomicEffectType.PRIORITY_MODIFIER) {
      return false;
    }

    if (!['add', 'set'].includes(params.mode)) {
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
