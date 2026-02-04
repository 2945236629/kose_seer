import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 吸血光环效果参数接口
 */
export interface IDrainAuraParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'drain_aura';
  /** 吸血比例（0-100，表示伤害的百分比） */
  drainPercent: number;
  /** 持续回合数（可选，默认永久） */
  duration?: number;
  /** 是否对所有攻击生效（true=所有，false=仅自己的攻击） */
  affectAllAttacks?: boolean;
  /** 最大吸血量（可选，默认无限制） */
  maxDrain?: number;
}

/**
 * 吸血光环效果
 * 
 * 功能：
 * - 攻击造成伤害时，回复伤害的一定百分比HP
 * - 可以设置持续回合数或永久生效
 * - 支持限制最大吸血量
 * - 可以选择是否对所有攻击生效
 * 
 * 使用场景：
 * - 吸血（攻击回复50%伤害）
 * - 生命汲取（攻击回复75%伤害）
 * - 吸取之力（持续5回合，攻击回复30%伤害）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "drain_aura",
 *   "drainPercent": 50,
 *   "duration": 5,
 *   "affectAllAttacks": true,
 *   "maxDrain": 100
 * }
 * ```
 * 
 * 状态数据结构：
 * ```typescript
 * {
 *   drainPercent: number;       // 吸血比例
 *   remainingTurns?: number;    // 剩余回合数
 *   isActive: boolean;          // 是否激活
 *   totalDrained: number;       // 总吸血量
 * }
 * ```
 */
export class DrainAura extends BaseAtomicEffect {
  private drainPercent: number;
  private duration?: number;
  private affectAllAttacks: boolean;
  private maxDrain: number;

  constructor(params: IDrainAuraParams) {
    super(
      AtomicEffectType.SPECIAL,
      'DrainAura',
      [EffectTiming.AFTER_SKILL, EffectTiming.AFTER_DAMAGE_APPLY, EffectTiming.TURN_END]
    );

    this.drainPercent = params.drainPercent;
    this.duration = params.duration;
    this.affectAllAttacks = params.affectAllAttacks ?? true;
    this.maxDrain = params.maxDrain ?? Infinity;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const attacker = this.getAttacker(context);

    // 在AFTER_SKILL时机激活光环
    if (context.timing === EffectTiming.AFTER_SKILL) {
      const auraState = this.getAuraState(attacker);
      auraState.isActive = true;
      auraState.drainPercent = this.drainPercent;
      if (this.duration !== undefined) {
        auraState.remainingTurns = this.duration;
      }

      results.push(
        this.createResult(
          true,
          'attacker',
          'drain_aura_activate',
          `吸血光环激活！攻击将回复${this.drainPercent}%伤害`,
          this.drainPercent,
          { duration: this.duration }
        )
      );

      this.log(`吸血光环激活: ${this.drainPercent}%, 持续${this.duration ?? '永久'}回合`);
    }

    // 在AFTER_DAMAGE_APPLY时机执行吸血
    if (context.timing === EffectTiming.AFTER_DAMAGE_APPLY) {
      const auraState = this.getAuraState(attacker);

      if (!auraState.isActive) {
        return results;
      }

      const damage = context.damage ?? 0;
      if (damage <= 0) {
        return results;
      }

      // 计算吸血量
      let drainAmount = Math.floor(damage * auraState.drainPercent / 100);
      if (drainAmount > this.maxDrain) {
        drainAmount = this.maxDrain;
      }

      // 检查是否超过最大HP
      const currentHp = attacker.hp ?? 0;
      const maxHp = attacker.maxHp ?? 0;
      const actualHeal = Math.min(drainAmount, maxHp - currentHp);

      if (actualHeal > 0) {
        // 回复HP
        if (attacker.hp !== undefined) {
          attacker.hp += actualHeal;
        }

        // 记录总吸血量
        auraState.totalDrained = (auraState.totalDrained ?? 0) + actualHeal;

        results.push(
          this.createResult(
            true,
            'attacker',
            'drain_aura_heal',
            `吸血光环回复了${actualHeal}HP！`,
            actualHeal,
            {
              damage,
              drainPercent: auraState.drainPercent,
              totalDrained: auraState.totalDrained
            }
          )
        );

        this.log(
          `吸血光环回复: 伤害${damage} × ${auraState.drainPercent}% = ${actualHeal}HP ` +
          `(总计${auraState.totalDrained}HP)`
        );
      }
    }

    // 在TURN_END时机检查持续时间
    if (context.timing === EffectTiming.TURN_END) {
      const auraState = this.getAuraState(attacker);

      if (auraState.isActive && auraState.remainingTurns !== undefined) {
        auraState.remainingTurns--;
        if (auraState.remainingTurns <= 0) {
          // 光环结束
          auraState.isActive = false;

          results.push(
            this.createResult(
              true,
              'attacker',
              'drain_aura_end',
              `吸血光环结束了！`,
              0,
              { totalDrained: auraState.totalDrained }
            )
          );

          this.log(`吸血光环结束，总计吸血${auraState.totalDrained ?? 0}HP`);
        }
      }
    }

    return results;
  }

  public validate(params: any): boolean {
    if (params.drainPercent === undefined || params.drainPercent < 0 || params.drainPercent > 100) {
      this.log('drainPercent必须在0-100之间', 'error');
      return false;
    }
    if (params.duration !== undefined && params.duration < 1) {
      this.log('duration必须大于0', 'error');
      return false;
    }
    return true;
  }

  /**
   * 获取光环状态
   */
  private getAuraState(pet: any): {
    drainPercent: number;
    remainingTurns?: number;
    isActive: boolean;
    totalDrained?: number;
  } {
    if (!pet.effectStates) {
      pet.effectStates = {};
    }
    if (!pet.effectStates.drainAura) {
      pet.effectStates.drainAura = {
        drainPercent: 0,
        isActive: false,
        totalDrained: 0
      };
    }
    return pet.effectStates.drainAura;
  }
}
