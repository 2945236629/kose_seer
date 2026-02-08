import { Logger } from '../../../../shared/utils';
import { PlayerInstance } from '../../Player/PlayerInstance';
import { IBattleInfo, IBattlePet, BattleStatus } from '../../../../shared/models/BattleModel';
import { GameConfig } from '../../../../shared/config/game/GameConfig';
import { createBattlePetProxy } from '../BattlePetProxy';
import { SptSystem } from '../../Pet/SptSystem';
import { BossAbilityConfig } from '../BossAbility/BossAbilityConfig';

/**
 * 战斗初始化服务
 * 负责创建战斗实例、初始化精灵数据
 */
export class BattleInitService {
  private _player: PlayerInstance;

  constructor(player: PlayerInstance) {
    this._player = player;
  }

  /**
   * 创建PVE战斗（玩家 vs BOSS/野怪）
   */
  public async CreatePVEBattle(userId: number, enemyId: number, enemyLevel: number): Promise<IBattleInfo | null> {
    try {
      // 1. 获取玩家首发精灵（必须是健康的）
      const playerPets = this._player.PetManager.PetData.GetPetsInBag();
      const healthyPets = playerPets.filter(p => p.hp > 0);
      
      if (healthyPets.length === 0) {
        Logger.Warn(`[BattleInitService] 玩家没有健康的精灵: UserID=${userId}`);
        return null;
      }
      
      // 优先选择首发精灵，如果首发精灵死亡则选择第一个健康的精灵
      const playerPet = healthyPets.find(p => p.isDefault) || healthyPets[0];

      // 2. 从配置获取玩家精灵的类型
      const playerPetConfig = GameConfig.GetPetById(playerPet.petId);
      const playerType = playerPetConfig?.Type || 0;

      // 3. 确保玩家精灵有技能（如果没有，使用默认技能）
      let playerSkills = playerPet.skillArray.filter(s => s > 0);
      if (playerSkills.length === 0) {
        // 默认技能：撞击
        playerSkills = [10001];
        Logger.Warn(`[BattleInitService] 玩家精灵没有技能，使用默认技能: UserID=${userId}, PetId=${playerPet.petId}`);
      }

      // 4. 构建玩家精灵数据
      const playerBattlePet = this.BuildBattlePet(
        playerPet.petId,
        playerPet.nick || playerPetConfig?.DefName || 'Pet',
        playerPet.level,
        playerPet.hp,      // 使用当前HP
        playerPet.maxHp,
        playerPet.atk,
        playerPet.def,
        playerPet.spAtk,
        playerPet.spDef,
        playerPet.speed,
        playerType,
        playerSkills,
        playerPet.catchTime,
        0  // 皮肤ID（暂时使用默认皮肤0）
      );

      // 4. 从配置获取敌人精灵信息
      const enemyPetConfig = GameConfig.GetPetById(enemyId);
      if (!enemyPetConfig) {
        Logger.Warn(`[BattleInitService] 找不到精灵配置: PetId=${enemyId}`);
        return null;
      }

      // 5. 计算敌人属性
      const enemyStats = this.CalculateEnemyStats(enemyPetConfig, enemyLevel);
      let enemySkills = this.GetEnemySkills(enemyId, enemyLevel);
      
      // 确保敌人有技能
      if (enemySkills.length === 0) {
        enemySkills = [10001]; // 默认：撞击
      }
      
      const enemyBattlePet = this.BuildBattlePet(
        enemyId,
        enemyPetConfig.DefName || `Enemy${enemyId}`,
        enemyLevel,
        enemyStats.hp,
        enemyStats.maxHp,
        enemyStats.attack,
        enemyStats.defence,
        enemyStats.spAtk,
        enemyStats.spDef,
        enemyStats.speed,
        enemyPetConfig.Type || 0,
        enemySkills,
        0,  // 敌人没有catchTime
        0   // 敌人没有皮肤
      );

      // 6. 创建战斗实例
      const battle: IBattleInfo = {
        userId,
        player: playerBattlePet,
        enemy: enemyBattlePet,
        turn: 0,
        isOver: false,
        aiType: 'random',
        startTime: Math.floor(Date.now() / 1000)
      };

      // 7. 触发被动能力（BATTLE_START时机）
      const { PassiveAbilitySystem } = await import('../PassiveAbilitySystem');
      
      // 触发玩家精灵的被动能力
      const playerPassiveResults = PassiveAbilitySystem.TriggerPassiveAbilities(
        playerBattlePet,
        enemyBattlePet
      );
      if (playerPassiveResults.length > 0) {
        Logger.Info(
          `[BattleInitService] 玩家精灵被动能力触发: ${playerBattlePet.name}, ` +
          `结果数: ${playerPassiveResults.length}`
        );
      }
      
      // 触发敌人精灵的被动能力
      const enemyPassiveResults = PassiveAbilitySystem.TriggerPassiveAbilities(
        enemyBattlePet,
        playerBattlePet
      );
      if (enemyPassiveResults.length > 0) {
        Logger.Info(
          `[BattleInitService] 敌人精灵被动能力触发: ${enemyBattlePet.name}, ` +
          `结果数: ${enemyPassiveResults.length}`
        );
      }

      Logger.Info(`[BattleInitService] 创建战斗: UserID=${userId}, Pet=${playerPet.petId}(Lv${playerPet.level}) vs Enemy=${enemyId}(Lv${enemyLevel})`);
      return battle;

    } catch (error) {
      Logger.Error(`[BattleInitService] 创建战斗失败`, error as Error);
      return null;
    }
  }

