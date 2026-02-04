import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 闪避提升能力参数接口
 */
export interface IOnEvadeBoostParams {
  /** 持续回合数 */
  duration: number;
  /** 触发概率 */
  chance: number;
  /** 提升的能力索引 */
  statIndex: number;
  /** 提升等级 */
  boostLevel: number;
}

/**
 * 闪避提升能力效果
 * 
 * 每次躲避攻击都有概率提升能力
 * 
 * @category Special
 * @example
 * // 闪避提升能力
 * {
 *   duration: 5,
 *   chance: 0.5,
 *   statIndex: 4, // 速度
 *   boostLevel: 1
 * }
 */
export class OnEvadeBoost extends BaseAtomicEffect {
  private duration: number;
  private chance: number;
  private statIndex: number;
  private boostLevel: number;

  constructor(params: IOnEvadeBoostParams) {
    super(AtomicEffectType.SPECIAL, 'OnEvadeBoost', []);
    this.duration = params.duration;
    this.chance = params.chance;
    this.statIndex = params.statIndex;
    this.boostLevel = params.boostLevel;
  }

  public validate(params: any): boolean {
    return this.duration > 0 && this.chance > 0 && this.chance <= 1;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker } = context;

    // 检查是否闪避成功（需要从context中获取，这里简化处理）
    // 实际使用时需要战斗系统传入missed标志
    const missed = false; // 简化处理

    if (!missed) {
      return [this.createResult(
        false,
        'attacker',
        'on_evade_boost',
        '未闪避攻击'
      )];
    }

    // 概率判定
    const roll = Math.random();
    if (roll > this.chance) {
      return [this.createResult(
        false,
        'attacker',
        'on_evade_boost',
        `概率判定失败（${(roll * 100).toFixed(1)}% > ${(this.chance * 100).toFixed(1)}%）`
      )];
    }

    // 提升能力
    if (!attacker.battleLevels) {
      attacker.battleLevels = [0, 0, 0, 0, 0, 0];
    }

    const beforeLevel = attacker.battleLevels[this.statIndex];
    attacker.battleLevels[this.statIndex] = Math.min(6, beforeLevel + this.boostLevel);
    const actualBoost = attacker.battleLevels[this.statIndex] - beforeLevel;

    const statNames = ['攻击', '防御', '特攻', '特防', '速度', '命中'];

    return [this.createResult(
      actualBoost > 0,
      'attacker',
      'on_evade_boost',
      `闪避提升${statNames[this.statIndex]}（+${actualBoost}）`,
      actualBoost,
      {
        statIndex: this.statIndex,
        boostLevel: actualBoost,
        duration: this.duration
      }
    )];
  }
}
