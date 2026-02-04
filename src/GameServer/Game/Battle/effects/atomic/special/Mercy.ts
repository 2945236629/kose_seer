import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 手下留情参数接口
 */
export interface IMercyParams {
  /** 保留的HP值 */
  remainingHp?: number;
  /** 是否总是生效 */
  alwaysActive?: boolean;
}

/**
 * 手下留情效果 (Mercy)
 * 
 * 攻击不会导致对手HP降至0，至少保留1 HP。
 * 
 * @category Special
 */
export class Mercy extends BaseAtomicEffect {
  private remainingHp: number;
  private alwaysActive: boolean;

  constructor(params: IMercyParams) {
    super(AtomicEffectType.SPECIAL, 'Mercy', []);
    this.remainingHp = params.remainingHp || 1;
    this.alwaysActive = params.alwaysActive !== false;
  }

  public validate(params: any): boolean {
    return true;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { defender } = context;

    // 检查对手HP是否已经降至0或以下
    if (defender.hp <= 0) {
      defender.hp = this.remainingHp;

      return [this.createResult(
        true,
        'defender',
        'mercy',
        `手下留情：对手HP保留${this.remainingHp}点`,
        this.remainingHp,
        {
          remainingHp: this.remainingHp,
          savedFromKo: true
        }
      )];
    }

    // 如果总是生效，确保HP不低于指定值
    if (this.alwaysActive && defender.hp < this.remainingHp) {
      defender.hp = this.remainingHp;

      return [this.createResult(
        true,
        'defender',
        'mercy',
        `手下留情：对手HP保留${this.remainingHp}点`,
        this.remainingHp,
        {
          remainingHp: this.remainingHp,
          savedFromKo: false
        }
      )];
    }

    return [this.createResult(
      false,
      'defender',
      'mercy',
      '手下留情：对手HP正常'
    )];
  }
}
