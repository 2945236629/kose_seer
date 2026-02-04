import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 惩罚效果参数接口
 */
export interface IPunishmentParams {
  /** 惩罚类型 */
  type: 'stat_boost' | 'status' | 'hp_percent';
  /** 惩罚倍率（每个能力提升/状态增加的伤害倍率） */
  multiplier: number;
  /** 基础威力 */
  basePower?: number;
}

/**
 * 惩罚效果 (Punishment)
 * 
 * 根据对手的状态（能力提升、异常状态、HP百分比等）增加伤害。
 * 对手状态越好/越差，伤害越高。
 * 
 * **功能：**
 * - stat_boost: 对手能力提升越多，伤害越高
 * - status: 对手异常状态越多，伤害越高
 * - hp_percent: 对手HP越高，伤害越高
 * 
 * **使用场景：**
 * 
 * 1. **惩罚强化（Effect_35）**
 *    - 对手每有1级能力提升，伤害+20
 *    - 例如：对手攻击+2、速度+1，伤害 = 基础 + 60
 * 
 * 2. **惩罚异常状态**
 *    - 对手每有1个异常状态，伤害+30%
 *    - 例如：对手中毒+灼伤，伤害 = 基础 × 1.6
 * 
 * 3. **惩罚高HP**
 *    - 对手HP越高，伤害越高
 *    - 例如：对手HP 100%时，伤害 = 基础 × 2.0
 * 
 * **JSON配置示例：**
 * 
 * ```json
 * {
 *   "type": "Punishment",
 *   "timing": "BEFORE_DAMAGE_CALC",
 *   "params": {
 *     "type": "stat_boost",
 *     "multiplier": 20,
 *     "basePower": 60
 *   }
 * }
 * ```
 * 
 * @category Special
 */
export class Punishment extends BaseAtomicEffect {
  private punishmentType: 'stat_boost' | 'status' | 'hp_percent';
  private multiplier: number;
  private basePower: number;

  constructor(params: IPunishmentParams) {
    super(AtomicEffectType.SPECIAL, 'Punishment', []);
    this.punishmentType = params.type;
    this.multiplier = params.multiplier;
    this.basePower = params.basePower || 60;
  }

  public validate(params: any): boolean {
    return params && params.type && params.multiplier !== undefined;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { defender } = context;
    let bonusPower = 0;

    switch (this.punishmentType) {
      case 'stat_boost': {
        // 计算对手的能力提升总和（只计算正值）
        const battleLv = defender.battleLv || [0, 0, 0, 0, 0, 0];
        const totalBoosts = battleLv.reduce((sum, level) => sum + Math.max(0, level), 0);
        bonusPower = totalBoosts * this.multiplier;
        break;
      }

      case 'status': {
        // 计算对手的异常状态数量
        const statusArray = defender.statusArray || [];
        const statusCount = statusArray.filter(s => s > 0).length;
        bonusPower = statusCount * this.multiplier;
        break;
      }

      case 'hp_percent': {
        // 根据对手HP百分比计算
        const hpPercent = defender.hp / defender.maxHp;
        bonusPower = this.basePower * hpPercent * (this.multiplier - 1);
        break;
      }
    }

    // 修改技能威力
    if (context.skill) {
      const originalPower = context.skill.power || this.basePower;
      context.skill.power = originalPower + bonusPower;
    }

    return [this.createResult(
      true,
      'defender',
      'power_boost',
      `惩罚效果：威力+${bonusPower.toFixed(0)}`,
      bonusPower,
      {
        punishmentType: this.punishmentType,
        bonusPower,
        originalPower: this.basePower
      }
    )];
  }
}
