/**
 * 战斗效果集成系统
 * 
 * 负责在战斗流程的各个时机触发效果：
 * - BATTLE_START: 战斗开始
 * - TURN_START: 回合开始
 * - BEFORE_SKILL: 技能使用前
 * - BEFORE_SPEED_CHECK: 速度判定前
 * - BEFORE_HIT_CHECK: 命中判定前
 * - BEFORE_CRIT_CHECK: 暴击判定前
 * - BEFORE_DAMAGE_CALC: 伤害计算前
 * - AFTER_DAMAGE_CALC: 伤害计算后
 * - HIT_CHECK: 命中判定
 * - CRIT_CHECK: 暴击判定
 * - BEFORE_DAMAGE_APPLY: 伤害应用前
 * - AFTER_DAMAGE_APPLY: 伤害应用后
 * - AFTER_SKILL: 技能使用后
 * - AFTER_HIT_CHECK: 命中判定后
 * - AFTER_KO: 击败对方后
 * - TURN_END: 回合结束
 * - BATTLE_END: 战斗结束
 * - ON_HP_CHANGE: HP变化时
 * - ON_ATTACKED: 受到攻击时
 * - ON_ATTACK: 攻击时
 * - ON_KO: 击败对手时
 * - ON_RECEIVE_DAMAGE: 受到伤害时
 * - ON_EVADE: 闪避时
 */

import { Logger } from '../../../shared/utils';
import { IBattlePet, IBattleInfo } from '../../../shared/models/BattleModel';
import { ISkillConfig } from '../../../shared/models/SkillModel';
import { EffectTiming, IEffectResult } from './effects/core/EffectContext';
import { EffectTrigger } from './EffectTrigger';
import { EffectConflictResolver } from './effects/core/EffectPriority';

/**
 * 战斗效果集成器
 */
export class BattleEffectIntegration {

  /**
   * 回合开始时触发效果
   * 
   * 触发时机：
   * - 持续回复/伤害效果
   * - 持续能力提升/下降
   * - 状态持续时间递减
   */
  public static OnTurnStart(battle: IBattleInfo): IEffectResult[] {
    const results: IEffectResult[] = [];

    Logger.Debug(`[BattleEffectIntegration] 回合开始: Turn=${battle.turn + 1}`);

    // 处理玩家的回合开始效果
    const playerResults = this.ProcessTurnStartEffects(battle.player, battle.enemy);
    results.push(...playerResults);

    // 处理敌人的回合开始效果
    const enemyResults = this.ProcessTurnStartEffects(battle.enemy, battle.player);
    results.push(...enemyResults);

    // 递减状态持续时间
    this.DecrementStatusDurations(battle.player);
    this.DecrementStatusDurations(battle.enemy);

    // 递减效果计数器
    this.DecrementEffectCounters(battle.player);
    this.DecrementEffectCounters(battle.enemy);

    return results;
  }

  /**
   * 技能使用前触发效果
   * 
   * 触发时机：
   * - 技能封印检查
   * - 技能无效化检查
   * - 优先级修正
   */
  public static OnBeforeSkill(
    attacker: IBattlePet,
    defender: IBattlePet,
    skill: ISkillConfig
  ): IEffectResult[] {
    const results: IEffectResult[] = [];

    Logger.Debug(`[BattleEffectIntegration] 技能使用前: Skill=${skill.name}`);

    // 触发技能效果（BEFORE_SKILL时机）
    const skillResults = EffectTrigger.TriggerSkillEffect(
      skill,
      attacker,
      defender,
      0,
      EffectTiming.BEFORE_SKILL
    );
    
    // 应用效果结果
    EffectTrigger.ApplyEffectResults(skillResults, attacker, defender);
    results.push(...skillResults);

    return results;
  }

