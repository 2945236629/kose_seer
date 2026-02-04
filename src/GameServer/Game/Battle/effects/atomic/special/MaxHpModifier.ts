import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 最大HP修正效果参数接口
 */
export interface IMaxHpModifierParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'max_hp_modifier';
  /** 目标（self=自己，opponent=对手） */
  target: 'self' | 'opponent';
  /** 修正模式（multiply=倍率，add=加值，set=设置） */
  mode: 'multiply' | 'add' | 'set';
  /** 修正值 */
  value: number;
  /** 持续回合数（可选，默认永久） */
  duration?: number;
  /** 是否同时回复HP（可选，默认false） */
  healToNew?: boolean;
}

/**
 * 最大HP修正效果
 * 
 * 功能：
 * - 修改目标的最大HP值
 * - 支持倍率、加值、设置三种模式
 * - 可设置持续回合数或永久生效
 * - 可选择是否同时回复HP到新的最大值
 * 
 * 使用场景：
 * - 巨大化（最大HP翻倍）
 * - 虚弱（最大HP减半）
 * - HP强化（最大HP+100）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "max_hp_modifier",
 *   "target": "self",
 *   "mode": "multiply",
 *   "value": 2.0,
 *   "duration": 5,
 *   "healToNew": true
 * }
 * ```
 * 
 * 状态数据结构：
 * ```typescript
 * {
 *   originalMaxHp: number;      // 原始最大HP
 *   modifiedMaxHp: number;      // 修正后最大HP
 *   remainingTurns?: number;    // 剩余回合数
 *   isModified: boolean;        // 是否已修正
 * }
 * ```
 */
export class MaxHpModifier extends BaseAtomicEffect {
  private target: 'self' | 'opponent';
  private mode: 'multiply' | 'add' | 'set';
  private value: number;
  private duration?: number;
  private healToNew: boolean;

  constructor(params: IMaxHpModifierParams) {
    super(
      AtomicEffectType.SPECIAL,
      'MaxHpModifier',
      [EffectTiming.AFTER_SKILL, EffectTiming.TURN_END]
    );

    this.target = params.target;
    this.mode = params.mode;
    this.value = params.value;
    this.duration = params.duration;
    this.healToNew = params.healToNew ?? false;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const targetPet = this.getTarget(context, this.target);

    // 在AFTER_SKILL时机执行修正
    if (context.timing === EffectTiming.AFTER_SKILL) {
      const originalMaxHp = targetPet.maxHp ?? 0;
      let newMaxHp = originalMaxHp;

      // 计算新的最大HP
      switch (this.mode) {
        case 'multiply':
          newMaxHp = Math.floor(originalMaxHp * this.value);
          break;
        case 'add':
          newMaxHp = originalMaxHp + this.value;
          break;
        case 'set':
          newMaxHp = this.value;
          break;
      }

      // 确保最大HP至少为1
      newMaxHp = Math.max(1, newMaxHp);

      // 应用最大HP修正
      targetPet.maxHp = newMaxHp;

      // 记录修正状态
      this.setModifierState(targetPet, originalMaxHp, newMaxHp, this.duration);

      // 如果需要，回复HP到新的最大值
      if (this.healToNew) {
        const currentHp = targetPet.hp ?? 0;
        const hpDiff = newMaxHp - currentHp;
        if (hpDiff > 0) {
          targetPet.hp = newMaxHp;
          results.push(
            this.createResult(
              true,
              this.target === 'self' ? 'attacker' : 'defender',
              'heal',
              `HP回复了${hpDiff}！`,
              hpDiff
            )
          );
        }
      } else {
        // 如果当前HP超过新的最大HP，调整当前HP
        const currentHp = targetPet.hp ?? 0;
        if (currentHp > newMaxHp) {
          targetPet.hp = newMaxHp;
        }
      }

      results.push(
        this.createResult(
          true,
          this.target === 'self' ? 'attacker' : 'defender',
          'max_hp_modifier',
          `最大HP变为${newMaxHp}！`,
          newMaxHp,
          {
            originalMaxHp,
            newMaxHp,
            mode: this.mode,
            value: this.value,
            duration: this.duration
          }
        )
      );

      this.log(
        `最大HP修正: ${this.target === 'self' ? '自己' : '对手'}的最大HP ` +
        `${originalMaxHp}→${newMaxHp} (${this.mode}: ${this.value})`
      );
    }

    // 在TURN_END时机检查持续时间
    if (context.timing === EffectTiming.TURN_END) {
      const modifierState = this.getModifierState(targetPet);

      if (modifierState.isModified && modifierState.remainingTurns !== undefined) {
        modifierState.remainingTurns--;
        if (modifierState.remainingTurns <= 0) {
          // 恢复原始最大HP
          targetPet.maxHp = modifierState.originalMaxHp;
          modifierState.isModified = false;

          // 如果当前HP超过原始最大HP，调整当前HP
          const currentHp = targetPet.hp ?? 0;
          if (currentHp > modifierState.originalMaxHp) {
            targetPet.hp = modifierState.originalMaxHp;
          }

          results.push(
            this.createResult(
              true,
              this.target === 'self' ? 'attacker' : 'defender',
              'max_hp_restore',
              `最大HP恢复了！`,
              modifierState.originalMaxHp
            )
          );

          this.log(
            `最大HP恢复: ${this.target === 'self' ? '自己' : '对手'}的最大HP ` +
            `${modifierState.modifiedMaxHp}→${modifierState.originalMaxHp}`
          );
        }
      }
    }

    return results;
  }

  public validate(params: any): boolean {
    if (!['self', 'opponent'].includes(params.target)) {
      this.log('target必须是self或opponent', 'error');
      return false;
    }
    if (!['multiply', 'add', 'set'].includes(params.mode)) {
      this.log('mode必须是multiply、add或set', 'error');
      return false;
    }
    if (params.value === undefined) {
      this.log('value是必需参数', 'error');
      return false;
    }
    if (params.mode === 'multiply' && params.value <= 0) {
      this.log('multiply模式的value必须大于0', 'error');
      return false;
    }
    if (params.mode === 'set' && params.value < 1) {
      this.log('set模式的value必须至少为1', 'error');
      return false;
    }
    return true;
  }

  /**
   * 获取修正状态
   */
  private getModifierState(pet: any): {
    originalMaxHp: number;
    modifiedMaxHp: number;
    remainingTurns?: number;
    isModified: boolean;
  } {
    if (!pet.effectStates) {
      pet.effectStates = {};
    }
    if (!pet.effectStates.maxHpModifier) {
      pet.effectStates.maxHpModifier = {
        originalMaxHp: pet.maxHp ?? 0,
        modifiedMaxHp: pet.maxHp ?? 0,
        isModified: false
      };
    }
    return pet.effectStates.maxHpModifier;
  }

  /**
   * 设置修正状态
   */
  private setModifierState(pet: any, originalMaxHp: number, modifiedMaxHp: number, duration?: number): void {
    const state = this.getModifierState(pet);
    state.originalMaxHp = originalMaxHp;
    state.modifiedMaxHp = modifiedMaxHp;
    state.isModified = true;
    if (duration !== undefined) {
      state.remainingTurns = duration;
    }
  }
}
