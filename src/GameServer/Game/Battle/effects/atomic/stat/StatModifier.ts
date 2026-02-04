import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType, IStatModifierParams } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 能力变化原子效果
 * 修改目标的能力等级（攻击、防御、特攻、特防、速度、命中、闪避）
 * 
 * 能力索引：
 * - 0: 攻击 (Attack)
 * - 1: 防御 (Defense)
 * - 2: 特攻 (Special Attack)
 * - 3: 特防 (Special Defense)
 * - 4: 速度 (Speed)
 * - 5: 命中/闪避 (Accuracy/Evasion)
 * 
 * @example
 * // 提升自身攻击1级
 * { type: 'stat_modifier', target: 'self', stat: 0, change: 1, mode: 'level' }
 * 
 * // 降低对方防御2级
 * { type: 'stat_modifier', target: 'opponent', stat: 1, change: -2, mode: 'level' }
 * 
 * // 提升自身速度3级
 * { type: 'stat_modifier', target: 'self', stat: 4, change: 3, mode: 'level' }
 */
export class StatModifier extends BaseAtomicEffect {
  private params: IStatModifierParams;

  // 能力名称映射
  private static readonly STAT_NAMES = ['攻击', '防御', '特攻', '特防', '速度', '命中/闪避'];

  constructor(params: IStatModifierParams) {
    super(
      AtomicEffectType.STAT_MODIFIER,
      'Stat Modifier',
      [EffectTiming.AFTER_SKILL, EffectTiming.AFTER_DAMAGE_APPLY]
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

    // 初始化能力变化数组
    if (!target.battleLevels) {
      target.battleLevels = [0, 0, 0, 0, 0, 0];
    }

    const statIndex = this.params.stat;
    const oldValue = target.battleLevels[statIndex];
    let newValue = oldValue;

    // 根据模式修改能力
    if (this.params.mode === 'level') {
      // 等级模式：能力等级变化范围 -6 到 +6
      newValue = Math.max(-6, Math.min(6, oldValue + this.params.change));
    } else if (this.params.mode === 'value') {
      // 数值模式：直接设置能力值
      newValue = this.params.change;
    } else if (this.params.mode === 'sync') {
      // 同步模式：同步对方的能力等级
      const opponent = this.params.target === 'self' ? context.defender : context.attacker;
      if (opponent && opponent.battleLevels) {
        newValue = opponent.battleLevels[statIndex];
      }
    }

    target.battleLevels[statIndex] = newValue;

    const statName = StatModifier.STAT_NAMES[statIndex] || `能力${statIndex}`;
    const changeDesc = newValue > oldValue ? '提升' : newValue < oldValue ? '下降' : '不变';
    const targetName = this.params.target === 'self' ? 'attacker' : 'defender';

    results.push(
      this.createResult(
        true,
        targetName,
        'stat_modifier',
        `${statName}${changeDesc}（${oldValue} -> ${newValue}）`,
        newValue,
        { stat: statIndex, oldValue, newValue, change: this.params.change }
      )
    );

    this.log(`${statName}变化: ${oldValue} -> ${newValue}`);
    return results;
  }

  public validate(params: any): boolean {
    if (!params || params.type !== AtomicEffectType.STAT_MODIFIER) {
      return false;
    }

    if (!['self', 'opponent'].includes(params.target)) {
      this.log(`无效的目标: ${params.target}`, 'error');
      return false;
    }

    if (typeof params.stat !== 'number' || params.stat < 0 || params.stat > 5) {
      this.log(`无效的能力索引: ${params.stat}`, 'error');
      return false;
    }

    if (typeof params.change !== 'number') {
      this.log(`无效的变化值: ${params.change}`, 'error');
      return false;
    }

    if (!['level', 'value', 'sync'].includes(params.mode)) {
      this.log(`无效的模式: ${params.mode}`, 'error');
      return false;
    }

    return true;
  }
}
