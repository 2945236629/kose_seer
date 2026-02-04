import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 集气效果参数接口
 */
export interface IFocusEnergyParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'focus_energy';
  critBonus: number;            // 暴击率加成（百分比）
  duration: number;             // 持续回合数
  guaranteedCrit?: boolean;     // 是否必定暴击
}

/**
 * 集气原子效果
 * 在X回合内提升暴击率
 * 
 * 用途：
 * - Effect_32: 持续提升暴击率（3回合，+50%）
 * - Effect_71: 献祭暴击提升（必定暴击）
 * 
 * 特性：
 * - 可以提升暴击率或设置必定暴击
 * - 持续多回合
 * - 可以与其他暴击加成叠加
 * 
 * @example
 * // 3回合内暴击率+50%
 * {
 *   type: 'special',
 *   specialType: 'focus_energy',
 *   critBonus: 50,
 *   duration: 3
 * }
 * 
 * @example
 * // 3回合内必定暴击
 * {
 *   type: 'special',
 *   specialType: 'focus_energy',
 *   critBonus: 0,
 *   duration: 3,
 *   guaranteedCrit: true
 * }
 * 
 * @category Modifier
 */
export class FocusEnergy extends BaseAtomicEffect {
  private params: IFocusEnergyParams;

  constructor(params: IFocusEnergyParams) {
    super(AtomicEffectType.SPECIAL, 'Focus Energy', [EffectTiming.BEFORE_CRIT_CHECK]);
    this.params = params;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    
    // 如果设置了必定暴击
    if (this.params.guaranteedCrit) {
      context.isCrit = true;
      context.critRateModifier = 100; // 设置为100%确保暴击
      
      results.push(this.createResult(
        true,
        'attacker',
        'focus_energy_guaranteed',
        '集气状态：必定暴击',
        100
      ));
      
      this.log('集气效果: 必定暴击');
    } else {
      // 增加暴击率
      const oldCritRate = context.critRate || 0;
      const newCritRate = oldCritRate + this.params.critBonus;
      context.critRate = newCritRate;
      context.critRateModifier += this.params.critBonus;
      
      results.push(this.createResult(
        true,
        'attacker',
        'focus_energy_boost',
        `集气状态：暴击率+${this.params.critBonus}%`,
        this.params.critBonus,
        { oldCritRate, newCritRate }
      ));
      
      this.log(`集气效果: 暴击率 ${oldCritRate}% -> ${newCritRate}%`);
    }
    
    return results;
  }

  public validate(params: any): boolean {
    return params &&
           params.type === AtomicEffectType.SPECIAL &&
           params.specialType === 'focus_energy' &&
           typeof params.duration === 'number' &&
           params.duration > 0 &&
           (typeof params.critBonus === 'number' || params.guaranteedCrit === true);
  }
}
