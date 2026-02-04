import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 属性复制效果参数接口
 */
export interface ITypeCopyParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'type_copy';
  /** 复制源（self=复制自己的属性给对手，opponent=复制对手的属性给自己） */
  source: 'self' | 'opponent';
  /** 持续回合数（可选，默认永久） */
  duration?: number;
  /** 是否覆盖原属性（true=覆盖，false=添加为第二属性） */
  overwrite?: boolean;
}

/**
 * 属性复制效果
 * 
 * 功能：
 * - 复制自己或对手的属性
 * - 可以覆盖原属性或添加为第二属性
 * - 支持持续回合数或永久生效
 * 
 * 使用场景：
 * - 属性模仿（复制对手属性）
 * - 属性传递（将自己属性复制给对手）
 * - 双属性（添加第二属性而不覆盖）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "type_copy",
 *   "source": "opponent",
 *   "duration": 5,
 *   "overwrite": true
 * }
 * ```
 * 
 * 与TypeSwap的区别：
 * - TypeSwap: 交换双方属性（双向）
 * - TypeCopy: 复制属性（单向），可选择复制源和目标
 */
export class TypeCopy extends BaseAtomicEffect {
  private source: 'self' | 'opponent';
  private duration?: number;
  private overwrite: boolean;

  constructor(params: ITypeCopyParams) {
    super(
      AtomicEffectType.SPECIAL,
      'TypeCopy',
      [EffectTiming.AFTER_SKILL, EffectTiming.TURN_END]
    );

    this.source = params.source;
    this.duration = params.duration;
    this.overwrite = params.overwrite ?? true;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const attacker = this.getAttacker(context);
    const defender = this.getDefender(context);

    // 在AFTER_SKILL时机执行复制
    if (context.timing === EffectTiming.AFTER_SKILL) {
      let sourcePet: any;
      let targetPet: any;

      if (this.source === 'opponent') {
        // 复制对手属性给自己
        sourcePet = defender;
        targetPet = attacker;
      } else {
        // 复制自己属性给对手
        sourcePet = attacker;
        targetPet = defender;
      }

      const sourceType = this.getPetType(sourcePet);
      const targetOriginalType = this.getPetType(targetPet);

      if (this.overwrite) {
        // 覆盖原属性
        this.setPetType(targetPet, sourceType);

        results.push(
          this.createResult(
            true,
            this.source === 'opponent' ? 'attacker' : 'defender',
            'type_copy',
            `属性变为了${this.getTypeName(sourceType)}！`,
            0,
            {
              original: targetOriginalType,
              new: sourceType,
              duration: this.duration
            }
          )
        );

        this.log(
          `属性复制: ${this.source === 'opponent' ? '攻击方' : '防御方'}` +
          `${targetOriginalType}→${sourceType}`
        );
      } else {
        // 添加为第二属性
        this.addSecondaryType(targetPet, sourceType);

        results.push(
          this.createResult(
            true,
            this.source === 'opponent' ? 'attacker' : 'defender',
            'type_add',
            `获得了${this.getTypeName(sourceType)}属性！`,
            0,
            {
              primary: targetOriginalType,
              secondary: sourceType,
              duration: this.duration
            }
          )
        );

        this.log(
          `属性添加: ${this.source === 'opponent' ? '攻击方' : '防御方'}` +
          `获得第二属性${sourceType}`
        );
      }

      // 记录复制状态
      this.setCopyState(targetPet, targetOriginalType, sourceType, this.duration);
    }

    // 在TURN_END时机检查持续时间
    if (context.timing === EffectTiming.TURN_END) {
      const targetPet = this.source === 'opponent' ? attacker : defender;
      const copyState = this.getCopyState(targetPet);

      if (copyState.isCopied && copyState.remainingTurns !== undefined) {
        copyState.remainingTurns--;
        if (copyState.remainingTurns <= 0) {
          // 恢复原始属性
          if (this.overwrite) {
            this.setPetType(targetPet, copyState.originalType);
          } else {
            this.removeSecondaryType(targetPet);
          }
          copyState.isCopied = false;

          results.push(
            this.createResult(
              true,
              this.source === 'opponent' ? 'attacker' : 'defender',
              'type_restore',
              `属性恢复了！`,
              0,
              { restoredType: copyState.originalType }
            )
          );

          this.log(
            `属性恢复: ${this.source === 'opponent' ? '攻击方' : '防御方'}` +
            `${copyState.copiedType}→${copyState.originalType}`
          );
        }
      }
    }

    return results;
  }

  public validate(params: any): boolean {
    if (!['self', 'opponent'].includes(params.source)) {
      this.log('source必须是self或opponent', 'error');
      return false;
    }
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
   * 添加第二属性
   */
  private addSecondaryType(pet: any, type: number): void {
    if (!pet.secondaryType) {
      pet.secondaryType = type;
    }
  }

  /**
   * 移除第二属性
   */
  private removeSecondaryType(pet: any): void {
    if (pet.secondaryType !== undefined) {
      delete pet.secondaryType;
    }
  }

  /**
   * 获取属性名称（简化版）
   */
  private getTypeName(type: number): string {
    const typeNames: { [key: number]: string } = {
      0: '普通', 1: '火', 2: '水', 3: '草', 4: '电',
      5: '地面', 6: '飞行', 7: '机械', 8: '冰', 9: '战斗',
      10: '光', 11: '暗影', 12: '神秘', 13: '超能', 14: '龙'
    };
    return typeNames[type] ?? `属性${type}`;
  }

  /**
   * 获取复制状态
   */
  private getCopyState(pet: any): {
    originalType: number;
    copiedType: number;
    remainingTurns?: number;
    isCopied: boolean;
  } {
    if (!pet.effectStates) {
      pet.effectStates = {};
    }
    if (!pet.effectStates.typeCopy) {
      pet.effectStates.typeCopy = {
        originalType: this.getPetType(pet),
        copiedType: this.getPetType(pet),
        isCopied: false
      };
    }
    return pet.effectStates.typeCopy;
  }

  /**
   * 设置复制状态
   */
  private setCopyState(pet: any, originalType: number, copiedType: number, duration?: number): void {
    const state = this.getCopyState(pet);
    state.originalType = originalType;
    state.copiedType = copiedType;
    state.isCopied = true;
    if (duration !== undefined) {
      state.remainingTurns = duration;
    }
  }
}