  /**
   * 伤害计算前触发效果
   * 
   * 触发时机：
   * - 威力修正
   * - 命中修正
   * - 暴击修正
   * - 属性威力提升
   */
  public static OnBeforeDamageCalc(
    attacker: IBattlePet,
    defender: IBattlePet,
    skill: ISkillConfig
  ): IEffectResult[] {
    const results: IEffectResult[] = [];

    Logger.Debug(`[BattleEffectIntegration] 伤害计算前: Skill=${skill.name}`);

    // 触发技能效果（BEFORE_DAMAGE_CALC时机）
    const skillResults = EffectTrigger.TriggerSkillEffect(
      skill,
      attacker,
      defender,
      0,
      EffectTiming.BEFORE_DAMAGE_CALC
    );
    
    // 应用效果结果
    EffectTrigger.ApplyEffectResults(skillResults, attacker, defender);
    results.push(...skillResults);

    return results;
  }

  /**
   * 伤害计算后触发效果
   * 
   * 触发时机：
   * - 伤害上限/下限
   * - 伤害修正
   */
  public static OnAfterDamageCalc(
    attacker: IBattlePet,
    defender: IBattlePet,
    skill: ISkillConfig,
    damage: number
  ): { damage: number; results: IEffectResult[] } {
    let results: IEffectResult[] = [];
    let modifiedDamage = damage;

    Logger.Debug(`[BattleEffectIntegration] 伤害计算后: Damage=${damage}`);

    // 触发技能效果（AFTER_DAMAGE_CALC时机）
    const skillResults = EffectTrigger.TriggerSkillEffect(
      skill,
      attacker,
      defender,
      damage,
      EffectTiming.AFTER_DAMAGE_CALC
    );
    
    // 解决效果冲突
    results = EffectConflictResolver.ResolveConflicts(skillResults);

    // 应用伤害修正
    for (const result of results) {
      if (result.success && result.value !== undefined) {
        // 伤害下限
        if (result.type === 'damage_floor' || result.effectType === 'damage_floor') {
          modifiedDamage = Math.max(modifiedDamage, result.value);
          Logger.Debug(`[BattleEffectIntegration] 应用伤害下限: ${damage} → ${modifiedDamage}`);
        }
        // 伤害上限
        else if (result.type === 'damage_cap' || result.effectType === 'damage_cap') {
          modifiedDamage = Math.min(modifiedDamage, result.value);
          Logger.Debug(`[BattleEffectIntegration] 应用伤害上限: ${damage} → ${modifiedDamage}`);
        }
      }
    }

    return { damage: modifiedDamage, results };
  }

  /**
   * 伤害应用前触发效果
   * 
   * 触发时机：
   * - 伤害减免
   * - 伤害护盾
   * - 反弹伤害
   */
  public static OnBeforeDamageApply(
    attacker: IBattlePet,
    defender: IBattlePet,
    skill: ISkillConfig,
    damage: number
  ): { damage: number; results: IEffectResult[] } {
    const results: IEffectResult[] = [];
    let modifiedDamage = damage;

    Logger.Debug(`[BattleEffectIntegration] 伤害应用前: Damage=${damage}`);

    // 触发技能效果（BEFORE_DAMAGE_APPLY时机）
    const skillResults = EffectTrigger.TriggerSkillEffect(
      skill,
      attacker,
      defender,
      damage,
      EffectTiming.BEFORE_DAMAGE_APPLY
    );
    results.push(...skillResults);

    // 应用伤害减免
    for (const result of skillResults) {
      if (result.success && result.value !== undefined) {
        if (result.type === 'fixed_damage_reduction' || result.effectType === 'fixed_damage_reduction') {
          modifiedDamage = Math.max(0, modifiedDamage - result.value);
          Logger.Debug(`[BattleEffectIntegration] 应用固定伤害减免: ${damage} → ${modifiedDamage}`);
        }
      }
    }

    return { damage: modifiedDamage, results };
  }

