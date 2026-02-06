import { IAtomicEffect, IAtomicEffectParams, AtomicEffectType } from './IAtomicEffect';
import { ConditionalCheck } from './ConditionalCheck';
import { DurationWrapper } from './DurationWrapper';
import { AccuracyModifier } from '../modifier/AccuracyModifier';
import { CritModifier } from '../modifier/CritModifier';
import { DamageModifier } from '../modifier/DamageModifier';
import { PowerModifier } from '../modifier/PowerModifier';
import { PriorityModifier } from '../modifier/PriorityModifier';
import { FocusEnergy } from '../modifier/FocusEnergy';
import { SureHit } from '../modifier/SureHit';
import { StatModifier } from '../stat/StatModifier';
import { StatClear } from '../stat/StatClear';
import { OnHitStatBoost } from '../stat/OnHitStatBoost';
import { StatusInflictor } from '../status/StatusInflictor';
import { DisableSkill } from '../status/DisableSkill';
import { RandomStatus } from '../status/RandomStatus';
import { HealEffect } from '../heal/HealEffect';
import { Regeneration } from '../heal/Regeneration';
import { FixedDamageEffect } from '../damage/FixedDamageEffect';
import { ContinuousDamage } from '../damage/ContinuousDamage';
import { MultiHit } from '../damage/MultiHit';
import { RandomPower } from '../damage/RandomPower';
import { ConsecutiveUse } from '../special/ConsecutiveUse';
import { LeechSeed } from '../damage/LeechSeed';
import { ImmuneEffect } from '../defensive/ImmuneEffect';
import { ReflectEffect } from '../defensive/ReflectEffect';
import { Counter } from '../defensive/Counter';
import { DamageShield } from '../defensive/DamageShield';
import { Endure } from '../defensive/Endure';
import { SpecialEffect } from '../special/SpecialEffect';
import { Charge } from '../special/Charge';
import { PPDrain } from '../special/PPDrain';
import { TypeSwap } from '../special/TypeSwap';
import { TypeCopy } from '../special/TypeCopy';
import { OnHitStatus } from '../status/OnHitStatus';
import { OnDamageStatus } from '../status/OnDamageStatus';
import { Punishment } from '../special/Punishment';
import { StatSync } from '../stat/StatSync';
import { DrainAura } from '../special/DrainAura';
import { RandomStatChange } from '../stat/RandomStatChange';
import { MaxHpModifier } from '../special/MaxHpModifier';
import { DamageBoost } from '../modifier/DamageBoost';
import { DamageReduction } from '../modifier/DamageReduction';
import { Sacrifice } from '../special/Sacrifice';
import { DelayedKill } from '../special/DelayedKill';
import { StatTransfer } from '../stat/StatTransfer';
import { TypePowerBoost } from '../modifier/TypePowerBoost';
import { KoDamageNext } from '../special/KoDamageNext';
import { HealReversal } from '../heal/HealReversal';
import { StatSteal } from '../stat/StatSteal';
import { SacrificeCrit } from '../special/SacrificeCrit';
import { MissPenalty } from '../special/MissPenalty';
import { CategoryEvasion } from '../modifier/CategoryEvasion';
import { HpCost } from '../special/HpCost';
import { HpCostDamage } from '../damage/HpCostDamage';
import { PPRestore } from '../special/PPRestore';
import { StatusSync } from '../status/StatusSync';
import { GenderDamageBoost } from '../modifier/GenderDamageBoost';
import { Reversal } from '../special/Reversal';
import { WeakenEffect } from '../special/WeakenEffect';
import { PriorityBoost } from '../modifier/PriorityBoost';
import { Recoil } from '../special/Recoil';
import { Absorb } from '../special/Absorb';
import { Encore } from '../special/Encore';
import { Mercy } from '../special/Mercy';
import { HpEqual } from '../special/HpEqual';
import { Transform } from '../special/Transform';
import { Substitute } from '../special/Substitute';
import { DamageFloor } from '../DamageFloor';
import { FixedDamageReduction } from '../FixedDamageReduction';
import { KoHeal } from '../KoHeal';
import { DamageCap } from '../DamageCap';
import { CumulativeStatus } from '../special/CumulativeStatus';
import { CumulativeCritBoost } from '../special/CumulativeCritBoost';
import { ContinuousStatBoost } from '../special/ContinuousStatBoost';
import { ContinuousMultiStatBoost } from '../special/ContinuousMultiStatBoost';
import { LevelDamage } from '../special/LevelDamage';
import { DamageToHp } from '../special/DamageToHp';
import { StatBoostReversal } from '../special/StatBoostReversal';
import { ClearTurnEffects } from '../special/ClearTurnEffects';
import { IgnoreDefenseBuff } from '../special/IgnoreDefenseBuff';
import { KoTransferBuff } from '../special/KoTransferBuff';
import { ConditionalDrainAura } from '../special/ConditionalDrainAura';
import { ConditionalStatusAura } from '../special/ConditionalStatusAura';
import { ConditionalContinuousDamage } from '../special/ConditionalContinuousDamage';
import { TypeSkillNullify } from '../special/TypeSkillNullify';
import { OnHitConditionalStatus } from '../special/OnHitConditionalStatus';
import { SacrificeDamage } from '../special/SacrificeDamage';
import { RandomHpLoss } from '../special/RandomHpLoss';
import { SelectiveHeal } from '../special/SelectiveHeal';
import { DelayedFullHeal } from '../special/DelayedFullHeal';
import { IvPower } from '../special/IvPower';
import { OnEvadeBoost } from '../special/OnEvadeBoost';
import { WeightedRandomPower } from '../special/WeightedRandomPower';
import { Flammable } from '../special/Flammable';
import { BattleReward } from '../special/BattleReward';
import { ContinuousStatChange } from '../special/ContinuousStatChange';
import { TypeSkillCounter } from '../special/TypeSkillCounter';
import { StatBoostNullify } from '../special/StatBoostNullify';
import { OnOpponentMiss } from '../special/OnOpponentMiss';
import { RandomStatusEffect } from '../special/RandomStatusEffect';
import { StatDownImmunityPassive } from '../passive/StatDownImmunityPassive';
import { StatusImmunityPassive } from '../passive/StatusImmunityPassive';
import { DamageReductionPassive } from '../passive/DamageReductionPassive';
import { SameTypeAbsorbPassive } from '../passive/SameTypeAbsorbPassive';
import { TypeImmunityPassive } from '../passive/TypeImmunityPassive';
import { OnHitStatusInflictPassive, PhysHitStatusInflictPassive, SpHitStatusInflictPassive, OnSpHitStatusInflictPassive } from '../passive/StatusInflictPassives';
import { AccuracyReductionPassive, SkillDodgePassive, AccuracyBonusPassive } from '../passive/AccuracyPassives';
import { FixedCritRatePassive, CritRateBonusPassive, FixedCritDivisorPassive, StatusCritBonusPassive, CritRateReducePassive } from '../passive/CritPassives';
import { BurstRecoverFullHpPassive, BurstRecoverFullHpPpPassive } from '../passive/BurstRecoverPassives';
import { InfinitePPPassive } from '../passive/InfinitePPPassive';
import { DamageReflectFractionPassive, HighDamageReflectPassive } from '../passive/DamageReflectPassives';
import { OnSpHitStatUpPassive, OnSpHitEnemyStatDownPassive, OnHitSelfStatUpPassive } from '../passive/OnHitStatChangePassives';
import { EscapePassive } from '../passive/EscapePassive';
import { CounterFearPassive, CounterDamageReducePassive, CounterPriorityReducePassive } from '../passive/CounterPassives';
import { HpStatBindPassive } from '../passive/HpStatBindPassive';
import { SkillUnlockShieldPassive, TypeSequenceShieldPassive, RotatingTypeShieldPassive } from '../passive/ShieldPassives';
import { SurviveWith1HpPassive, SurviveLethalChancePassive, FiveTurnImmortalPassive } from '../passive/SurvivePassives';
import { ReceivedDamageMultiplyPassive } from '../passive/ReceivedDamageMultiplyPassive';
import { LowHpOhkoPriorityPassive } from '../passive/LowHpOhkoPriorityPassive';
import { ReviveOnDeathPassive, ReviveFullPassive } from '../passive/RevivePassives';
import { FlatStatBonusPassive } from '../passive/FlatStatBonusPassive';
import { TypeDamageBonusPassive } from '../passive/TypeDamageBonusPassive';
import { DamageBonusPercentPassive, EvenDamageMultiplyPassive, OddDamageDividePassive, BothDamageReducePassive, BothDamageMultiplyPassive, ChanceDamageFlatReducePassive, ChanceFullBlockPassive, PhysChanceDamageBonusPassive, SpChanceDamageBonusPassive, AttackTypeDamageBonusPassive, SelfDamageReducePassive } from '../passive/DamageModifyPassives';
import { TurnEndHealPassive, BothTurnHealPercentPassive, BothTurnDamagePassive, TurnDrainPassive, AsymmetricTurnHealPassive, TurnEnemyDamagePassive } from '../passive/TurnHealPassives';
import { PriorityChangePassive, LowHpPriorityPassive, HighDamageNextPriorityPassive } from '../passive/PriorityPassives';
import { AttackTypeImmunePassive } from '../passive/AttackTypeImmunePassive';
import { PostHitDamageReductionPassive } from '../passive/PostHitDamageReductionPassive';
import { EffectImmunityPassive, SkillEffectImmunityPassive } from '../passive/EffectImmunityPassives';
import { RotatingAttackImmunityPassive } from '../passive/RotatingAttackImmunityPassive';
import { TimedOhkoPassive } from '../passive/TimedOhkoPassive';
import { BossRagePassive } from '../passive/BossRagePassive';
import { BossPossessionPassive } from '../passive/BossPossessionPassive';
import { SpecificTypeAbsorbPassive } from '../passive/SpecificTypeAbsorbPassive';
import { GenderDamageBonusPassive } from '../passive/GenderDamageBonusPassive';
import { CopyEnemyBuffPassive } from '../passive/CopyEnemyBuffPassive';
import { LowDamageHealPassive, DamageLifestealPassive, HitStackWeaknessPassive, HighDamageNextDoublePassive, HighDamageHealPassive, LowHpGuardianPassive } from '../passive/OnHitPassives';
import { HighDamageCounterKillPassive } from '../passive/HighDamageCounterKillPassive';
import { DodgeHealPassive } from '../passive/DodgeHealPassive';
import { LowHpFullHealChancePassive } from '../passive/LowHpFullHealChancePassive';
import { TypeOhkoPassive } from '../passive/TypeOhkoPassive';
import { ClearEnemyTurnEffectsPassive } from '../passive/ClearEnemyTurnEffectsPassive';
import { Logger } from '../../../../../../shared/utils/Logger';

