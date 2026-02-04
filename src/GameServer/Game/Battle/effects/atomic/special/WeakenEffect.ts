import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 衰弱效果参数接口
 */
export interface IWeakenEffectParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'weaken';
  /** 衰弱类型：damage=伤害衰弱, heal=回复衰弱, all=全部衰弱 */
  weakenType: 'damage' | 'heal' | 'all';
  /** 衰弱比例（0-1，例如0.5表示减少50%） */
  ratio: number;
  /** 持续回合数（0=永久） */
  duration?: number;
}

/**
 * 衰弱效果
 * 
 * 功能：
 * - 降低目标的伤害或回复效果
 * - 支持伤害衰弱、回复衰弱或全部衰弱
 * - 可设置衰弱比例和持续时间
 * - 状态持久化
 * 
 * 使用场景：
 * - 虚弱诅咒（造成的伤害减少50%）
 * - 治疗封印（回复效果减少70%）
 * - 全面衰弱（伤害和回复都减少30%）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "weaken",
 *   "weakenType": "damage",
 *   "ratio": 0.5,
 *   "duration": 3
 * }
 * ```
 * 
 * 状态数据结构：
 * ```typescript
 * {
 *   isActive: boolean;       // 是否激活
 *   remainingTurns: number;  // 剩余回合数
 *   weakenType: string;      // 衰弱类型
 *   ratio: number;           // 衰弱比例
 * }
 * ```
 * 
 * 与DamageReduction的区别：
 * - DamageReduction: 降低受到的伤害（防御方）
 * - WeakenEffect: 降低造成的伤害（攻击方）
 */
export class WeakenEffect extends BaseAtomicEffect {
  private weakenType: 'damage' | 'heal' | 'all';
  private ratio: number;
  private duration: number;

  constructor(params: IWeakenEffectParams) {
    super(
      AtomicEffectType.SPECIAL,
      'WeakenEffect',
      [EffectTiming.AFTER_SKILL, EffectTiming.AFTER_DAMAGE_CALC, EffectTiming.TURN_END]
    );

    this.weakenType = params.weakenType;
    this.ratio = params.ratio;
    this.duration = params.duration ?? 0;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const target = this.getDefender(context);

    if (!target) {
      this.log('衰弱效果：目标不存在', 'warn');
      return results;
    }

    const state = this.getWeakenState(target);

    // AFTER_SKILL: 激活效果
    if (context.timing === EffectTiming.AFTER_SKILL) {
      state.isActive = true;
      state.remainingTurns = this.duration;
      state.weakenType = this.weakenType;
      state.ratio = this.ratio;

      results.push(
        this.createResult(
          true,
          'defender',
          'weaken',
          `激活衰弱效果（${this.weakenType}）`,
          this.ratio,
          { duration: this.duration }
        )
      );

      this.log(`衰弱效果：激活${this.weakenType}衰弱，持续${this.duration}回合`);
    }

    // AFTER_DAMAGE_CALC: 应用伤害衰弱
    if (context.timing === EffectTiming.AFTER_DAMAGE_CALC && state.isActive) {
      if (state.weakenType === 'damage' || state.weakenType === 'all') {
        const attacker = this.getAttacker(context);
        if (attacker && this.isWeakened(attacker, state)) {
          const oldDamage = context.damage || 0;
          context.damage = Math.floor(oldDamage * (1 - state.ratio));

          results.push(
            this.createResult(
              true,
              'attacker',
              'weaken',
              `伤害衰弱：${oldDamage}→${context.damage}`,
              oldDamage - context.damage,
              { weakenType: 'damage', ratio: state.ratio }
            )
          );

          this.log(`衰弱效果：伤害从${oldDamage}降低到${context.damage}`);
        }
      }
    }

    // TURN_END: 检查持续时间
    if (context.timing === EffectTiming.TURN_END && state.isActive) {
      if (state.remainingTurns > 0) {
        state.remainingTurns--;

        if (state.remainingTurns === 0) {
          state.isActive = false;

          results.push(
            this.createResult(
              true,
              'defender',
              'weaken',
              '衰弱效果结束',
              0
            )
          );

          this.log('衰弱效果：效果结束');
        }
      }
    }

    return results;
  }

  /**
   * 检查精灵是否处于衰弱状态
   */
  private isWeakened(pet: any, state: any): boolean {
    return state.isActive && pet.effectStates?.weaken === state;
  }

  /**
   * 获取衰弱状态
   */
  private getWeakenState(pet: any): {
    isActive: boolean;
    remainingTurns: number;
    weakenType: string;
    ratio: number;
  } {
    if (!pet.effectStates) {
      pet.effectStates = {};
    }
    if (!pet.effectStates.weaken) {
      pet.effectStates.weaken = {
        isActive: false,
        remainingTurns: 0,
        weakenType: '',
        ratio: 0
      };
    }
    return pet.effectStates.weaken;
  }

  public validate(params: any): boolean {
    if (!params.weakenType || !['damage', 'heal', 'all'].includes(params.weakenType)) {
      this.log('衰弱效果：weakenType必须是damage、heal或all', 'error');
      return false;
    }

    if (typeof params.ratio !== 'number' || params.ratio < 0 || params.ratio > 1) {
      this.log('衰弱效果：ratio必须在0-1之间', 'error');
      return false;
    }

    if (params.duration !== undefined && (typeof params.duration !== 'number' || params.duration < 0)) {
      this.log('衰弱效果：duration必须是非负整数', 'error');
      return false;
    }

    return true;
  }
}
