import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * HP消耗伤害效果参数接口
 */
export interface IHpCostDamageParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'hp_cost_damage';
  /** HP消耗模式：percent=百分比, fixed=固定值 */
  mode: 'percent' | 'fixed';
  /** HP消耗值（百分比0-100或固定值） */
  cost: number;
  /** 伤害倍率（消耗的HP × 倍率 = 造成的伤害） */
  damageMultiplier?: number;
}

/**
 * HP消耗伤害效果
 * 
 * 功能：
 * - 消耗自己的HP，根据消耗量造成伤害
 * - 支持百分比或固定值HP消耗
 * - 可设置伤害倍率
 * - 至少保留1HP
 * 
 * 使用场景：
 * - 生命爆发（消耗50%HP，造成消耗量×1.5的伤害）
 * - 血之利刃（消耗100HP，造成消耗量×2的伤害）
 * - 献祭打击（消耗30%HP，造成等量伤害）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "damage",
 *   "mode": "percent",
 *   "cost": 50,
 *   "damageMultiplier": 1.5
 * }
 * ```
 * 
 * 计算公式：
 * - 伤害 = 消耗的HP × damageMultiplier
 * - 例如：消耗200HP，倍率1.5，则造成300伤害
 * 
 * 与Sacrifice的区别：
 * - Sacrifice: 消耗HP提升威力（影响伤害计算）
 * - HpCostDamage: 消耗HP直接转换为伤害（固定伤害）
 */
export class HpCostDamage extends BaseAtomicEffect {
  private mode: 'percent' | 'fixed';
  private cost: number;
  private damageMultiplier: number;

  constructor(params: IHpCostDamageParams) {
    super(
      AtomicEffectType.SPECIAL,
      'HpCostDamage',
      [EffectTiming.BEFORE_DAMAGE_CALC]
    );

    this.mode = params.mode;
    this.cost = params.cost;
    this.damageMultiplier = params.damageMultiplier ?? 1.0;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const attacker = this.getAttacker(context);
    const defender = this.getDefender(context);

    if (!attacker || !defender) {
      this.log('HP消耗伤害效果：攻击者或防御者不存在', 'warn');
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

    if (hpCost <= 0) {
      this.log('HP消耗伤害效果：HP不足，无法消耗', 'warn');
      return results;
    }

    // 消耗HP
    attacker.hp -= hpCost;

    // 计算造成的伤害
    const damage = Math.floor(hpCost * this.damageMultiplier);

    // 设置为固定伤害
    context.damage = damage;
    context.effectData = context.effectData || {};
    context.effectData.isFixedDamage = true;

    results.push(
      this.createResult(
        true,
        'attacker',
        'hp_cost',
        `消耗${hpCost}HP`,
        hpCost,
        { mode: this.mode, cost: this.cost }
      )
    );

    results.push(
      this.createResult(
        true,
        'defender',
        'damage',
        `造成${damage}伤害`,
        damage,
        { hpCost, damageMultiplier: this.damageMultiplier }
      )
    );

    this.log(`HP消耗伤害效果：消耗${hpCost}HP，造成${damage}伤害`);

    return results;
  }

  public validate(params: any): boolean {
    if (!params.mode || !['percent', 'fixed'].includes(params.mode)) {
      this.log('HP消耗伤害效果：mode必须是percent或fixed', 'error');
      return false;
    }

    if (typeof params.cost !== 'number' || params.cost <= 0) {
      this.log('HP消耗伤害效果：cost必须是正数', 'error');
      return false;
    }

    if (params.mode === 'percent' && (params.cost < 0 || params.cost > 100)) {
      this.log('HP消耗伤害效果：百分比模式下cost必须在0-100之间', 'error');
      return false;
    }

    if (params.damageMultiplier !== undefined && (typeof params.damageMultiplier !== 'number' || params.damageMultiplier <= 0)) {
      this.log('HP消耗伤害效果：damageMultiplier必须是正数', 'error');
      return false;
    }

    return true;
  }
}
