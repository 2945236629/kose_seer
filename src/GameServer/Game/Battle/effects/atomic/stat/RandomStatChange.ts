import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 随机能力变化效果参数接口
 */
export interface IRandomStatChangeParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'random_stat_change';
  /** 目标（self=自己，opponent=对手） */
  target: 'self' | 'opponent';
  /** 变化等级（正数=提升，负数=降低） */
  change: number;
  /** 可选择的能力列表（可选，不指定则从所有能力中随机） */
  stats?: number[];
  /** 随机选择的能力数量（可选，默认1） */
  count?: number;
  /** 是否允许重复选择（可选，默认false） */
  allowDuplicate?: boolean;
  /** 触发概率（可选，默认100） */
  probability?: number;
}

/**
 * 随机能力变化效果
 * 
 * 功能：
 * - 随机提升或降低目标的能力
 * - 可以指定可选择的能力列表
 * - 可以一次随机多个能力
 * - 支持触发概率
 * 
 * 使用场景：
 * - 古代之力（10%概率随机提升一项能力）
 * - 银色旋风（随机提升两项能力）
 * - 疯狂（随机提升攻击或特攻，降低防御或特防）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "random_stat_change",
 *   "target": "self",
 *   "change": 1,
 *   "stats": [0, 1, 2, 3, 4],
 *   "count": 1,
 *   "allowDuplicate": false,
 *   "probability": 10
 * }
 * ```
 * 
 * 能力索引：
 * - 0: 攻击
 * - 1: 防御
 * - 2: 特攻
 * - 3: 特防
 * - 4: 速度
 * - 5: 命中
 * - 6: 闪避
 */
export class RandomStatChange extends BaseAtomicEffect {
  private target: 'self' | 'opponent';
  private change: number;
  private stats?: number[];
  private count: number;
  private allowDuplicate: boolean;
  private probability: number;

  constructor(params: IRandomStatChangeParams) {
    super(
      AtomicEffectType.SPECIAL,
      'RandomStatChange',
      [EffectTiming.AFTER_SKILL, EffectTiming.AFTER_DAMAGE_APPLY]
    );

    this.target = params.target;
    this.change = params.change;
    this.stats = params.stats;
    this.count = params.count ?? 1;
    this.allowDuplicate = params.allowDuplicate ?? false;
    this.probability = params.probability ?? 100;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];

    // 概率判断
    if (!this.checkProbability(this.probability)) {
      results.push(
        this.createResult(
          false,
          'both',
          'random_stat_change',
          '随机能力变化未触发',
          0
        )
      );
      return results;
    }

    const targetPet = this.getTarget(context, this.target);

    // 确定可选择的能力列表
    const availableStats = this.stats ?? [0, 1, 2, 3, 4]; // 默认：攻击、防御、特攻、特防、速度

    // 随机选择能力
    const selectedStats = this.selectRandomStats(availableStats, this.count, this.allowDuplicate);

    if (selectedStats.length === 0) {
      results.push(
        this.createResult(
          false,
          this.target === 'self' ? 'attacker' : 'defender',
          'random_stat_change',
          '没有可选择的能力',
          0
        )
      );
      return results;
    }

    // 应用能力变化
    for (const statIndex of selectedStats) {
      const statName = this.getStatName(statIndex);
      const success = this.applyStatChange(targetPet, statIndex, this.change);

      if (success) {
        results.push(
          this.createResult(
            true,
            this.target === 'self' ? 'attacker' : 'defender',
            'random_stat_change',
            `${statName}${this.change > 0 ? '提升' : '降低'}了${Math.abs(this.change)}级！`,
            this.change,
            {
              stat: statIndex,
              statName,
              change: this.change
            }
          )
        );

        this.log(
          `随机能力变化: ${this.target === 'self' ? '自己' : '对手'}的${statName}` +
          `${this.change > 0 ? '提升' : '降低'}${Math.abs(this.change)}级`
        );
      }
    }

    return results;
  }

  public validate(params: any): boolean {
    if (!['self', 'opponent'].includes(params.target)) {
      this.log('target必须是self或opponent', 'error');
      return false;
    }
    if (params.change === undefined || params.change === 0) {
      this.log('change不能为0', 'error');
      return false;
    }
    if (params.count !== undefined && params.count < 1) {
      this.log('count必须大于0', 'error');
      return false;
    }
    return true;
  }

  /**
   * 随机选择能力
   */
  private selectRandomStats(availableStats: number[], count: number, allowDuplicate: boolean): number[] {
    const selected: number[] = [];
    const pool = [...availableStats];

    for (let i = 0; i < count && pool.length > 0; i++) {
      const index = Math.floor(Math.random() * pool.length);
      const stat = pool[index];
      selected.push(stat);

      if (!allowDuplicate) {
        pool.splice(index, 1);
      }
    }

    return selected;
  }

  /**
   * 应用能力变化
   */
  private applyStatChange(pet: any, statIndex: number, change: number): boolean {
    if (!pet.battleLevels) {
      pet.battleLevels = [0, 0, 0, 0, 0, 0];
    }

    const currentLevel = pet.battleLevels[statIndex] ?? 0;
    const newLevel = Math.max(-6, Math.min(6, currentLevel + change));

    if (newLevel === currentLevel) {
      // 已达到上限或下限
      return false;
    }

    pet.battleLevels[statIndex] = newLevel;
    return true;
  }

  /**
   * 获取能力名称
   */
  private getStatName(statIndex: number): string {
    const statNames = ['攻击', '防御', '特攻', '特防', '速度', '命中', '闪避'];
    return statNames[statIndex] ?? `能力${statIndex}`;
  }
}
