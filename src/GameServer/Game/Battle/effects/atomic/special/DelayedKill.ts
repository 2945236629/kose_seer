import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 延迟秒杀效果参数接口
 */
export interface IDelayedKillParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'delayed_kill';
  /** 延迟回合数 */
  delay: number;
  /** 是否可以被治疗解除（可选，默认false） */
  canBeHealed?: boolean;
}

/**
 * 延迟秒杀效果
 * 
 * 功能：
 * - 在N回合后击倒目标
 * - 可选择是否可以通过治疗解除
 * - 倒计时显示
 * 
 * 使用场景：
 * - 灭亡之歌（3回合后击倒）
 * - 诅咒（5回合后击倒）
 * - 死亡宣告（固定回合后击倒）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "delayed_kill",
 *   "delay": 3,
 *   "canBeHealed": false
 * }
 * ```
 * 
 * 状态数据结构：
 * ```typescript
 * {
 *   remainingTurns: number;     // 剩余回合数
 *   isActive: boolean;          // 是否激活
 *   canBeHealed: boolean;       // 是否可治疗解除
 * }
 * ```
 */
export class DelayedKill extends BaseAtomicEffect {
  private delay: number;
  private canBeHealed: boolean;

  constructor(params: IDelayedKillParams) {
    super(
      AtomicEffectType.SPECIAL,
      'DelayedKill',
      [EffectTiming.AFTER_SKILL, EffectTiming.TURN_END, EffectTiming.ON_HP_CHANGE]
    );

    this.delay = params.delay;
    this.canBeHealed = params.canBeHealed ?? false;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const defender = this.getDefender(context);

    // 在AFTER_SKILL时机设置延迟秒杀
    if (context.timing === EffectTiming.AFTER_SKILL) {
      const killState = this.getKillState(defender);
      killState.isActive = true;
      killState.remainingTurns = this.delay;
      killState.canBeHealed = this.canBeHealed;

      results.push(
        this.createResult(
          true,
          'defender',
          'delayed_kill_set',
          `被施加了延迟秒杀！${this.delay}回合后将被击倒`,
          this.delay
        )
      );

      this.log(`延迟秒杀设置: ${this.delay}回合后击倒`);
    }

    // 在TURN_END时机倒计时
    if (context.timing === EffectTiming.TURN_END) {
      const killState = this.getKillState(defender);

      if (killState.isActive) {
        killState.remainingTurns--;

        if (killState.remainingTurns > 0) {
          results.push(
            this.createResult(
              true,
              'defender',
              'delayed_kill_countdown',
              `延迟秒杀倒计时：${killState.remainingTurns}回合`,
              killState.remainingTurns
            )
          );
        } else {
          // 时间到，击倒目标
          defender.hp = 0;
          killState.isActive = false;

          results.push(
            this.createResult(
              true,
              'defender',
              'delayed_kill_execute',
              `延迟秒杀生效！被击倒了`,
              0
            )
          );

          this.log(`延迟秒杀生效: 目标被击倒`);
        }
      }
    }

    // 在ON_HP_CHANGE时机检查是否被治疗解除
    if (context.timing === EffectTiming.ON_HP_CHANGE && this.canBeHealed) {
      const killState = this.getKillState(defender);

      if (killState.isActive) {
        const currentHp = defender.hp ?? 0;
        const maxHp = defender.maxHp ?? 0;

        // 如果HP回满，解除延迟秒杀
        if (currentHp >= maxHp) {
          killState.isActive = false;

          results.push(
            this.createResult(
              true,
              'defender',
              'delayed_kill_removed',
              `延迟秒杀被解除了！`,
              0
            )
          );

          this.log(`延迟秒杀解除: HP回满`);
        }
      }
    }

    return results;
  }

  public validate(params: any): boolean {
    if (params.delay === undefined || params.delay < 1) {
      this.log('delay必须至少为1', 'error');
      return false;
    }
    return true;
  }

  /**
   * 获取秒杀状态
   */
  private getKillState(pet: any): {
    remainingTurns: number;
    isActive: boolean;
    canBeHealed: boolean;
  } {
    if (!pet.effectStates) {
      pet.effectStates = {};
    }
    if (!pet.effectStates.delayedKill) {
      pet.effectStates.delayedKill = {
        remainingTurns: 0,
        isActive: false,
        canBeHealed: false
      };
    }
    return pet.effectStates.delayedKill;
  }
}
