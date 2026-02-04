import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 反击效果参数接口
 */
export interface ICounterParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'counter';
  reflectRatio: number;         // 反弹比例（0-1）
  reflectFixed?: number;        // 固定反弹值（优先于比例）
  duration: number;             // 持续回合数
  minTurns?: number;            // 最小持续回合（随机范围）
  maxTurns?: number;            // 最大持续回合（随机范围）
  counterType?: 'all' | 'physical' | 'special'; // 反击类型
}

/**
 * 反击原子效果
 * 在X~Y回合内，将自身受到的伤害按比例反弹给对方
 * 
 * 用途：
 * - Effect_21: 持续反弹伤害（3-5回合，反弹50%）
 * - Effect_462: 固定值反弹
 * 
 * 特性：
 * - 支持比例反弹和固定值反弹
 * - 支持随机持续回合数
 * - 可以指定反击类型（物理/特殊/全部）
 * 
 * @example
 * // 3-5回合内反弹50%伤害
 * {
 *   type: 'special',
 *   specialType: 'counter',
 *   reflectRatio: 0.5,
 *   duration: 0,
 *   minTurns: 3,
 *   maxTurns: 5,
 *   counterType: 'all'
 * }
 * 
 * @example
 * // 固定反弹100点伤害，持续3回合
 * {
 *   type: 'special',
 *   specialType: 'counter',
 *   reflectFixed: 100,
 *   duration: 3,
 *   counterType: 'physical'
 * }
 * 
 * @category Defensive
 */
export class Counter extends BaseAtomicEffect {
  private params: ICounterParams;

  constructor(params: ICounterParams) {
    super(AtomicEffectType.SPECIAL, 'Counter', [EffectTiming.AFTER_DAMAGE_APPLY]);
    this.params = params;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const attacker = context.attacker;
    const defender = context.defender;
    const damage = context.damage;
    
    // 检查是否有伤害
    if (damage <= 0) {
      return results;
    }
    
    // 检查反击类型
    if (this.params.counterType) {
      const skillCategory = context.skillCategory;
      if (this.params.counterType === 'physical' && skillCategory !== 1) {
        return results;
      }
      if (this.params.counterType === 'special' && skillCategory !== 2) {
        return results;
      }
    }
    
    // 计算反弹伤害
    let counterDamage = 0;
    if (this.params.reflectFixed !== undefined) {
      // 固定值反弹
      counterDamage = this.params.reflectFixed;
    } else {
      // 比例反弹
      counterDamage = Math.floor(damage * this.params.reflectRatio);
    }
    
    // 确保反弹伤害至少为1
    counterDamage = Math.max(1, counterDamage);
    
    // 对攻击者造成反弹伤害
    const actualCounterDamage = Math.min(counterDamage, attacker.hp);
    if (actualCounterDamage > 0) {
      attacker.hp -= actualCounterDamage;
      
      results.push(this.createResult(
        true,
        'attacker',
        'counter_damage',
        `受到${actualCounterDamage}点反击伤害`,
        actualCounterDamage,
        { originalDamage: damage, counterDamage: actualCounterDamage }
      ));
      
      this.log(`反击: 受到${damage}伤害, 反弹${actualCounterDamage}伤害`);
    }
    
    return results;
  }

  public validate(params: any): boolean {
    if (!params || params.type !== AtomicEffectType.SPECIAL || params.specialType !== 'counter') {
      return false;
    }
    
    // 必须有reflectRatio或reflectFixed之一
    const hasRatio = typeof params.reflectRatio === 'number';
    const hasFixed = typeof params.reflectFixed === 'number';
    
    if (!hasRatio && !hasFixed) {
      return false;
    }
    
    // 如果有随机范围，检查范围有效性
    if (params.minTurns !== undefined && params.maxTurns !== undefined) {
      if (params.minTurns > params.maxTurns || params.minTurns < 1) {
        return false;
      }
    } else if (typeof params.duration !== 'number' || params.duration < 1) {
      return false;
    }
    
    return true;
  }

  /**
   * 获取实际持续回合数
   */
  public getDuration(): number {
    if (this.params.minTurns !== undefined && this.params.maxTurns !== undefined) {
      const range = this.params.maxTurns - this.params.minTurns + 1;
      return this.params.minTurns + Math.floor(Math.random() * range);
    }
    return this.params.duration;
  }
}
