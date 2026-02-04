import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 累积暴击率提升参数接口
 */
export interface ICumulativeCritBoostParams {
  /** 每次增加的暴击率 */
  critIncrease?: number;
  /** 最大暴击率增加 */
  maxCritIncrease?: number;
}

/**
 * 累积暴击率提升效果
 * 
 * 每次攻击后暴击率递增，直到达到最大值
 * 
 * @category Special
 */
export class CumulativeCritBoost extends BaseAtomicEffect {
  private critIncrease: number;
  private maxCritIncrease: number;
  
  // 追踪每个精灵的累积暴击率
  private cumulativeCrit: Map<number, number> = new Map();

  constructor(params: ICumulativeCritBoostParams) {
    super(AtomicEffectType.SPECIAL, 'CumulativeCritBoost', []);
    this.critIncrease = params.critIncrease || 6.25;
    this.maxCritIncrease = params.maxCritIncrease || 50;
  }

  public validate(params: any): boolean {
    return true;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker } = context;

    // 获取当前累积暴击率
    const currentCrit = this.cumulativeCrit.get(attacker.id) || 0;
    
    // 计算新的暴击率
    const newCrit = Math.min(
      currentCrit + this.critIncrease,
      this.maxCritIncrease
    );

    // 更新累积暴击率
    this.cumulativeCrit.set(attacker.id, newCrit);

    // 应用暴击率提升
    if (context.critRate !== undefined) {
      context.critRate += newCrit;
    }

    return [this.createResult(
      true,
      'attacker',
      'cumulative_crit_boost',
      `累积暴击率提升 +${newCrit.toFixed(2)}%`,
      newCrit,
      {
        critIncrease: this.critIncrease,
        currentCrit: newCrit,
        maxCrit: this.maxCritIncrease,
        isMaxed: newCrit >= this.maxCritIncrease
      }
    )];
  }

  /**
   * 重置累积暴击率（战斗结束或切换精灵时调用）
   */
  public resetCrit(attackerId: number): void {
    this.cumulativeCrit.delete(attackerId);
  }

  /**
   * 获取当前累积暴击率
   */
  public getCurrentCrit(attackerId: number): number {
    return this.cumulativeCrit.get(attackerId) || 0;
  }
}
