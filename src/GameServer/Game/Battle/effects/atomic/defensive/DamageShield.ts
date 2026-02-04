import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 伤害护盾参数接口
 */
export interface IDamageShieldParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'damage_shield';
  reductionRatio?: number;      // 伤害减免比例（0-1）
  reductionFixed?: number;      // 固定减免值
  duration: number;             // 持续回合数
  shieldType?: 'all' | 'physical' | 'special'; // 护盾类型
  maxReduction?: number;        // 最大减免值
}

/**
 * 伤害护盾原子效果
 * 在X回合内减少特定类型的伤害
 * 
 * 用途：
 * - Effect_50: 持续物理伤害减免（5回合，减免50%）
 * - Effect_54: 持续降低对方伤害
 * - Effect_125: 伤害上限
 * 
 * 特性：
 * - 支持比例减免和固定值减免
 * - 可以指定护盾类型（物理/特殊/全部）
 * - 可以设置最大减免值
 * 
 * @example
 * // 5回合内物理伤害减免50%
 * {
 *   type: 'special',
 *   specialType: 'damage_shield',
 *   reductionRatio: 0.5,
 *   duration: 5,
 *   shieldType: 'physical'
 * }
 * 
 * @example
 * // 3回合内每次受到的伤害不超过100
 * {
 *   type: 'special',
 *   specialType: 'damage_shield',
 *   duration: 3,
 *   maxReduction: 100,
 *   shieldType: 'all'
 * }
 * 
 * @category Defensive
 */
export class DamageShield extends BaseAtomicEffect {
  private params: IDamageShieldParams;

  constructor(params: IDamageShieldParams) {
    super(AtomicEffectType.SPECIAL, 'Damage Shield', [EffectTiming.BEFORE_DAMAGE_APPLY]);
    this.params = params;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const originalDamage = context.damage;
    
    // 检查伤害是否为0
    if (originalDamage <= 0) {
      return results;
    }
    
    // 检查护盾类型
    if (this.params.shieldType) {
      const skillCategory = context.skillCategory;
      if (this.params.shieldType === 'physical' && skillCategory !== 1) {
        return results;
      }
      if (this.params.shieldType === 'special' && skillCategory !== 2) {
        return results;
      }
    }
    
    let newDamage = originalDamage;
    let reductionAmount = 0;
    
    // 计算减免
    if (this.params.reductionFixed !== undefined) {
      // 固定值减免
      reductionAmount = this.params.reductionFixed;
      newDamage = Math.max(1, originalDamage - reductionAmount);
    } else if (this.params.reductionRatio !== undefined) {
      // 比例减免
      reductionAmount = Math.floor(originalDamage * this.params.reductionRatio);
      newDamage = Math.max(1, originalDamage - reductionAmount);
    }
    
    // 应用最大减免限制
    if (this.params.maxReduction !== undefined) {
      if (originalDamage > this.params.maxReduction) {
        newDamage = this.params.maxReduction;
        reductionAmount = originalDamage - newDamage;
      }
    }
    
    // 更新伤害值
    if (newDamage !== originalDamage) {
      context.damage = newDamage;
      
      const shieldTypeName = this.getShieldTypeName(this.params.shieldType);
      
      results.push(this.createResult(
        true,
        'defender',
        'damage_shield',
        `${shieldTypeName}护盾减免${reductionAmount}点伤害`,
        reductionAmount,
        { originalDamage, newDamage, reductionAmount }
      ));
      
      this.log(`伤害护盾: ${originalDamage} -> ${newDamage} (减免${reductionAmount})`);
    }
    
    return results;
  }

  public validate(params: any): boolean {
    if (!params || params.type !== AtomicEffectType.SPECIAL || params.specialType !== 'damage_shield') {
      return false;
    }
    
    if (typeof params.duration !== 'number' || params.duration < 1) {
      return false;
    }
    
    // 必须有reductionRatio、reductionFixed或maxReduction之一
    const hasRatio = typeof params.reductionRatio === 'number';
    const hasFixed = typeof params.reductionFixed === 'number';
    const hasMax = typeof params.maxReduction === 'number';
    
    return hasRatio || hasFixed || hasMax;
  }

  /**
   * 获取护盾类型名称
   */
  private getShieldTypeName(type?: string): string {
    switch (type) {
      case 'physical': return '物理';
      case 'special': return '特殊';
      case 'all':
      default: return '全';
    }
  }
}
