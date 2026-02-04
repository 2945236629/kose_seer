import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 寄生种子参数接口
 */
export interface ILeechSeedParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'leech_seed';
  damageRatio: number;          // 伤害比例（基于目标最大HP）
  duration: number;             // 持续回合数
  immuneTypes?: number[];       // 免疫的属性类型（如草系）
  healAttacker?: boolean;       // 是否回复攻击者HP
}

/**
 * 寄生种子原子效果
 * 每回合吸取对方最大HP的一定比例，持续N回合
 * 
 * 用途：
 * - Effect_13: 持续吸取（每回合1/8最大HP）
 * 
 * 特性：
 * - 对特定属性免疫（如草系）
 * - 可以回复攻击者HP
 * - 持续多回合
 * 
 * @example
 * // 每回合吸取1/8最大HP，持续5回合，草系免疫
 * {
 *   type: 'special',
 *   specialType: 'leech_seed',
 *   damageRatio: 0.125,
 *   duration: 5,
 *   immuneTypes: [12], // 草系
 *   healAttacker: true
 * }
 * 
 * @category Damage
 */
export class LeechSeed extends BaseAtomicEffect {
  private params: ILeechSeedParams;

  constructor(params: ILeechSeedParams) {
    super(AtomicEffectType.SPECIAL, 'Leech Seed', [EffectTiming.TURN_END]);
    this.params = params;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const attacker = context.attacker;
    const defender = context.defender;
    
    // 检查免疫
    if (this.params.immuneTypes && this.params.immuneTypes.includes(defender.type)) {
      results.push(this.createResult(
        false,
        'defender',
        'leech_seed_immune',
        `${this.getTypeName(defender.type)}系免疫寄生种子`,
        0
      ));
      
      this.log(`目标${defender.name}免疫寄生种子（${this.getTypeName(defender.type)}系）`);
      return results;
    }
    
    // 计算吸取伤害
    const drainAmount = Math.floor(defender.maxHp * this.params.damageRatio);
    const actualDamage = Math.min(drainAmount, defender.hp);
    
    if (actualDamage > 0) {
      // 对目标造成伤害
      defender.hp -= actualDamage;
      
      results.push(this.createResult(
        true,
        'defender',
        'leech_seed_damage',
        `被寄生种子吸取${actualDamage}点HP`,
        actualDamage
      ));
      
      // 回复攻击者HP
      if (this.params.healAttacker && attacker.hp < attacker.maxHp) {
        const healAmount = Math.min(actualDamage, attacker.maxHp - attacker.hp);
        attacker.hp += healAmount;
        
        results.push(this.createResult(
          true,
          'attacker',
          'leech_seed_heal',
          `通过寄生种子回复${healAmount}点HP`,
          healAmount
        ));
        
        this.log(`寄生种子: 吸取${actualDamage}HP, 回复${healAmount}HP`);
      } else {
        this.log(`寄生种子: 吸取${actualDamage}HP`);
      }
    }
    
    return results;
  }

  public validate(params: any): boolean {
    return params &&
           params.type === AtomicEffectType.SPECIAL &&
           params.specialType === 'leech_seed' &&
           typeof params.damageRatio === 'number' &&
           params.damageRatio > 0 &&
           params.damageRatio <= 1 &&
           typeof params.duration === 'number' &&
           params.duration > 0;
  }

  /**
   * 获取属性名称
   */
  private getTypeName(type: number): string {
    const typeNames: { [key: number]: string } = {
      0: '普通', 1: '水', 2: '火', 3: '草', 4: '电',
      5: '冰', 6: '战斗', 7: '地面', 8: '飞行', 9: '超能',
      10: '虫', 11: '岩石', 12: '草', 13: '鬼', 14: '龙',
      15: '恶', 16: '钢', 17: '妖精', 18: '光', 19: '暗影'
    };
    return typeNames[type] || '未知';
  }
}
