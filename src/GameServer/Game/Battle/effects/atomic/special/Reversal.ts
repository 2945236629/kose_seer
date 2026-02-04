import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 反转效果参数接口
 */
export interface IReversalParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'reversal';
  /** 反转类型：hp_ratio=HP比例, stat_changes=能力变化 */
  reversalType: 'hp_ratio' | 'stat_changes';
  /** 威力基础值 */
  basePower?: number;
  /** 最大威力 */
  maxPower?: number;
}

/**
 * 反转效果
 * 
 * 功能：
 * - HP比例反转：HP越低威力越高
 * - 能力变化反转：将能力提升变为降低，降低变为提升
 * - 可设置威力基础值和最大值
 * - 动态计算威力
 * 
 * 使用场景：
 * - 绝地反击（HP越低威力越高，最高200）
 * - 反转世界（交换所有能力变化的正负）
 * - 背水一战（HP低于25%时威力翻倍）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "reversal",
 *   "reversalType": "hp_ratio",
 *   "basePower": 20,
 *   "maxPower": 200
 * }
 * ```
 * 
 * HP比例反转计算公式：
 * - 威力 = basePower + (maxPower - basePower) × (1 - HP百分比)
 * - 例如：HP 10%时，威力 = 20 + (200 - 20) × 0.9 = 182
 */
export class Reversal extends BaseAtomicEffect {
  private reversalType: 'hp_ratio' | 'stat_changes';
  private basePower: number;
  private maxPower: number;

  constructor(params: IReversalParams) {
    super(
      AtomicEffectType.SPECIAL,
      'Reversal',
      [EffectTiming.BEFORE_DAMAGE_CALC, EffectTiming.AFTER_SKILL]
    );

    this.reversalType = params.reversalType;
    this.basePower = params.basePower ?? 20;
    this.maxPower = params.maxPower ?? 200;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];

    switch (this.reversalType) {
      case 'hp_ratio':
        this.applyHpRatioReversal(context, results);
        break;
      case 'stat_changes':
        this.applyStatChangesReversal(context, results);
        break;
    }

    return results;
  }

  /**
   * 应用HP比例反转
   */
  private applyHpRatioReversal(context: IEffectContext, results: IEffectResult[]): void {
    if (context.timing !== EffectTiming.BEFORE_DAMAGE_CALC) {
      return;
    }

    const attacker = this.getAttacker(context);
    if (!attacker) {
      this.log('反转效果：攻击者不存在', 'warn');
      return;
    }

    // 计算HP百分比
    const hpRatio = attacker.hp / attacker.maxHp;

    // 计算威力：HP越低威力越高
    const powerBoost = (this.maxPower - this.basePower) * (1 - hpRatio);
    const finalPower = Math.floor(this.basePower + powerBoost);

    // 修改技能威力
    if (context.skill) {
      context.skill.power = finalPower;
    }
    context.skillPower = finalPower;

    results.push(
      this.createResult(
        true,
        'attacker',
        'reversal',
        `反转威力：${finalPower}（HP ${Math.floor(hpRatio * 100)}%）`,
        finalPower,
        { 
          reversalType: 'hp_ratio',
          hpRatio,
          basePower: this.basePower,
          maxPower: this.maxPower
        }
      )
    );

    this.log(`反转效果：HP ${Math.floor(hpRatio * 100)}%，威力${finalPower}`);
  }

  /**
   * 应用能力变化反转
   */
  private applyStatChangesReversal(context: IEffectContext, results: IEffectResult[]): void {
    if (context.timing !== EffectTiming.AFTER_SKILL) {
      return;
    }

    const target = this.getDefender(context);
    if (!target) {
      this.log('反转效果：目标不存在', 'warn');
      return;
    }

    if (!target.battleLevels) {
      target.battleLevels = [0, 0, 0, 0, 0, 0];
    }

    // 反转所有能力变化
    const changes: string[] = [];
    const statNames = ['攻击', '防御', '特攻', '特防', '速度', '命中'];

    for (let i = 0; i < target.battleLevels.length; i++) {
      const oldLevel = target.battleLevels[i];
      if (oldLevel !== 0) {
        target.battleLevels[i] = -oldLevel;
        changes.push(`${statNames[i]}:${oldLevel}→${-oldLevel}`);
      }
    }

    if (changes.length > 0) {
      results.push(
        this.createResult(
          true,
          'defender',
          'reversal',
          `反转能力变化：${changes.join(', ')}`,
          0,
          { reversalType: 'stat_changes', changes }
        )
      );

      this.log(`反转效果：反转能力变化（${changes.join(', ')}）`);
    } else {
      this.log('反转效果：目标没有能力变化', 'warn');
    }
  }

  public validate(params: any): boolean {
    if (!params.reversalType || !['hp_ratio', 'stat_changes'].includes(params.reversalType)) {
      this.log('反转效果：reversalType必须是hp_ratio或stat_changes', 'error');
      return false;
    }

    if (params.reversalType === 'hp_ratio') {
      if (params.basePower !== undefined && (typeof params.basePower !== 'number' || params.basePower < 0)) {
        this.log('反转效果：basePower必须是非负数', 'error');
        return false;
      }

      if (params.maxPower !== undefined && (typeof params.maxPower !== 'number' || params.maxPower < 0)) {
        this.log('反转效果：maxPower必须是非负数', 'error');
        return false;
      }

      if (params.basePower !== undefined && params.maxPower !== undefined && params.basePower >= params.maxPower) {
        this.log('反转效果：basePower必须小于maxPower', 'error');
        return false;
      }
    }

    return true;
  }
}
