import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 持续能力提升参数接口
 */
export interface IContinuousStatBoostParams {
  /** 持续回合数 */
  duration?: number;
  /** 能力索引数组 */
  stats?: number[];
  /** 每回合提升等级 */
  levelChange?: number;
  /** 目标（self/opponent） */
  target?: string;
}

/**
 * 持续能力提升状态
 */
interface IStatBoostAura {
  duration: number;
  remainingTurns: number;
  stats: number[];
  levelChange: number;
  target: string;
}

/**
 * 持续能力提升效果
 * 
 * 每回合自动提升指定的多个能力
 * 
 * @category Special
 */
export class ContinuousStatBoost extends BaseAtomicEffect {
  private duration: number;
  private stats: number[];
  private levelChange: number;
  private target: string;
  
  // 追踪每个精灵的光环状态
  private auras: Map<number, IStatBoostAura> = new Map();

  constructor(params: IContinuousStatBoostParams) {
    super(AtomicEffectType.SPECIAL, 'ContinuousStatBoost', []);
    this.duration = params.duration || 3;
    this.stats = params.stats || [0, 4]; // 默认：攻击和速度
    this.levelChange = params.levelChange || 1;
    this.target = params.target || 'self';
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
      stats: this.stats,
      levelChange: this.levelChange,
      target: this.target
    });

    return [this.createResult(
      true,
      this.target === 'self' ? 'attacker' : 'defender',
      'continuous_stat_boost',
      `持续${this.duration}回合能力提升光环`,
      this.duration,
      {
        duration: this.duration,
        stats: this.stats,
        levelChange: this.levelChange,
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

    // 提升能力
    for (const statIndex of aura.stats) {
      if (pet.statLevels && pet.statLevels[statIndex] !== undefined) {
        pet.statLevels[statIndex] += aura.levelChange;
        
        // 限制在[-6, 6]范围内
        pet.statLevels[statIndex] = Math.max(-6, Math.min(6, pet.statLevels[statIndex]));
      }
    }

    results.push(this.createResult(
      true,
      'attacker',
      'continuous_stat_boost_trigger',
      `持续能力提升触发`,
      aura.levelChange,
      {
        stats: aura.stats,
        levelChange: aura.levelChange,
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
