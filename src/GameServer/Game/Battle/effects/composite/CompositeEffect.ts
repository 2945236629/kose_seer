import { BaseEffect } from '../core/BaseEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../core/EffectContext';
import { IAtomicEffect, IAtomicEffectParams, IConditionalParams } from '../atomic/core/IAtomicEffect';
import { Logger } from '../../../../../shared/utils/Logger';

/**
 * 组合效果
 * 由多个原子效果组合而成
 */
export class CompositeEffect extends BaseEffect {
  private atoms: IAtomicEffect[];
  private atomParams: IAtomicEffectParams[];

  constructor(
    effectId: number,
    effectName: string,
    timings: EffectTiming[],
    atoms: IAtomicEffect[],
    atomParams: IAtomicEffectParams[]
  ) {
    super(effectId, effectName, timings);
    this.atoms = atoms;
    this.atomParams = atomParams;
  }

  /**
   * 执行组合效果
   */
  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];

    this.logEffect(`开始执行组合效果，包含 ${this.atoms.length} 个原子效果`);

    // 按顺序执行每个原子效果
    for (let i = 0; i < this.atoms.length; i++) {
      const atom = this.atoms[i];
      const params = this.atomParams[i];

      // 检查原子效果是否可以在当前时机触发
      if (!atom.canTriggerAt(context.timing)) {
        this.logEffect(`原子效果 ${atom.name} 不能在 ${context.timing} 时机触发，跳过`);
        continue;
      }

      try {
        // 处理条件效果
        if (params.type === 'conditional') {
          const conditionalResults = this.executeConditional(
            atom,
            params as IConditionalParams,
            context
          );
          results.push(...conditionalResults);
        } else {
          // 执行普通原子效果
          const atomResults = atom.execute(context);
          results.push(...atomResults);
        }
      } catch (error) {
        Logger.Error(
          `[${this.effectName}] 执行原子效果 ${atom.name} 失败`,
          error as Error
        );
      }
    }

    this.logEffect(`组合效果执行完成，产生 ${results.length} 个结果`);

    return results;
  }

  /**
   * 执行条件效果
   * 根据条件结果决定执行 then 或 else 分支
   */
  private executeConditional(
    atom: IAtomicEffect,
    params: IConditionalParams,
    context: IEffectContext
  ): IEffectResult[] {
    const results: IEffectResult[] = [];

    // 执行条件检查
    const conditionResults = atom.execute(context);
    results.push(...conditionResults);

    // 获取条件结果
    const conditionMet = conditionResults.some(r => r.success && r.value === 1);

    // 根据条件结果执行相应的原子效果
    const branchParams = conditionMet ? params.then : params.else;

    if (branchParams && branchParams.length > 0) {
      this.logEffect(
        `条件 ${params.condition} ${conditionMet ? '满足' : '不满足'}，执行 ${branchParams.length} 个原子效果`
      );

      // 执行分支中的原子效果
      // 注意：这里需要从工厂创建原子效果实例
      // TODO: 实现原子效果工厂
      this.logEffect('TODO: 实现条件分支中的原子效果执行');
    }

    return results;
  }

  /**
   * 获取所有原子效果
   */
  public getAtoms(): IAtomicEffect[] {
    return this.atoms;
  }

  /**
   * 获取原子效果参数
   */
  public getAtomParams(): IAtomicEffectParams[] {
    return this.atomParams;
  }
}
