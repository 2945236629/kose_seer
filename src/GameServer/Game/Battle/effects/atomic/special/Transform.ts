import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 变身效果参数接口
 */
export interface ITransformParams {
  /** 变身持续时间（回合数，0表示永久） */
  duration?: number;
  /** 是否复制能力等级 */
  copyStatStages?: boolean;
  /** 是否复制HP */
  copyHp?: boolean;
}

/**
 * 变身效果 (Transform)
 * 
 * 变身成对手的样子，复制对手的属性、技能等。
 * 
 * **注意：这是简化实现，仅复制基础属性**
 * 
 * @category Special
 */
export class Transform extends BaseAtomicEffect {
  private duration: number;
  private copyStatStages: boolean;
  private copyHp: boolean;

  constructor(params: ITransformParams) {
    super(AtomicEffectType.SPECIAL, 'Transform', []);
    this.duration = params.duration || 0;
    this.copyStatStages = params.copyStatStages !== false;
    this.copyHp = params.copyHp || false;
  }

  public validate(params: any): boolean {
    return true;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker, defender } = context;

    // 简化实现：仅复制基础属性
    attacker.attack = defender.attack;
    attacker.defence = defender.defence;
    attacker.speed = defender.speed;

    // 复制技能
    attacker.skills = [...defender.skills];
    if (defender.skillPP) {
      attacker.skillPP = [...defender.skillPP];
    }

    // 复制属性类型
    attacker.type = defender.type;

    // 可选：复制能力等级
    if (this.copyStatStages && defender.battleLv) {
      attacker.battleLv = [...defender.battleLv];
    }

    return [this.createResult(
      true,
      'attacker',
      'transform',
      `变身成功：变身成${defender.name || '对手'}`,
      0,
      {
        duration: this.duration,
        copyStatStages: this.copyStatStages,
        copyHp: this.copyHp
      }
    )];
  }
}
