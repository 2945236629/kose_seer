/**
 * 被动能力系统（兼容层）
 *
 * 保留原有接口以兼容 BattleInitService 等调用方。
 * 实际功能委托给 BossAbilityManager → PassiveEffectRunner。
 */

import { Logger } from '../../../shared/utils';
import { IBattlePet } from '../../../shared/models/BattleModel';
import { IEffectResult } from './effects/core/EffectContext';
import { BossAbilityManager } from './BossAbility/BossAbilityManager';
import { BossAbilityConfig } from './BossAbility/BossAbilityConfig';

/**
 * 被动能力系统类（兼容层）
 */
export class PassiveAbilitySystem {

  /**
   * 在战斗开始时触发精灵的所有被动能力
   *
   * @param pet 精灵对象
   * @param _opponent 对手精灵（保留参数以兼容）
   * @returns 空数组（实际效果由 PassiveEffectRunner 在各时机自动触发）
   */
  public static TriggerPassiveAbilities(
    pet: IBattlePet,
    _opponent: IBattlePet
  ): IEffectResult[] {
    // 从配置读取BOSS特性
    const abilityIds = BossAbilityConfig.Instance.GetAbilities(pet.petId);

    if (abilityIds.length === 0) {
      return [];
    }

    // 委托给 BossAbilityManager → PassiveEffectRunner 注册
    BossAbilityManager.InitializeBossAbilities(pet, abilityIds);

    return [];
  }

  /**
   * 为精灵配置被动能力（运行时配置）
   *
   * @deprecated 请在 boss_abilities.json 中配置
   */
  public static ConfigurePassiveAbilities(petId: number, abilityIds: number[]): void {
    Logger.Warn(
      `[PassiveAbilitySystem] ConfigurePassiveAbilities已废弃，` +
      `请在 boss_abilities.json 中配置: petId=${petId}, abilities=[${abilityIds.join(', ')}]`
    );
  }
}
