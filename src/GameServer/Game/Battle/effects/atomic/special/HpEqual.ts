import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 同生共死参数接口
 */
export interface IHpEqualParams {
  /** 目标HP设置模式 */
  mode: 'equal_to_self' | 'equal_to_opponent' | 'average';
  /** 是否可以超过最大HP */
  canExceedMax?: boolean;
}

/**
 * 同生共死效果 (HpEqual)
 * 
 * 使双方的HP变为相同值。
 * 可以选择不同的计算模式。
 * 
 * **功能：**
 * - equal_to_self: 对手HP变为自己的HP
 * - equal_to_opponent: 自己HP变为对手的HP
 * - average: 双方HP变为平均值
 * - 可选择是否能超过最大HP
 * 
 * **使用场景：**
 * 
 * 1. **同生共死技能（Effect_41）**
 *    - 对手HP变为自己的HP
 *    - 例如：自己50 HP，对手200 HP → 对手变为50 HP
 * 
 * 2. **生命共享**
 *    - 双方HP变为平均值
 *    - 例如：自己50 HP，对手200 HP → 双方都变为125 HP
 * 
 * 3. **生命转移**
 *    - 自己HP变为对手的HP
 *    - 例如：自己50 HP，对手200 HP → 自己变为200 HP
 * 
 * **JSON配置示例：**
 * 
 * ```json
 * {
 *   "type": "HpEqual",
 *   "timing": "AFTER_SKILL",
 *   "params": {
 *     "mode": "equal_to_self",
 *     "canExceedMax": false
 *   }
 * }
 * ```
 * 
 * @category Special
 */
export class HpEqual extends BaseAtomicEffect {
  private mode: 'equal_to_self' | 'equal_to_opponent' | 'average';
  private canExceedMax: boolean;

  constructor(params: IHpEqualParams) {
    super(AtomicEffectType.SPECIAL, 'HpEqual', []);
    this.mode = params.mode;
    this.canExceedMax = params.canExceedMax || false;
  }

  public validate(params: any): boolean {
    return params && params.mode;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker, defender } = context;
    const oldAttackerHp = attacker.hp;
    const oldDefenderHp = defender.hp;

    let targetHp = 0;

    // 计算目标HP
    switch (this.mode) {
      case 'equal_to_self':
        targetHp = attacker.hp;
        defender.hp = this.canExceedMax ? targetHp : Math.min(defender.maxHp, targetHp);
        break;

      case 'equal_to_opponent':
        targetHp = defender.hp;
        attacker.hp = this.canExceedMax ? targetHp : Math.min(attacker.maxHp, targetHp);
        break;

      case 'average':
        targetHp = Math.floor((attacker.hp + defender.hp) / 2);
        attacker.hp = this.canExceedMax ? targetHp : Math.min(attacker.maxHp, targetHp);
        defender.hp = this.canExceedMax ? targetHp : Math.min(defender.maxHp, targetHp);
        break;
    }

    // 确保HP不低于0
    attacker.hp = Math.max(0, attacker.hp);
    defender.hp = Math.max(0, defender.hp);

    return [this.createResult(
      true,
      'both',
      'hp_equal',
      `同生共死：HP变为${targetHp}`,
      targetHp,
      {
        mode: this.mode,
        targetHp,
        attackerHpChange: attacker.hp - oldAttackerHp,
        defenderHpChange: defender.hp - oldDefenderHp,
        attackerHp: attacker.hp,
        defenderHp: defender.hp
      }
    )];
  }
}