  /**
   * 创建BOSS战斗（使用bossId从配置读取完整信息）
   * 
   * @param userId 玩家ID
   * @param bossId 客户端传来的BOSS ID
   * @returns 战斗实例，失败返回null
   */
  public async CreateBossBattle(userId: number, bossId: number): Promise<IBattleInfo | null> {
    try {
      // 1. 从配置读取BOSS信息（通过bossId查找）
      const bossConfig = BossAbilityConfig.Instance.GetBossConfig(bossId);
      if (!bossConfig) {
        Logger.Warn(`[BattleInitService] 找不到BOSS配置: BossId=${bossId}`);
        return null;
      }

      Logger.Info(
        `[BattleInitService] 创建BOSS战斗: BossId=${bossId}, ` +
        `PetId=${bossConfig.petId}, ClientId=${bossConfig.clientId}, Level=${bossConfig.level}, ` +
        `DV=${bossConfig.dv}, Nature=${bossConfig.nature}`
      );

      // 2. 获取玩家首发精灵（必须是健康的）
      const playerPets = this._player.PetManager.PetData.GetPetsInBag();
      const healthyPets = playerPets.filter(p => p.hp > 0);
      
      if (healthyPets.length === 0) {
        Logger.Warn(`[BattleInitService] 玩家没有健康的精灵: UserID=${userId}`);
        return null;
      }
      
      // 优先选择首发精灵，如果首发精灵死亡则选择第一个健康的精灵
      const playerPet = healthyPets.find(p => p.isDefault) || healthyPets[0];

      // 3. 从配置获取玩家精灵的类型
      const playerPetConfig = GameConfig.GetPetById(playerPet.petId);
      const playerType = playerPetConfig?.Type || 0;

      // 4. 确保玩家精灵有技能（如果没有，使用默认技能）
      let playerSkills = playerPet.skillArray.filter(s => s > 0);
      if (playerSkills.length === 0) {
        playerSkills = [10001];
        Logger.Warn(`[BattleInitService] 玩家精灵没有技能，使用默认技能: UserID=${userId}, PetId=${playerPet.petId}`);
      }

      // 5. 构建玩家精灵数据
      const playerBattlePet = this.BuildBattlePet(
        playerPet.petId,
        playerPet.nick || playerPetConfig?.DefName || 'Pet',
        playerPet.level,
        playerPet.hp,
        playerPet.maxHp,
        playerPet.atk,
        playerPet.def,
        playerPet.spAtk,
        playerPet.spDef,
        playerPet.speed,
        playerType,
        playerSkills,
        playerPet.catchTime,
        0
      );

      // 6. 从配置获取BOSS精灵信息
      const bossPetConfig = GameConfig.GetPetById(bossConfig.petId);
      if (!bossPetConfig) {
        Logger.Warn(`[BattleInitService] 找不到BOSS精灵配置: PetId=${bossConfig.petId}`);
        return null;
      }

      // 7. 使用BOSS配置计算属性（使用配置中的dv、ev、nature）
      const bossStats = this.CalculateBossStats(
        bossPetConfig,
        bossConfig.level,
        bossConfig.dv,
        bossConfig.ev,
        bossConfig.nature
      );

      // 如果配置了自定义血量，覆盖计算值
      if (bossConfig.customHP !== undefined && bossConfig.customHP > 0) {
        bossStats.hp = bossConfig.customHP;
        bossStats.maxHp = bossConfig.customHP;
        Logger.Info(
          `[BattleInitService] 使用自定义血量: BossId=${bossConfig.bossId}, ` +
          `CustomHP=${bossConfig.customHP}`
        );
      }

      // 8. 获取BOSS技能
      let bossSkills = this.GetEnemySkills(bossConfig.petId, bossConfig.level);
      if (bossSkills.length === 0) {
        bossSkills = [10001];
      }

      // 9. 构建BOSS精灵数据（使用clientId作为显示ID）
      const bossBattlePet = this.BuildBattlePet(
        bossConfig.clientId,  // 使用clientId（闪光精灵时不同）
        bossConfig.petName,
        bossConfig.level,
        bossStats.hp,
        bossStats.maxHp,
        bossStats.attack,
        bossStats.defence,
        bossStats.spAtk,
        bossStats.spDef,
        bossStats.speed,
        bossPetConfig.Type || 0,
        bossSkills,
        0,
        0
      );

      // 10. 创建战斗实例
      const battle: IBattleInfo = {
        userId,
        player: playerBattlePet,
        enemy: bossBattlePet,
        turn: 0,
        isOver: false,
        aiType: 'random',
        startTime: Math.floor(Date.now() / 1000),
        bossId: bossConfig.bossId  // 保存bossId用于战斗结束时读取奖励配置
      };

      // 11. 触发被动能力（BATTLE_START时机）
      const { PassiveAbilitySystem } = await import('../PassiveAbilitySystem');
      
      const playerPassiveResults = PassiveAbilitySystem.TriggerPassiveAbilities(
        playerBattlePet,
        bossBattlePet
      );
      if (playerPassiveResults.length > 0) {
        Logger.Info(
          `[BattleInitService] 玩家精灵被动能力触发: ${playerBattlePet.name}, ` +
          `结果数: ${playerPassiveResults.length}`
        );
      }
      
      const bossPassiveResults = PassiveAbilitySystem.TriggerPassiveAbilities(
        bossBattlePet,
        playerBattlePet
      );
      if (bossPassiveResults.length > 0) {
        Logger.Info(
          `[BattleInitService] BOSS被动能力触发: ${bossBattlePet.name}, ` +
          `结果数: ${bossPassiveResults.length}`
        );
      }

      Logger.Info(
        `[BattleInitService] 创建BOSS战斗成功: UserID=${userId}, ` +
        `BossId=${bossId}, Pet=${playerPet.petId}(Lv${playerPet.level}) vs ` +
        `${bossConfig.petName}(Lv${bossConfig.level})`
      );
      
      return battle;

    } catch (error) {
      Logger.Error(`[BattleInitService] 创建BOSS战斗失败`, error as Error);
      return null;
    }
  }