  /**
   * 伤害应用后触发效果
   * 
   * 触发时机：
   * - 吸血
   * - 反伤
   * - 状态施加
   * - 能力变化
   */
  public static OnAfterDamageApply(
    attacker: IBattlePet,
    defender: IBattlePet,
    skill: ISkillConfig,
    damage: number
  ): IEffectResult[] {
    const results: IEffectResult[] = [];

    Logger.Debug(`[BattleEffectIntegration] 伤害应用后: Damage=${damage}`);

    // 触发技能效果（AFTER_DAMAGE_APPLY时机）
    const skillResults = EffectTrigger.TriggerSkillEffect(
      skill,
      attacker,
      defender,
      damage,
      EffectTiming.AFTER_DAMAGE_APPLY
    );
    
    // 应用效果结果
    EffectTrigger.ApplyEffectResults(skillResults, attacker, defender);
    results.push(...skillResults);

    return results;
  }

  /**
   * 技能使用后触发效果
   * 
   * 触发时机：
   * - 自身能力变化
   * - 对方能力变化
   * - 状态施加
   * - 特殊效果
   */
  public static OnAfterSkill(
    attacker: IBattlePet,
    defender: IBattlePet,
    skill: ISkillConfig,
    damage: number
  ): IEffectResult[] {
    const results: IEffectResult[] = [];

    Logger.Debug(`[BattleEffectIntegration] 技能使用后: Skill=${skill.name}`);

    // 触发技能效果（AFTER_SKILL时机）
    const skillResults = EffectTrigger.TriggerSkillEffect(
      skill,
      attacker,
      defender,
      damage,
      EffectTiming.AFTER_SKILL
    );
    
    // 应用效果结果
    EffectTrigger.ApplyEffectResults(skillResults, attacker, defender);
    results.push(...skillResults);

    return results;
  }

  /**
   * 回合结束时触发效果
   * 
   * 触发时机：
   * - 持续伤害（中毒、烧伤等）
   * - 持续回复
   * - 状态效果处理
   */
  public static OnTurnEnd(battle: IBattleInfo): IEffectResult[] {
    const results: IEffectResult[] = [];

    Logger.Debug(`[BattleEffectIntegration] 回合结束: Turn=${battle.turn}`);

    // 处理玩家的回合结束效果
    const playerResults = this.ProcessTurnEndEffects(battle.player, battle.enemy);
    results.push(...playerResults);

    // 处理敌人的回合结束效果
    const enemyResults = this.ProcessTurnEndEffects(battle.enemy, battle.player);
    results.push(...enemyResults);

    return results;
  }

  /**
   * 击败对手时触发效果
   * 
   * 触发时机：
   * - 击败回复
   * - 击败转移强化
   * - 击败奖励
   */
  public static OnKO(
    attacker: IBattlePet,
    defender: IBattlePet,
    skill: ISkillConfig
  ): IEffectResult[] {
    const results: IEffectResult[] = [];

    Logger.Debug(`[BattleEffectIntegration] 击败对手: Attacker=${attacker.name}`);

    // 触发技能效果（ON_KO时机）
    const skillResults = EffectTrigger.TriggerSkillEffect(
      skill,
      attacker,
      defender,
      0,
      EffectTiming.ON_KO
    );
    
    // 应用效果结果
    EffectTrigger.ApplyEffectResults(skillResults, attacker, defender);
    results.push(...skillResults);

    return results;
  }

  /**
   * 受到伤害时触发效果
   * 
   * 触发时机：
   * - 受击状态施加
   * - 受击能力提升
   * - 伤害转化为体力
   */
  public static OnReceiveDamage(
    attacker: IBattlePet,
    defender: IBattlePet,
    skill: ISkillConfig,
    damage: number
  ): IEffectResult[] {
    const results: IEffectResult[] = [];

    Logger.Debug(`[BattleEffectIntegration] 受到伤害: Damage=${damage}`);

    // 触发技能效果（ON_RECEIVE_DAMAGE时机）
    const skillResults = EffectTrigger.TriggerSkillEffect(
      skill,
      attacker,
      defender,
      damage,
      EffectTiming.ON_RECEIVE_DAMAGE
    );
    
    // 应用效果结果
    EffectTrigger.ApplyEffectResults(skillResults, attacker, defender);
    results.push(...skillResults);

    return results;
  }

