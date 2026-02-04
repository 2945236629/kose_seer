import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 克制效果参数接口
 */
export interface IEncoreParams {
  /** 持续回合数 */
  duration: number;
  /** 是否可以被替换打断 */
  canBeInterrupted?: boolean;
}

/**
 * 克制效果 (Encore)
 * 
 * 强制对手连续使用上一次使用的技能。
 * 对手无法切换技能，只能重复使用。
 * 
 * **功能：**
 * - 锁定对手的技能选择
 * - 持续指定回合数
 * - 可选择是否能被替换打断
 * - 如果对手没有上次技能，效果失败
 * 
 * **使用场景：**
 * 
 * 1. **克制技能（Effect_40）**
 *    - 强制对手重复使用上次技能3回合
 *    - 例如：对手使用了"撞击"，接下来3回合只能用"撞击"
 * 
 * 2. **模仿**
 *    - 强制对手重复使用上次技能2回合
 *    - 可以被替换打断
 * 
 * 3. **挑衅**
 *    - 强制对手重复使用上次攻击技能4回合
 *    - 不能被替换打断
 * 
 * **JSON配置示例：**
 * 
 * ```json
 * {
 *   "type": "Encore",
 *   "timing": "AFTER_SKILL",
 *   "params": {
 *     "duration": 3,
 *     "canBeInterrupted": false
 *   }
 * }
 * ```
 * 
 * @category Special
 */
export class Encore extends BaseAtomicEffect {
  private duration: number;
  private canBeInterrupted: boolean;

  constructor(params: IEncoreParams) {
    super(AtomicEffectType.SPECIAL, 'Encore', []);
    this.duration = params.duration;
    this.canBeInterrupted = params.canBeInterrupted !== false;
  }

  public validate(params: any): boolean {
    return params && params.duration !== undefined;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { defender } = context;

    // 检查对手是否有上次使用的技能
    if (!defender.lastMove) {
      return [this.createResult(false, 'defender', 'encore', '克制失败：对手没有上次使用的技能')];
    }

    // 检查对手是否已经被克制
    if (defender.encore && defender.encoreTurns && defender.encoreTurns > 0) {
      return [this.createResult(false, 'defender', 'encore', '克制失败：对手已经被克制')];
    }

    // 应用克制效果
    defender.encore = true;
    defender.encoreTurns = this.duration;
    // defender.encoreSkill = defender.lastMove; // IBattlePet没有此属性

    return [this.createResult(
      true,
      'defender',
      'encore',
      `克制成功：对手被迫使用技能${defender.lastMove}，持续${this.duration}回合`,
      this.duration,
      {
        duration: this.duration,
        lockedSkill: defender.lastMove,
        canBeInterrupted: this.canBeInterrupted
      }
    )];
  }
}
