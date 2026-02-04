import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType, IStatusInflictorParams } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 状态施加原子效果
 * 给目标施加异常状态（中毒、麻痹、烧伤等）
 * 
 * 状态类型：
 * - 0: 麻痹
 * - 1: 中毒
 * - 2: 烧伤
 * - 3: 冻结
 * - 4: 睡眠
 * - 5: 冻伤
 * - 6: 害怕
 * - 7: 混乱
 * - 8: 深度睡眠
 * - 9: 束缚
 * - 10: 疲惫
 * 
 * @example
 * // 100%概率麻痹对方
 * { type: 'status_inflictor', target: 'opponent', status: 0, probability: 100 }
 * 
 * // 30%概率中毒对方
 * { type: 'status_inflictor', target: 'opponent', status: 1, probability: 30 }
 * 
 * // 烧伤对方，持续3回合
 * { type: 'status_inflictor', target: 'opponent', status: 2, duration: 3 }
 */
export class StatusInflictor extends BaseAtomicEffect {
  private params: IStatusInflictorParams;

  // 状态名称映射
  private static readonly STATUS_NAMES: { [key: number]: string } = {
    0: '麻痹', 1: '中毒', 2: '烧伤', 3: '冻结', 4: '睡眠',
    5: '冻伤', 6: '害怕', 7: '混乱', 8: '深度睡眠', 9: '束缚', 10: '疲惫'
  };

  constructor(params: IStatusInflictorParams) {
    super(
      AtomicEffectType.STATUS_INFLICTOR,
      'Status Inflictor',
      [EffectTiming.AFTER_DAMAGE_APPLY, EffectTiming.AFTER_SKILL]
    );
    this.params = params;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const target = this.getTarget(context, this.params.target);

    if (!target) {
      this.log('目标不存在', 'warn');
      return results;
    }

    // 检查概率
    const probability = this.params.probability !== undefined ? this.params.probability : 100;
    if (!this.checkProbability(probability)) {
      this.log(`概率判定失败（${probability}%）`, 'debug');
      return results;
    }

    // 检查目标是否已有异常状态（-1和0都表示无状态）
    if (target.status !== undefined && target.status > 0) {
      this.log(`目标已有异常状态${target.status}，无法施加新状态`, 'debug');
      results.push(
        this.createResult(
          false,
          this.params.target === 'self' ? 'attacker' : 'defender',
          'status',  // 使用 'status' 类型
          '目标已有异常状态',
          0
        )
      );
      return results;
    }

    // 施加异常状态
    target.status = this.params.status;
    if (this.params.duration) {
      target.statusTurns = this.params.duration;
    }
    // Proxy 会自动同步 statusArray 和 statusDurations

    const statusName = StatusInflictor.STATUS_NAMES[this.params.status] || `状态${this.params.status}`;
    const targetName = this.params.target === 'self' ? 'attacker' : 'defender';

    results.push(
      this.createResult(
        true,
        targetName,
        'status',  // 使用 'status' 类型，与 ApplyEffectResults 匹配
        `施加${statusName}状态`,
        this.params.status,
        { 
          status: this.params.status, 
          duration: this.params.duration || 3,
          statusName: statusName
        }
      )
    );

    this.log(`施加${statusName}状态（概率${probability}%）`);
    return results;
  }

  public validate(params: any): boolean {
    if (!params || params.type !== AtomicEffectType.STATUS_INFLICTOR) {
      return false;
    }

    if (!['self', 'opponent'].includes(params.target)) {
      this.log(`无效的目标: ${params.target}`, 'error');
      return false;
    }

    if (typeof params.status !== 'number') {
      this.log(`无效的状态类型: ${params.status}`, 'error');
      return false;
    }

    if (params.probability !== undefined && 
        (typeof params.probability !== 'number' || params.probability < 0 || params.probability > 100)) {
      this.log(`无效的概率: ${params.probability}`, 'error');
      return false;
    }

    return true;
  }
}
