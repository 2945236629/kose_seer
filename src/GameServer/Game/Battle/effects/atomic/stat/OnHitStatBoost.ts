import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 受击提升能力参数接口
 */
export interface IOnHitStatBoostParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'on_hit_stat_boost';
  duration: number;             // 持续回合数
  stat: number;                 // 提升的能力索引（0=攻击,1=防御,2=特攻,3=特防,4=速度）
  change: number;               // 能力变化值
  probability?: number;         // 触发概率（0-100）
  minDamage?: number;           // 最小伤害阈值（只有伤害>=此值才触发）
}

/**
 * 受击提升能力原子效果
 * 在X回合内，受到任何伤害时，自身指定能力提高
 * 
 * 用途：
 * - Effect_123: 受击提升能力（受到伤害时提升防御）
 * 
 * 特性：
 * - 受到伤害时触发
 * - 可以提升任意能力
 * - 支持概率触发
 * - 可以设置最小伤害阈值
 * 
 * @example
 * // 受到伤害时100%提升1级防御，持续5回合
 * {
 *   type: 'special',
 *   specialType: 'on_hit_stat_boost',
 *   duration: 5,
 *   stat: 1, // 防御
 *   change: 1,
 *   probability: 100
 * }
 * 
 * @example
 * // 受到50点以上伤害时50%提升2级速度
 * {
 *   type: 'special',
 *   specialType: 'on_hit_stat_boost',
 *   duration: 3,
 *   stat: 4, // 速度
 *   change: 2,
 *   probability: 50,
 *   minDamage: 50
 * }
 * 
 * @category Stat
 */
export class OnHitStatBoost extends BaseAtomicEffect {
  private params: IOnHitStatBoostParams;

  // 能力名称映射
  private static readonly STAT_NAMES: string[] = [
    '攻击', '防御', '特攻', '特防', '速度', '命中'
  ];

  constructor(params: IOnHitStatBoostParams) {
    super(AtomicEffectType.SPECIAL, 'On Hit Stat Boost', [EffectTiming.AFTER_DAMAGE_APPLY]);
    this.params = params;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const defender = context.defender;
    const damage = context.damage;
    
    // 检查是否受到伤害
    if (damage <= 0) {
      return results;
    }
    
    // 检查最小伤害阈值
    if (this.params.minDamage && damage < this.params.minDamage) {
      return results;
    }
    
    // 检查概率
    const probability = this.params.probability || 100;
    if (!this.checkProbability(probability)) {
      results.push(this.createResult(
        false,
        'defender',
        'on_hit_stat_boost_failed',
        `受击提升触发失败（概率${probability}%）`,
        0
      ));
      return results;
    }
    
    // 初始化能力变化数组
    if (!defender.battleLevels) {
      defender.battleLevels = [0, 0, 0, 0, 0, 0];
    }
    
    const statIndex = this.params.stat;
    const oldValue = defender.battleLevels[statIndex];
    const newValue = Math.max(-6, Math.min(6, oldValue + this.params.change));
    
    // 应用能力变化
    defender.battleLevels[statIndex] = newValue;
    
    const statName = OnHitStatBoost.STAT_NAMES[statIndex] || `能力${statIndex}`;
    const changeDesc = this.params.change > 0 ? '提升' : '下降';
    const changeAmount = Math.abs(this.params.change);
    
    results.push(this.createResult(
      true,
      'defender',
      'on_hit_stat_boost',
      `受击后${statName}${changeDesc}${changeAmount}级`,
      newValue,
      { stat: statIndex, oldValue, newValue, damage }
    ));
    
    this.log(`受击提升: 受到${damage}伤害, ${statName} ${oldValue} -> ${newValue}`);
    
    return results;
  }

  public validate(params: any): boolean {
    return params &&
           params.type === AtomicEffectType.SPECIAL &&
           params.specialType === 'on_hit_stat_boost' &&
           typeof params.duration === 'number' &&
           params.duration > 0 &&
           typeof params.stat === 'number' &&
           params.stat >= 0 &&
           params.stat <= 5 &&
           typeof params.change === 'number';
  }
}
