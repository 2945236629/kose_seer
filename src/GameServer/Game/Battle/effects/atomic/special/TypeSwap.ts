import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 属性交换效果参数接口
 */
export interface ITypeSwapParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'type_swap';
  /** 持续回合数（可选，默认永久） */
  duration?: number;
  /** 是否交换双方属性（true=交换，false=仅复制对手属性） */
  swapBoth?: boolean;
}

/**
 * 属性交换效果
 * 
 * 功能：
 * - 交换自己和对手的属性
 * - 可以设置持续回合数或永久生效
 * - 支持双向交换或单向复制
 * 
 * 使用场景：
 * - 属性互换（交换双方属性）
 * - 属性复制（复制对手属性到自己）
 * - 临时属性变化（持续N回合）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "type_swap",
 *   "duration": 5,
 *   "swapBoth": true
 * }
 * ```
 * 
 * 状态数据结构：
 * ```typescript
 * {
 *   originalType: number;       // 原始属性
 *   swappedType: number;        // 交换后的属性
 *   remainingTurns: number;     // 剩余回合数
 *   isSwapped: boolean;         // 是否已交换
 * }
 * ```
 */
export class TypeSwap extends BaseAtomicEffect {
  private duration?: number;
  private swapBoth: boolean;

  constructor(params: ITypeSwapParams) {
    super(
      AtomicEffectType.SPECIAL,
      'TypeSwap',
      [EffectTiming.AFTER_SKILL, EffectTiming.TURN_END]
    );

    this.duration = params.duration;
    this.swapBoth = params.swapBoth ?? true;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const attacker = this.getAttacker(context);
    const defender = this.getDefender(context);

    // 在AFTER_SKILL时机执行交换
    if (context.timing === EffectTiming.AFTER_SKILL) {
      const attackerType = this.getPetType(attacker);
      const defenderType = this.getPetType(defender);

      if (this.swapBoth) {
        // 双向交换
        this.setPetType(attacker, defenderType);
        this.setPetType(defender, attackerType);

        // 记录交换状态
        this.setSwapState(attacker, attackerType, defenderType, this.duration);
        this.setSwapState(defender, defenderType, attackerType, this.duration);

        results.push(
          this.createResult(
            true,
            'both',
            'type_swap',
            `双方属性互换！`,
            0,
            {
              attackerOriginal: attackerType,
              attackerNew: defenderType,
              defenderOriginal: defenderType,
              defenderNew: attackerType,
              duration: this.duration
            }
          )
        );

        this.log(`属性互换: 攻击方${attackerType}→${defenderType}, 防御方${defenderType}→${attackerType}`);
      } else {
        // 单向复制（攻击方复制防御方属性）
        this.setPetType(attacker, defenderType);
        this.setSwapState(attacker, attackerType, defenderType, this.duration);

        results.push(
          this.createResult(
            true,
            'attacker',
            'type_copy',
            `复制了对手的属性！`,
            0,
            {
              original: attackerType,
              new: defenderType,
              duration: this.duration
            }
          )
        );

        this.log(`属性复制: 攻击方${attackerType}→${defenderType}`);
      }
    }

    // 在TURN_END时机检查持续时间
    if (context.timing === EffectTiming.TURN_END) {
      const attackerState = this.getSwapState(attacker);
      const defenderState = this.getSwapState(defender);

      // 检查攻击方
      if (attackerState.isSwapped) {
        if (attackerState.remainingTurns !== undefined) {
          attackerState.remainingTurns--;
          if (attackerState.remainingTurns <= 0) {
            // 恢复原始属性
            this.setPetType(attacker, attackerState.originalType);
            attackerState.isSwapped = false;

            results.push(
              this.createResult(
                true,
                'attacker',
                'type_restore',
                `属性恢复了！`,
                0,
                { restoredType: attackerState.originalType }
              )
            );

            this.log(`攻击方属性恢复: ${attackerState.swappedType}→${attackerState.originalType}`);
          }
        }
      }

      // 检查防御方
      if (this.swapBoth && defenderState.isSwapped) {
        if (defenderState.remainingTurns !== undefined) {
          defenderState.remainingTurns--;
          if (defenderState.remainingTurns <= 0) {
            // 恢复原始属性
            this.setPetType(defender, defenderState.originalType);
            defenderState.isSwapped = false;

            results.push(
              this.createResult(
                true,
                'defender',
                'type_restore',
                `属性恢复了！`,
                0,
                { restoredType: defenderState.originalType }
              )
            );

            this.log(`防御方属性恢复: ${defenderState.swappedType}→${defenderState.originalType}`);
          }
        }
      }
    }

    return results;
  }

  public validate(params: any): boolean {
    if (params.duration !== undefined && params.duration < 1) {
      this.log('duration必须大于0', 'error');
      return false;
    }
    return true;
  }

  /**
   * 获取精灵属性
   */
  private getPetType(pet: any): number {
    return pet.type ?? pet.elementType ?? 0;
  }

  /**
   * 设置精灵属性
   */
  private setPetType(pet: any, type: number): void {
    if (pet.type !== undefined) {
      pet.type = type;
    }
    if (pet.elementType !== undefined) {
      pet.elementType = type;
    }
  }

  /**
   * 获取交换状态
   */
  private getSwapState(pet: any): {
    originalType: number;
    swappedType: number;
    remainingTurns?: number;
    isSwapped: boolean;
  } {
    if (!pet.effectStates) {
      pet.effectStates = {};
    }
    if (!pet.effectStates.typeSwap) {
      pet.effectStates.typeSwap = {
        originalType: this.getPetType(pet),
        swappedType: this.getPetType(pet),
        isSwapped: false
      };
    }
    return pet.effectStates.typeSwap;
  }

  /**
   * 设置交换状态
   */
  private setSwapState(pet: any, originalType: number, swappedType: number, duration?: number): void {
    const state = this.getSwapState(pet);
    state.originalType = originalType;
    state.swappedType = swappedType;
    state.isSwapped = true;
    if (duration !== undefined) {
      state.remainingTurns = duration;
    }
  }
}
