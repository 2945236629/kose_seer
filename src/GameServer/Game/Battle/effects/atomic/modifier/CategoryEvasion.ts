import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 类别闪避效果参数接口
 */
export interface ICategoryEvasionParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'category_evasion';
  /** 技能类别：physical=物理, special=特殊 */
  category: 'physical' | 'special';
  /** 闪避率提升值（0-100） */
  evasionBoost: number;
  /** 持续回合数（0=永久） */
  duration?: number;
}

/**
 * 类别闪避效果
 * 
 * 功能：
 * - 提升对特定类别技能的闪避率
 * - 支持物理或特殊技能类别
 * - 可设置持续回合数或永久生效
 * - 状态持久化
 * 
 * 使用场景：
 * - 物理闪避（物理技能闪避率+30%）
 * - 特殊闪避（特殊技能闪避率+30%）
 * - 防御姿态（3回合内物理技能闪避率+50%）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "modifier",
 *   "category": "physical",
 *   "evasionBoost": 30,
 *   "duration": 3
 * }
 * ```
 * 
 * 状态数据结构：
 * ```typescript
 * {
 *   isActive: boolean;       // 是否激活
 *   remainingTurns: number;  // 剩余回合数
 *   category: string;        // 技能类别
 *   evasionBoost: number;    // 闪避率提升
 * }
 * ```
 */
export class CategoryEvasion extends BaseAtomicEffect {
  private category: 'physical' | 'special';
  private evasionBoost: number;
  private duration: number;

  constructor(params: ICategoryEvasionParams) {
    super(
      AtomicEffectType.SPECIAL,
      'CategoryEvasion',
      [EffectTiming.AFTER_SKILL, EffectTiming.BEFORE_HIT_CHECK, EffectTiming.TURN_END]
    );

    this.category = params.category;
    this.evasionBoost = params.evasionBoost;
    this.duration = params.duration ?? 0;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const defender = this.getDefender(context);

    if (!defender) {
      this.log('类别闪避效果：防御者不存在', 'warn');
      return results;
    }

    const state = this.getCategoryEvasionState(defender);

    // AFTER_SKILL: 激活效果
    if (context.timing === EffectTiming.AFTER_SKILL) {
      state.isActive = true;
      state.remainingTurns = this.duration;
      state.category = this.category;
      state.evasionBoost = this.evasionBoost;

      results.push(
        this.createResult(
          true,
          'defender',
          'category_evasion',
          `激活${this.category === 'physical' ? '物理' : '特殊'}闪避`,
          this.evasionBoost,
          { duration: this.duration }
        )
      );

      this.log(`类别闪避效果：激活${this.category}闪避，持续${this.duration}回合`);
    }

    // BEFORE_HIT_CHECK: 应用闪避率提升
    if (context.timing === EffectTiming.BEFORE_HIT_CHECK && state.isActive) {
      // 检查技能类别是否匹配
      const skillCategory = (context.skill as any)?.category || context.effectData?.skillCategory;
      const categoryMatches = this.checkCategoryMatch(skillCategory);

      if (categoryMatches) {
        const oldAccuracy = (context as any).accuracy || 100;
        (context as any).accuracy = Math.max(0, oldAccuracy - state.evasionBoost);

        results.push(
          this.createResult(
            true,
            'defender',
            'evasion_boost',
            `闪避率+${state.evasionBoost}%`,
            state.evasionBoost,
            { oldAccuracy, newAccuracy: (context as any).accuracy }
          )
        );

        this.log(`类别闪避效果：命中率从${oldAccuracy}%降低到${(context as any).accuracy}%`);
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
              'category_evasion',
              '类别闪避效果结束',
              0
            )
          );

          this.log('类别闪避效果：效果结束');
        }
      }
    }

    return results;
  }

  /**
   * 检查技能类别是否匹配
   */
  private checkCategoryMatch(skillCategory: any): boolean {
    if (!skillCategory) return false;

    // 处理不同的类别表示方式
    if (typeof skillCategory === 'string') {
      return skillCategory.toLowerCase() === this.category;
    }

    if (typeof skillCategory === 'number') {
      // 0=物理, 1=特殊
      return (skillCategory === 0 && this.category === 'physical') ||
             (skillCategory === 1 && this.category === 'special');
    }

    return false;
  }

  /**
   * 获取类别闪避状态
   */
  private getCategoryEvasionState(pet: any): {
    isActive: boolean;
    remainingTurns: number;
    category: string;
    evasionBoost: number;
  } {
    if (!pet.effectStates) {
      pet.effectStates = {};
    }
    if (!pet.effectStates.categoryEvasion) {
      pet.effectStates.categoryEvasion = {
        isActive: false,
        remainingTurns: 0,
        category: '',
        evasionBoost: 0
      };
    }
    return pet.effectStates.categoryEvasion;
  }

  public validate(params: any): boolean {
    if (!params.category || !['physical', 'special'].includes(params.category)) {
      this.log('类别闪避效果：category必须是physical或special', 'error');
      return false;
    }

    if (typeof params.evasionBoost !== 'number' || params.evasionBoost < 0 || params.evasionBoost > 100) {
      this.log('类别闪避效果：evasionBoost必须在0-100之间', 'error');
      return false;
    }

    if (params.duration !== undefined && (typeof params.duration !== 'number' || params.duration < 0)) {
      this.log('类别闪避效果：duration必须是非负整数', 'error');
      return false;
    }

    return true;
  }
}
