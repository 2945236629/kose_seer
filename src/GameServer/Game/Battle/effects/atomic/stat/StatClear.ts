import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 能力清除参数接口
 */
export interface IStatClearParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'stat_clear';
  target: 'self' | 'opponent';
  clearType: 'debuff' | 'buff' | 'all';  // 清除类型：下降/提升/全部
}

/**
 * 能力清除原子效果
 * 清除指定目标的能力等级变化
 * 
 * @example
 * // 清除自身所有能力下降
 * { type: 'special', specialType: 'stat_clear', target: 'self', clearType: 'debuff' }
 * 
 * // 清除对方所有能力提升
 * { type: 'special', specialType: 'stat_clear', target: 'opponent', clearType: 'buff' }
 * 
 * // 清除自身所有能力变化
 * { type: 'special', specialType: 'stat_clear', target: 'self', clearType: 'all' }
 */
export class StatClear extends BaseAtomicEffect {
  private params: IStatClearParams;

  constructor(params: IStatClearParams) {
    super(
      AtomicEffectType.SPECIAL,
      'Stat Clear',
      [EffectTiming.BEFORE_SKILL, EffectTiming.AFTER_SKILL]
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

    // 获取目标的能力等级变化
    const battleLevels = target.battleLevels || [0, 0, 0, 0, 0, 0];
    let clearedCount = 0;

    // 根据清除类型清除能力变化
    for (let i = 0; i < battleLevels.length; i++) {
      const change = battleLevels[i];
      
      if (this.params.clearType === 'all') {
        // 清除所有能力变化
        if (change !== 0) {
          battleLevels[i] = 0;
          clearedCount++;
        }
      } else if (this.params.clearType === 'debuff') {
        // 只清除负向变化（下降）
        if (change < 0) {
          battleLevels[i] = 0;
          clearedCount++;
        }
      } else if (this.params.clearType === 'buff') {
        // 只清除正向变化（提升）
        if (change > 0) {
          battleLevels[i] = 0;
          clearedCount++;
        }
      }
    }

    // 更新目标的能力变化
    target.battleLevels = battleLevels;

    const targetName = this.params.target === 'self' ? 'attacker' : 'defender';

    if (clearedCount > 0) {
      results.push(
        this.createResult(
          true,
          targetName,
          'stat_clear',
          `清除了${clearedCount}项能力变化（${this.params.clearType}）`,
          clearedCount,
          { clearType: this.params.clearType, battleLevels }
        )
      );
      this.log(`清除了${clearedCount}项能力变化（${this.params.clearType}）`);
    } else {
      results.push(
        this.createResult(
          false,
          targetName,
          'stat_clear',
          '没有需要清除的能力变化',
          0
        )
      );
      this.log('没有需要清除的能力变化', 'debug');
    }

    return results;
  }

  public validate(params: any): boolean {
    if (!params || params.type !== AtomicEffectType.SPECIAL) {
      return false;
    }

    if (params.specialType !== 'stat_clear') {
      return false;
    }

    if (!['self', 'opponent'].includes(params.target)) {
      this.log(`无效的目标: ${params.target}`, 'error');
      return false;
    }

    if (!['debuff', 'buff', 'all'].includes(params.clearType)) {
      this.log(`无效的清除类型: ${params.clearType}`, 'error');
      return false;
    }

    return true;
  }
}
