import { Logger } from '../../../shared/utils';

/**
 * BOSS规则集中管理
 * 管理BOSS相关的硬编码规则（如免疫同生共死等）
 */
export class BossRules {
  // 免疫同生共死的BOSS ID集合
  private static readonly SAME_LIFE_DEATH_IMMUNE_IDS = new Set([
    70,   // 雷伊
    132,  // 尤纳斯
    216,  // 哈莫雷特
    261,  // 盖亚
    274,  // 塔克林
    391,  // 塔西亚
  ]);

  // 免疫异常状态的BOSS ID集合（备用查询，主要通过1903被动实现）
  private static readonly STATUS_IMMUNE_IDS = new Set([
    70,   // 雷伊
    216,  // 哈莫雷特
    264,  // 奈尼芬多
    261,  // 盖亚
  ]);

  /**
   * 检查BOSS是否免疫同生共死
   */
  public static IsSameLifeDeathImmune(petId: number): boolean {
    return this.SAME_LIFE_DEATH_IMMUNE_IDS.has(petId);
  }

  /**
   * 检查BOSS是否免疫异常状态
   */
  public static IsStatusImmune(petId: number): boolean {
    return this.STATUS_IMMUNE_IDS.has(petId);
  }
}