  /**
   * 构建战斗精灵数据
   */
  private BuildBattlePet(
    id: number,
    name: string,
    level: number,
    hp: number,
    maxHp: number,
    attack: number,
    defence: number,
    spAtk: number,
    spDef: number,
    speed: number,
    type: number,
    skills: number[],
    catchTime: number,
    skinID: number = 0
  ): IBattlePet {
    // 过滤无效技能，但确保至少有一个技能
    const validSkills = skills.filter(s => s > 0);
    const finalSkills = validSkills.length > 0 ? validSkills : [10001]; // 默认撞击
    
    // 从技能配置中获取每个技能的最大PP
    const skillPPs = finalSkills.map(skillId => {
      const skillConfig = GameConfig.GetSkillById(skillId);
      const maxPP = skillConfig?.MaxPP || 20;
      Logger.Debug(`[BattleInitService] BuildBattlePet: SkillId=${skillId}, MaxPP=${maxPP}, SkillName=${skillConfig?.Name || 'Unknown'}`);
      return maxPP;
    });
    
    Logger.Debug(`[BattleInitService] BuildBattlePet: Skills=${JSON.stringify(finalSkills)}, PPs=${JSON.stringify(skillPPs)}`);
    
    const pet: IBattlePet = {
      petId: id,
      id,
      name,
      level,
      hp,
      maxHp,
      attack,
      defence,
      spAtk,
      spDef,
      speed,
      type,
      skills: finalSkills,
      catchTime,
      skinID,  // 设置皮肤ID
      statusArray: new Array(20).fill(0),
      battleLv: new Array(6).fill(0),
      status: BattleStatus.NONE,
      statusTurns: 0,
      statusDurations: new Array(20).fill(0),
      flinched: false,
      bound: false,
      boundTurns: 0,
      fatigue: false,
      fatigueTurns: 0,
      battleLevels: [0, 0, 0, 0, 0, 0],
      effectCounters: {},
      skillPP: skillPPs,  // 使用从配置读取的PP值
      lastMove: 0,
      encore: false,
      encoreTurns: 0
    };

    // 使用 Proxy 包装，自动同步状态字段
    return createBattlePetProxy(pet);
  }

