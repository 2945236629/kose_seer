import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 献祭暴击效果参数接口
 */
export interface ISacrificeCritParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'sacrifice_crit';
  /** HP消耗模式：hp_percent=百分比, hp_fixed=固定值 */
  mode: 'hp_percent' | 'hp_fixed';
  /** HP消耗值（百分比0-100或固定值） */
  hpCost: number;
  /** 暴击率提升值（0-100） */
  critBoost: number;
  /** 是否必定暴击 */
  guaranteedCrit?: boolean;
}

/**
 * 献祭暴击效果
 * 
 * 功能：
 * - 消耗自己的HP来提升暴击率
 * - 支持百分比或固定值HP消耗
 * - 可设置必定暴击
 * - HP消耗在技能使用前执行
 * 
 * 使用场景：
 * - 背水一战（消耗50%HP，必定暴击）
 * - 生命赌博（消耗30%HP，暴击率+50%）
 * - 血之契约（消耗100HP，暴击率+30%）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "sacrifice_crit",
 *   "mode": "hp_percent",
 *   "hpCost": 50,
 *   "critBoost": 50,
 *   "guaranteedCrit": false
 * }
 * ```
 * 
 * 与Sacrifice的区别：
 * - Sacrifice: 消耗HP提升威力
 * - SacrificeCrit: 消耗HP提升暴击率
 */
export class SacrificeCrit extends BaseAtomicEffect {
  private mode: 'hp_percent' | 'hp_fixed';
  private hpCost: number;
  private critBoost: number;
  private guaranteedCrit: boolean;

  constructor(params: ISacrificeCritParams) {
    super(
      AtomicEffectType.SPECIAL,
      'SacrificeCrit',
      [EffectTiming.BEFORE_SKILL, EffectTiming.BEFORE_CRIT_CHECK]
    );

    this.mode = params.mode;
    this.hpCost = params.hpCost;
    this.critBoost = params.critBoost;
    this.guaranteedCrit = params.guaranteedCrit ?? false;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const attacker = this.getAttacker(context);

    if (!attacker) {
      this.log('献祭暴击效果：攻击者不存在', 'warn');
      return results;
    }

    // BEFORE_SKILL: 消耗HP
    if (context.timing === EffectTiming.BEFORE_SKILL) {
      let hpToSacrifice = 0;

      if (this.mode === 'hp_percent') {
        hpToSacrifice = Math.floor(attacker.maxHp * (this.hpCost / 100));
      } else {
        hpToSacrifice = this.hpCost;
      }

      // 确保不会消耗超过当前HP-1（至少保留1HP）
      hpToSacrifice = Math.min(hpToSacrifice, attacker.hp - 1);
      hpToSacrifice = Math.max(0, hpToSacrifice);

      if (hpToSacrifice > 0) {
        attacker.hp -= hpToSacrifice;

        results.push(
          this.createResult(
            true,
            'attacker',
            'sacrifice_crit',
            `献祭${hpToSacrifice}HP提升暴击率`,
            hpToSacrifice,
            { mode: this.mode, hpCost: this.hpCost }
          )
        );

        this.log(`献祭暴击效果：消耗${hpToSacrifice}HP`);
      }
    }

    // BEFORE_CRIT_CHECK: 提升暴击率
    if (context.timing === EffectTiming.BEFORE_CRIT_CHECK) {
      if (this.guaranteedCrit) {
        context.critRate = 100;
        results.push(
          this.createResult(
            true,
            'attacker',
            'crit_boost',
            '必定暴击',
            100
          )
        );
        this.log('献祭暴击效果：必定暴击');
      } else {
        const oldCritRate = context.critRate || 0;
        context.critRate = Math.min(100, oldCritRate + this.critBoost);

        results.push(
          this.createResult(
            true,
            'attacker',
            'crit_boost',
            `暴击率+${this.critBoost}%`,
            this.critBoost,
            { oldCritRate, newCritRate: context.critRate }
          )
        );

        this.log(`献祭暴击效果：暴击率从${oldCritRate}%提升到${context.critRate}%`);
      }
    }

    return results;
  }

  public validate(params: any): boolean {
    if (!params.mode || !['hp_percent', 'hp_fixed'].includes(params.mode)) {
      this.log('献祭暴击效果：mode必须是hp_percent或hp_fixed', 'error');
      return false;
    }

    if (typeof params.hpCost !== 'number' || params.hpCost <= 0) {
      this.log('献祭暴击效果：hpCost必须是正数', 'error');
      return false;
    }

    if (params.mode === 'hp_percent' && (params.hpCost < 0 || params.hpCost > 100)) {
      this.log('献祭暴击效果：百分比模式下hpCost必须在0-100之间', 'error');
      return false;
    }

    if (typeof params.critBoost !== 'number' || params.critBoost < 0 || params.critBoost > 100) {
      this.log('献祭暴击效果：critBoost必须在0-100之间', 'error');
      return false;
    }

    return true;
  }
}
