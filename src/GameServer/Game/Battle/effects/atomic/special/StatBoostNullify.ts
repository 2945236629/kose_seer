import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 能力增强失效效果参数接口
 */
export interface IStatBoostNullifyParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'stat_boost_nullify';
  /** 持续回合数 */
  duration: number;
  /** 目标 */
  target?: 'self' | 'opponent';
}

/**
 * 能力增强失效效果
 * 
 * 功能：
 * - X回合内，使得对手所有能力增强效果失效
 * - 能力提升等级被视为0
 * - 不影响能力下降
 * 
 * 使用场景：
 * - 效果156: 3回合内，使得对手所有能力增强效果失效
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "stat_boost_nullify",
 *   "target": "opponent",
 *   "duration": 3
 * }
 * ```
 */
export class StatBoostNullify extends BaseAtomicEffect {
  private duration: number;
  private target: 'self' | 'opponent';

  constructor(params: IStatBoostNullifyParams) {
    super(
      AtomicEffectType.SPECIAL,
      'StatBoostNullify',
      [EffectTiming.AFTER_SKILL, EffectTiming.TURN_END]
    );

    this.duration = params.duration;
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

      target.effectCounters['stat_boost_nullify'] = this.duration;

      results.push(
        this.createResult(
          true,
          this.target === 'self' ? 'attacker' : 'defender',
          'stat_boost_nullify',
          `能力增强失效状态！持续${this.duration}回合`,
          this.duration
        )
      );

      this.log(`能力增强失效: 持续${this.duration}回合`);
    }

    // 在TURN_END时机递减计数器
    if (context.timing === EffectTiming.TURN_END) {
      if (target.effectCounters?.['stat_boost_nullify']) {
        target.effectCounters['stat_boost_nullify']--;
        if (target.effectCounters['stat_boost_nullify'] <= 0) {
          delete target.effectCounters['stat_boost_nullify'];
          results.push(
            this.createResult(
              true,
              this.target === 'self' ? 'attacker' : 'defender',
              'stat_boost_nullify_end',
              `能力增强失效状态解除！`,
              0
            )
          );
          this.log(`能力增强失效状态解除`);
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
    return true;
  }
}
