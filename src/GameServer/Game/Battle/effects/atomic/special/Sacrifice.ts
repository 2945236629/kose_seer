import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 献祭效果参数接口
 */
export interface ISacrificeParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'sacrifice';
  /** 献祭模式（hp_percent=HP百分比，hp_fixed=固定HP，instant_ko=直接击倒） */
  mode: 'hp_percent' | 'hp_fixed' | 'instant_ko';
  /** 献祭值（hp_percent模式为百分比0-100，hp_fixed模式为固定值） */
  value?: number;
  /** 威力加成（可选，献祭HP越多威力越高） */
  powerBonus?: number;
  /** 是否在击倒自己后仍然造成伤害（可选，默认true） */
  damageAfterKo?: boolean;
}

/**
 * 献祭效果
 * 
 * 功能：
 * - 消耗自己的HP来增强技能效果
 * - 支持百分比、固定值、直接击倒三种模式
 * - 可根据献祭HP量提升威力
 * - 可选择击倒后是否仍造成伤害
 * 
 * 使用场景：
 * - 自爆（消耗所有HP，造成巨额伤害）
 * - 舍身冲撞（消耗50%HP，威力提升）
 * - 生命献祭（消耗固定HP，威力大幅提升）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "sacrifice",
 *   "mode": "hp_percent",
 *   "value": 50,
 *   "powerBonus": 1.5,
 *   "damageAfterKo": true
 * }
 * ```
 * 
 * 计算公式：
 * - 威力 = 基础威力 × (1 + 献祭HP百分比 × powerBonus)
 * - 例如：献祭50%HP，powerBonus=1.5，则威力 = 基础威力 × 1.75
 */
export class Sacrifice extends BaseAtomicEffect {
  private mode: 'hp_percent' | 'hp_fixed' | 'instant_ko';
  private value: number;
  private powerBonus: number;
  private damageAfterKo: boolean;

  constructor(params: ISacrificeParams) {
    super(
      AtomicEffectType.SPECIAL,
      'Sacrifice',
      [EffectTiming.BEFORE_DAMAGE_CALC]
    );

    this.mode = params.mode;
    this.value = params.value ?? 0;
    this.powerBonus = params.powerBonus ?? 0;
    this.damageAfterKo = params.damageAfterKo ?? true;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const attacker = this.getAttacker(context);

    const currentHp = attacker.hp ?? 0;
    const maxHp = attacker.maxHp ?? 0;
    let sacrificeHp = 0;

    // 计算献祭HP
    switch (this.mode) {
      case 'hp_percent':
        sacrificeHp = Math.floor(maxHp * this.value / 100);
        break;
      case 'hp_fixed':
        sacrificeHp = this.value;
        break;
      case 'instant_ko':
        sacrificeHp = currentHp;
        break;
    }

    // 确保不超过当前HP
    sacrificeHp = Math.min(sacrificeHp, currentHp);

    if (sacrificeHp <= 0) {
      results.push(
        this.createResult(
          false,
          'attacker',
          'sacrifice',
          'HP不足，无法献祭',
          0
        )
      );
      return results;
    }

    // 扣除HP
    attacker.hp = Math.max(0, currentHp - sacrificeHp);
    const isKo = attacker.hp === 0;

    results.push(
      this.createResult(
        true,
        'attacker',
        'sacrifice',
        `献祭了${sacrificeHp}HP！`,
        sacrificeHp,
        {
          sacrificeHp,
          remainingHp: attacker.hp,
          isKo
        }
      )
    );

    // 如果有威力加成，应用到技能威力
    if (this.powerBonus > 0 && context.skill) {
      const hpPercent = sacrificeHp / maxHp;
      const powerMultiplier = 1 + (hpPercent * this.powerBonus);
      const originalPower = context.skill.power;
      context.skill.power = Math.floor(originalPower * powerMultiplier);

      results.push(
        this.createResult(
          true,
          'attacker',
          'power_boost',
          `威力提升！${originalPower}→${context.skill.power}`,
          context.skill.power - originalPower,
          {
            originalPower,
            newPower: context.skill.power,
            powerMultiplier
          }
        )
      );

      this.log(
        `献祭威力加成: 献祭${sacrificeHp}HP (${Math.round(hpPercent * 100)}%), ` +
        `威力${originalPower}→${context.skill.power} (×${powerMultiplier.toFixed(2)})`
      );
    }

    // 如果击倒自己且不允许造成伤害，设置伤害为0
    if (isKo && !this.damageAfterKo) {
      context.damage = 0;
      results.push(
        this.createResult(
          true,
          'attacker',
          'sacrifice_ko',
          '献祭击倒了自己！',
          0
        )
      );
    }

    this.log(
      `献祭效果: 消耗${sacrificeHp}HP, 剩余${attacker.hp}HP` +
      (isKo ? ' (击倒)' : '')
    );

    return results;
  }

  public validate(params: any): boolean {
    if (!['hp_percent', 'hp_fixed', 'instant_ko'].includes(params.mode)) {
      this.log('mode必须是hp_percent、hp_fixed或instant_ko', 'error');
      return false;
    }
    if (params.mode !== 'instant_ko' && params.value === undefined) {
      this.log('hp_percent和hp_fixed模式需要指定value', 'error');
      return false;
    }
    if (params.mode === 'hp_percent' && (params.value < 0 || params.value > 100)) {
      this.log('hp_percent模式的value必须在0-100之间', 'error');
      return false;
    }
    return true;
  }
}
