import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 属性技能反击效果参数接口
 */
export interface ITypeSkillCounterParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'type_skill_counter';
  /** 持续回合数 */
  duration: number;
  /** 反击类型 */
  counterType: 'status' | 'stat_change' | 'damage';
  /** 状态ID（counterType='status'时） */
  statusId?: number;
  /** 状态持续时间 */
  statusDuration?: number;
  /** 触发概率（0-100） */
  probability?: number;
  /** 能力索引（counterType='stat_change'时） */
  statIndex?: number;
  /** 能力变化值 */
  statChange?: number;
  /** 伤害值（counterType='damage'时） */
  damageValue?: number;
}

/**
 * 属性技能反击效果
 * 
 * 功能：
 * - X回合内，若对方使用属性技能，则触发反击效果
 * - 支持施加状态、改变能力、造成伤害等反击类型
 * 
 * 使用场景：
 * - 效果152: 3回合内，若对方使用属性技能，则50%使对方中毒
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "type_skill_counter",
 *   "duration": 3,
 *   "counterType": "status",
 *   "statusId": 1,
 *   "statusDuration": 3,
 *   "probability": 50
 * }
 * ```
 */
export class TypeSkillCounter extends BaseAtomicEffect {
  private duration: number;
  private counterType: string;
  private statusId?: number;
  private statusDuration: number;
  private probability: number;
  private statIndex?: number;
  private statChange?: number;
  private damageValue?: number;

