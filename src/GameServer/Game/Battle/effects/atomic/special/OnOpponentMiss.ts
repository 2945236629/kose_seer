import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 对方Miss触发效果参数接口
 */
export interface IOnOpponentMissParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'on_opponent_miss';
  /** 持续回合数 */
  duration: number;
  /** 触发的效果类型 */
  effect: 'focus_energy' | 'stat_boost' | 'heal';
  /** 效果持续时间 */
  effectDuration?: number;
  /** 能力索引（effect='stat_boost'时） */
  statIndex?: number;
  /** 能力变化值（effect='stat_boost'时） */
  statChange?: number;
  /** 回复量（effect='heal'时） */
  healAmount?: number;
}

/**
 * 对方Miss触发效果
 * 
 * 功能：
 * - X回合内，若对手MISS则触发指定效果
 * - 支持必定暴击、能力提升、回复HP等效果
 * 
 * 使用场景：
 * - 效果160: 3回合内，若对手MISS则下回合自身必定致命一击
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "on_opponent_miss",
 *   "duration": 3,
 *   "effect": "focus_energy",
 *   "effectDuration": 1
 * }
 * ```
 */
export class OnOpponentMiss extends BaseAtomicEffect {
  private duration: number;
  private effect: string;
  private effectDuration: number;
  private statIndex?: number;
  private statChange?: number;
  private healAmount?: number;

  constructor(params: IOnOpponentMissParams) {
    super(
      AtomicEffectType.SPECIAL,
      'OnOpponentMiss',
      [EffectTiming.AFTER_SKILL, EffectTiming.BEFORE_SKILL, EffectTiming.TURN_END]
    );

    this.duration = params.duration;
    this.effect = params.effect;
    this.effectDuration = params.effectDuration || 1;
    this.statIndex = params.statIndex;
    this.statChange = params.statChange;
    this.healAmount = params.healAmount;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const attacker = this.getAttacker(context);

    // 在AFTER_SKILL时机设置监听状态
    if (context.timing === EffectTiming.AFTER_SKILL) {
      if (!attacker.effectCounters) {
        attacker.effectCounters = {};
      }

      attacker.effectCounters['on_opponent_miss'] = this.duration;
      // 简化实现：仅设置标记，实际触发逻辑需要在战斗系统中集成
      this.log(`对方Miss触发状态: 持续${this.duration}回合（需要战斗系统集成）`);

      results.push(
        this.createResult(
          true,
          'attacker',
          'on_opponent_miss',
          `对方Miss触发状态！持续${this.duration}回合`,
          this.duration
        )
      );

      this.log(`对方Miss触发状态: 持续${this.duration}回合, 效果=${this.effect}`);
    }

    // 在BEFORE_SKILL时机检查对方是否Miss（通过命中判定失败）
    // 注意：这个效果需要在战斗系统中配合Miss事件触发
    if (context.timing === EffectTiming.BEFORE_SKILL) {
      // 这里只是设置监听，实际触发需要在Miss发生时调用
      // 暂时跳过，等待战斗系统集成
    }

    // 在TURN_END时机递减计数器
    if (context.timing === EffectTiming.TURN_END) {
      if (attacker.effectCounters?.['on_opponent_miss']) {
        attacker.effectCounters['on_opponent_miss']--;
        if (attacker.effectCounters['on_opponent_miss'] <= 0) {
          delete attacker.effectCounters['on_opponent_miss'];

          results.push(
            this.createResult(
              true,
              'attacker',
              'on_opponent_miss_end',
              `对方Miss触发状态解除！`,
              0
            )
          );

          this.log(`对方Miss触发状态解除`);
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
    if (!params.effect) {
      this.log('effect必须指定', 'error');
      return false;
    }
    return true;
  }
}
