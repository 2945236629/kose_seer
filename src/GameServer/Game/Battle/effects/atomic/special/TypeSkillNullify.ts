import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 属性技能无效化参数接口
 */
export interface ITypeSkillNullifyParams {
  /** 持续回合数 */
  duration: number;
  /** 无效化的属性类型列表 */
  types: number[];
}

/**
 * 属性技能无效化效果
 * 
 * 使特定属性的技能无效
 * 
 * @category Special
 * @example
 * // 持续火属性技能无效
 * {
 *   duration: 5,
 *   types: [1] // 1 = 火属性
 * }
 */
export class TypeSkillNullify extends BaseAtomicEffect {
  private duration: number;
  private types: number[];

  constructor(params: ITypeSkillNullifyParams) {
    super(AtomicEffectType.SPECIAL, 'TypeSkillNullify', []);
    this.duration = params.duration;
    this.types = params.types;
  }

  public validate(params: any): boolean {
    return this.duration > 0 && this.types.length > 0;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker, defender, skillType } = context;

    // 检查技能属性是否在无效化列表中
    if (skillType !== undefined && this.types.includes(skillType)) {
      // 技能无效，伤害归零
      return [this.createResult(
        true,
        'defender',
        'type_skill_nullify',
        `属性技能无效（属性${skillType}）`,
        0,
        {
          nullifiedType: skillType,
          types: this.types,
          duration: this.duration
        }
      )];
    }

    return [this.createResult(
      false,
      'defender',
      'type_skill_nullify',
      '技能属性不在无效化列表中'
    )];
  }
}