  /**
   * 闪避时触发效果
   * 
   * 触发时机：
   * - 闪避提升能力
   */
  public static OnEvade(
    attacker: IBattlePet,
    defender: IBattlePet,
    skill: ISkillConfig
  ): IEffectResult[] {
    const results: IEffectResult[] = [];

    Logger.Debug(`[BattleEffectIntegration] 闪避攻击: Defender=${defender.name}`);

    // 触发技能效果（ON_EVADE时机）
    const skillResults = EffectTrigger.TriggerSkillEffect(
      skill,
      attacker,
      defender,
      0,
      EffectTiming.ON_EVADE
    );
    
    // 应用效果结果
    EffectTrigger.ApplyEffectResults(skillResults, attacker, defender);
    results.push(...skillResults);

    return results;
  }

  /**
   * 战斗结束时触发效果
   * 
   * 触发时机：
   * - 战斗奖励
   * - 清理临时效果
   */
  public static OnBattleEnd(battle: IBattleInfo, winnerId: number): IEffectResult[] {
    const results: IEffectResult[] = [];

    Logger.Debug(`[BattleEffectIntegration] 战斗结束: Winner=${winnerId}`);

    // 清理临时效果
    this.CleanupBattleEffects(battle.player);
    this.CleanupBattleEffects(battle.enemy);

    return results;
  }

  /**
   * 处理回合开始效果
   */
  private static ProcessTurnStartEffects(
    pet: IBattlePet,
    _opponent: IBattlePet
  ): IEffectResult[] {
    const results: IEffectResult[] = [];

    // 处理持续回复
    if (pet.effectCounters && pet.effectCounters['regeneration']) {
      const healAmount = Math.floor(pet.maxHp * 0.0625); // 1/16 HP
      pet.hp = Math.min(pet.maxHp, pet.hp + healAmount);
      Logger.Debug(`[BattleEffectIntegration] 持续回复: ${pet.name} +${healAmount}HP`);
    }

    // 处理持续伤害（中毒、烧伤等）
    if (pet.status !== undefined && pet.status > 0) {
      const damageAmount = Math.floor(pet.maxHp * 0.0625); // 1/16 HP
      pet.hp = Math.max(0, pet.hp - damageAmount);
      Logger.Debug(`[BattleEffectIntegration] 持续伤害: ${pet.name} -${damageAmount}HP`);
    }

    return results;
  }

  /**
   * 处理回合结束效果
   */
  private static ProcessTurnEndEffects(
    pet: IBattlePet,
    opponent: IBattlePet
  ): IEffectResult[] {
    const results: IEffectResult[] = [];

    // 处理寄生种子
    if (pet.effectCounters && pet.effectCounters['leech_seed']) {
      const drainAmount = Math.floor(pet.maxHp * 0.125); // 1/8 HP
      pet.hp = Math.max(0, pet.hp - drainAmount);
      opponent.hp = Math.min(opponent.maxHp, opponent.hp + drainAmount);
      Logger.Debug(`[BattleEffectIntegration] 寄生种子: ${pet.name} -${drainAmount}HP, ${opponent.name} +${drainAmount}HP`);
    }

    return results;
  }

  /**
   * 递减状态持续时间
   */
  private static DecrementStatusDurations(pet: IBattlePet): void {
    if (!pet.statusDurations) return;

    for (let i = 0; i < pet.statusDurations.length; i++) {
      if (pet.statusDurations[i] > 0) {
        pet.statusDurations[i]--;
        
        // 如果持续时间归零，清除状态
        if (pet.statusDurations[i] === 0 && pet.status === i) {
          pet.status = undefined;
          Logger.Debug(`[BattleEffectIntegration] 状态结束: ${pet.name}, status=${i}`);
        }
      }
    }
  }

