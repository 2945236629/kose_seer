import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * HP消耗效果参数接口
 */
export interface IHpCostParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'hp_cost';
  /** HP消耗模式：percent=百分比, fixed=固定值 */
  mode: 'percent' | 'fixed';
  /** HP消耗值（百分比0-100或固定值） */
  cost: number;
  /** 是否在技能使用前消耗（true=前，false=后） */
  beforeSkill?: boolean;
}

/**
 * HP消耗效果
 * 
 * 功能：
 * - 使用技能时消耗自己的HP
 * - 支持百分比或固定值消耗
 * - 可选择在技能使用前或后消耗
 * - 至少保留1HP
 * 
 * 使用场景：
 * - 生命代价（使用技能消耗30%HP）
 * - 血之献祭（使用技能消耗100HP）
 * - 透支技能（技能使用后消耗50%HP）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "hp_cost",
 *   "mode": "percent",
 *   "cost": 30,
 *   "beforeSkill": true
 * }
 * ```
 * 
 * 与Sacrifice的区别：
 * - Sacrifice: 消耗HP提升威力
 * - HpCost: 单纯消耗HP作为代价
 */
export class HpCost extends BaseAtomicEffect {
  private mode: 'percent' | 'fixed';
  private cost: number;
  private beforeSkill: boolean;

  constructor(params: IHpCostParams) {
    super(
      AtomicEffectType.SPECIAL,
      'HpCost',
      [EffectTiming.BEFORE_SKILL, EffectTiming.AFTER_SKILL]
    );

    this.mode = params.mode;
    this.cost = params.cost;
    this.beforeSkill = params.beforeSkill ?? true;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const attacker = this.getAttacker(context);

    if (!attacker) {
      this.log('HP消耗效果：攻击者不存在', 'warn');
      return results;
    }

    // 根据beforeSkill决定在哪个时机消耗HP
    const shouldExecute = (this.beforeSkill && context.timing === EffectTiming.BEFORE_SKILL) ||
                          (!this.beforeSkill && context.timing === EffectTiming.AFTER_SKILL);

    if (!shouldExecute) {
      return results;
    }

    // 计算HP消耗
    let hpCost = 0;

    if (this.mode === 'percent') {
      hpCost = Math.floor(attacker.maxHp * (this.cost / 100));
    } else {
      hpCost = this.cost;
    }

    // 确保不会消耗超过当前HP-1（至少保留1HP）
    hpCost = Math.min(hpCost, attacker.hp - 1);
    hpCost = Math.max(0, hpCost);

    if (hpCost > 0) {
      attacker.hp -= hpCost;

      results.push(
        this.createResult(
          true,
          'attacker',
          'hp_cost',
          `消耗${hpCost}HP`,
          hpCost,
          { mode: this.mode, cost: this.cost, beforeSkill: this.beforeSkill }
        )
      );

      this.log(`HP消耗效果：消耗${hpCost}HP（${this.beforeSkill ? '技能前' : '技能后'}）`);
    } else {
      this.log('HP消耗效果：HP不足，无法消耗', 'warn');
    }

    return results;
  }

  public validate(params: any): boolean {
    if (!params.mode || !['percent', 'fixed'].includes(params.mode)) {
      this.log('HP消耗效果：mode必须是percent或fixed', 'error');
      return false;
    }

    if (typeof params.cost !== 'number' || params.cost <= 0) {
      this.log('HP消耗效果：cost必须是正数', 'error');
      return false;
    }

    if (params.mode === 'percent' && (params.cost < 0 || params.cost > 100)) {
      this.log('HP消耗效果：百分比模式下cost必须在0-100之间', 'error');
      return false;
    }

    return true;
  }
}
