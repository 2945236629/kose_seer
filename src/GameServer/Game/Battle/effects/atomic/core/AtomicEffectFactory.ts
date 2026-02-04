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
