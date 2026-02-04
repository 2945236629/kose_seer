import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 优先级提升参数接口
 */
export interface IPriorityBoostParams {
  /** 提升的优先级 */
  boost: number;
  /** 条件类型 */
  condition?: 'always' | 'first_turn' | 'hp_full' | 'hp_low';
  /** 条件阈值（用于hp_low） */
  threshold?: number;
}

/**
 * 优先级提升效果 (PriorityBoost)
 * 
 * 提升技能的优先级，使其更容易先手攻击。
 * 
 * @category Modifier
 */
export class PriorityBoost extends BaseAtomicEffect {
  private boost: number;
  private condition: 'always' | 'first_turn' | 'hp_full' | 'hp_low';
  private threshold: number;

  constructor(params: IPriorityBoostParams) {
    super(AtomicEffectType.SPECIAL, 'PriorityBoost', []);
    this.boost = params.boost;
    this.condition = params.condition || 'always';
    this.threshold = params.threshold || 0.25;
  }

  public validate(params: any): boolean {
    return params && params.boost !== undefined;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker, turn } = context;

    // 检查条件
    let shouldBoost = false;
    let reason = '';

    switch (this.condition) {
      case 'always':
        shouldBoost = true;
        reason = '无条件';
        break;

      case 'first_turn':
        shouldBoost = turn === 1;
        reason = '第一回合';
        break;

      case 'hp_full':
        shouldBoost = attacker.hp === attacker.maxHp;
        reason = 'HP满';
        break;

      case 'hp_low':
        shouldBoost = attacker.hp / attacker.maxHp <= this.threshold;
        reason = `HP低于${(this.threshold * 100).toFixed(0)}%`;
        break;
    }

    if (!shouldBoost) {
      return [this.createResult(
        false,
        'attacker',
        'priority',
        `优先级提升条件不满足（${reason}）`
      )];
    }

    // 提升优先级
    if (context.skill) {
      const originalPriority = context.skill.priority || 0;
      context.skill.priority = originalPriority + this.boost;
    }

    return [this.createResult(
      true,
      'attacker',
      'priority',
      `优先级+${this.boost}（${reason}）`,
      this.boost,
      {
        boost: this.boost,
        condition: this.condition,
        reason
      }
    )];
  }
}
