import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 能力提升反转参数接口
 */
export interface IStatBoostReversalParams {
  /** 目标（self/opponent） */
  target?: string;
}

/**
 * 能力提升反转效果
 * 
 * 将目标的所有能力提升变为能力下降
 * 
 * @category Special
 */
export class StatBoostReversal extends BaseAtomicEffect {
  private target: string;

  constructor(params: IStatBoostReversalParams) {
    super(AtomicEffectType.SPECIAL, 'StatBoostReversal', []);
    this.target = params.target || 'opponent';
  }

  public validate(params: any): boolean {
    return true;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker, defender } = context;
    const targetPet = this.target === 'self' ? attacker : defender;

    let reversedCount = 0;

    // 反转所有能力提升
    if (targetPet.battleLevels) {
      for (let i = 0; i < targetPet.battleLevels.length; i++) {
        if (targetPet.battleLevels[i] > 0) {
          targetPet.battleLevels[i] = -targetPet.battleLevels[i];
          reversedCount++;
        }
      }
    }

    return [this.createResult(
      reversedCount > 0,
      this.target === 'self' ? 'attacker' : 'defender',
      'stat_boost_reversal',
      `能力提升反转（${reversedCount}个能力）`,
      reversedCount,
      {
        target: this.target,
        reversedCount
      }
    )];
  }
}
