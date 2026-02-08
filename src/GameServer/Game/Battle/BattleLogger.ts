/**
 * 战斗日志系统 - 简化版
 * 提供统一的战斗日志格式，减少混乱
 */

import { Logger } from '../../../shared/utils';
import { IBattleInfo, IBattlePet } from '../../../shared/models/BattleModel';

/**
 * 战斗日志工具类
 * 提供格式化的战斗日志输出
 */
export class BattleLogger {
  /**
   * 记录战斗开始
   */
  public static LogBattleStart(userId: number, player: IBattlePet, enemy: IBattlePet, isBoss: boolean = false): void {
    const type = isBoss ? 'BOSS战斗' : '野怪战斗';
    Logger.Info(
      `\n┌─────────────────────────────────────────────────────────────\n` +
      `│ 🎮 ${type}开始 [UserID: ${userId}]\n` +
      `├─────────────────────────────────────────────────────────────\n` +
      `│ 玩家: ${player.name} Lv.${player.level} [HP: ${player.hp}/${player.maxHp}]\n` +
      `│ 敌人: ${enemy.name} Lv.${enemy.level} [HP: ${enemy.hp}/${enemy.maxHp}]\n` +
      `└─────────────────────────────────────────────────────────────`
    );
  }

  /**
   * 记录回合开始
   */
  public static LogTurnStart(turn: number, playerSkillName: string, enemySkillName: string): void {
    Logger.Info(
      `\n⚔️  回合 ${turn}\n` +
      `   玩家: ${playerSkillName} | 敌人: ${enemySkillName}`
    );
  }

  /**
   * 记录攻击结果
   */
  public static LogAttack(
    attacker: string,
    skillName: string,
    damage: number,
    isCrit: boolean,
    missed: boolean,
    targetHp: number,
    targetMaxHp: number
  ): void {
    if (missed) {
      Logger.Info(`   ❌ ${attacker}的${skillName}未命中！`);
    } else {
      const critText = isCrit ? ' 💥暴击!' : '';
      Logger.Info(
        `   ⚡ ${attacker}使用${skillName}，造成${damage}伤害${critText}\n` +
        `      目标剩余HP: ${targetHp}/${targetMaxHp}`
      );
    }
  }

  /**
   * 记录战斗结束
   */
  public static LogBattleEnd(userId: number, winner: number, reason: string, turn: number): void {
    const winnerText = winner === userId ? '🎉 玩家胜利' : winner === 0 ? '💀 玩家失败' : '🤝 平局';
    Logger.Info(
      `\n┌─────────────────────────────────────────────────────────────\n` +
      `│ ${winnerText}\n` +
      `├─────────────────────────────────────────────────────────────\n` +
      `│ 原因: ${reason}\n` +
      `│ 回合数: ${turn}\n` +
      `└─────────────────────────────────────────────────────────────\n`
    );
  }

  /**
   * 记录奖励
   */
  public static LogReward(exp: number, coins: number, levelUp: boolean, newLevel: number, drops: number): void {
    Logger.Info(
      `\n🎁 战斗奖励:\n` +
      `   💎 经验: +${exp}${levelUp ? ` (升级到Lv.${newLevel}!)` : ''}\n` +
      `   💰 金币: +${coins}\n` +
      `   📦 掉落: ${drops}个物品`
    );
  }

  /**
   * 记录捕获
   */
  public static LogCapture(success: boolean, petName: string, catchRate: number, shakeCount: number): void {
    if (success) {
      Logger.Info(`\n✨ 捕获成功! 获得了${petName}! (捕获率: ${catchRate.toFixed(1)}%, 摇晃: ${shakeCount}次)`);
    } else {
      Logger.Info(`\n💔 捕获失败... (捕获率: ${catchRate.toFixed(1)}%, 摇晃: ${shakeCount}次)`);
    }
  }

  /**
   * 记录逃跑
   */
  public static LogEscape(success: boolean, escapeRate?: number): void {
    if (success) {
      Logger.Info(`\n🏃 逃跑成功!`);
    } else {
      Logger.Info(`\n❌ 逃跑失败... (成功率: ${escapeRate?.toFixed(1)}%)`);
    }
  }

  /**
   * 记录精灵切换
   */
  public static LogPetSwitch(newPetName: string, level: number, hp: number, maxHp: number): void {
    Logger.Info(`\n🔄 切换精灵: ${newPetName} Lv.${level} [HP: ${hp}/${maxHp}]`);
  }

  /**
   * 记录错误
   */
  public static LogError(context: string, error: Error): void {
    Logger.Error(`\n❌ [战斗错误] ${context}`, error);
  }

  /**
   * 记录警告
   */
  public static LogWarning(message: string): void {
    Logger.Warn(`\n⚠️  ${message}`);
  }

  /**
   * 记录调试信息（仅在需要时使用）
   */
  public static LogDebug(message: string): void {
    Logger.Debug(`[Battle] ${message}`);
  }
}

