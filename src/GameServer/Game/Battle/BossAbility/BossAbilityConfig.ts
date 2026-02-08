/**
 * BOSS配置加载器
 *
 * 从 boss_abilities.json 读取BOSS完整配置
 * 包含：属性、等级、掉落、特性等
 * 
 * 特性支持两种格式:
 *   纯数字: 1902 → 使用默认参数
 *   带参数: { "id": 1904, "args": [30] } → 覆盖默认参数
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../../../../shared/utils';

/**
 * 单个特性条目（解析后）
 */
export interface IAbilityEntry {
  id: number;
  args?: number[];
}

/**
 * BOSS完整配置接口（JSON原始格式）
 */
export interface IBossConfig {
  bossId: number;
  petId: number;
  petName: string;
  clientId: number;
  level: number;
  dv: number;
  ev: number;
  nature: number;
  customHP?: number;  // 自定义血量（可选）
  abilities: (number | { id: number; args?: number[] })[];
  drops: Array<{ itemId: number; rate: number; count: number }>;
  rewards: { exp: number; coins: number };
  description: string;
}

/**
 * BOSS配置文件接口
 */
interface IBossConfigFile {
  version: string;
  description: string;
  lastUpdate: string;
  bossConfigs: IBossConfig[];
  abilityReference?: any;
  dropItemReference?: any;
  notes?: string[];
}

/**
 * BOSS配置类
 */
export class BossAbilityConfig {
  private static _instance: BossAbilityConfig;
  private abilityMap: Map<number, IAbilityEntry[]> = new Map(); // petId -> abilities
  private bossConfigMap: Map<number, IBossConfig> = new Map(); // bossId -> config
  private loaded: boolean = false;

  private constructor() {}

  public static get Instance(): BossAbilityConfig {
    if (!BossAbilityConfig._instance) {
      BossAbilityConfig._instance = new BossAbilityConfig();
    }
    return BossAbilityConfig._instance;
  }

  /**
   * 加载配置文件
   */
  public Load(): void {
    if (this.loaded) {
      return;
    }

    try {
      const configPath = path.join(
        process.cwd(),
        'config',
        'data',
        'json',
        'boss_abilities.json'
      );

      if (!fs.existsSync(configPath)) {
        Logger.Warn(`[BossAbilityConfig] 配置文件不存在: ${configPath}`);
        this.loaded = true;
        return;
      }

      const content = fs.readFileSync(configPath, 'utf-8');
      const config: IBossConfigFile = JSON.parse(content);

      // 构建映射表
      this.abilityMap.clear();
      this.bossConfigMap.clear();
      
      for (const boss of config.bossConfigs) {
        // 解析特性列表
        const entries: IAbilityEntry[] = [];
        for (const ability of boss.abilities) {
          if (typeof ability === 'number') {
            entries.push({ id: ability });
          } else {
            entries.push({ id: ability.id, args: ability.args });
          }
        }
        
        // 存储特性映射（按petId索引，向后兼容）
        this.abilityMap.set(boss.petId, entries);
        
        // 存储完整配置（按bossId索引）
        this.bossConfigMap.set(boss.bossId, boss);
      }

      Logger.Info(
        `[BossAbilityConfig] 加载BOSS配置成功: ` +
        `版本=${config.version}, BOSS数=${config.bossConfigs.length}`
      );

      this.loaded = true;
    } catch (error) {
      Logger.Error('[BossAbilityConfig] 加载配置文件失败', error as Error);
      this.loaded = true;
    }
  }

  /**
   * 根据bossId获取BOSS完整配置
   *
   * @param bossId BOSS唯一ID
   * @returns BOSS配置对象，如果不存在返回undefined
   */
  public GetBossConfig(bossId: number): IBossConfig | undefined {
    if (!this.loaded) {
      this.Load();
    }

    return this.bossConfigMap.get(bossId);
  }

  /**
   * 根据clientId获取BOSS完整配置
   * 客户端传来的是精灵显示ID（clientId），需要通过它查找BOSS配置
   *
   * @param clientId 客户端精灵ID
   * @returns BOSS配置对象，如果不存在返回undefined
   */
  public GetBossConfigByClientId(clientId: number): IBossConfig | undefined {
    if (!this.loaded) {
      this.Load();
    }

    // 遍历所有BOSS配置，查找匹配的clientId
    for (const boss of this.bossConfigMap.values()) {
      if (boss.clientId === clientId) {
        return boss;
      }
    }

    return undefined;
  }

  /**
   * 获取精灵的特性条目列表（包含参数）
   *
   * @param petId 精灵ID
   * @returns 特性条目数组
   */
  public GetAbilityEntries(petId: number): IAbilityEntry[] {
    if (!this.loaded) {
      this.Load();
    }

    return this.abilityMap.get(petId) || [];
  }

  /**
   * 获取精灵的特性ID列表（向后兼容）
   *
   * @param petId 精灵ID
   * @returns 特性ID数组
   */
  public GetAbilities(petId: number): number[] {
    return this.GetAbilityEntries(petId).map(e => e.id);
  }

  /**
   * 检查精灵是否有特性
   *
   * @param petId 精灵ID
   * @returns 是否有特性
   */
  public HasAbilities(petId: number): boolean {
    if (!this.loaded) {
      this.Load();
    }

    return this.abilityMap.has(petId);
  }

  /**
   * 检查BOSS是否存在
   *
   * @param bossId BOSS唯一ID
   * @returns 是否存在
   */
  public HasBoss(bossId: number): boolean {
    if (!this.loaded) {
      this.Load();
    }

    return this.bossConfigMap.has(bossId);
  }

  /**
   * 重新加载配置
   */
  public Reload(): void {
    this.loaded = false;
    this.abilityMap.clear();
    this.bossConfigMap.clear();
    this.Load();
  }
}