  /**
   * 计算敌人属性
   * 
   * 使用标准公式：
   * - HP = ((种族值*2 + 个体值 + 努力值/4) * 等级 / 100) + 10 + 等级
   * - 其他 = ((种族值*2 + 个体值 + 努力值/4) * 等级 / 100 + 5) * 性格修正
   * 
   * BOSS默认值：
   * - 个体值：24（所有属性）
   * - 努力值：0（BOSS没有努力值）
   * - 性格：0（平衡性格，修正系数1.0）
   */
  private CalculateEnemyStats(petConfig: any, level: number): {
    hp: number;
    maxHp: number;
    attack: number;
    defence: number;
    spAtk: number;
    spDef: number;
    speed: number;
  } {
    // 从配置读取种族值
    const baseHp = petConfig.HP || 50;
    const baseAtk = petConfig.Atk || 40;
    const baseDef = petConfig.Def || 35;
    const baseSpAtk = petConfig.SpAtk || 40;
    const baseSpDef = petConfig.SpDef || 35;
    const baseSpeed = petConfig.Spd || 30;

    // BOSS默认值
    const dv = 24;      // 个体值：24
    const ev = 0;       // 努力值：0（BOSS没有努力值）

    // HP计算：((种族值*2 + 个体值 + 努力值/4) * 等级 / 100) + 10 + 等级
    const hp = Math.floor((baseHp * 2 + dv + ev / 4) * level / 100) + 10 + level;
    
    // 其他属性计算：((种族值*2 + 个体值 + 努力值/4) * 等级 / 100 + 5) * 性格修正
    // 平衡性格修正系数为1.0，所以不需要额外计算
    const attack = Math.floor((baseAtk * 2 + dv + ev / 4) * level / 100) + 5;
    const defence = Math.floor((baseDef * 2 + dv + ev / 4) * level / 100) + 5;
    const spAtk = Math.floor((baseSpAtk * 2 + dv + ev / 4) * level / 100) + 5;
    const spDef = Math.floor((baseSpDef * 2 + dv + ev / 4) * level / 100) + 5;
    const speed = Math.floor((baseSpeed * 2 + dv + ev / 4) * level / 100) + 5;
    
    return {
      hp,
      maxHp: hp,
      attack,
      defence,
      spAtk,
      spDef,
      speed
    };
  }

