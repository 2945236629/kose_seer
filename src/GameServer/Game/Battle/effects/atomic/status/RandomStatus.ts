import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';
import { BattleStatus } from '../../../../../../shared/models/BattleModel';

/**
 * 随机异常状态参数接口
 */
export interface IRandomStatusParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'random_status';
  target: 'self' | 'opponent';
  statusList: number[];         // 可选状态列表
  probability?: number;         // 触发概率（0-100）
  duration?: number;            // 状态持续回合数
  weights?: number[];           // 每个状态的权重（可选）
}

/**
 * 随机异常状态原子效果
 * 从指定状态列表中随机施加一个
 * 
 * 用途：
 * - Effect_74: 随机异常状态（麻痹/中毒/烧伤）
 * - Effect_75: 随机异常状态（冰冻/睡眠/害怕）
 * 
 * 特性：
 * - 从列表中随机选择一个状态
 * - 支持权重分配
 * - 支持概率触发
 * - 可以指定状态持续时间
 * 
 * @example
 * // 随机施加麻痹、中毒或烧伤
 * {
 *   type: 'special',
 *   specialType: 'random_status',
 *   target: 'opponent',
 *   statusList: [2, 3, 4], // 麻痹、中毒、烧伤
 *   probability: 30
 * }
 * 
 * @example
 * // 带权重的随机状态（冰冻50%，睡眠30%，害怕20%）
 * {
 *   type: 'special',
 *   specialType: 'random_status',
 *   target: 'opponent',
 *   statusList: [5, 6, 7],
 *   weights: [50, 30, 20],
 *   probability: 50
 * }
 * 
 * @category Status
 */
export class RandomStatus extends BaseAtomicEffect {
  private params: IRandomStatusParams;

  // 状态名称映射
  private static readonly STATUS_NAMES: { [key: number]: string } = {
    0: '正常',
    1: '濒死',
    2: '麻痹',
    3: '中毒',
    4: '烧伤',
    5: '冰冻',
    6: '睡眠',
    7: '害怕',
    8: '混乱',
    9: '虚弱',
    10: '石化',
    11: '寄生',
    12: '烧伤（强化）',
    13: '中毒（剧毒）',
    14: '能力封印',
    15: '疲劳',
    16: '束缚',
    17: '畏缩',
    18: '诅咒',
    19: '衰弱'
  };

  constructor(params: IRandomStatusParams) {
    super(AtomicEffectType.SPECIAL, 'Random Status', [EffectTiming.AFTER_SKILL]);
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
    const probability = this.params.probability || 100;
    if (!this.checkProbability(probability)) {
      results.push(this.createResult(
        false,
        this.params.target === 'self' ? 'attacker' : 'defender',
        'random_status_failed',
        `随机状态触发失败（概率${probability}%）`,
        0
      ));
      return results;
    }
    
    // 检查目标是否已有异常状态
    if (target.status && target.status !== BattleStatus.NONE && target.status >= 0) {
      this.log(`目标已有异常状态${target.status}，无法施加新状态`, 'debug');
      results.push(this.createResult(
        false,
        this.params.target === 'self' ? 'attacker' : 'defender',
        'random_status_blocked',
        '目标已有异常状态',
        0
      ));
      return results;
    }
    
    // 随机选择一个状态
    const selectedStatus = this.selectRandomStatus();
    
    // 施加状态
    target.status = selectedStatus;
    if (this.params.duration) {
      target.statusTurns = this.params.duration;
    }
    
    const statusName = RandomStatus.STATUS_NAMES[selectedStatus] || `状态${selectedStatus}`;
    const targetName = this.params.target === 'self' ? 'attacker' : 'defender';
    
    results.push(this.createResult(
      true,
      targetName,
      'random_status',
      `随机施加${statusName}状态`,
      selectedStatus,
      { status: selectedStatus, statusName, duration: this.params.duration }
    ));
    
    this.log(`随机状态: 施加${statusName}（${selectedStatus}）`);
    
    return results;
  }

  /**
   * 根据权重随机选择一个状态
   */
  private selectRandomStatus(): number {
    const statusList = this.params.statusList;
    const weights = this.params.weights;
    
    // 如果没有权重，均匀随机
    if (!weights || weights.length !== statusList.length) {
      const randomIndex = Math.floor(Math.random() * statusList.length);
      return statusList[randomIndex];
    }
    
    // 根据权重随机
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < statusList.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return statusList[i];
      }
    }
    
    // 兜底返回第一个
    return statusList[0];
  }

  public validate(params: any): boolean {
    return params &&
           params.type === AtomicEffectType.SPECIAL &&
           params.specialType === 'random_status' &&
           ['self', 'opponent'].includes(params.target) &&
           Array.isArray(params.statusList) &&
           params.statusList.length > 0;
  }
}
