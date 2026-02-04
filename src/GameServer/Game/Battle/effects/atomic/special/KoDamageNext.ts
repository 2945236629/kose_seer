import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 击败伤害下一只效果参数接口
 */
export interface IKoDamageNextParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'ko_damage_next';
  /** 伤害模式（percent=百分比，fixed=固定值，overflow=溢出伤害） */
  mode: 'percent' | 'fixed' | 'overflow';
  /** 伤害值（percent模式为百分比0-100，fixed模式为固定值） */
  value?: number;
}

/**
 * 击败伤害下一只效果
 * 
 * 功能：
 * - 击败对手后对下一只精灵造成伤害
 * - 支持百分比、固定值、溢出伤害三种模式
 * - 溢出伤害模式：将超出击倒所需的伤害转移到下一只
 * 
 * 使用场景：
 * - 连锁攻击（击败后对下一只造成50%伤害）
 * - 余波（击败后对下一只造成固定伤害）
 * - 贯穿（溢出伤害转移到下一只）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "ko_damage_next",
 *   "mode": "overflow"
 * }
 * ```
 */
export class KoDamageNext extends BaseAtomicEffect {
  private mode: 'percent' | 'fixed' | 'overflow';
  private value: number;

  constructor(params: IKoDamageNextParams) {
    super(
      AtomicEffectType.SPECIAL,
      'KoDamageNext',
      [EffectTiming.AFTER_KO]
    );

    this.mode = params.mode;
    this.value = params.value ?? 0;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const defender = this.getDefender(context);

    // 检查是否击败了对手
    if ((defender.hp ?? 0) > 0) {
      return results;
    }

    let nextDamage = 0;

    // 计算对下一只的伤害
    switch (this.mode) {
      case 'percent':
        const maxHp = defender.maxHp ?? 0;
        nextDamage = Math.floor(maxHp * this.value / 100);
        break;
      case 'fixed':
        nextDamage = this.value;
        break;
      case 'overflow':
        // 溢出伤害 = 实际伤害 - 击倒所需伤害
        const actualDamage = context.damage;
        const hpBeforeDamage = (defender.hp ?? 0) + actualDamage;
        nextDamage = Math.max(0, actualDamage - hpBeforeDamage);
        break;
    }

    if (nextDamage > 0) {
      results.push(
        this.createResult(
          true,
          'defender',
          'ko_damage_next',
          `击败后将对下一只造成${nextDamage}伤害！`,
          nextDamage,
          {
            mode: this.mode,
            damage: nextDamage
          }
        )
      );

      this.log(`击败伤害下一只: ${this.mode}模式, 伤害${nextDamage}`);
    }

    return results;
  }

  public validate(params: any): boolean {
    if (!['percent', 'fixed', 'overflow'].includes(params.mode)) {
      this.log('mode必须是percent、fixed或overflow', 'error');
      return false;
    }
    if (params.mode !== 'overflow' && params.value === undefined) {
      this.log('percent和fixed模式需要指定value', 'error');
      return false;
    }
    return true;
  }
}
