import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 选择目标回复参数接口
 */
export interface ISelectiveHealParams {
  /** 回复比例 */
  healRatio: number;
  /** 目标选择 */
  targetSelection: 'self' | 'ally' | 'all_allies';
}

/**
 * 选择目标回复效果
 * 
 * 对选中对象或本方全体恢复体力
 * 
 * @category Special
 * @example
 * // 选择目标回复
 * {
 *   healRatio: 0.5,
 *   targetSelection: 'self'
 * }
 */
export class SelectiveHeal extends BaseAtomicEffect {
  private healRatio: number;
  private targetSelection: string;

  constructor(params: ISelectiveHealParams) {
    super(AtomicEffectType.SPECIAL, 'SelectiveHeal', []);
    this.healRatio = params.healRatio;
    this.targetSelection = params.targetSelection;
  }

  public validate(params: any): boolean {
    return this.healRatio > 0;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker } = context;

    // 计算回复量
    const healAmount = Math.floor(attacker.maxHp * this.healRatio);

    // 应用回复
    const beforeHp = attacker.hp;
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmount);
    const actualHeal = attacker.hp - beforeHp;

    return [this.createResult(
      actualHeal > 0,
      'attacker',
      'selective_heal',
      `选择目标回复（${actualHeal}HP）`,
      actualHeal,
      {
        healAmount: actualHeal,
        targetSelection: this.targetSelection
      }
    )];
  }
}
