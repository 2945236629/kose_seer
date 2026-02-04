import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 忍耐效果参数接口
 */
export interface IEndureParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'endure';
  duration: number;             // 持续回合数
  minHp?: number;               // 保留的最小HP（默认1）
  probability?: number;         // 触发概率（0-100，默认100）
  oncePerBattle?: boolean;      // 是否每场战斗只触发一次
}

/**
 * 忍耐原子效果
 * 在X回合内，受到致死攻击时保留1点HP
 * 
 * 用途：
 * - Effect_68: 保留1血（3回合内必定触发一次）
 * 
 * 特性：
 * - 防止被一击秒杀
 * - 可以设置保留的最小HP
 * - 可以设置触发概率
 * - 可以限制每场战斗只触发一次
 * 
 * @example
 * // 3回合内受到致死攻击时保留1HP
 * {
 *   type: 'special',
 *   specialType: 'endure',
 *   duration: 3,
 *   minHp: 1,
 *   oncePerBattle: true
 * }
 * 
 * @example
 * // 5回合内50%概率保留5HP
 * {
 *   type: 'special',
 *   specialType: 'endure',
 *   duration: 5,
 *   minHp: 5,
 *   probability: 50
 * }
 * 
 * @category Defensive
 */
export class Endure extends BaseAtomicEffect {
  private params: IEndureParams;
  private static triggeredInBattle: Set<number> = new Set();

  constructor(params: IEndureParams) {
    super(AtomicEffectType.SPECIAL, 'Endure', [EffectTiming.BEFORE_DAMAGE_APPLY]);
    this.params = params;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const defender = context.defender;
    const damage = context.damage;
    
    // 检查是否会被击败
    const wouldBeFatal = defender.hp - damage <= 0;
    if (!wouldBeFatal) {
      return results;
    }
    
    // 检查是否已经在本场战斗中触发过
    if (this.params.oncePerBattle && Endure.triggeredInBattle.has(defender.id)) {
      results.push(this.createResult(
        false,
        'defender',
        'endure_used',
        '忍耐效果已在本场战斗中使用过',
        0
      ));
      return results;
    }
    
    // 检查概率
    const probability = this.params.probability || 100;
    if (!this.checkProbability(probability)) {
      results.push(this.createResult(
        false,
        'defender',
        'endure_failed',
        `忍耐效果触发失败（概率${probability}%）`,
        0
      ));
      return results;
    }
    
    // 触发忍耐效果
    const minHp = this.params.minHp || 1;
    const newDamage = defender.hp - minHp;
    
    // 修改伤害值，确保保留最小HP
    context.damage = Math.max(0, newDamage);
    
    // 标记已触发
    if (this.params.oncePerBattle) {
      Endure.triggeredInBattle.add(defender.id);
    }
    
    results.push(this.createResult(
      true,
      'defender',
      'endure',
      `忍耐效果触发，保留${minHp}点HP`,
      minHp,
      { originalDamage: damage, newDamage: context.damage, minHp }
    ));
    
    this.log(`忍耐效果触发: 原伤害${damage}, 修正后${context.damage}, 保留${minHp}HP`);
    
    return results;
  }

  public validate(params: any): boolean {
    return params &&
           params.type === AtomicEffectType.SPECIAL &&
           params.specialType === 'endure' &&
           typeof params.duration === 'number' &&
           params.duration > 0;
  }

  /**
   * 重置战斗触发记录（新战斗开始时调用）
   */
  public static ResetBattleTriggers(): void {
    Endure.triggeredInBattle.clear();
  }

  /**
   * 检查精灵是否已触发过忍耐
   */
  public static HasTriggered(petId: number): boolean {
    return Endure.triggeredInBattle.has(petId);
  }
}