  /**
   * 递减效果计数器
   */
  private static DecrementEffectCounters(pet: IBattlePet): void {
    if (!pet.effectCounters) return;

    const expiredEffects: string[] = [];

    for (const [key, value] of Object.entries(pet.effectCounters)) {
      if (typeof value === 'number' && value > 0) {
        pet.effectCounters[key] = value - 1;
        
        // 如果计数器归零，记录需要清理的效果
        if (pet.effectCounters[key] === 0) {
          expiredEffects.push(key);
        }
      }
    }

    // 清理过期的临时能力变化
    for (const key of expiredEffects) {
      // 检查是否是临时能力变化效果
      // 格式: stat_<索引>_boost_<变化值>
      if (key.startsWith('stat_') && key.includes('_boost_')) {
        const match = key.match(/stat_(\d+)_boost_(-?\d+)/);
        if (match && pet.battleLv) {
          const statIndex = parseInt(match[1]);
          const stages = parseInt(match[2]);
          
          // 恢复能力等级
          const oldStage = pet.battleLv[statIndex] || 0;
          const newStage = Math.max(-6, Math.min(6, oldStage - stages));
          pet.battleLv[statIndex] = newStage;
          
          const statNames = ['攻击', '防御', '特攻', '特防', '速度', '命中'];
          Logger.Info(
            `[BattleEffectIntegration] 临时能力变化结束: ${pet.name}, ` +
            `${statNames[statIndex]} ${oldStage} → ${newStage}`
          );
        }
      }
      
      // 移除效果计数器
      delete pet.effectCounters[key];
      Logger.Debug(`[BattleEffectIntegration] 效果结束: ${pet.name}, effect=${key}`);
    }
  }

  /**
   * 战斗开始时触发效果
   * 
   * 触发时机：
   * - 特性触发（威吓、下马威等）
   * - 场地效果
   * - 天气效果
   */
  public static OnBattleStart(battle: IBattleInfo): IEffectResult[] {
    const results: IEffectResult[] = [];

    Logger.Debug(`[BattleEffectIntegration] 战斗开始`);

    // 处理玩家的战斗开始效果
    if (battle.player.skills && battle.player.skills.length > 0) {
      const playerSkill = { id: 0, name: '战斗开始', category: 3, type: 0, power: 0, maxPP: 0, accuracy: 100, critRate: 0, priority: 0, mustHit: false } as ISkillConfig;
      const playerResults = EffectTrigger.TriggerSkillEffect(
        playerSkill,
        battle.player,
        battle.enemy,
        0,
        EffectTiming.BATTLE_START
      );
      EffectTrigger.ApplyEffectResults(playerResults, battle.player, battle.enemy);
      results.push(...playerResults);
    }

    // 处理敌人的战斗开始效果
    if (battle.enemy.skills && battle.enemy.skills.length > 0) {
      const enemySkill = { id: 0, name: '战斗开始', category: 3, type: 0, power: 0, maxPP: 0, accuracy: 100, critRate: 0, priority: 0, mustHit: false } as ISkillConfig;
      const enemyResults = EffectTrigger.TriggerSkillEffect(
        enemySkill,
        battle.enemy,
        battle.player,
        0,
        EffectTiming.BATTLE_START
      );
      EffectTrigger.ApplyEffectResults(enemyResults, battle.enemy, battle.player);
      results.push(...enemyResults);
    }

    return results;
  }

  /**
   * 速度判定前触发效果
   * 
   * 触发时机：
   * - 速度修正
   * - 优先度修正
   * - 先制效果
   */
  public static OnBeforeSpeedCheck(
    attacker: IBattlePet,
    defender: IBattlePet,
    attackerSkill: ISkillConfig,
    defenderSkill: ISkillConfig
  ): IEffectResult[] {
    const results: IEffectResult[] = [];

    Logger.Debug(`[BattleEffectIntegration] 速度判定前`);

    // 触发攻击方效果
    const attackerResults = EffectTrigger.TriggerSkillEffect(
      attackerSkill,
      attacker,
      defender,
      0,
      EffectTiming.BEFORE_SPEED_CHECK
    );
    EffectTrigger.ApplyEffectResults(attackerResults, attacker, defender);
    results.push(...attackerResults);

    // 触发防守方效果
    const defenderResults = EffectTrigger.TriggerSkillEffect(
      defenderSkill,
      defender,
      attacker,
      0,
      EffectTiming.BEFORE_SPEED_CHECK
    );
    EffectTrigger.ApplyEffectResults(defenderResults, defender, attacker);
    results.push(...defenderResults);

    return results;
  }

