/**
 * BOSS特性配置加载器
 * 
 * 从 boss_abilities.json 读取BOSS特性配置
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../../../../shared/utils';

/**
 * BOSS特性配置接口
 */
export interface IBossAbilityConfig {
  petId: number;
  petName: string;
  abilities: number[];
  description: string;
}

/**
 * BOSS特性配置文件接口
 */
interface IBossAbilityConfigFile {
  version: string;
  description: string;
  lastUpdate: string;
  bossAbilities: IBossAbilityConfig[];
  notes?: string[];
}

/**
 * BOSS特性配置类
 */
export class BossAbilityConfig {
  private static _instance: BossAbilityConfig;
  private configMap: Map<number, number[]> = new Map();
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
      const config: IBossAbilityConfigFile = JSON.parse(content);

      // 构建映射表
      this.configMap.clear();
      for (const boss of config.bossAbilities) {
        this.configMap.set(boss.petId, boss.abilities);
      }

      Logger.Info(
        `[BossAbilityConfig] 加载BOSS特性配置成功: ` +
        `版本=${config.version}, BOSS数=${config.bossAbilities.length}`
      );

      this.loaded = true;
    } catch (error) {
      Logger.Error('[BossAbilityConfig] 加载配置文件失败', error as Error);
      this.loaded = true;
    }
  }

  /**
   * 获取精灵的特性ID列表
   * 
   * @param petId 精灵ID
   * @returns 特性ID数组
   */
  public GetAbilities(petId: number): number[] {
    if (!this.loaded) {
      this.Load();
    }

    return this.configMap.get(petId) || [];
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

    return this.configMap.has(petId);
  }

  /**
   * 重新加载配置
   */
  public Reload(): void {
    this.loaded = false;
    this.configMap.clear();
    this.Load();
  }
}
