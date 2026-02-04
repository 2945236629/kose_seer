import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 伤害转化为体力参数接口
 */
export interface IDamageToHpParams {
  /** 持续回合数 */
  duration?: number;
  /** 转化比例 */
  conversionRatio?: number;
}

/**
 * 伤害转化为体力状态
 */
interface IDamageToHpAura {
  duration: number;
  remainingTurns: number;
  conversionRatio: number;
}

/**
 * 伤害转化为体力效果
 * 
 * 持续N回合，受到的伤害转化为自身HP
 * 
 * @category Special
 */
export class DamageToHp extends BaseAtomicEffect {
  private duration: number;
  private conversionRatio: number;
  
  // 追踪每个精灵的光环状态
  private auras: Map<number, IDamageToHpAura> = new Map();

  constructor(params: IDamageToHpParams) {
    super(AtomicEffectType.SPECIAL, 'DamageToHp', []);
    this.duration = params.duration || 3;
    this.conversionRatio = params.conversionRatio || 1.0;
  }

  public validate(params: any): boolean {
    return true;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker } = context;

    // 创建光环
    this.auras.set(attacker.id, {
      duration: this.duration,
      remainingTurns: this.duration,
      conversionRatio: this.conversionRatio
    });

    return [this.createResult(
      true,
      'attacker',
      'damage_to_hp',
      `伤害转化为体力光环（${this.duration}回合）`,
      this.duration,
      {
        duration: this.duration,
        conversionRatio: this.conversionRatio
      }
    )];
  }

  /**
   * 受到伤害时触发
   */
  public onDamageTaken(petId: number, pet: any, damage: number): IEffectResult[] {
    const aura = this.auras.get(petId);
    if (!aura) return [];

    // 将伤害转化为HP
    const healAmount = Math.floor(damage * aura.conversionRatio);
    pet.hp = Math.min(pet.maxHp, pet.hp + healAmount);

    return [this.createResult(
      true,
      'attacker',
      'damage_to_hp_trigger',
      `伤害转化为体力 +${healAmount}HP`,
      healAmount,
      {
        damage,
        healAmount,
        conversionRatio: aura.conversionRatio
      }
    )];
  }

  /**
   * 每回合结束时触发
   */
  public onTurnEnd(petId: number): void {
    const aura = this.auras.get(petId);
    if (aura) {
      aura.remainingTurns--;
      if (aura.remainingTurns <= 0) {
        this.auras.delete(petId);
      }
    }
  }

  /**
   * 移除光环
   */
  public removeAura(petId: number): void {
    this.auras.delete(petId);
  }
}
