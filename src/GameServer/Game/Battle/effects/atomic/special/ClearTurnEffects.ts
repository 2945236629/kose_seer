import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 清除回合效果参数接口
 */
export interface IClearTurnEffectsParams {
  /** 目标（self/opponent） */
  target?: string;
}

/**
 * 清除回合效果
 * 
 * 清除目标所有的临时回合效果（光环、护盾等）
 * 
 * @category Special
 */
export class ClearTurnEffects extends BaseAtomicEffect {
  private target: string;

  constructor(params: IClearTurnEffectsParams) {
    super(AtomicEffectType.SPECIAL, 'ClearTurnEffects', []);
    this.target = params.target || 'opponent';
  }

  public validate(params: any): boolean {
    return true;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker, defender } = context;
    const targetPet = this.target === 'self' ? attacker : defender;

    // 简化实现：标记清除回合效果
    // 实际的清除逻辑需要在战斗系统中实现
    return [this.createResult(
      true,
      this.target === 'self' ? 'attacker' : 'defender',
      'clear_turn_effects',
      `清除回合效果`,
      1,
      {
        target: this.target
      }
    )];
  }
}
