import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 反作用力参数接口
 */
export interface IRecoilParams {
  /** 反作用力模式 */
  mode: 'damage_percent' | 'max_hp_percent' | 'fixed';
  /** 反作用力比例/数值 */
  value: number;
  /** 是否可以导致自己昏厥 */
  canKo?: boolean;
}

/**
 * 反作用力效果 (Recoil)
 * 
 * 使用技能后，自己受到反作用力伤害。
 * 伤害可以基于造成的伤害、最大HP或固定值。
 * 
 * **功能：**
 * - damage_percent: 基于造成伤害的百分比
 * - max_hp_percent: 基于自己最大HP的百分比
 * - fixed: 固定伤害
 * - 可选择是否能导致自己昏厥
 * 
 * **使用场景：**
 * 
 * 1. **猛撞类技能（Effect_11）**
 *    - 造成伤害的1/4反作用力
 *    - 例如：造成100伤害，自己受到25伤害
 * 
 * 2. **舍身冲撞**
 *    - 造成伤害的1/3反作用力
 *    - 例如：造成120伤害，自己受到40伤害
 * 
 * 3. **爆炸类技能**
 *    - 自己最大HP的50%反作用力
 *    - 可以导致自己昏厥
 * 
 * 4. **心灵冲击**
 *    - 固定50点反作用力
 * 
 * **JSON配置示例：**
 * 
 * ```json
 * {
 *   "type": "Recoil",
 *   "timing": "AFTER_SKILL",
 *   "params": {
 *     "mode": "damage_percent",
 *     "value": 0.25,
 *     "canKo": false
 *   }
 * }
 * ```
 * 
 * @category Special
 */
export class Recoil extends BaseAtomicEffect {
  private mode: 'damage_percent' | 'max_hp_percent' | 'fixed';
  private value: number;
  private canKo: boolean;

  constructor(params: IRecoilParams) {
    super(AtomicEffectType.SPECIAL, 'Recoil', []);
    this.mode = params.mode;
    this.value = params.value;
    this.canKo = params.canKo !== false;
  }

  public validate(params: any): boolean {
    return params && params.mode && params.value !== undefined;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker, damage } = context;
    let recoilDamage = 0;

    // 计算反作用力伤害
    switch (this.mode) {
      case 'damage_percent':
        recoilDamage = Math.floor(damage * this.value);
        break;

      case 'max_hp_percent':
        recoilDamage = Math.floor(attacker.maxHp * this.value);
        break;

      case 'fixed':
        recoilDamage = this.value;
        break;
    }

    // 应用反作用力
    if (recoilDamage > 0) {
      const oldHp = attacker.hp;
      
      if (this.canKo) {
        // 可以导致昏厥
        attacker.hp = Math.max(0, attacker.hp - recoilDamage);
      } else {
        // 不能导致昏厥，至少保留1HP
        attacker.hp = Math.max(1, attacker.hp - recoilDamage);
      }

      const actualDamage = oldHp - attacker.hp;

      return [this.createResult(
        true,
        'attacker',
        'recoil',
        `反作用力：自己受到${actualDamage}点伤害`,
        actualDamage,
        {
          recoilDamage: actualDamage,
          mode: this.mode,
          canKo: this.canKo,
          remainingHp: attacker.hp
        }
      )];
    }

    return [this.createResult(
      false,
      'attacker',
      'recoil',
      '反作用力：无伤害'
    )];
  }
}
