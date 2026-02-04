import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * PP恢复效果参数接口
 */
export interface IPPRestoreParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'pp_restore';
  /** 恢复模式：all=所有技能, specific=指定技能, random=随机技能 */
  mode: 'all' | 'specific' | 'random';
  /** 恢复的PP值 */
  amount: number;
  /** 指定技能索引（0-3，仅specific模式） */
  skillIndex?: number;
  /** 目标：self=自己, opponent=对手 */
  target?: 'self' | 'opponent';
}

/**
 * PP恢复效果
 * 
 * 功能：
 * - 恢复技能的PP值
 * - 支持恢复所有技能、指定技能或随机技能
 * - 可恢复自己或对手的PP
 * - 不会超过技能的最大PP
 * 
 * 使用场景：
 * - PP恢复药（恢复所有技能10PP）
 * - 能量回复（恢复指定技能20PP）
 * - 随机恢复（随机恢复一个技能15PP）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "special",
 *   "specialType": "pp_restore",
 *   "mode": "all",
 *   "amount": 10,
 *   "target": "self"
 * }
 * ```
 * 
 * 与PPDrain的区别：
 * - PPDrain: 消耗对手的PP
 * - PPRestore: 恢复PP
 */
export class PPRestore extends BaseAtomicEffect {
  private mode: 'all' | 'specific' | 'random';
  private amount: number;
  private skillIndex: number;
  private target: 'self' | 'opponent';

  constructor(params: IPPRestoreParams) {
    super(
      AtomicEffectType.SPECIAL,
      'PPRestore',
      [EffectTiming.AFTER_SKILL]
    );

    this.mode = params.mode;
    this.amount = params.amount;
    this.skillIndex = params.skillIndex ?? 0;
    this.target = params.target ?? 'self';
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const targetPet = this.target === 'self' ? this.getAttacker(context) : this.getDefender(context);

    if (!targetPet) {
      this.log('PP恢复效果：目标不存在', 'warn');
      return results;
    }

    if (!targetPet.skills || targetPet.skills.length === 0) {
      this.log('PP恢复效果：目标没有技能', 'warn');
      return results;
    }

    switch (this.mode) {
      case 'all':
        this.restoreAllSkills(targetPet, results);
        break;
      case 'specific':
        this.restoreSpecificSkill(targetPet, results);
        break;
      case 'random':
        this.restoreRandomSkill(targetPet, results);
        break;
    }

    return results;
  }

  /**
   * 恢复所有技能的PP
   */
  private restoreAllSkills(pet: any, results: IEffectResult[]): void {
    let totalRestored = 0;

    for (let i = 0; i < pet.skills.length; i++) {
      const skill = pet.skills[i];
      if (!skill) continue;

      const restored = this.restoreSkillPP(skill);
      totalRestored += restored;
    }

    if (totalRestored > 0) {
      results.push(
        this.createResult(
          true,
          this.target === 'self' ? 'attacker' : 'defender',
          'pp_restore',
          `恢复所有技能${totalRestored}PP`,
          totalRestored,
          { mode: 'all' }
        )
      );

      this.log(`PP恢复效果：恢复所有技能共${totalRestored}PP`);
    }
  }

  /**
   * 恢复指定技能的PP
   */
  private restoreSpecificSkill(pet: any, results: IEffectResult[]): void {
    if (this.skillIndex < 0 || this.skillIndex >= pet.skills.length) {
      this.log(`PP恢复效果：技能索引${this.skillIndex}超出范围`, 'warn');
      return;
    }

    const skill = pet.skills[this.skillIndex];
    if (!skill) {
      this.log(`PP恢复效果：技能索引${this.skillIndex}不存在`, 'warn');
      return;
    }

    const restored = this.restoreSkillPP(skill);

    if (restored > 0) {
      results.push(
        this.createResult(
          true,
          this.target === 'self' ? 'attacker' : 'defender',
          'pp_restore',
          `恢复技能${skill.name || '未知'}${restored}PP`,
          restored,
          { mode: 'specific', skillIndex: this.skillIndex }
        )
      );

      this.log(`PP恢复效果：恢复技能${skill.name}${restored}PP`);
    }
  }

  /**
   * 恢复随机技能的PP
   */
  private restoreRandomSkill(pet: any, results: IEffectResult[]): void {
    // 筛选出PP未满的技能
    const availableSkills = pet.skills.filter((skill: any) => 
      skill && skill.pp < skill.maxPp
    );

    if (availableSkills.length === 0) {
      this.log('PP恢复效果：所有技能PP已满', 'warn');
      return;
    }

    // 随机选择一个技能
    const randomIndex = Math.floor(Math.random() * availableSkills.length);
    const skill = availableSkills[randomIndex];

    const restored = this.restoreSkillPP(skill);

    if (restored > 0) {
      results.push(
        this.createResult(
          true,
          this.target === 'self' ? 'attacker' : 'defender',
          'pp_restore',
          `恢复技能${skill.name || '未知'}${restored}PP`,
          restored,
          { mode: 'random' }
        )
      );

      this.log(`PP恢复效果：随机恢复技能${skill.name}${restored}PP`);
    }
  }

  /**
   * 恢复单个技能的PP
   */
  private restoreSkillPP(skill: any): number {
    if (!skill.pp && skill.pp !== 0) {
      skill.pp = skill.maxPp || 0;
    }

    const oldPP = skill.pp;
    const maxPP = skill.maxPp || 0;
    skill.pp = Math.min(maxPP, skill.pp + this.amount);
    const restored = skill.pp - oldPP;

    return restored;
  }

  public validate(params: any): boolean {
    if (!params.mode || !['all', 'specific', 'random'].includes(params.mode)) {
      this.log('PP恢复效果：mode必须是all、specific或random', 'error');
      return false;
    }

    if (typeof params.amount !== 'number' || params.amount <= 0) {
      this.log('PP恢复效果：amount必须是正数', 'error');
      return false;
    }

    if (params.mode === 'specific') {
      if (typeof params.skillIndex !== 'number' || params.skillIndex < 0 || params.skillIndex > 3) {
        this.log('PP恢复效果：skillIndex必须在0-3之间', 'error');
        return false;
      }
    }

    if (params.target && !['self', 'opponent'].includes(params.target)) {
      this.log('PP恢复效果：target必须是self或opponent', 'error');
      return false;
    }

    return true;
  }
}