/**
 * 原子效果工厂
 * 根据参数创建原子效果实例
 */
export class AtomicEffectFactory {
  private static instance: AtomicEffectFactory;

  private constructor() {}

  public static getInstance(): AtomicEffectFactory {
    if (!AtomicEffectFactory.instance) {
      AtomicEffectFactory.instance = new AtomicEffectFactory();
    }
    return AtomicEffectFactory.instance;
  }

  public create(params: IAtomicEffectParams): IAtomicEffect | null {
    try {
      switch (params.type) {
        case AtomicEffectType.CONDITIONAL:
          return new ConditionalCheck(params as any);
        case AtomicEffectType.DAMAGE_MODIFIER:
          return new DamageModifier(params as any);
        case AtomicEffectType.POWER_MODIFIER:
          return new PowerModifier(params as any);
        case AtomicEffectType.PRIORITY_MODIFIER:
          return new PriorityModifier(params as any);
        case AtomicEffectType.STAT_MODIFIER:
          return new StatModifier(params as any);
        case AtomicEffectType.STATUS_INFLICTOR:
          return new StatusInflictor(params as any);
        case AtomicEffectType.HEAL:
          return new HealEffect(params as any);
        case AtomicEffectType.ACCURACY_MODIFIER:
          return new AccuracyModifier(params as any);
        case AtomicEffectType.CRIT_MODIFIER:
          return new CritModifier(params as any);
        case AtomicEffectType.IMMUNE:
          // 检查是否是被动免疫效果
          const immuneType = (params as any).immuneType;
          if (immuneType === 'stat_down') return new StatDownImmunityPassive();
          if (immuneType === 'status') return new StatusImmunityPassive();
          return new ImmuneEffect(params as any);
        case AtomicEffectType.FIXED_DAMAGE:
          return new FixedDamageEffect(params as any);
        case AtomicEffectType.REFLECT:
          return new ReflectEffect(params as any);
        case AtomicEffectType.SPECIAL:
          // 根据specialType创建不同的特殊效果
          const specialType = (params as any).specialType;
          
          // 基础特殊效果
          if (specialType === 'stat_clear') return new StatClear(params as any);
          if (specialType === 'regeneration') return new Regeneration(params as any);
          if (specialType === 'continuous_damage') return new ContinuousDamage(params as any);
          if (specialType === 'multi_hit') return new MultiHit(params as any);
          if (specialType === 'random_power') return new RandomPower(params as any);
          
          // 第一批新增效果
          if (specialType === 'consecutive_use') return new ConsecutiveUse(params as any);
          if (specialType === 'leech_seed') return new LeechSeed(params as any);
          if (specialType === 'counter') return new Counter(params as any);
          if (specialType === 'focus_energy') return new FocusEnergy(params as any);
          if (specialType === 'damage_shield') return new DamageShield(params as any);
          if (specialType === 'disable_skill') return new DisableSkill(params as any);
          if (specialType === 'endure') return new Endure(params as any);
          if (specialType === 'random_status') return new RandomStatus(params as any);
          if (specialType === 'sure_hit') return new SureHit(params as any);
          if (specialType === 'on_hit_stat_boost') return new OnHitStatBoost(params as any);
          
          // 第二批新增效果
          if (specialType === 'charge') return new Charge(params as any);
          if (specialType === 'pp_drain') return new PPDrain(params as any);
          if (specialType === 'type_swap') return new TypeSwap(params as any);
          if (specialType === 'type_copy') return new TypeCopy(params as any);
          if (specialType === 'on_hit_status') return new OnHitStatus(params as any);
          if (specialType === 'on_damage_status') return new OnDamageStatus(params as any);
          if (specialType === 'punishment') return new Punishment(params as any);
          if (specialType === 'stat_sync') return new StatSync(params as any);
          if (specialType === 'drain_aura') return new DrainAura(params as any);
          if (specialType === 'random_stat_change') return new RandomStatChange(params as any);
          
          // 第三批新增效果
          if (specialType === 'max_hp_modifier') return new MaxHpModifier(params as any);
          if (specialType === 'damage_boost') return new DamageBoost(params as any);
          if (specialType === 'damage_reduction') return new DamageReduction(params as any);
          if (specialType === 'sacrifice') return new Sacrifice(params as any);
          if (specialType === 'delayed_kill') return new DelayedKill(params as any);
          if (specialType === 'stat_transfer') return new StatTransfer(params as any);
          if (specialType === 'type_power_boost') return new TypePowerBoost(params as any);
          if (specialType === 'ko_damage_next') return new KoDamageNext(params as any);
          if (specialType === 'heal_reversal') return new HealReversal(params as any);
          if (specialType === 'stat_steal') return new StatSteal(params as any);
          
          // 第四批新增效果
          if (specialType === 'sacrifice_crit') return new SacrificeCrit(params as any);
          if (specialType === 'miss_penalty') return new MissPenalty(params as any);
          if (specialType === 'category_evasion') return new CategoryEvasion(params as any);
          if (specialType === 'hp_cost') return new HpCost(params as any);
          if (specialType === 'hp_cost_damage') return new HpCostDamage(params as any);
          if (specialType === 'pp_restore') return new PPRestore(params as any);
          if (specialType === 'status_sync') return new StatusSync(params as any);
          if (specialType === 'gender_damage_boost') return new GenderDamageBoost(params as any);
          if (specialType === 'reversal') return new Reversal(params as any);
          if (specialType === 'weaken') return new WeakenEffect(params as any);
          
          // 第五批新增效果
          if (specialType === 'priority_boost') return new PriorityBoost(params as any);
          if (specialType === 'recoil') return new Recoil(params as any);
          if (specialType === 'absorb') return new Absorb(params as any);
          if (specialType === 'encore') return new Encore(params as any);
          if (specialType === 'mercy') return new Mercy(params as any);
          if (specialType === 'hp_equal') return new HpEqual(params as any);
          if (specialType === 'transform') return new Transform(params as any);
          if (specialType === 'substitute') return new Substitute(params as any);
          
          // 第六批新增效果 - 高优先级简单实现
          if (specialType === 'damage_floor') return new DamageFloor(params as any);
          if (specialType === 'fixed_damage_reduction') return new FixedDamageReduction(params as any);
          if (specialType === 'ko_heal') return new KoHeal(params as any);
          if (specialType === 'damage_cap') return new DamageCap(params as any);
          
          // 第七批新增效果 - 高优先级中等实现
          if (specialType === 'cumulative_status') return new CumulativeStatus(params as any);
          if (specialType === 'cumulative_crit_boost') return new CumulativeCritBoost(params as any);
          if (specialType === 'continuous_stat_boost') return new ContinuousStatBoost(params as any);
          if (specialType === 'continuous_multi_stat_boost') return new ContinuousMultiStatBoost(params as any);
          
          // 第八批新增效果 - 中优先级简单实现
          if (specialType === 'level_damage') return new LevelDamage(params as any);
          if (specialType === 'damage_to_hp') return new DamageToHp(params as any);
          if (specialType === 'stat_boost_reversal') return new StatBoostReversal(params as any);
          if (specialType === 'clear_turn_effects') return new ClearTurnEffects(params as any);
          if (specialType === 'ignore_defense_buff') return new IgnoreDefenseBuff(params as any);
          if (specialType === 'ko_transfer_buff') return new KoTransferBuff(params as any);
          
          // 第八批新增效果 - 中优先级中等实现
          if (specialType === 'conditional_drain_aura') return new ConditionalDrainAura(params as any);
          if (specialType === 'conditional_status_aura') return new ConditionalStatusAura(params as any);
          if (specialType === 'conditional_continuous_damage') return new ConditionalContinuousDamage(params as any);
          if (specialType === 'type_skill_nullify') return new TypeSkillNullify(params as any);
          if (specialType === 'on_hit_conditional_status') return new OnHitConditionalStatus(params as any);
          
          // 第九批新增效果 - 低优先级实现
          if (specialType === 'sacrifice_damage') return new SacrificeDamage(params as any);
          if (specialType === 'random_hp_loss') return new RandomHpLoss(params as any);
          if (specialType === 'selective_heal') return new SelectiveHeal(params as any);
          if (specialType === 'delayed_full_heal') return new DelayedFullHeal(params as any);
          if (specialType === 'iv_power') return new IvPower(params as any);
          if (specialType === 'on_evade_boost') return new OnEvadeBoost(params as any);
          if (specialType === 'weighted_random_power') return new WeightedRandomPower(params as any);
          if (specialType === 'flammable') return new Flammable(params as any);
          if (specialType === 'battle_reward') return new BattleReward(params as any);
          
          // 第十批新增效果 - 组合实现所需的特殊效果
          if (specialType === 'continuous_stat_change') return new ContinuousStatChange(params as any);
          if (specialType === 'type_skill_counter') return new TypeSkillCounter(params as any);
          if (specialType === 'stat_boost_nullify') return new StatBoostNullify(params as any);
          if (specialType === 'on_opponent_miss') return new OnOpponentMiss(params as any);
          if (specialType === 'random_status') return new RandomStatusEffect(params as any);
          
          // BOSS被动特性 - 已有
          if (specialType === 'damage_reduction_passive') return new DamageReductionPassive(params as any);
          if (specialType === 'same_type_absorb') return new SameTypeAbsorbPassive();
          if (specialType === 'type_immunity') return new TypeImmunityPassive(params as any);

          // BOSS被动特性 - 状态施加 (2006, 2066, 2067, 2078)
          if (specialType === 'on_hit_status_inflict') return new OnHitStatusInflictPassive(params as any);
          if (specialType === 'phys_hit_status_inflict') return new PhysHitStatusInflictPassive(params as any);
          if (specialType === 'sp_hit_status_inflict') return new SpHitStatusInflictPassive(params as any);
          if (specialType === 'on_sp_hit_status_inflict') return new OnSpHitStatusInflictPassive(params as any);

          // BOSS被动特性 - 命中率 (2007, 2024, 2029)
          if (specialType === 'accuracy_reduction_passive') return new AccuracyReductionPassive(params as any);
          if (specialType === 'skill_dodge') return new SkillDodgePassive(params as any);
          if (specialType === 'accuracy_bonus') return new AccuracyBonusPassive(params as any);

          // BOSS被动特性 - 暴击率 (2008, 2030, 2045, 2057, 2064)
          if (specialType === 'fixed_crit_rate') return new FixedCritRatePassive(params as any);
          if (specialType === 'crit_rate_bonus') return new CritRateBonusPassive(params as any);
          if (specialType === 'fixed_crit_divisor') return new FixedCritDivisorPassive(params as any);
          if (specialType === 'status_crit_bonus') return new StatusCritBonusPassive(params as any);
          if (specialType === 'crit_rate_reduce') return new CritRateReducePassive(params as any);

          // BOSS被动特性 - 濒死回满 (2009, 2051)
          if (specialType === 'burst_recover_full_hp') return new BurstRecoverFullHpPassive(params as any);
          if (specialType === 'burst_recover_full_hp_pp') return new BurstRecoverFullHpPpPassive(params as any);

          // BOSS被动特性 - 无限PP (2010)
          if (specialType === 'infinite_pp') return new InfinitePPPassive(params as any);

          // BOSS被动特性 - 伤害反弹 (2011, 2083)
          if (specialType === 'damage_reflect_fraction') return new DamageReflectFractionPassive(params as any);
          if (specialType === 'high_damage_reflect') return new HighDamageReflectPassive(params as any);

          // BOSS被动特性 - 受击能力变化 (2012, 2034, 2035)
          if (specialType === 'on_sp_hit_stat_up') return new OnSpHitStatUpPassive(params as any);
          if (specialType === 'on_sp_hit_enemy_stat_down') return new OnSpHitEnemyStatDownPassive(params as any);
          if (specialType === 'on_hit_self_stat_up') return new OnHitSelfStatUpPassive(params as any);

          // BOSS被动特性 - 定时逃跑 (2013)
          if (specialType === 'timed_escape') return new EscapePassive(params as any);

          // BOSS被动特性 - 天敌 (2014, 2015, 2043)
          if (specialType === 'counter_fear') return new CounterFearPassive(params as any);
          if (specialType === 'counter_damage_reduce') return new CounterDamageReducePassive(params as any);
          if (specialType === 'counter_priority_reduce') return new CounterPriorityReducePassive(params as any);

          // BOSS被动特性 - 血量绑定能力 (2016)
          if (specialType === 'hp_stat_bind') return new HpStatBindPassive(params as any);

          // BOSS被动特性 - 护盾 (2020, 2027, 2036)
          if (specialType === 'skill_unlock_shield') return new SkillUnlockShieldPassive(params as any);
          if (specialType === 'type_sequence_shield') return new TypeSequenceShieldPassive(params as any);
          if (specialType === 'rotating_type_shield') return new RotatingTypeShieldPassive(params as any);

          // BOSS被动特性 - 存活 (2021, 2031, 2046)
          if (specialType === 'survive_with_1hp_unless_skill') return new SurviveWith1HpPassive(params as any);
          if (specialType === 'survive_lethal_chance') return new SurviveLethalChancePassive(params as any);
          if (specialType === 'five_turn_immortal') return new FiveTurnImmortalPassive(params as any);

          // BOSS被动特性 - 受击伤害倍增 (2022)
          if (specialType === 'received_damage_multiply') return new ReceivedDamageMultiplyPassive(params as any);

          // BOSS被动特性 - 低血秒杀先手 (2023)
          if (specialType === 'low_hp_ohko_priority') return new LowHpOhkoPriorityPassive(params as any);

          // BOSS被动特性 - 复活 (2025, 2044)
          if (specialType === 'revive_on_death') return new ReviveOnDeathPassive(params as any);
          if (specialType === 'revive_full') return new ReviveFullPassive(params as any);

          // BOSS被动特性 - 固定属性加成 (2026)
          if (specialType === 'flat_stat_bonus') return new FlatStatBonusPassive(params as any);

          // BOSS被动特性 - 属性伤害加成 (2028)
          if (specialType === 'type_damage_bonus') return new TypeDamageBonusPassive(params as any);

          // BOSS被动特性 - 伤害修改 (2038, 2039, 2040, 2047, 2055, 2060, 2061, 2062, 2063, 2065, 2076)
          if (specialType === 'damage_bonus_percent') return new DamageBonusPercentPassive(params as any);
          if (specialType === 'even_damage_multiply') return new EvenDamageMultiplyPassive(params as any);
          if (specialType === 'odd_damage_divide') return new OddDamageDividePassive(params as any);
          if (specialType === 'both_damage_reduce') return new BothDamageReducePassive(params as any);
          if (specialType === 'both_damage_multiply') return new BothDamageMultiplyPassive(params as any);
          if (specialType === 'chance_damage_flat_reduce') return new ChanceDamageFlatReducePassive(params as any);
          if (specialType === 'chance_full_block') return new ChanceFullBlockPassive(params as any);
          if (specialType === 'phys_chance_damage_bonus') return new PhysChanceDamageBonusPassive(params as any);
          if (specialType === 'sp_chance_damage_bonus') return new SpChanceDamageBonusPassive(params as any);
          if (specialType === 'attack_type_damage_bonus') return new AttackTypeDamageBonusPassive(params as any);
          if (specialType === 'self_damage_reduce') return new SelfDamageReducePassive(params as any);

          // BOSS被动特性 - 回合回血/扣血 (2041, 2053, 2054, 2071, 2075, 2077)
          if (specialType === 'turn_end_heal') return new TurnEndHealPassive(params as any);
          if (specialType === 'both_turn_heal_percent') return new BothTurnHealPercentPassive(params as any);
          if (specialType === 'both_turn_damage') return new BothTurnDamagePassive(params as any);
          if (specialType === 'turn_drain') return new TurnDrainPassive(params as any);
          if (specialType === 'asymmetric_turn_heal') return new AsymmetricTurnHealPassive(params as any);
          if (specialType === 'turn_enemy_damage') return new TurnEnemyDamagePassive(params as any);

          // BOSS被动特性 - 先制 (2042, 2097, 2098)
          if (specialType === 'priority_change') return new PriorityChangePassive(params as any);
          if (specialType === 'low_hp_priority') return new LowHpPriorityPassive(params as any);
          if (specialType === 'high_damage_next_priority') return new HighDamageNextPriorityPassive(params as any);

          // BOSS被动特性 - 攻击类型无效 (2048)
          if (specialType === 'attack_type_immune') return new AttackTypeImmunePassive(params as any);

          // BOSS被动特性 - 受击后减伤 (2049)
          if (specialType === 'post_hit_damage_reduction') return new PostHitDamageReductionPassive(params as any);

          // BOSS被动特性 - 免疫特效 (2050, 2185)
          if (specialType === 'effect_immunity') return new EffectImmunityPassive(params as any);
          if (specialType === 'skill_effect_immunity') return new SkillEffectImmunityPassive(params as any);

          // BOSS被动特性 - 轮换免疫 (2052)
          if (specialType === 'rotating_attack_immunity') return new RotatingAttackImmunityPassive(params as any);

          // BOSS被动特性 - 定时秒杀 (2056)
          if (specialType === 'timed_ohko') return new TimedOhkoPassive(params as any);

          // BOSS被动特性 - 魔王愤怒/附身 (2058, 2059)
          if (specialType === 'boss_rage') return new BossRagePassive(params as any);
          if (specialType === 'boss_possession') return new BossPossessionPassive(params as any);

          // BOSS被动特性 - 特定系吸收 (2068)
          if (specialType === 'specific_type_absorb') return new SpecificTypeAbsorbPassive(params as any);

          // BOSS被动特性 - 性别伤害加成 (2069)
          if (specialType === 'gender_damage_bonus') return new GenderDamageBonusPassive(params as any);

          // BOSS被动特性 - 复制强化 (2070)
          if (specialType === 'copy_enemy_buff') return new CopyEnemyBuffPassive(params as any);

          // BOSS被动特性 - 命中后效果 (2072, 2073, 2074, 2079, 2080, 2081)
          if (specialType === 'low_damage_heal') return new LowDamageHealPassive(params as any);
          if (specialType === 'damage_lifesteal') return new DamageLifestealPassive(params as any);
          if (specialType === 'hit_stack_weakness') return new HitStackWeaknessPassive(params as any);
          if (specialType === 'high_damage_next_double') return new HighDamageNextDoublePassive(params as any);
          if (specialType === 'high_damage_heal') return new HighDamageHealPassive(params as any);
          if (specialType === 'low_hp_guardian') return new LowHpGuardianPassive(params as any);

          // BOSS被动特性 - 高伤反杀 (2037)
          if (specialType === 'high_damage_counter_kill') return new HighDamageCounterKillPassive(params as any);

          // BOSS被动特性 - 闪避回血 (2082)
          if (specialType === 'dodge_heal') return new DodgeHealPassive(params as any);

          // BOSS被动特性 - 低血概率回满 (2033)
          if (specialType === 'low_hp_full_heal_chance') return new LowHpFullHealChancePassive(params as any);

          // BOSS被动特性 - 属性秒杀 (2205)
          if (specialType === 'type_ohko') return new TypeOhkoPassive(params as any);

          // BOSS被动特性 - 命中消回合效果 (2772)
          if (specialType === 'clear_enemy_turn_effects') return new ClearEnemyTurnEffectsPassive(params as any);

          return new SpecialEffect(params as any);
        case AtomicEffectType.DURATION:
          const wrapper = new DurationWrapper(params as any);
          if ((params as any).effect) {
            const wrappedEffect = this.create((params as any).effect);
            if (wrappedEffect) wrapper.setWrappedEffect(wrappedEffect);
          }
          return wrapper;
        default:
          Logger.Error(`未知的原子效果类型: ${params.type}`, new Error());
          return null;
      }
    } catch (error) {
      Logger.Error(`创建原子效果失败: ${params.type}`, error as Error);
      return null;
    }
  }

  public createBatch(paramsList: IAtomicEffectParams[]): IAtomicEffect[] {
    const atoms: IAtomicEffect[] = [];
    for (const params of paramsList) {
      const atom = this.create(params);
      if (atom) atoms.push(atom);
    }
    return atoms;
  }
}

export const atomicEffectFactory = AtomicEffectFactory.getInstance();
