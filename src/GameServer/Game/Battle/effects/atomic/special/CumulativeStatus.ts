import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 累积概率异常状态参数接口
 */
export interface ICumulativeStatusParams {
  /** 基础概率 */
  baseProbability?: number;
  /** 每次增加的概率 */
  probabilityIncrease?: number;
  /** 最大概率 */
  maxProbability?: number;
  /** 状态类型 */
  status?: number;
  /** 持续回合数 */
  duration?: number;
}

/**
 * 累积概率异常状态效果
 * 
 * 每次使用时概率递增，直到达到最大值
 * 
 * @category Special
 */
export class CumulativeStatus extends BaseAtomicEffect {
  private baseProbability: number;
  private probabilityIncrease: number;
  private maxProbability: number;
  private status: number;
  private duration: number;
  
  // 追踪每个精灵的累积次数
  private cumulativeCount: Map<number, number> = new Map();

  constructor(params: ICumulativeStatusParams) {
    super(AtomicEffectType.SPECIAL, 'CumulativeStatus', []);
    this.baseProbability = params.baseProbability || 30;
    this.probabilityIncrease = params.probabilityIncrease || 10;
    this.maxProbability = params.maxProbability || 100;
    this.status = params.status || 0;
    this.duration = params.duration || 3;
  }

  public validate(params: any): boolean {
    return true;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker, defender } = context;

    // 获取当前累积次数
    const count = this.cumulativeCount.get(attacker.id) || 0;
    
    // 计算当前概率
    const currentProbability = Math.min(
      this.baseProbability + count * this.probabilityIncrease,
      this.maxProbability
    );

    // 概率判定
    const roll = Math.random() * 100;
    const success = roll < currentProbability;

    if (success) {
      // 施加状态
      defender.status = this.status;
      if (defender.statusDurations && this.status < defender.statusDurations.length) {
        defender.statusDurations[this.status] = this.duration;
      }

      // 增加累积次数
      this.cumulativeCount.set(attacker.id, count + 1);

      return [this.createResult(
        true,
        'defender',
        'cumulative_status',
        `累积概率异常状态触发（${currentProbability.toFixed(1)}%）`,
        this.status,
        {
          status: this.status,
          duration: this.duration,
          probability: currentProbability,
          cumulativeCount: count + 1,
          success: true
        }
      )];
    } else {
      // 增加累积次数（即使失败也增加）
      this.cumulativeCount.set(attacker.id, count + 1);

      return [this.createResult(
        false,
        'defender',
        'cumulative_status',
        `累积概率异常状态未触发（${currentProbability.toFixed(1)}%）`,
        0,
        {
          probability: currentProbability,
          cumulativeCount: count + 1,
          success: false
        }
      )];
    }
  }

  /**
   * 重置累积计数（战斗结束或切换精灵时调用）
   */
  public resetCount(attackerId: number): void {
    this.cumulativeCount.delete(attackerId);
  }
}
