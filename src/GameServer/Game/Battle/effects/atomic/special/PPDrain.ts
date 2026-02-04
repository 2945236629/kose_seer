import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * PP消耗效果参数接口
 */
export interface IPPDrainParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'pp_drain';
  /** 目标（self=自己，opponent=对手） */
  target: 'self' | 'opponent';
  /** 消耗模式（fixed=固定值，percent=百分比，all=全部） */
  mode: 'fixed' | 'percent' | 'all';
  /** 消耗值（fixed模式为具体PP数，percent模式为百分比0-100） */
  value?: number;
  /** 是否针对特定技能（可选，不指定则随机选择） */
  targetSkillId?: number;
  /** 触发概率（可选，默认100） */
  probability?: number;
}

/**
 * PP消耗效果
 * 
 * 功能：
 * - 消耗目标精灵的技能PP值
 * - 支持固定值、百分比、全部消耗三种模式
 * - 可以指定消耗特定技能的PP，或随机选择
 * - 支持触发概率
 * 
 * 使用场景：
 * - 恶魔之吻（消耗对手随机技能3PP）
 * - PP封印（消耗对手所有技能PP）
 * - 压制（消耗对手当前技能50%PP）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "pp_drain",
 *   "target": "opponent",
 *   "mode": "fixed",
 *   "value": 3,
 *   "probability": 100
 * }
 * ```
 * 
 * 模式说明：
 * - fixed: 消耗固定PP值（value指定）
 * - percent: 消耗百分比PP（value为0-100）
 * - all: 消耗全部PP（value忽略）
 */
export class PPDrain extends BaseAtomicEffect {
  private target: 'self' | 'opponent';
  private mode: 'fixed' | 'percent' | 'all';
  private value: number;
  private targetSkillId?: number;
  private probability: number;

  constructor(params: IPPDrainParams) {
    super(
      AtomicEffectType.SPECIAL,
      'PPDrain',
      [EffectTiming.AFTER_SKILL, EffectTiming.ON_ATTACKED]
    );

    this.target = params.target;
    this.mode = params.mode;
    this.value = params.value ?? 0;
    this.targetSkillId = params.targetSkillId;
    this.probability = params.probability ?? 100;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];

    // 概率判断
    if (!this.checkProbability(this.probability)) {
      results.push(
        this.createResult(
          false,
          'both',
          'pp_drain',
          'PP消耗未触发',
          0
        )
      );
      return results;
    }

    const targetPet = this.getTarget(context, this.target);

    // 获取目标技能
    const skills = this.getTargetSkills(targetPet);
    if (skills.length === 0) {
      results.push(
        this.createResult(
          false,
          this.target === 'self' ? 'attacker' : 'defender',
          'pp_drain',
          '目标没有可消耗的技能',
          0
        )
      );
      return results;
    }

    // 选择要消耗PP的技能
    let targetSkill: any;
    if (this.targetSkillId !== undefined) {
      targetSkill = skills.find((s: any) => s.id === this.targetSkillId);
      if (!targetSkill) {
        results.push(
          this.createResult(
            false,
            this.target === 'self' ? 'attacker' : 'defender',
            'pp_drain',
            `未找到技能ID: ${this.targetSkillId}`,
            0
          )
        );
        return results;
      }
    } else {
      // 随机选择一个有PP的技能
      const availableSkills = skills.filter((s: any) => (s.currentPP ?? s.maxPP ?? 0) > 0);
      if (availableSkills.length === 0) {
        results.push(
          this.createResult(
            false,
            this.target === 'self' ? 'attacker' : 'defender',
            'pp_drain',
            '目标所有技能PP已耗尽',
            0
          )
        );
        return results;
      }
      targetSkill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
    }

    // 计算消耗的PP
    const currentPP = targetSkill.currentPP ?? targetSkill.maxPP ?? 0;
    const maxPP = targetSkill.maxPP ?? 0;
    let drainAmount = 0;

    switch (this.mode) {
      case 'fixed':
        drainAmount = Math.min(this.value, currentPP);
        break;
      case 'percent':
        drainAmount = Math.min(Math.floor(maxPP * this.value / 100), currentPP);
        break;
      case 'all':
        drainAmount = currentPP;
        break;
    }

    // 应用PP消耗
    targetSkill.currentPP = Math.max(0, currentPP - drainAmount);

    results.push(
      this.createResult(
        true,
        this.target === 'self' ? 'attacker' : 'defender',
        'pp_drain',
        `技能"${targetSkill.name ?? targetSkill.id}"的PP减少了${drainAmount}`,
        drainAmount,
        {
          skillId: targetSkill.id,
          skillName: targetSkill.name,
          drainAmount,
          remainingPP: targetSkill.currentPP
        }
      )
    );

    this.log(
      `消耗${this.target === 'self' ? '自己' : '对手'}的技能PP: ` +
      `${targetSkill.name ?? targetSkill.id} -${drainAmount}PP (剩余${targetSkill.currentPP})`
    );

    return results;
  }

  public validate(params: any): boolean {
    if (!['self', 'opponent'].includes(params.target)) {
      this.log('target必须是self或opponent', 'error');
      return false;
    }
    if (!['fixed', 'percent', 'all'].includes(params.mode)) {
      this.log('mode必须是fixed、percent或all', 'error');
      return false;
    }
    if (params.mode !== 'all' && (params.value === undefined || params.value < 0)) {
      this.log('fixed和percent模式需要指定有效的value', 'error');
      return false;
    }
    return true;
  }

  /**
   * 获取目标精灵的技能列表
   */
  private getTargetSkills(pet: any): any[] {
    if (!pet) return [];
    return pet.skills ?? pet.skillList ?? [];
  }
}
