import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 牺牲固定伤害参数接口
 */
export interface ISacrificeDamageParams {
  /** 最小伤害 */
  minDamage: number;
  /** 最大伤害 */
  maxDamage: number;
  /** 是否留1HP */
  leaveOneHp?: boolean;
}

/**
 * 牺牲固定伤害效果
 * 
 * 牺牲全部体力造成固定伤害，致命伤害时对手剩下1HP
 * 
 * @category Special
 * @example
 * // 牺牲固定伤害
 * {
 *   minDamage: 250,
 *   maxDamage: 300,
 *   leaveOneHp: true
 * }
 */
export class SacrificeDamage extends BaseAtomicEffect {
  private minDamage: number;
  private maxDamage: number;
  private leaveOneHp: boolean;

  constructor(params: ISacrificeDamageParams) {
    super(AtomicEffectType.SPECIAL, 'SacrificeDamage', []);
    this.minDamage = params.minDamage;
    this.maxDamage = params.maxDamage;
    this.leaveOneHp = params.leaveOneHp !== false;
  }

  public validate(params: any): boolean {
    return this.minDamage > 0 && this.maxDamage >= this.minDamage;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker, defender } = context;

    // 牺牲攻击者全部HP
    attacker.hp = 0;

    // 计算随机伤害
    const damage = Math.floor(Math.random() * (this.maxDamage - this.minDamage + 1)) + this.minDamage;

    // 应用伤害
    let actualDamage = damage;
    if (this.leaveOneHp && damage >= defender.hp) {
      // 致命伤害时留1HP
      actualDamage = defender.hp - 1;
    }

    defender.hp = Math.max(1, defender.hp - actualDamage);

    return [this.createResult(
      true,
      'both',
      'sacrifice_damage',
      `牺牲固定伤害（${actualDamage}点）`,
      actualDamage,
      {
        sacrificed: true,
        damage: actualDamage,
        leaveOneHp: this.leaveOneHp
      }
    )];
  }
}
