import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 无视防御能力提升参数接口
 */
export interface IIgnoreDefenseBuffParams {
  /** 是否无视特防 */
  ignoreSpDefense?: boolean;
}

/**
 * 无视防御能力提升效果
 * 
 * 伤害计算时忽略对手的防御/特防能力提升
 * 
 * @category Special
 */
export class IgnoreDefenseBuff extends BaseAtomicEffect {
  private ignoreSpDefense: boolean;

  constructor(params: IIgnoreDefenseBuffParams) {
    super(AtomicEffectType.SPECIAL, 'IgnoreDefenseBuff', []);
    this.ignoreSpDefense = params.ignoreSpDefense !== false;
  }

  public validate(params: any): boolean {
    return true;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { defender } = context;

    // 简化实现：标记忽略防御buff
    // 实际的忽略逻辑需要在伤害计算中实现
    let ignoredStats: number[] = [];

    // 检查防御能力提升
    if (defender.battleLevels) {
      // 物理防御（index 1）
      if (defender.battleLevels[1] > 0) {
        ignoredStats.push(1);
      }
      // 特殊防御（index 3）
      if (this.ignoreSpDefense && defender.battleLevels[3] > 0) {
        ignoredStats.push(3);
      }
    }

    return [this.createResult(
      ignoredStats.length > 0,
      'attacker',
      'ignore_defense_buff',
      `无视防御能力提升`,
      ignoredStats.length,
      {
        ignoredStats,
        ignoreSpDefense: this.ignoreSpDefense
      }
    )];
  }
}