  /**
   * 命中判定前触发效果
   * 
   * 触发时机：
   * - 命中率修正
   * - 必中效果
   * - 闪避率修正
   */
  public static OnBeforeHitCheck(
    attacker: IBattlePet,
    defender: IBattlePet,
    skill: ISkillConfig
  ): IEffectResult[] {
    const results: IEffectResult[] = [];

    Logger.Debug(`[BattleEffectIntegration] 命中判定前: Skill=${skill.name}`);

    // 触发技能效果
    const skillResults = EffectTrigger.TriggerSkillEffect(
      skill,
      attacker,
      defender,
      0,
      EffectTiming.BEFORE_HIT_CHECK
    );
    EffectTrigger.ApplyEffectResults(skillResults, attacker, defender);
    results.push(...skillResults);

    return results;
  }

  /**
   * 命中判定时触发效果
   * 
   * 触发时机：
   * - 命中判定修正
   * - 必中判定
   */
  public static OnHitCheck(
    attacker: IBattlePet,
    defender: IBattlePet,
    skill: ISkillConfig
  ): IEffectResult[] {
    const results: IEffectResult[] = [];

    Logger.Debug(`[BattleEffectIntegration] 命中判定: Skill=${skill.name}`);

    // 触发技能效果
    const skillResults = EffectTrigger.TriggerSkillEffect(
      skill,
      attacker,
      defender,
      0,
      EffectTiming.HIT_CHECK
    );
    EffectTrigger.ApplyEffectResults(skillResults, attacker, defender);
    results.push(...skillResults);

    return results;
  }

  /**
   * 命中判定后触发效果
   * 
   * 触发时机：
   * - 命中后的额外效果
   */
  public static OnAfterHitCheck(
    attacker: IBattlePet,
    defender: IBattlePet,
    skill: ISkillConfig,
    hit: boolean
  ): IEffectResult[] {
    const results: IEffectResult[] = [];

    Logger.Debug(`[BattleEffectIntegration] 命中判定后: Hit=${hit}`);

    // 触发技能效果
    const skillResults = EffectTrigger.TriggerSkillEffect(
      skill,
      attacker,
      defender,
      0,
      EffectTiming.AFTER_HIT_CHECK
    );
    EffectTrigger.ApplyEffectResults(skillResults, attacker, defender);
    results.push(...skillResults);

    return results;
  }

  /**
   * 暴击判定前触发效果
   * 
   * 触发时机：
   * - 暴击率修正
   * - 必定暴击
   * - 暴击无效
   */
  public static OnBeforeCritCheck(
    attacker: IBattlePet,
    defender: IBattlePet,
    skill: ISkillConfig
  ): IEffectResult[] {
    const results: IEffectResult[] = [];

    Logger.Debug(`[BattleEffectIntegration] 暴击判定前: Skill=${skill.name}`);

    // 触发技能效果
    const skillResults = EffectTrigger.TriggerSkillEffect(
      skill,
      attacker,
      defender,
      0,
      EffectTiming.BEFORE_CRIT_CHECK
    );
    EffectTrigger.ApplyEffectResults(skillResults, attacker, defender);
    results.push(...skillResults);

    return results;
  }

  /**
   * 暴击判定时触发效果
   * 
   * 触发时机：
   * - 暴击判定修正
   */
  public static OnCritCheck(
    attacker: IBattlePet,
    defender: IBattlePet,
    skill: ISkillConfig
  ): IEffectResult[] {
    const results: IEffectResult[] = [];

    Logger.Debug(`[BattleEffectIntegration] 暴击判定: Skill=${skill.name}`);

    // 触发技能效果
    const skillResults = EffectTrigger.TriggerSkillEffect(
      skill,
      attacker,
      defender,
      0,
      EffectTiming.CRIT_CHECK
    );
    EffectTrigger.ApplyEffectResults(skillResults, attacker, defender);
    results.push(...skillResults);

    return results;
  }

