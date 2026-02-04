import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 吸血参数接口
 */
export interface IAbsorbParams {
  /** 吸血比例（基于造成的伤害） */
  percent: number;
  /** 最小吸血量 */
  minHeal?: number;
  /** 最大吸血量 */
  maxHeal?: number;
}

/**
 * 吸血效果 (Absorb)
 * 
 * 根据造成的伤害回复自己的HP。
 * 可以设置最小和最大回复量。
 * 
 * **功能：**
 * - 基于伤害的百分比回复
 * - 设置最小回复量（保底）
 * - 设置最大回复量（上限）
 * - 不能超过最大HP
 * 
 * **使用场景：**
 * 
 * 1. **吸血类技能（Effect_12）**
 *    - 回复造成伤害的50%
 *    - 例如：造成100伤害，回复50 HP
 * 
 * 2. **终极吸取**
 *    - 回复造成伤害的75%
 *    - 例如：造成120伤害，回复90 HP
 * 
 * 3. **吸血鬼之牙**
 *    - 回复造成伤害的100%
 *    - 最少回复10 HP
 * 
 * 4. **生命汲取**
 *    - 回复造成伤害的50%
 *    - 最多回复100 HP
 * 
 * **JSON配置示例：**
 * 
 * ```json
 * {
 *   "type": "Absorb",
 *   "timing": "AFTER_DAMAGE_APPLY",
 *   "params": {
 *     "percent": 0.5,
 *     "minHeal": 1,
 *     "maxHeal": 999
 *   }
 * }
 * ```
 * 
 * @category Special
 */
export class Absorb extends BaseAtomicEffect {
  private percent: number;
  private minHeal: number;
  private maxHeal: number;

  constructor(params: IAbsorbParams) {
    super(AtomicEffectType.SPECIAL, 'Absorb', []);
    this.percent = params.percent;
    this.minHeal = params.minHeal || 0;
    this.maxHeal = params.maxHeal || 999;
  }

  public validate(params: any): boolean {
    return params && params.percent !== undefined;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker, damage } = context;

    // 如果没有造成伤害，不吸血
    if (damage <= 0) {
      return [this.createResult(false, 'attacker', 'absorb', '吸血失败：未造成伤害')];
    }

    // 计算吸血量
    let healAmount = Math.floor(damage * this.percent);

    // 应用最小和最大限制
    healAmount = Math.max(this.minHeal, Math.min(this.maxHeal, healAmount));

    // 回复HP（不能超过最大HP）
    const oldHp = attacker.hp;
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmount);
    const actualHeal = attacker.hp - oldHp;

    if (actualHeal > 0) {
      return [this.createResult(
        true,
        'attacker',
        'absorb',
        `吸血：回复${actualHeal} HP`,
        actualHeal,
        {
          healAmount: actualHeal,
          percent: this.percent,
          baseDamage: damage,
          remainingHp: attacker.hp
        }
      )];
    }

    return [this.createResult(false, 'attacker', 'absorb', '吸血失败：HP已满')];
  }
}
