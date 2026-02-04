/**
 * 技能效果系统
 * 基于原子效果组合的设计
 */

// 核心
export * from './core';

// 原子效果 - Core
export * from './atomic/core/IAtomicEffect';
export * from './atomic/core/BaseAtomicEffect';
export * from './atomic/core/ConditionalCheck';
export * from './atomic/core/DurationWrapper';
export * from './atomic/core/AtomicEffectFactory';

// 原子效果 - Modifier
export * from './atomic/modifier/DamageModifier';
export * from './atomic/modifier/PowerModifier';
export * from './atomic/modifier/PriorityModifier';
export * from './atomic/modifier/AccuracyModifier';
export * from './atomic/modifier/CritModifier';
export * from './atomic/modifier/FocusEnergy';
export * from './atomic/modifier/SureHit';
export * from './atomic/modifier/DamageBoost';
export * from './atomic/modifier/DamageReduction';
export * from './atomic/modifier/TypePowerBoost';
export * from './atomic/modifier/CategoryEvasion';
export * from './atomic/modifier/GenderDamageBoost';

// 原子效果 - Stat
export * from './atomic/stat/StatModifier';
export * from './atomic/stat/StatClear';
export * from './atomic/stat/OnHitStatBoost';
export * from './atomic/stat/StatSync';
export * from './atomic/stat/RandomStatChange';
export * from './atomic/stat/StatTransfer';
export * from './atomic/stat/StatSteal';

// 原子效果 - Status
export * from './atomic/status/StatusInflictor';
export * from './atomic/status/DisableSkill';
export * from './atomic/status/RandomStatus';
export * from './atomic/status/OnHitStatus';
export * from './atomic/status/OnDamageStatus';
export * from './atomic/status/StatusSync';

// 原子效果 - Heal
export * from './atomic/heal/HealEffect';
export * from './atomic/heal/Regeneration';
export * from './atomic/heal/HealReversal';

// 原子效果 - Damage
export * from './atomic/damage/FixedDamageEffect';
export * from './atomic/damage/ContinuousDamage';
export * from './atomic/damage/MultiHit';
export * from './atomic/damage/RandomPower';
export * from './atomic/damage/LeechSeed';
export * from './atomic/damage/HpCostDamage';

// 原子效果 - Defensive
export * from './atomic/defensive/ImmuneEffect';
export * from './atomic/defensive/ReflectEffect';
export * from './atomic/defensive/Counter';
export * from './atomic/defensive/DamageShield';
export * from './atomic/defensive/Endure';

// 原子效果 - Special
export * from './atomic/special/SpecialEffect';
export * from './atomic/special/Charge';
export * from './atomic/special/PPDrain';
export * from './atomic/special/TypeSwap';
export * from './atomic/special/TypeCopy';
export * from './atomic/special/Punishment';
export * from './atomic/special/DrainAura';
export * from './atomic/special/MaxHpModifier';
export * from './atomic/special/Sacrifice';
export * from './atomic/special/DelayedKill';
export * from './atomic/special/KoDamageNext';
export * from './atomic/special/SacrificeCrit';
export * from './atomic/special/MissPenalty';
export * from './atomic/special/HpCost';
export * from './atomic/special/PPRestore';
export * from './atomic/special/Reversal';
export * from './atomic/special/WeakenEffect';
export * from './atomic/special/ConsecutiveUse';
export * from './atomic/special/Recoil';
export * from './atomic/special/Absorb';
export * from './atomic/special/Encore';
export * from './atomic/special/Mercy';
export * from './atomic/special/HpEqual';
export * from './atomic/special/Transform';
export * from './atomic/special/Substitute';

// 原子效果 - Modifier (新增)
export * from './atomic/modifier/PriorityBoost';

// 组合效果
export * from './composite/CompositeEffect';

// 工厂
export * from './EffectFactory';
