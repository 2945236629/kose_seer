import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 蓄力效果参数接口
 */
export interface IChargeParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'charge';
  /** 蓄力回合数 */
  chargeTurns: number;
  /** 蓄力期间的威力倍率（可选，默认0） */
  chargePowerMultiplier?: number;
  /** 蓄力完成后的威力倍率（可选，默认2.0） */
  releasePowerMultiplier?: number;
  /** 蓄力期间是否可以行动（可选，默认false） */
  canActDuringCharge?: boolean;
  /** 蓄力期间的消息（可选） */
  chargeMessage?: string;
  /** 释放时的消息（可选） */
  releaseMessage?: string;
}

/**
 * 蓄力效果
 * 
 * 功能：
 * - 技能需要蓄力N回合后才能释放
 * - 蓄力期间可以设置威力倍率（通常为0，即无法攻击）
 * - 蓄力完成后释放时威力提升
 * - 支持自定义蓄力和释放消息
 * 
 * 使用场景：
 * - 日光束（蓄力1回合，释放时威力120）
 * - 火箭头锤（蓄力1回合，释放时威力150）
 * - 破坏死光（释放后下回合无法行动）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "charge",
 *   "chargeTurns": 1,
 *   "chargePowerMultiplier": 0,
 *   "releasePowerMultiplier": 2.0,
 *   "chargeMessage": "正在蓄力...",
 *   "releaseMessage": "释放能量！"
 * }
 * ```
 * 
 * 状态数据结构：
 * ```typescript
 * {
 *   chargeCounter: number;      // 当前蓄力回合数
 *   totalChargeTurns: number;   // 总蓄力回合数
 *   isCharging: boolean;        // 是否正在蓄力
 *   skillId: number;            // 蓄力的技能ID
 * }
 * ```
 */
export class Charge extends BaseAtomicEffect {
  private chargeTurns: number;
  private chargePowerMultiplier: number;
  private releasePowerMultiplier: number;
  private canActDuringCharge: boolean;
  private chargeMessage: string;
  private releaseMessage: string;

  constructor(params: IChargeParams) {
    super(
      AtomicEffectType.SPECIAL,
      'Charge',
      [EffectTiming.BEFORE_SKILL, EffectTiming.BEFORE_DAMAGE_CALC]
    );

    this.chargeTurns = params.chargeTurns;
    this.chargePowerMultiplier = params.chargePowerMultiplier ?? 0;
    this.releasePowerMultiplier = params.releasePowerMultiplier ?? 2.0;
    this.canActDuringCharge = params.canActDuringCharge ?? false;
    this.chargeMessage = params.chargeMessage ?? '正在蓄力...';
    this.releaseMessage = params.releaseMessage ?? '释放能量！';
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const attacker = this.getAttacker(context);

    // 获取或初始化蓄力状态
    const chargeState = this.getChargeState(attacker);

    if (!chargeState.isCharging) {
      // 开始蓄力
      chargeState.isCharging = true;
      chargeState.chargeCounter = 0;
      chargeState.totalChargeTurns = this.chargeTurns;
      chargeState.skillId = context.skillId;

      results.push(
        this.createResult(
          true,
          'attacker',
          'charge_start',
          this.chargeMessage,
          this.chargeTurns
        )
      );

      // 蓄力期间的威力修正
      if (context.skill && context.skill.power !== undefined) {
        context.skill.power *= this.chargePowerMultiplier;
        results.push(
          this.createResult(
            true,
            'attacker',
            'power_modifier',
            `蓄力期间威力修正: ×${this.chargePowerMultiplier}`,
            context.skill.power
          )
        );
      }

      this.log(`开始蓄力，需要${this.chargeTurns}回合`);
    } else {
      // 继续蓄力
      chargeState.chargeCounter++;

      if (chargeState.chargeCounter >= chargeState.totalChargeTurns) {
        // 蓄力完成，释放
        chargeState.isCharging = false;
        chargeState.chargeCounter = 0;

        results.push(
          this.createResult(
            true,
            'attacker',
            'charge_release',
            this.releaseMessage,
            this.releasePowerMultiplier
          )
        );

        // 释放时的威力提升
        if (context.skill && context.skill.power !== undefined) {
          context.skill.power *= this.releasePowerMultiplier;
          results.push(
            this.createResult(
              true,
              'attacker',
              'power_modifier',
              `释放威力提升: ×${this.releasePowerMultiplier}`,
              context.skill.power
            )
          );
        }

        this.log(`蓄力完成，释放！威力×${this.releasePowerMultiplier}`);
      } else {
        // 继续蓄力
        results.push(
          this.createResult(
            true,
            'attacker',
            'charge_continue',
            `蓄力中... (${chargeState.chargeCounter}/${chargeState.totalChargeTurns})`,
            chargeState.chargeCounter
          )
        );

        // 蓄力期间的威力修正
        if (context.skill && context.skill.power !== undefined && !this.canActDuringCharge) {
          context.skill.power *= this.chargePowerMultiplier;
          results.push(
            this.createResult(
              true,
              'attacker',
              'power_modifier',
              `蓄力期间威力修正: ×${this.chargePowerMultiplier}`,
              context.skill.power
            )
          );
        }

        this.log(`继续蓄力 (${chargeState.chargeCounter}/${chargeState.totalChargeTurns})`);
      }
    }

    return results;
  }

  public validate(params: any): boolean {
    if (!params.chargeTurns || params.chargeTurns < 1) {
      this.log('蓄力回合数必须大于0', 'error');
      return false;
    }
    return true;
  }

  /**
   * 获取蓄力状态
   */
  private getChargeState(pet: any): {
    isCharging: boolean;
    chargeCounter: number;
    totalChargeTurns: number;
    skillId: number;
  } {
    if (!pet.effectStates) {
      pet.effectStates = {};
    }
    if (!pet.effectStates.charge) {
      pet.effectStates.charge = {
        isCharging: false,
        chargeCounter: 0,
        totalChargeTurns: 0,
        skillId: 0
      };
    }
    return pet.effectStates.charge;
  }
}
