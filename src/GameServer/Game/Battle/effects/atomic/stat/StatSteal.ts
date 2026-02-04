import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 能力窃取效果参数接口
 */
export interface IStatStealParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'stat_steal';
  /** 窃取的能力 */
  stat: number;
  /** 窃取等级数 */
  levels: number;
  /** 触发概率（可选，默认100） */
  probability?: number;
}

/**
 * 能力窃取效果
 * 
 * 功能：
 * - 降低对手的能力，同时提升自己的能力
 * - 支持触发概率
 * - 自动处理能力等级上下限
 * 
 * 使用场景：
 * - 力量窃取（降低对手攻击，提升自己攻击）
 * - 速度窃取（降低对手速度，提升自己速度）
 * - 能力吸收（窃取对手的能力提升）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "stat_steal",
 *   "stat": 0,
 *   "levels": 1,
 *   "probability": 100
 * }
 * ```
 * 
 * 与StatTransfer的区别：
 * - StatTransfer: 转移能力变化等级（复制、交换、窃取所有提升）
 * - StatSteal: 窃取指定等级（降低对手N级，提升自己N级）
 */
export class StatSteal extends BaseAtomicEffect {
  private stat: number;
  private levels: number;
  private probability: number;

  constructor(params: IStatStealParams) {
    super(
      AtomicEffectType.SPECIAL,
      'StatSteal',
      [EffectTiming.AFTER_SKILL, EffectTiming.AFTER_DAMAGE_APPLY]
    );

    this.stat = params.stat;
    this.levels = params.levels;
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
          'stat_steal',
          '能力窃取未触发',
          0
        )
      );
      return results;
    }

    const attacker = this.getAttacker(context);
    const defender = this.getDefender(context);

    const statName = this.getStatName(this.stat);
    const attackerLevel = this.getStatLevel(attacker, this.stat);
    const defenderLevel = this.getStatLevel(defender, this.stat);

    // 计算实际窃取的等级（考虑上下限）
    const actualSteal = Math.min(
      this.levels,
      defenderLevel + 6,  // 对手最多降低到-6
      6 - attackerLevel   // 自己最多提升到+6
    );

    if (actualSteal <= 0) {
      results.push(
        this.createResult(
          false,
          'both',
          'stat_steal',
          `无法窃取${statName}`,
          0
        )
      );
      return results;
    }

    // 降低对手能力
    const newDefenderLevel = Math.max(-6, defenderLevel - actualSteal);
    this.setStatLevel(defender, this.stat, newDefenderLevel);

    // 提升自己能力
    const newAttackerLevel = Math.min(6, attackerLevel + actualSteal);
    this.setStatLevel(attacker, this.stat, newAttackerLevel);

    results.push(
      this.createResult(
        true,
        'both',
        'stat_steal',
        `窃取了对手的${statName}！`,
        actualSteal,
        {
          stat: this.stat,
          statName,
          stolenLevels: actualSteal,
          attackerOld: attackerLevel,
          attackerNew: newAttackerLevel,
          defenderOld: defenderLevel,
          defenderNew: newDefenderLevel
        }
      )
    );

    this.log(
      `能力窃取: ${statName} 窃取${actualSteal}级, ` +
      `攻击方${attackerLevel}→${newAttackerLevel}, ` +
      `防御方${defenderLevel}→${newDefenderLevel}`
    );

    return results;
  }

  public validate(params: any): boolean {
    if (params.stat === undefined || params.stat < 0 || params.stat > 6) {
      this.log('stat必须在0-6之间', 'error');
      return false;
    }
    if (params.levels === undefined || params.levels < 1) {
      this.log('levels必须至少为1', 'error');
      return false;
    }
    return true;
  }

  /**
   * 获取能力变化等级
   */
  private getStatLevel(pet: any, statIndex: number): number {
    if (!pet.battleLevels) return 0;
    return pet.battleLevels[statIndex] ?? 0;
  }

  /**
   * 设置能力变化等级
   */
  private setStatLevel(pet: any, statIndex: number, level: number): void {
    if (!pet.battleLevels) {
      pet.battleLevels = [0, 0, 0, 0, 0, 0, 0];
    }
    pet.battleLevels[statIndex] = Math.max(-6, Math.min(6, level));
  }

  /**
   * 获取能力名称
   */
  private getStatName(statIndex: number): string {
    const statNames = ['攻击', '防御', '特攻', '特防', '速度', '命中', '闪避'];
    return statNames[statIndex] ?? `能力${statIndex}`;
  }
}
