import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 加权随机威力参数接口
 */
export interface IWeightedRandomPowerParams {
  /** 威力范围列表 */
  powerRanges: Array<{
    min: number;
    max: number;
    weight: number;
  }>;
}

/**
 * 加权随机威力效果
 * 
 * 按权重随机选择威力范围
 * 
 * @category Special
 * @example
 * // 多段随机威力
 * {
 *   powerRanges: [
 *     { min: 301, max: 350, weight: 0.5 },
 *     { min: 101, max: 300, weight: 0.3 },
 *     { min: 5, max: 100, weight: 0.2 }
 *   ]
 * }
 */
export class WeightedRandomPower extends BaseAtomicEffect {
  private powerRanges: Array<{
    min: number;
    max: number;
    weight: number;
  }>;

  constructor(params: IWeightedRandomPowerParams) {
    super(AtomicEffectType.SPECIAL, 'WeightedRandomPower', []);
    this.powerRanges = params.powerRanges;
  }

  public validate(params: any): boolean {
    if (!this.powerRanges || this.powerRanges.length === 0) {
      return false;
    }

    // 检查权重总和是否为1
    const totalWeight = this.powerRanges.reduce((sum, range) => sum + range.weight, 0);
    return Math.abs(totalWeight - 1) < 0.01;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    // 按权重随机选择范围
    const roll = Math.random();
    let cumulative = 0;
    let selectedRange = this.powerRanges[0];

    for (const range of this.powerRanges) {
      cumulative += range.weight;
      if (roll <= cumulative) {
        selectedRange = range;
        break;
      }
    }

    // 在选中的范围内随机选择威力
    const power = Math.floor(
      Math.random() * (selectedRange.max - selectedRange.min + 1) + selectedRange.min
    );

    return [this.createResult(
      true,
      'attacker',
      'weighted_random_power',
      `加权随机威力（${power}）`,
      power,
      {
        power,
        selectedRange: `${selectedRange.min}-${selectedRange.max}`,
        weight: selectedRange.weight
      }
    )];
  }
}
