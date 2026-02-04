import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 持续每回合改变能力效果参数接口
 */
export interface IContinuousStatChangeParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'continuous_stat_change';
  /** 持续回合数 */
  duration: number;
  /** 能力变化列表 */
  statChanges: Array<{
    stat: number;      // 能力索引 (0-5)
    change: number;    // 变化值
  }>;
  /** 触发时机 */
  timing?: 'TURN_START' | 'TURN_END';
  /** 目标 */
  target?: 'self' | 'opponent';
}

/**
 * 持续每回合改变能力效果
 * 
 * 功能：
 * - X回合内，每回合改变目标的指定能力
 * - 支持多个能力同时变化
 * - 可选择在回合开始或结束时触发
 * 
 * 使用场景：
 * - 效果150: 3回合内，对手每回合防御和特防等级-1
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "continuous_stat_change",
 *   "target": "opponent",
 *   "duration": 3,
 *   "statChanges": [
 *     { "stat": 1, "change": -1 },
 *     { "stat": 3, "change": -1 }
 *   ],
 *   "timing": "TURN_START"
 * }
 * ```
 */
export class ContinuousStatChange extends BaseAtomicEffect {
  private duration: number;
  private statChanges: Array<{ stat: number; change: number }>;
  private timing: 'TURN_START' | 'TURN_END';
  private target: 'self' | 'opponent';

  constructor(params: IContinuousStatChangeParams) {
    super(
      AtomicEffectType.SPECIAL,
      'ContinuousStatChange',
      [EffectTiming.AFTER_SKILL, EffectTiming.TURN_START, EffectTiming.TURN_END]
    );

    this.duration = params.duration;
    this.statChanges = params.statChanges;
    this.timing = params.timing || 'TURN_START';
    this.target = params.target || 'opponent';
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const target = this.target === 'self' ? this.getAttacker(context) : this.getDefender(context);

    // 在AFTER_SKILL时机设置效果
    if (context.timing === EffectTiming.AFTER_SKILL) {
      if (!target.effectCounters) {
        target.effectCounters = {};
      }

      // 存储持续效果信息（使用特殊命名的计数器）
      target.effectCounters['continuous_stat_change'] = this.duration;
      // 将每个能力变化存储为独立的计数器
      for (let i = 0; i < this.statChanges.length; i++) {
        const change = this.statChanges[i];
        target.effectCounters[`continuous_stat_${i}_stat`] = change.stat;
        target.effectCounters[`continuous_stat_${i}_change`] = change.change;
      }
      target.effectCounters['continuous_stat_count'] = this.statChanges.length;
      target.effectCounters['continuous_stat_timing'] = this.timing === 'TURN_START' ? 1 : 2;

      results.push(
        this.createResult(
          true,
          this.target === 'self' ? 'attacker' : 'defender',
          'continuous_stat_change',
          `持续能力变化状态！持续${this.duration}回合`,
          this.duration,
          { statChanges: this.statChanges }
        )
      );

      this.log(`持续能力变化: ${this.statChanges.length}个能力, 持续${this.duration}回合`);
    }

    // 在指定时机触发能力变化
    const shouldTrigger = 
      (this.timing === 'TURN_START' && context.timing === EffectTiming.TURN_START) ||
      (this.timing === 'TURN_END' && context.timing === EffectTiming.TURN_END);

    if (shouldTrigger && target.effectCounters?.['continuous_stat_change']) {
      const count = target.effectCounters['continuous_stat_count'] || 0;
      if (count > 0) {
        // 重建能力变化列表
        const statChanges: Array<{ stat: number; change: number }> = [];
        for (let i = 0; i < count; i++) {
          const stat = target.effectCounters[`continuous_stat_${i}_stat`] || 0;
          const change = target.effectCounters[`continuous_stat_${i}_change`] || 0;
          statChanges.push({ stat, change });
        }

        // 初始化battleLv
        if (!target.battleLv) {
          target.battleLv = [0, 0, 0, 0, 0, 0];
        }

        // 应用能力变化
        for (const change of statChanges) {
          const oldLevel = target.battleLv[change.stat];
          target.battleLv[change.stat] = Math.max(-6, Math.min(6, oldLevel + change.change));

          results.push(
            this.createResult(
              true,
              this.target === 'self' ? 'attacker' : 'defender',
              'stat_change',
              `能力${change.stat}变化${change.change > 0 ? '+' : ''}${change.change}！`,
              change.change,
              { statIndex: change.stat, oldLevel, newLevel: target.battleLv[change.stat] }
            )
          );

          this.log(`持续能力变化触发: 能力${change.stat} ${oldLevel} -> ${target.battleLv[change.stat]}`);
        }

        // 递减计数器
        target.effectCounters['continuous_stat_change']--;
        if (target.effectCounters['continuous_stat_change'] <= 0) {
          delete target.effectCounters['continuous_stat_change'];
          const count = target.effectCounters['continuous_stat_count'] || 0;
          for (let i = 0; i < count; i++) {
            delete target.effectCounters[`continuous_stat_${i}_stat`];
            delete target.effectCounters[`continuous_stat_${i}_change`];
          }
          delete target.effectCounters['continuous_stat_count'];
          delete target.effectCounters['continuous_stat_timing'];

          results.push(
            this.createResult(
              true,
              this.target === 'self' ? 'attacker' : 'defender',
              'continuous_stat_change_end',
              `持续能力变化状态解除！`,
              0
            )
          );

          this.log(`持续能力变化状态解除`);
        }
      }
    }

    return results;
  }

  public validate(params: any): boolean {
    if (params.duration === undefined || params.duration < 1) {
      this.log('duration必须大于0', 'error');
      return false;
    }
    if (!params.statChanges || params.statChanges.length === 0) {
      this.log('statChanges不能为空', 'error');
      return false;
    }
    return true;
  }
}
