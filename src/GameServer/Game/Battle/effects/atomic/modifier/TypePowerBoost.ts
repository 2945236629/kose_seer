import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 特定属性技能威力提升效果参数接口
 */
export interface ITypePowerBoostParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'type_power_boost';
  /** 提升的属性类型 */
  targetType: number;
  /** 威力倍率 */
  multiplier: number;
  /** 持续回合数（可选，默认永久） */
  duration?: number;
}

/**
 * 特定属性技能威力提升效果
 * 
 * 功能：
 * - 提升特定属性技能的威力
 * - 可设置持续回合数或永久生效
 * - 支持多种属性类型
 * 
 * 使用场景：
 * - 火焰强化（火属性技能威力×1.5）
 * - 水流强化（水属性技能威力×1.5）
 * - 草木强化（草属性技能威力×1.5）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "type_power_boost",
 *   "targetType": 1,
 *   "multiplier": 1.5,
 *   "duration": 5
 * }
 * ```
 */
export class TypePowerBoost extends BaseAtomicEffect {
  private targetType: number;
  private multiplier: number;
  private duration?: number;

  constructor(params: ITypePowerBoostParams) {
    super(
      AtomicEffectType.SPECIAL,
      'TypePowerBoost',
      [EffectTiming.AFTER_SKILL, EffectTiming.BEFORE_DAMAGE_CALC, EffectTiming.TURN_END]
    );

    this.targetType = params.targetType;
    this.multiplier = params.multiplier;
    this.duration = params.duration;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const attacker = this.getAttacker(context);

    if (context.timing === EffectTiming.AFTER_SKILL) {
      const boostState = this.getBoostState(attacker);
      boostState.isActive = true;
      boostState.targetType = this.targetType;
      boostState.multiplier = this.multiplier;
      if (this.duration !== undefined) {
        boostState.remainingTurns = this.duration;
      }

      results.push(
        this.createResult(
          true,
          'attacker',
          'type_power_boost_activate',
          `${this.getTypeName(this.targetType)}属性技能威力提升！`,
          this.multiplier
        )
      );
    }

    if (context.timing === EffectTiming.BEFORE_DAMAGE_CALC) {
      const boostState = this.getBoostState(attacker);
      if (boostState.isActive && context.skillType === boostState.targetType && context.skill) {
        const originalPower = context.skill.power;
        context.skill.power = Math.floor(originalPower * boostState.multiplier);
        results.push(
          this.createResult(
            true,
            'attacker',
            'type_power_boost',
            `威力提升！${originalPower}→${context.skill.power}`,
            context.skill.power - originalPower
          )
        );
      }
    }

    if (context.timing === EffectTiming.TURN_END) {
      const boostState = this.getBoostState(attacker);
      if (boostState.isActive && boostState.remainingTurns !== undefined) {
        boostState.remainingTurns--;
        if (boostState.remainingTurns <= 0) {
          boostState.isActive = false;
          results.push(
            this.createResult(true, 'attacker', 'type_power_boost_end', `属性威力提升结束！`, 0)
          );
        }
      }
    }

    return results;
  }

  public validate(params: any): boolean {
    if (params.targetType === undefined) {
      this.log('targetType是必需参数', 'error');
      return false;
    }
    if (params.multiplier === undefined || params.multiplier <= 0) {
      this.log('multiplier必须大于0', 'error');
      return false;
    }
    return true;
  }

  private getBoostState(pet: any): any {
    if (!pet.effectStates) pet.effectStates = {};
    if (!pet.effectStates.typePowerBoost) {
      pet.effectStates.typePowerBoost = { isActive: false, targetType: 0, multiplier: 1.0 };
    }
    return pet.effectStates.typePowerBoost;
  }

  private getTypeName(type: number): string {
    const typeNames: { [key: number]: string } = {
      0: '普通', 1: '火', 2: '水', 3: '草', 4: '电', 5: '地面', 6: '飞行',
      7: '机械', 8: '冰', 9: '战斗', 10: '光', 11: '暗影', 12: '神秘', 13: '超能', 14: '龙'
    };
    return typeNames[type] ?? `属性${type}`;
  }
}
