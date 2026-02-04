import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 性别伤害增强效果参数接口
 */
export interface IGenderDamageBoostParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'gender_damage_boost';
  /** 目标性别：male=雄性, female=雌性, same=相同, different=不同 */
  targetGender: 'male' | 'female' | 'same' | 'different';
  /** 伤害倍率（小数或百分比） */
  multiplier: number;
}

/**
 * 性别伤害增强效果
 * 
 * 功能：
 * - 根据目标性别提升伤害
 * - 支持指定性别或相同/不同性别
 * - 可设置伤害倍率
 * - 无性别精灵不受影响
 * 
 * 使用场景：
 * - 魅惑（对异性伤害+50%）
 * - 同性相斥（对同性伤害+30%）
 * - 雄性克制（对雄性伤害+50%）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "modifier",
 *   "targetGender": "different",
 *   "multiplier": 1.5
 * }
 * ```
 * 
 * 性别值说明：
 * - 0: 无性别
 * - 1: 雄性
 * - 2: 雌性
 */
export class GenderDamageBoost extends BaseAtomicEffect {
  private targetGender: 'male' | 'female' | 'same' | 'different';
  private multiplier: number;

  constructor(params: IGenderDamageBoostParams) {
    super(
      AtomicEffectType.SPECIAL,
      'GenderDamageBoost',
      [EffectTiming.BEFORE_DAMAGE_CALC]
    );

    this.targetGender = params.targetGender;
    this.multiplier = params.multiplier;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const attacker = this.getAttacker(context);
    const defender = this.getDefender(context);

    if (!attacker || !defender) {
      this.log('性别伤害增强效果：攻击者或防御者不存在', 'warn');
      return results;
    }

    // 获取性别
    const attackerGender = (attacker as any).gender || 0;
    const defenderGender = (defender as any).gender || 0;

    // 检查是否满足性别条件
    const conditionMet = this.checkGenderCondition(attackerGender, defenderGender);

    if (!conditionMet) {
      this.log('性别伤害增强效果：性别条件不满足', 'warn');
      return results;
    }

    // 应用伤害倍率
    const oldDamage = context.damage || 0;
    context.damage = Math.floor(oldDamage * this.multiplier);

    results.push(
      this.createResult(
        true,
        'both',
        'gender_damage_boost',
        `性别伤害增强×${this.multiplier}`,
        context.damage - oldDamage,
        { 
          targetGender: this.targetGender,
          multiplier: this.multiplier,
          attackerGender,
          defenderGender,
          oldDamage,
          newDamage: context.damage
        }
      )
    );

    this.log(`性别伤害增强效果：伤害从${oldDamage}提升到${context.damage}`);

    return results;
  }

  /**
   * 检查性别条件
   */
  private checkGenderCondition(attackerGender: number, defenderGender: number): boolean {
    // 无性别精灵不受影响
    if (attackerGender === 0 || defenderGender === 0) {
      return false;
    }

    switch (this.targetGender) {
      case 'male':
        return defenderGender === 1;
      case 'female':
        return defenderGender === 2;
      case 'same':
        return attackerGender === defenderGender;
      case 'different':
        return attackerGender !== defenderGender;
      default:
        return false;
    }
  }

  public validate(params: any): boolean {
    if (!params.targetGender || !['male', 'female', 'same', 'different'].includes(params.targetGender)) {
      this.log('性别伤害增强效果：targetGender必须是male、female、same或different', 'error');
      return false;
    }

    if (typeof params.multiplier !== 'number' || params.multiplier <= 0) {
      this.log('性别伤害增强效果：multiplier必须是正数', 'error');
      return false;
    }

    return true;
  }
}
