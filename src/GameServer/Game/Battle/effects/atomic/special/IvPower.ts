import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 个体威力提升参数接口
 */
export interface IIvPowerParams {
  /** 最小威力 */
  minPower: number;
  /** 最大威力 */
  maxPower: number;
  /** IV计算方式 */
  ivType: 'total' | 'average' | 'max';
}

/**
 * 个体威力提升效果
 * 
 * 根据个体值提升威力
 * 
 * @category Special
 * @example
 * // 个体威力提升
 * {
 *   minPower: 1,
 *   maxPower: 155,
 *   ivType: 'total'
 * }
 */
export class IvPower extends BaseAtomicEffect {
  private minPower: number;
  private maxPower: number;
  private ivType: string;

  constructor(params: IIvPowerParams) {
    super(AtomicEffectType.SPECIAL, 'IvPower', []);
    this.minPower = params.minPower;
    this.maxPower = params.maxPower;
    this.ivType = params.ivType;
  }

  public validate(params: any): boolean {
    return this.maxPower >= this.minPower;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker } = context;

    // 计算个体值（简化实现，使用能力值作为近似）
    const iv = this.calculateIv(attacker);

    // 根据个体值计算威力
    // IV范围通常是0-31，总和0-186
    // 映射到威力范围
    const ivRatio = Math.min(1, iv / 186);
    const power = Math.floor(this.minPower + (this.maxPower - this.minPower) * ivRatio);

    return [this.createResult(
      true,
      'attacker',
      'iv_power',
      `个体威力提升（威力${power}）`,
      power,
      {
        power,
        iv,
        ivType: this.ivType
      }
    )];
  }

  private calculateIv(pet: any): number {
    // 简化实现：使用能力值总和作为个体值近似
    const stats = [
      pet.attack,
      pet.defence,
      pet.spAtk,
      pet.spDef,
      pet.speed,
      pet.maxHp
    ];

    switch (this.ivType) {
      case 'total':
        return stats.reduce((sum, stat) => sum + (stat % 32), 0);
      case 'average':
        return Math.floor(stats.reduce((sum, stat) => sum + (stat % 32), 0) / stats.length);
      case 'max':
        return Math.max(...stats.map(stat => stat % 32));
      default:
        return 0;
    }
  }
}