  constructor(params: ITypeSkillCounterParams) {
    super(
      AtomicEffectType.SPECIAL,
      'TypeSkillCounter',
      [EffectTiming.AFTER_SKILL, EffectTiming.BEFORE_SKILL, EffectTiming.TURN_END]
    );

    this.duration = params.duration;
    this.counterType = params.counterType;
    this.statusId = params.statusId;
    this.statusDuration = params.statusDuration || 3;
    this.probability = params.probability || 100;
    this.statIndex = params.statIndex;
    this.statChange = params.statChange;
    this.damageValue = params.damageValue;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const attacker = this.getAttacker(context);
    const defender = this.getDefender(context);

    // 在AFTER_SKILL时机设置反击状态
    if (context.timing === EffectTiming.AFTER_SKILL) {
      if (!attacker.effectCounters) {
        attacker.effectCounters = {};
      }

      attacker.effectCounters['type_skill_counter'] = this.duration;
      // 存储反击参数（使用特殊命名的计数器）
      attacker.effectCounters['type_skill_counter_prob'] = this.probability;
      
      if (this.counterType === 'status' && this.statusId !== undefined) {
        attacker.effectCounters['type_skill_counter_type'] = 1; // 1=status
        attacker.effectCounters['type_skill_counter_status'] = this.statusId;
        attacker.effectCounters['type_skill_counter_duration'] = this.statusDuration;
      } else if (this.counterType === 'stat_change' && this.statIndex !== undefined && this.statChange !== undefined) {
        attacker.effectCounters['type_skill_counter_type'] = 2; // 2=stat_change
        attacker.effectCounters['type_skill_counter_stat'] = this.statIndex;
        attacker.effectCounters['type_skill_counter_change'] = this.statChange;
      } else if (this.counterType === 'damage' && this.damageValue !== undefined) {
        attacker.effectCounters['type_skill_counter_type'] = 3; // 3=damage
        attacker.effectCounters['type_skill_counter_damage'] = this.damageValue;
      }

      results.push(
        this.createResult(
          true,
          'attacker',
          'type_skill_counter',
          `属性技能反击状态！持续${this.duration}回合`,
          this.duration,
          { counterType: this.counterType }
        )
      );

      this.log(`属性技能反击: 类型=${this.counterType}, 持续${this.duration}回合`);
    }

    // 在BEFORE_SKILL时机检查是否触发反击
    if (context.timing === EffectTiming.BEFORE_SKILL) {
      // 检查防御方是否有反击状态
      if (defender.effectCounters?.['type_skill_counter']) {
        const counterTypeNum = defender.effectCounters['type_skill_counter_type'] || 0;
        const prob = defender.effectCounters['type_skill_counter_prob'] || 100;
        
        // 检查攻击方是否使用了属性技能（假设skillType存在且不为0表示属性技能）
        const skill = context.skill;
        // 暂时跳过类型检查，等待技能系统完善
        const isTypeSkill = true; // 假设所有技能都是属性技能
        
        if (skill && isTypeSkill) {
          // 概率判定
          if (Math.random() * 100 < prob) {
            if (counterTypeNum === 1) {
              // status
              const statusId = defender.effectCounters['type_skill_counter_status'] || 0;
              const duration = defender.effectCounters['type_skill_counter_duration'] || 3;

              // 检查是否已有状态或免疫
              if (!attacker.status || attacker.status === -1) {
                if (!attacker.immuneFlags?.status) {
                  attacker.status = statusId;
                  if (!attacker.statusDurations) {
                    attacker.statusDurations = [0, 0, 0, 0, 0, 0, 0, 0, 0];
                  }
                  attacker.statusDurations[statusId] = duration;

                  results.push(
                    this.createResult(
                      true,
                      'attacker',
                      'status_inflict',
                      `属性技能反击！施加异常状态！`,
                      statusId,
                      { duration }
                    )
                  );

                  this.log(`属性技能反击触发: 施加状态${statusId}`);
                }
              }
            } else if (counterTypeNum === 2) {
              // stat_change
              const statIndex = defender.effectCounters['type_skill_counter_stat'] || 0;
              const statChange = defender.effectCounters['type_skill_counter_change'] || 0;

              if (!attacker.battleLv) {
                attacker.battleLv = [0, 0, 0, 0, 0, 0];
              }

              const oldLevel = attacker.battleLv[statIndex];
              attacker.battleLv[statIndex] = Math.max(-6, Math.min(6, oldLevel + statChange));

              results.push(
                this.createResult(
                  true,
                  'attacker',
                  'stat_change',
                  `属性技能反击！能力变化！`,
                  statChange,
                  { statIndex, oldLevel, newLevel: attacker.battleLv[statIndex] }
                )
              );

              this.log(`属性技能反击触发: 能力${statIndex}变化${statChange}`);
            } else if (counterTypeNum === 3) {
              // damage
              const damageValue = defender.effectCounters['type_skill_counter_damage'] || 0;

              if (attacker.hp !== undefined) {
                attacker.hp = Math.max(0, attacker.hp - damageValue);

                results.push(
                  this.createResult(
                    true,
                    'attacker',
                    'damage',
                    `属性技能反击！造成${damageValue}伤害！`,
                    damageValue
                  )
                );

                this.log(`属性技能反击触发: 造成${damageValue}伤害`);
              }
            }
          }
        }
      }
    }

    // 在TURN_END时机递减计数器
    if (context.timing === EffectTiming.TURN_END) {
      if (attacker.effectCounters?.['type_skill_counter']) {
        attacker.effectCounters['type_skill_counter']--;
        if (attacker.effectCounters['type_skill_counter'] <= 0) {
          delete attacker.effectCounters['type_skill_counter'];
          delete attacker.effectCounters['type_skill_counter_type'];
          delete attacker.effectCounters['type_skill_counter_prob'];
          delete attacker.effectCounters['type_skill_counter_status'];
          delete attacker.effectCounters['type_skill_counter_duration'];
          delete attacker.effectCounters['type_skill_counter_stat'];
          delete attacker.effectCounters['type_skill_counter_change'];
          delete attacker.effectCounters['type_skill_counter_damage'];

          results.push(
            this.createResult(
              true,
              'attacker',
              'type_skill_counter_end',
              `属性技能反击状态解除！`,
              0
            )
          );

          this.log(`属性技能反击状态解除`);
        }
      }
    }

    return results;
  }

  public validate(params: any): boolean {
    if (params.duration === undefined || params.duration < 1) {
      this.log('duration必须大于0', 'error');
      return false;
    }
    if (!params.counterType) {
      this.log('counterType必须指定', 'error');
      return false;
    }
    return true;
  }
}
