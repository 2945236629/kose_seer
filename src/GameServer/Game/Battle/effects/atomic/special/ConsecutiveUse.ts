import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 连续使用参数接口
 */
export interface IConsecutiveUseParams {
  /** 每次使用增加的威力 */
  incrementPerUse: number;
  /** 最大增加威力 */
  maxIncrement: number;
  /** 是否重置计数（切换技能时） */
  resetOnSwitch?: boolean;
}

/**
 * 连续使用效果 (ConsecutiveUse)
 * 
 * 连续使用同一技能时，威力逐渐增加。
 * 
 * @category Special
 */
export class ConsecutiveUse extends BaseAtomicEffect {
  private incrementPerUse: number;
  private maxIncrement: number;
  private resetOnSwitch: boolean;

  // 静态存储：记录每个精灵的连续使用次数
  private static consecutiveUseCount: Map<string, number> = new Map();

  constructor(params: IConsecutiveUseParams) {
    super(AtomicEffectType.SPECIAL, 'ConsecutiveUse', []);
    this.incrementPerUse = params.incrementPerUse;
    this.maxIncrement = params.maxIncrement;
    this.resetOnSwitch = params.resetOnSwitch !== false;
  }

  public validate(params: any): boolean {
    return params && params.incrementPerUse !== undefined;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker, skillId } = context;
    const key = `${attacker.id}_${skillId}`;

    // 获取当前连续使用次数
    let useCount = ConsecutiveUse.consecutiveUseCount.get(key) || 0;

    // 检查是否切换了技能
    if (this.resetOnSwitch && attacker.lastMove && attacker.lastMove !== skillId) {
      useCount = 0;
    }

    // 增加使用次数
    useCount++;
    ConsecutiveUse.consecutiveUseCount.set(key, useCount);

    // 计算威力增加（第1次不增加，从第2次开始）
    const powerBonus = Math.min(
      (useCount - 1) * this.incrementPerUse,
      this.maxIncrement
    );

    // 修改技能威力
    if (context.skill && powerBonus > 0) {
      context.skill.power = (context.skill.power || 0) + powerBonus;
    }

    // 记录最后使用的技能
    attacker.lastMove = skillId;

    return [this.createResult(
      true,
      'attacker',
      'power_boost',
      `连续使用第${useCount}次，威力+${powerBonus}`,
      powerBonus,
      {
        useCount,
        powerBonus,
        maxReached: powerBonus >= this.maxIncrement
      }
    )];
  }

  /**
   * 重置指定精灵的连续使用计数
   */
  public static resetCount(petId: number, skillId?: number): void {
    if (skillId) {
      const key = `${petId}_${skillId}`;
      this.consecutiveUseCount.delete(key);
    } else {
      const keysToDelete: string[] = [];
      for (const key of this.consecutiveUseCount.keys()) {
        if (key.startsWith(`${petId}_`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.consecutiveUseCount.delete(key));
    }
  }

  /**
   * 清空所有连续使用计数（战斗结束时调用）
   */
  public static clearAll(): void {
    this.consecutiveUseCount.clear();
  }
}
