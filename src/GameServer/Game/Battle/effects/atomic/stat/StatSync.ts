import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 能力同步效果参数接口
 */
export interface IStatSyncParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'stat_sync';
  /** 同步模式（average=平均值，copy=复制，swap=交换） */
  mode: 'average' | 'copy' | 'swap';
  /** 同步的能力（可选，不指定则同步所有能力） */
  stats?: number[];
  /** 是否包含能力变化等级（可选，默认false） */
  includeLevels?: boolean;
}

/**
 * 能力同步效果
 * 
 * 功能：
 * - 同步自己和对手的能力值
 * - 支持三种同步模式：平均值、复制、交换
 * - 可以选择同步特定能力或所有能力
 * - 可以选择是否包含能力变化等级
 * 
 * 使用场景：
 * - 力量均分（将双方攻击力平均）
 * - 速度同步（将双方速度平均）
 * - 能力复制（复制对手的能力）
 * - 能力交换（交换双方的能力）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "stat_sync",
 *   "mode": "average",
 *   "stats": [0, 4],
 *   "includeLevels": false
 * }
 * ```
 * 
 * 能力索引：
 * - 0: 攻击
 * - 1: 防御
 * - 2: 特攻
 * - 3: 特防
 * - 4: 速度
 */
export class StatSync extends BaseAtomicEffect {
  private mode: 'average' | 'copy' | 'swap';
  private stats?: number[];
  private includeLevels: boolean;

  constructor(params: IStatSyncParams) {
    super(
      AtomicEffectType.SPECIAL,
      'StatSync',
      [EffectTiming.AFTER_SKILL]
    );

    this.mode = params.mode;
    this.stats = params.stats;
    this.includeLevels = params.includeLevels ?? false;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const attacker = this.getAttacker(context);
    const defender = this.getDefender(context);

    // 确定要同步的能力
    const statsToSync = this.stats ?? [0, 1, 2, 3, 4]; // 默认同步所有能力

    for (const statIndex of statsToSync) {
      const statName = this.getStatName(statIndex);
      const attackerStat = this.getStat(attacker, statIndex);
      const defenderStat = this.getStat(defender, statIndex);

      let newAttackerStat = attackerStat;
      let newDefenderStat = defenderStat;

      switch (this.mode) {
        case 'average':
          // 平均值模式
          const average = Math.floor((attackerStat + defenderStat) / 2);
          newAttackerStat = average;
          newDefenderStat = average;
          break;

        case 'copy':
          // 复制模式（攻击方复制防御方）
          newAttackerStat = defenderStat;
          break;

        case 'swap':
          // 交换模式
          newAttackerStat = defenderStat;
          newDefenderStat = attackerStat;
          break;
      }

      // 应用能力变化
      this.setStat(attacker, statIndex, newAttackerStat);
      if (this.mode !== 'copy') {
        this.setStat(defender, statIndex, newDefenderStat);
      }

      // 如果包含能力变化等级，也进行同步
      if (this.includeLevels) {
        const attackerLevel = this.getStatLevel(attacker, statIndex);
        const defenderLevel = this.getStatLevel(defender, statIndex);

        switch (this.mode) {
          case 'average':
            const avgLevel = Math.floor((attackerLevel + defenderLevel) / 2);
            this.setStatLevel(attacker, statIndex, avgLevel);
            this.setStatLevel(defender, statIndex, avgLevel);
            break;

          case 'copy':
            this.setStatLevel(attacker, statIndex, defenderLevel);
            break;

          case 'swap':
            this.setStatLevel(attacker, statIndex, defenderLevel);
            this.setStatLevel(defender, statIndex, attackerLevel);
            break;
        }
      }

      results.push(
        this.createResult(
          true,
          this.mode === 'copy' ? 'attacker' : 'both',
          'stat_sync',
          `${statName}同步！`,
          0,
          {
            stat: statIndex,
            statName,
            mode: this.mode,
            attackerOld: attackerStat,
            attackerNew: newAttackerStat,
            defenderOld: defenderStat,
            defenderNew: newDefenderStat
          }
        )
      );

      this.log(
        `能力同步(${this.mode}): ${statName} ` +
        `攻击方${attackerStat}→${newAttackerStat}, ` +
        `防御方${defenderStat}→${newDefenderStat}`
      );
    }

    return results;
  }

  public validate(params: any): boolean {
    if (!['average', 'copy', 'swap'].includes(params.mode)) {
      this.log('mode必须是average、copy或swap', 'error');
      return false;
    }
    if (params.stats && !Array.isArray(params.stats)) {
      this.log('stats必须是数组', 'error');
      return false;
    }
    return true;
  }

  /**
   * 获取能力值
   */
  private getStat(pet: any, statIndex: number): number {
    const statNames = ['attack', 'defense', 'spAttack', 'spDefense', 'speed'];
    const statName = statNames[statIndex];
    return pet[statName] ?? 0;
  }

  /**
   * 设置能力值
   */
  private setStat(pet: any, statIndex: number, value: number): void {
    const statNames = ['attack', 'defense', 'spAttack', 'spDefense', 'speed'];
    const statName = statNames[statIndex];
    if (pet[statName] !== undefined) {
      pet[statName] = value;
    }
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
      pet.battleLevels = [0, 0, 0, 0, 0, 0];
    }
    pet.battleLevels[statIndex] = level;
  }

  /**
   * 获取能力名称
   */
  private getStatName(statIndex: number): string {
    const statNames = ['攻击', '防御', '特攻', '特防', '速度'];
    return statNames[statIndex] ?? `能力${statIndex}`;
  }
}
