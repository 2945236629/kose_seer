import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 持续多能力变化参数接口
 */
export interface IContinuousMultiStatBoostParams {
  /** 持续回合数 */
  duration?: number;
  /** 能力变化配置 */
  statChanges?: Array<{
    stat: number;
    change: number;
  }>;
  /** 目标（self/opponent） */
  target?: string;
}

/**
 * 持续多能力变化状态
 */
interface IMultiStatBoostAura {
  duration: number;
  remainingTurns: number;
  statChanges: Array<{
    stat: number;
    change: number;
  }>;
  target: string;
}

/**
 * 持续多能力变化效果
 * 
 * 每回合自动修改多个能力（可以是提升或下降）
 * 
 * @category Special
 */
export class ContinuousMultiStatBoost extends BaseAtomicEffect {
  private duration: number;
  private statChanges: Array<{ stat: number; change: number }>;
  private target: string;
  
  // 追踪每个精灵的光环状态
  private auras: Map<number, IMultiStatBoostAura> = new Map();

  constructor(params: IContinuousMultiStatBoostParams) {
    super(AtomicEffectType.SPECIAL, 'ContinuousMultiStatBoost', []);
    this.duration = params.duration || 3;
    this.statChanges = params.statChanges || [
      { stat: 0, change: -1 }, // 攻击-1
      { stat: 2, change: -1 }  // 防御-1
    ];
    this.target = params.target || 'opponent';
  }

  public validate(params: any): boolean {
    return true;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker, defender } = context;
    const targetPet = this.target === 'self' ? attacker : defender;

    // 创建光环
    this.auras.set(targetPet.id, {
      duration: this.duration,
      remainingTurns: this.duration,
      statChanges: this.statChanges,
      target: this.target
    });

    return [this.createResult(
      true,
      this.target === 'self' ? 'attacker' : 'defender',
      'continuous_multi_stat_boost',
      `持续${this.duration}回合多能力变化光环`,
      this.duration,
      {
        duration: this.duration,
        statChanges: this.statChanges,
        target: this.target
      }
    )];
  }

  /**
   * 每回合触发（在回合开始时调用）
   */
  public onTurnStart(petId: number, pet: any): IEffectResult[] {
    const aura = this.auras.get(petId);
    if (!aura) return [];

    const results: IEffectResult[] = [];

    // 修改能力
    for (const { stat, change } of aura.statChanges) {
      if (pet.statLevels && pet.statLevels[stat] !== undefined) {
        pet.statLevels[stat] += change;
        
        // 限制在[-6, 6]范围内
        pet.statLevels[stat] = Math.max(-6, Math.min(6, pet.statLevels[stat]));
      }
    }

    results.push(this.createResult(
      true,
      'attacker',
      'continuous_multi_stat_boost_trigger',
      `持续多能力变化触发`,
      aura.statChanges.length,
      {
        statChanges: aura.statChanges,
        remainingTurns: aura.remainingTurns
      }
    ));

    // 减少剩余回合数
    aura.remainingTurns--;
    if (aura.remainingTurns <= 0) {
      this.auras.delete(petId);
    }

    return results;
  }

  /**
   * 移除光环
   */
  public removeAura(petId: number): void {
    this.auras.delete(petId);
  }

  /**
   * 检查是否有光环
   */
  public hasAura(petId: number): boolean {
    return this.auras.has(petId);
  }
}
