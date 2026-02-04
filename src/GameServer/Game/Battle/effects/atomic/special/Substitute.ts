import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 替身效果参数接口
 */
export interface ISubstituteParams {
  /** 替身HP（基于自己最大HP的百分比） */
  hpPercent: number;
  /** 是否可以被暴击 */
  canBeCrit?: boolean;
  /** 是否可以被状态效果影响 */
  canBeStatused?: boolean;
}

/**
 * 替身效果 (Substitute)
 * 
 * 消耗自己的HP创建替身，替身代替自己承受伤害。
 * 
 * **注意：这是占位实现，需要扩展IBattlePet接口才能完整实现**
 * 
 * @category Special
 */
export class Substitute extends BaseAtomicEffect {
  private hpPercent: number;
  private canBeCrit: boolean;
  private canBeStatused: boolean;

  constructor(params: ISubstituteParams) {
    super(AtomicEffectType.SPECIAL, 'Substitute', []);
    this.hpPercent = params.hpPercent;
    this.canBeCrit = params.canBeCrit || false;
    this.canBeStatused = params.canBeStatused || false;
  }

  public validate(params: any): boolean {
    return params && params.hpPercent !== undefined;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker } = context;

    // 计算替身HP
    const substituteHp = Math.floor(attacker.maxHp * this.hpPercent);

    // 检查自己HP是否足够
    if (attacker.hp <= substituteHp) {
      return [this.createResult(
        false,
        'attacker',
        'substitute',
        '替身失败：HP不足'
      )];
    }

    // 消耗HP（简化实现）
    attacker.hp -= substituteHp;

    // TODO: 需要在IBattlePet中添加substitute相关属性才能完整实现
    // attacker.substitute = true;
    // attacker.substituteHp = substituteHp;

    return [this.createResult(
      true,
      'attacker',
      'substitute',
      `替身成功：创建${substituteHp} HP的替身（简化实现）`,
      substituteHp,
      {
        substituteHp,
        hpCost: substituteHp,
        remainingHp: attacker.hp,
        canBeCrit: this.canBeCrit,
        canBeStatused: this.canBeStatused
      }
    )];
  }
}