  /**
   * 计算BOSS属性（使用配置中的dv、ev、nature）
   * 
   * 使用标准公式：
   * - HP = ((种族值*2 + 个体值 + 努力值/4) * 等级 / 100) + 10 + 等级
   * - 其他 = ((种族值*2 + 个体值 + 努力值/4) * 等级 / 100 + 5) * 性格修正
   * 
   * 性格修正：
   * - 加属性：1.1
   * - 平衡：1.0
   * - 减属性：0.9
   */
  private CalculateBossStats(
    petConfig: any,
    level: number,
    dv: number,
    ev: number,
    nature: number
  ): {
    hp: number;
    maxHp: number;
    attack: number;
    defence: number;
    spAtk: number;
    spDef: number;
    speed: number;
  } {
    // 从配置读取种族值
    const baseHp = petConfig.HP || 50;
    const baseAtk = petConfig.Atk || 40;
    const baseDef = petConfig.Def || 35;
    const baseSpAtk = petConfig.SpAtk || 40;
    const baseSpDef = petConfig.SpDef || 35;
    const baseSpeed = petConfig.Spd || 30;

    // HP计算：((种族值*2 + 个体值 + 努力值/4) * 等级 / 100) + 10 + 等级
    const hp = Math.floor((baseHp * 2 + dv + ev / 4) * level / 100) + 10 + level;
    
    // 其他属性计算：((种族值*2 + 个体值 + 努力值/4) * 等级 / 100 + 5) * 性格修正
    // 性格0=平衡，修正系数1.0
    const natureMod = nature === 0 ? 1.0 : 1.0; // 暂时只支持平衡性格
    
    const attack = Math.floor((Math.floor((baseAtk * 2 + dv + ev / 4) * level / 100) + 5) * natureMod);
    const defence = Math.floor((Math.floor((baseDef * 2 + dv + ev / 4) * level / 100) + 5) * natureMod);
    const spAtk = Math.floor((Math.floor((baseSpAtk * 2 + dv + ev / 4) * level / 100) + 5) * natureMod);
    const spDef = Math.floor((Math.floor((baseSpDef * 2 + dv + ev / 4) * level / 100) + 5) * natureMod);
    const speed = Math.floor((Math.floor((baseSpeed * 2 + dv + ev / 4) * level / 100) + 5) * natureMod);
    
    Logger.Debug(
      `[BattleInitService] 计算BOSS属性: Level=${level}, DV=${dv}, EV=${ev}, Nature=${nature}, ` +
      `HP=${hp}, Atk=${attack}, Def=${defence}, SpAtk=${spAtk}, SpDef=${spDef}, Speed=${speed}`
    );
    
    return {
      hp,
      maxHp: hp,
      attack,
      defence,
      spAtk,
      spDef,
      speed
    };
  }

  /**
   * 获取敌人技能列表
   * 从配置读取该精灵在指定等级可学会的技能，随机选择4个
   */
  private GetEnemySkills(petId: number, level: number): number[] {
    // 使用 SptSystem 获取精灵的可学习技能
    const learnableMoves = SptSystem.GetLearnableMovesByLevel(petId, level);

    if (learnableMoves.length === 0) {
      return [10001]; // 默认撞击
    }

    // 如果技能数量 <= 4，直接返回所有技能
    if (learnableMoves.length <= 4) {
      return learnableMoves.map(move => move.id);
    }

    // 随机选择4个技能
    const shuffled = [...learnableMoves].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 4).map(move => move.id);
  }

  /**
   * 验证战斗是否有效
   */
  public ValidateBattle(battle: IBattleInfo | null): boolean {
    if (!battle) {
      Logger.Debug(`[BattleInitService] ValidateBattle: battle is null`);
      return false;
    }
    if (battle.isOver) {
      Logger.Debug(`[BattleInitService] ValidateBattle: battle.isOver = true`);
      return false;
    }
    if (battle.player.hp <= 0) {
      Logger.Debug(`[BattleInitService] ValidateBattle: player.hp = ${battle.player.hp}`);
      return false;
    }
    if (battle.enemy.hp <= 0) {
      Logger.Debug(`[BattleInitService] ValidateBattle: enemy.hp = ${battle.enemy.hp}`);
      return false;
    }
    Logger.Debug(`[BattleInitService] ValidateBattle: 战斗有效`);
    return true;
  }
}
