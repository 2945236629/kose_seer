import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * Miss惩罚效果参数接口
 */
export interface IMissPenaltyParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'miss_penalty';
  /** 惩罚类型：hp_damage=HP伤害, stat_down=能力下降, status=异常状态 */
  penaltyType: 'hp_damage' | 'stat_down' | 'status';
  /** HP伤害值（百分比0-100或固定值） */
  hpDamage?: number;
  /** HP伤害模式：percent=百分比, fixed=固定值 */
  hpDamageMode?: 'percent' | 'fixed';
  /** 能力索引（0-5：攻击/防御/特攻/特防/速度/命中） */
  statIndex?: number;
  /** 能力变化等级（-6到+6） */
  statChange?: number;
  /** 异常状态ID */
  statusId?: number;
}

/**
 * Miss惩罚效果
 * 
 * 功能：
 * - 技能未命中时对自己施加惩罚
 * - 支持HP伤害、能力下降、异常状态三种惩罚
 * - HP伤害支持百分比或固定值
 * - 能力下降支持指定能力和等级
 * 
 * 使用场景：
 * - 高风险技能（未命中时损失30%HP）
 * - 反噬技能（未命中时攻击-1）
 * - 诅咒技能（未命中时陷入混乱）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "miss_penalty",
 *   "penaltyType": "hp_damage",
 *   "hpDamage": 30,
 *   "hpDamageMode": "percent"
 * }
 * ```
 * 
 * 状态数据结构：
 * ```typescript
 * {
 *   missCount: number;  // Miss次数统计
 * }
 * ```
 */
export class MissPenalty extends BaseAtomicEffect {
  private penaltyType: 'hp_damage' | 'stat_down' | 'status';
  private hpDamage: number;
  private hpDamageMode: 'percent' | 'fixed';
  private statIndex: number;
  private statChange: number;
  private statusId: number;

  constructor(params: IMissPenaltyParams) {
    super(
      AtomicEffectType.SPECIAL,
      'MissPenalty',
      [EffectTiming.AFTER_SKILL]
    );

    this.penaltyType = params.penaltyType;
    this.hpDamage = params.hpDamage ?? 0;
    this.hpDamageMode = params.hpDamageMode ?? 'percent';
    this.statIndex = params.statIndex ?? 0;
    this.statChange = params.statChange ?? -1;
    this.statusId = params.statusId ?? 0;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const attacker = this.getAttacker(context);

    if (!attacker) {
      this.log('Miss惩罚效果：攻击者不存在', 'warn');
      return results;
    }

    // 检查是否Miss
    const skillMissed = context.effectData?.missed === true || context.effectData?.hit === false;
    if (!skillMissed) {
      return results;
    }

    // 获取状态
    const state = this.getMissPenaltyState(attacker);
    state.missCount = (state.missCount || 0) + 1;

    // 应用惩罚
    switch (this.penaltyType) {
      case 'hp_damage':
        this.applyHpDamagePenalty(attacker, results);
        break;
      case 'stat_down':
        this.applyStatDownPenalty(attacker, results);
        break;
      case 'status':
        this.applyStatusPenalty(attacker, results);
        break;
    }

    return results;
  }

  /**
   * 应用HP伤害惩罚
   */
  private applyHpDamagePenalty(attacker: any, results: IEffectResult[]): void {
    let damage = 0;

    if (this.hpDamageMode === 'percent') {
      damage = Math.floor(attacker.maxHp * (this.hpDamage / 100));
    } else {
      damage = this.hpDamage;
    }

    damage = Math.min(damage, attacker.hp - 1); // 至少保留1HP
    damage = Math.max(0, damage);

    if (damage > 0) {
      attacker.hp -= damage;

      results.push(
        this.createResult(
          true,
          'attacker',
          'miss_penalty',
          `Miss惩罚：损失${damage}HP`,
          damage,
          { penaltyType: 'hp_damage', mode: this.hpDamageMode }
        )
      );

      this.log(`Miss惩罚效果：攻击者损失${damage}HP`);
    }
  }

  /**
   * 应用能力下降惩罚
   */
  private applyStatDownPenalty(attacker: any, results: IEffectResult[]): void {
    if (!attacker.battleLevels) {
      attacker.battleLevels = [0, 0, 0, 0, 0, 0];
    }

    const oldLevel = attacker.battleLevels[this.statIndex];
    attacker.battleLevels[this.statIndex] = Math.max(-6, Math.min(6, oldLevel + this.statChange));
    const newLevel = attacker.battleLevels[this.statIndex];

    const statNames = ['攻击', '防御', '特攻', '特防', '速度', '命中'];
    const statName = statNames[this.statIndex] || '未知';

    results.push(
      this.createResult(
        true,
        'attacker',
        'miss_penalty',
        `Miss惩罚：${statName}${this.statChange > 0 ? '+' : ''}${this.statChange}`,
        this.statChange,
        { penaltyType: 'stat_down', statIndex: this.statIndex, oldLevel, newLevel }
      )
    );

    this.log(`Miss惩罚效果：攻击者${statName}从${oldLevel}变为${newLevel}`);
  }

  /**
   * 应用异常状态惩罚
   */
  private applyStatusPenalty(attacker: any, results: IEffectResult[]): void {
    // 设置异常状态
    if (!attacker.status) {
      attacker.status = this.statusId;

      const statusNames = ['麻痹', '中毒', '烧伤', '冻伤', '睡眠', '混乱', '害怕', '疲惫'];
      const statusName = statusNames[this.statusId] || '未知';

      results.push(
        this.createResult(
          true,
          'attacker',
          'miss_penalty',
          `Miss惩罚：陷入${statusName}状态`,
          this.statusId,
          { penaltyType: 'status', statusId: this.statusId }
        )
      );

      this.log(`Miss惩罚效果：攻击者陷入${statusName}状态`);
    }
  }

  /**
   * 获取Miss惩罚状态
   */
  private getMissPenaltyState(pet: any): { missCount: number } {
    if (!pet.effectStates) {
      pet.effectStates = {};
    }
    if (!pet.effectStates.missPenalty) {
      pet.effectStates.missPenalty = {
        missCount: 0
      };
    }
    return pet.effectStates.missPenalty;
  }

  public validate(params: any): boolean {
    if (!params.penaltyType || !['hp_damage', 'stat_down', 'status'].includes(params.penaltyType)) {
      this.log('Miss惩罚效果：penaltyType必须是hp_damage、stat_down或status', 'error');
      return false;
    }

    if (params.penaltyType === 'hp_damage') {
      if (typeof params.hpDamage !== 'number' || params.hpDamage <= 0) {
        this.log('Miss惩罚效果：hpDamage必须是正数', 'error');
        return false;
      }
      if (params.hpDamageMode === 'percent' && (params.hpDamage < 0 || params.hpDamage > 100)) {
        this.log('Miss惩罚效果：百分比模式下hpDamage必须在0-100之间', 'error');
        return false;
      }
    }

    if (params.penaltyType === 'stat_down') {
      if (typeof params.statIndex !== 'number' || params.statIndex < 0 || params.statIndex > 5) {
        this.log('Miss惩罚效果：statIndex必须在0-5之间', 'error');
        return false;
      }
      if (typeof params.statChange !== 'number' || params.statChange < -6 || params.statChange > 6) {
        this.log('Miss惩罚效果：statChange必须在-6到6之间', 'error');
        return false;
      }
    }

    if (params.penaltyType === 'status') {
      if (typeof params.statusId !== 'number' || params.statusId < 0) {
        this.log('Miss惩罚效果：statusId必须是非负整数', 'error');
        return false;
      }
    }

    return true;
  }
}
