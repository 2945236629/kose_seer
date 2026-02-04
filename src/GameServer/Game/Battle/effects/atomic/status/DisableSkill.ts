import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 封技效果参数接口
 */
export interface IDisableSkillParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'disable_skill';
  duration: number;             // 持续回合数
  disableType?: 'last' | 'all' | 'specific'; // 封技类型
  skillId?: number;             // 指定技能ID（disableType为specific时使用）
  probability?: number;         // 触发概率（0-100）
}

/**
 * 封技原子效果
 * 使对方下X个回合无法使用技能
 * 
 * 用途：
 * - Effect_52: 先手封技（封印对方上次使用的技能）
 * 
 * 特性：
 * - 可以封印上次使用的技能
 * - 可以封印所有技能
 * - 可以封印指定技能
 * - 支持概率触发
 * 
 * @example
 * // 封印对方上次使用的技能，持续3回合
 * {
 *   type: 'special',
 *   specialType: 'disable_skill',
 *   duration: 3,
 *   disableType: 'last'
 * }
 * 
 * @example
 * // 50%概率封印所有技能，持续2回合
 * {
 *   type: 'special',
 *   specialType: 'disable_skill',
 *   duration: 2,
 *   disableType: 'all',
 *   probability: 50
 * }
 * 
 * @category Status
 */
export class DisableSkill extends BaseAtomicEffect {
  private params: IDisableSkillParams;

  constructor(params: IDisableSkillParams) {
    super(AtomicEffectType.SPECIAL, 'Disable Skill', [EffectTiming.AFTER_SKILL]);
    this.params = params;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const defender = context.defender;
    
    // 检查概率
    const probability = this.params.probability || 100;
    if (!this.checkProbability(probability)) {
      results.push(this.createResult(
        false,
        'defender',
        'disable_skill_failed',
        `封技失败（概率${probability}%）`,
        0
      ));
      return results;
    }
    
    // 根据封技类型处理
    let disabledSkillId: number | null = null;
    let disableMessage = '';
    
    switch (this.params.disableType) {
      case 'last':
        // 封印上次使用的技能
        if (defender.lastMove) {
          disabledSkillId = defender.lastMove;
          disableMessage = `上次使用的技能被封印${this.params.duration}回合`;
        } else {
          results.push(this.createResult(
            false,
            'defender',
            'disable_skill_no_last',
            '没有上次使用的技能',
            0
          ));
          return results;
        }
        break;
        
      case 'all':
        // 封印所有技能
        disableMessage = `所有技能被封印${this.params.duration}回合`;
        break;
        
      case 'specific':
        // 封印指定技能
        if (this.params.skillId) {
          disabledSkillId = this.params.skillId;
          disableMessage = `技能${this.params.skillId}被封印${this.params.duration}回合`;
        }
        break;
        
      default:
        // 默认封印上次使用的技能
        if (defender.lastMove) {
          disabledSkillId = defender.lastMove;
          disableMessage = `上次使用的技能被封印${this.params.duration}回合`;
        }
        break;
    }
    
    // 应用封技效果
    if (disabledSkillId !== null || this.params.disableType === 'all') {
      // 设置encore状态（克制/封技状态）
      defender.encore = true;
      defender.encoreTurns = this.params.duration;
      
      // 存储被封印的技能ID到effectCounters
      if (!defender.effectCounters) {
        defender.effectCounters = {};
      }
      defender.effectCounters['disabledSkill'] = disabledSkillId || -1; // -1表示全部
      
      results.push(this.createResult(
        true,
        'defender',
        'disable_skill',
        disableMessage,
        this.params.duration,
        { disabledSkillId, duration: this.params.duration }
      ));
      
      this.log(`封技成功: ${disableMessage}`);
    }
    
    return results;
  }

  public validate(params: any): boolean {
    return params &&
           params.type === AtomicEffectType.SPECIAL &&
           params.specialType === 'disable_skill' &&
           typeof params.duration === 'number' &&
           params.duration > 0;
  }
}