  /**
   * 击败对方后触发效果（AFTER_KO）
   * 
   * 触发时机：
   * - 击败后的清理工作
   * - 经验值获取
   */
  public static OnAfterKO(
    attacker: IBattlePet,
    defender: IBattlePet,
    skill: ISkillConfig
  ): IEffectResult[] {
    const results: IEffectResult[] = [];

    Logger.Debug(`[BattleEffectIntegration] 击败对方后: Attacker=${attacker.name}`);

    // 触发技能效果
    const skillResults = EffectTrigger.TriggerSkillEffect(
      skill,
      attacker,
      defender,
      0,
      EffectTiming.AFTER_KO
    );
    EffectTrigger.ApplyEffectResults(skillResults, attacker, defender);
    results.push(...skillResults);

    return results;
  }

  /**
   * HP变化时触发效果
   * 
   * 触发时机：
   * - HP变化监听
   * - 低HP触发效果
   */
  public static OnHPChange(
    pet: IBattlePet,
    opponent: IBattlePet,
    oldHP: number,
    newHP: number
  ): IEffectResult[] {
    const results: IEffectResult[] = [];

    Logger.Debug(`[BattleEffectIntegration] HP变化: ${pet.name} ${oldHP} → ${newHP}`);

    // 创建虚拟技能用于触发效果
    const dummySkill = { id: 0, name: 'HP变化', category: 3, type: 0, power: 0, maxPP: 0, accuracy: 100, critRate: 0, priority: 0, mustHit: false } as ISkillConfig;
    
    // 触发效果
    const skillResults = EffectTrigger.TriggerSkillEffect(
      dummySkill,
      pet,
      opponent,
      Math.abs(newHP - oldHP),
      EffectTiming.ON_HP_CHANGE
    );
    EffectTrigger.ApplyEffectResults(skillResults, pet, opponent);
    results.push(...skillResults);

    return results;
  }

  /**
   * 受到攻击时触发效果
   * 
   * 触发时机：
   * - 受击触发特性
   * - 反击效果
   */
  public static OnAttacked(
    attacker: IBattlePet,
    defender: IBattlePet,
    skill: ISkillConfig
  ): IEffectResult[] {
    const results: IEffectResult[] = [];

    Logger.Debug(`[BattleEffectIntegration] 受到攻击: Defender=${defender.name}`);

    // 触发技能效果
    const skillResults = EffectTrigger.TriggerSkillEffect(
      skill,
      attacker,
      defender,
      0,
      EffectTiming.ON_ATTACKED
    );
    EffectTrigger.ApplyEffectResults(skillResults, attacker, defender);
    results.push(...skillResults);

    return results;
  }

  /**
   * 攻击时触发效果
   * 
   * 触发时机：
   * - 攻击触发特性
   * - 攻击前效果
   */
  public static OnAttack(
    attacker: IBattlePet,
    defender: IBattlePet,
    skill: ISkillConfig
  ): IEffectResult[] {
    const results: IEffectResult[] = [];

    Logger.Debug(`[BattleEffectIntegration] 攻击时: Attacker=${attacker.name}`);

    // 触发技能效果
    const skillResults = EffectTrigger.TriggerSkillEffect(
      skill,
      attacker,
      defender,
      0,
      EffectTiming.ON_ATTACK
    );
    EffectTrigger.ApplyEffectResults(skillResults, attacker, defender);
    results.push(...skillResults);

    return results;
  }

  /**
   * 清理战斗效果
   */
  private static CleanupBattleEffects(pet: IBattlePet): void {
    // 清理能力等级
    if (pet.battleLevels) {
      pet.battleLevels = [0, 0, 0, 0, 0, 0];
    }

    // 清理效果计数器
    if (pet.effectCounters) {
      pet.effectCounters = {};
    }

    // 清理状态持续时间
    if (pet.statusDurations) {
      pet.statusDurations = new Array(20).fill(0);
    }

    Logger.Debug(`[BattleEffectIntegration] 清理战斗效果: ${pet.name}`);
  }
}
