import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 能力转移效果参数接口
 */
export interface IStatTransferParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'stat_transfer';
  /** 转移的能力列表（可选，不指定则转移所有能力变化） */
  stats?: number[];
  /** 转移模式（copy=复制，swap=交换，steal=窃取） */
  mode: 'copy' | 'swap' | 'steal';
}

/**
 * 能力转移效果
 * 
 * 功能：
 * - 转移能力变化等级
 * - 支持复制、交换、窃取三种模式
 * - 可选择转移特定能力或所有能力
 * 
 * 使用场景：
 * - 能力复制（复制对手的能力变化）
 * - 能力交换（交换双方的能力变化）
 * - 能力窃取（窃取对手的能力提升，清除对手的能力变化）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "stat_transfer",
 *   "stats": [0, 2, 4],
 *   "mode": "steal"
 * }
 * ```
 * 
 * 模式说明：
 * - copy: 复制对手的能力变化到自己（对手保持不变）
 * - swap: 交换双方的能力变化
 * - steal: 窃取对手的能力提升（仅正值），清除对手的能力变化
 */
export class StatTransfer extends BaseAtomicEffect {
  private stats?: number[];
  private mode: 'copy' | 'swap' | 'steal';

  constructor(params: IStatTransferParams) {
    super(
      AtomicEffectType.SPECIAL,
      'StatTransfer',
      [EffectTiming.AFTER_SKILL]
    );

    this.stats = params.stats;
    this.mode = params.mode;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const attacker = this.getAttacker(context);
    const defender = this.getDefender(context);

    // 确定要转移的能力
    const statsToTransfer = this.stats ?? [0, 1, 2, 3, 4]; // 默认所有能力

    for (const statIndex of statsToTransfer) {
      const statName = this.getStatName(statIndex);
      const attackerLevel = this.getStatLevel(attacker, statIndex);
      const defenderLevel = this.getStatLevel(defender, statIndex);

      switch (this.mode) {
        case 'copy':
          // 复制对手的能力变化
          this.setStatLevel(attacker, statIndex, defenderLevel);
          results.push(
            this.createResult(
              true,
              'attacker',
              'stat_transfer_copy',
              `复制了对手的${statName}变化！`,
              defenderLevel,
              {
                stat: statIndex,
                statName,
                level: defenderLevel
              }
            )
          );
          this.log(`能力复制: ${statName} = ${defenderLevel}`);
          break;

        case 'swap':
          // 交换双方的能力变化
          this.setStatLevel(attacker, statIndex, defenderLevel);
          this.setStatLevel(defender, statIndex, attackerLevel);
          results.push(
            this.createResult(
              true,
              'both',
              'stat_transfer_swap',
              `交换了${statName}变化！`,
              0,
              {
                stat: statIndex,
                statName,
                attackerOld: attackerLevel,
                attackerNew: defenderLevel,
                defenderOld: defenderLevel,
                defenderNew: attackerLevel
              }
            )
          );
          this.log(`能力交换: ${statName} 攻击方${attackerLevel}↔${defenderLevel}防御方`);
          break;

        case 'steal':
          // 窃取对手的能力提升（仅正值）
          if (defenderLevel > 0) {
            const newAttackerLevel = Math.min(6, attackerLevel + defenderLevel);
            this.setStatLevel(attacker, statIndex, newAttackerLevel);
            this.setStatLevel(defender, statIndex, 0);
            results.push(
              this.createResult(
                true,
                'both',
                'stat_transfer_steal',
                `窃取了对手的${statName}提升！`,
                defenderLevel,
                {
                  stat: statIndex,
                  statName,
                  stolenLevels: defenderLevel,
                  attackerNew: newAttackerLevel
                }
              )
            );
            this.log(`能力窃取: ${statName} 窃取${defenderLevel}级，攻击方${attackerLevel}→${newAttackerLevel}`);
          }
          break;
      }
    }

    return results;
  }

  public validate(params: any): boolean {
    if (!['copy', 'swap', 'steal'].includes(params.mode)) {
      this.log('mode必须是copy、swap或steal', 'error');
      return false;
    }
    if (params.stats && !Array.isArray(params.stats)) {
      this.log('stats必须是数组', 'error');
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
