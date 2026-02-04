import { BaseAtomicEffect } from './BaseAtomicEffect';
import { AtomicEffectType, ConditionType, IConditionalParams } from './IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 条件判断原子效果
 * 根据条件判断执行不同的效果
 */
export class ConditionalCheck extends BaseAtomicEffect {
  private params: IConditionalParams;

  constructor(params: IConditionalParams) {
    super(AtomicEffectType.CONDITIONAL, 'Conditional Check', []);
    this.params = params;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const conditionMet = this.checkCondition(context);

    results.push(this.createResult(
      conditionMet,
      'both',
      'conditional',
      `条件${this.params.condition}判定: ${conditionMet ? '成功' : '失败'}`,
      conditionMet ? 1 : 0
    ));

    return results;
  }

  private checkCondition(context: IEffectContext): boolean {
    switch (this.params.condition) {
      case ConditionType.ALWAYS:
        return true;
      case ConditionType.NEVER:
        return false;
      case ConditionType.PROBABILITY:
        return this.checkProbability(this.params.value as number || 50);
      case ConditionType.FIRST_STRIKE:
        return context.attacker.speed > context.defender.speed;
      case ConditionType.SECOND_STRIKE:
        return context.attacker.speed <= context.defender.speed;
      default:
        this.log(`未实现的条件类型: ${this.params.condition}`, 'warn');
        return false;
    }
  }

  public validate(params: any): boolean {
    return params && params.type === AtomicEffectType.CONDITIONAL &&
           Object.values(ConditionType).includes(params.condition);
  }
}
