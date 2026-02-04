import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 等级伤害附加参数接口
 */
export interface ILevelDamageParams {
  /** 等级伤害系数 */
  levelMultiplier?: number;
}

/**
 * 等级伤害附加效果
 * 
 * 根据自身等级计算额外伤害
 * 
 * @category Special
 */
export class LevelDamage extends BaseAtomicEffect {
  private levelMultiplier: number;

  constructor(params: ILevelDamageParams) {
    super(AtomicEffectType.SPECIAL, 'LevelDamage', []);
    this.levelMultiplier = params.levelMultiplier || 1;
  }

  public validate(params: any): boolean {
    return true;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker, damage } = context;

    // 计算等级附加伤害
    const level = attacker.level || 1;
    const additionalDamage = Math.floor(level * this.levelMultiplier);

    // 添加到伤害
    if (damage !== undefined) {
      context.damage = damage + additionalDamage;
    }

    return [this.createResult(
      true,
      'attacker',
      'level_damage',
      `等级伤害附加 +${additionalDamage}`,
      additionalDamage,
      {
        level,
        multiplier: this.levelMultiplier,
        additionalDamage
      }
    )];
  }
}
