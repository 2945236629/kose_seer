import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 随机异常状态效果参数接口
 */
export interface IRandomStatusEffectParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'random_status';
  /** 目标 */
  target?: 'self' | 'opponent';
  /** 可选的状态列表 */
  statusList: number[];
  /** 状态持续时间 */
  duration: number;
  /** 触发概率（0-100） */
  probability?: number;
}

/**
 * 随机异常状态效果
 * 
 * 功能：
 * - 从指定的状态列表中随机选择一个施加给目标
 * - 支持概率触发
 * 
 * 使用场景：
 * - 效果176: 30%概率随机异常状态（中毒、麻痹、冰冻、烧伤、睡眠、混乱）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "random_status",
 *   "target": "opponent",
 *   "statusList": [1, 2, 5, 6, 8, 0],
 *   "duration": 3,
 *   "probability": 30
 * }
 * ```
 * 
 * 状态ID说明：
 * - 0: 混乱
 * - 1: 中毒
 * - 2: 麻痹
 * - 5: 冰冻
 * - 6: 烧伤
 * - 8: 睡眠
 */
export class RandomStatusEffect extends BaseAtomicEffect {
  private target: 'self' | 'opponent';
  private statusList: number[];
  private duration: number;
  private probability: number;

  constructor(params: IRandomStatusEffectParams) {
    super(
      AtomicEffectType.SPECIAL,
      'RandomStatusEffect',
      [EffectTiming.AFTER_SKILL]
    );

    this.target = params.target || 'opponent';
    this.statusList = params.statusList;
    this.duration = params.duration;
    this.probability = params.probability || 100;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const target = this.target === 'self' ? this.getAttacker(context) : this.getDefender(context);

    // 概率判定
    if (Math.random() * 100 >= this.probability) {
      this.log(`随机异常状态未触发（概率${this.probability}%）`);
      return results;
    }

    // 随机选择一个状态
    const randomIndex = Math.floor(Math.random() * this.statusList.length);
    const statusId = this.statusList[randomIndex];

    // 检查是否已有异常状态
    if (target.status && target.status !== -1) {
      results.push(
        this.createResult(
          false,
          this.target === 'self' ? 'attacker' : 'defender',
          'status_failed',
          `目标已有异常状态！`,
          0
        )
      );
      this.log(`随机异常状态失败: 目标已有状态${target.status}`);
      return results;
    }

    // 检查免疫
    if (target.immuneFlags?.status) {
      results.push(
        this.createResult(
          false,
          this.target === 'self' ? 'attacker' : 'defender',
          'status_immune',
          `目标免疫异常状态！`,
          0
        )
      );
      this.log(`随机异常状态失败: 目标免疫`);
      return results;
    }

    // 施加状态
    target.status = statusId;
    if (!target.statusDurations) {
      target.statusDurations = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
    target.statusDurations[statusId] = this.duration;

    const statusNames: { [key: number]: string } = {
      0: '混乱',
      1: '中毒',
      2: '麻痹',
      5: '冰冻',
      6: '烧伤',
      8: '睡眠'
    };

    results.push(
      this.createResult(
        true,
        this.target === 'self' ? 'attacker' : 'defender',
        'status_inflict',
        `随机施加${statusNames[statusId] || '异常状态'}！`,
        statusId,
        { duration: this.duration }
      )
    );

    this.log(`随机异常状态: 施加状态${statusId}(${statusNames[statusId]})，持续${this.duration}回合`);

    return results;
  }

  public validate(params: any): boolean {
    if (!params.statusList || params.statusList.length === 0) {
      this.log('statusList不能为空', 'error');
      return false;
    }
    if (params.duration === undefined || params.duration < 1) {
      this.log('duration必须大于0', 'error');
      return false;
    }
    return true;
  }
}
