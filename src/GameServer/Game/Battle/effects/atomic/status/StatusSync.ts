import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 状态同步效果参数接口
 */
export interface IStatusSyncParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'status_sync';
  /** 同步模式：copy=复制, swap=交换, transfer=转移 */
  mode: 'copy' | 'swap' | 'transfer';
  /** 同步方向：to_opponent=给对手, from_opponent=从对手 */
  direction?: 'to_opponent' | 'from_opponent';
}

/**
 * 状态同步效果
 * 
 * 功能：
 * - 同步异常状态
 * - 支持复制、交换、转移三种模式
 * - 可指定同步方向
 * - 状态包括：麻痹、中毒、烧伤、冻伤、睡眠、混乱、害怕、疲惫
 * 
 * 使用场景：
 * - 状态复制（复制对手的异常状态到自己）
 * - 状态交换（交换双方的异常状态）
 * - 状态转移（将自己的异常状态转移给对手）
 * 
 * 配置示例：
 * ```json
 * {
 *   "type": "status",
 *   "mode": "copy",
 *   "direction": "from_opponent"
 * }
 * ```
 * 
 * 模式说明：
 * - copy: 复制状态（源保持不变，目标获得相同状态）
 * - swap: 交换状态（双方状态互换）
 * - transfer: 转移状态（源状态清除，目标获得状态）
 * 
 * 与StatSync的区别：
 * - StatSync: 同步能力变化等级
 * - StatusSync: 同步异常状态
 */
export class StatusSync extends BaseAtomicEffect {
  private mode: 'copy' | 'swap' | 'transfer';
  private direction: 'to_opponent' | 'from_opponent';

  constructor(params: IStatusSyncParams) {
    super(
      AtomicEffectType.SPECIAL,
      'StatusSync',
      [EffectTiming.AFTER_SKILL]
    );

    this.mode = params.mode;
    this.direction = params.direction ?? 'to_opponent';
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    const attacker = this.getAttacker(context);
    const defender = this.getDefender(context);

    if (!attacker || !defender) {
      this.log('状态同步效果：攻击者或防御者不存在', 'warn');
      return results;
    }

    switch (this.mode) {
      case 'copy':
        this.copyStatus(attacker, defender, results);
        break;
      case 'swap':
        this.swapStatus(attacker, defender, results);
        break;
      case 'transfer':
        this.transferStatus(attacker, defender, results);
        break;
    }

    return results;
  }

  /**
   * 复制状态
   */
  private copyStatus(attacker: any, defender: any, results: IEffectResult[]): void {
    const source = this.direction === 'from_opponent' ? defender : attacker;
    const target = this.direction === 'from_opponent' ? attacker : defender;

    if (source.status !== undefined && source.status !== null) {
      target.status = source.status;
      target.statusTurns = source.statusTurns || 0;

      const statusName = this.getStatusName(source.status);

      results.push(
        this.createResult(
          true,
          this.direction === 'from_opponent' ? 'attacker' : 'defender',
          'status_sync',
          `复制${statusName}状态`,
          source.status,
          { mode: 'copy', direction: this.direction }
        )
      );

      this.log(`状态同步效果：复制${statusName}状态`);
    } else {
      this.log('状态同步效果：源没有异常状态', 'warn');
    }
  }

  /**
   * 交换状态
   */
  private swapStatus(attacker: any, defender: any, results: IEffectResult[]): void {
    const attackerStatus = attacker.status;
    const attackerStatusTurns = attacker.statusTurns || 0;
    const defenderStatus = defender.status;
    const defenderStatusTurns = defender.statusTurns || 0;

    // 交换状态
    attacker.status = defenderStatus;
    attacker.statusTurns = defenderStatusTurns;
    defender.status = attackerStatus;
    defender.statusTurns = attackerStatusTurns;

    const attackerStatusName = this.getStatusName(attackerStatus);
    const defenderStatusName = this.getStatusName(defenderStatus);

    results.push(
      this.createResult(
        true,
        'both',
        'status_sync',
        `交换异常状态`,
        0,
        { 
          mode: 'swap',
          attackerOldStatus: attackerStatusName,
          attackerNewStatus: defenderStatusName,
          defenderOldStatus: defenderStatusName,
          defenderNewStatus: attackerStatusName
        }
      )
    );

    this.log(`状态同步效果：交换异常状态（${attackerStatusName} ↔ ${defenderStatusName}）`);
  }

  /**
   * 转移状态
   */
  private transferStatus(attacker: any, defender: any, results: IEffectResult[]): void {
    const source = this.direction === 'to_opponent' ? attacker : defender;
    const target = this.direction === 'to_opponent' ? defender : attacker;

    if (source.status !== undefined && source.status !== null) {
      const statusName = this.getStatusName(source.status);

      // 转移状态
      target.status = source.status;
      target.statusTurns = source.statusTurns || 0;

      // 清除源的状态
      source.status = undefined;
      source.statusTurns = 0;

      results.push(
        this.createResult(
          true,
          'both',
          'status_sync',
          `转移${statusName}状态`,
          source.status,
          { mode: 'transfer', direction: this.direction }
        )
      );

      this.log(`状态同步效果：转移${statusName}状态`);
    } else {
      this.log('状态同步效果：源没有异常状态', 'warn');
    }
  }

  /**
   * 获取状态名称
   */
  private getStatusName(statusId: number | undefined): string {
    if (statusId === undefined || statusId === null) {
      return '无';
    }

    const statusNames = ['麻痹', '中毒', '烧伤', '冻伤', '睡眠', '混乱', '害怕', '疲惫'];
    return statusNames[statusId] || '未知';
  }

  public validate(params: any): boolean {
    if (!params.mode || !['copy', 'swap', 'transfer'].includes(params.mode)) {
      this.log('状态同步效果：mode必须是copy、swap或transfer', 'error');
      return false;
    }

    if (params.direction && !['to_opponent', 'from_opponent'].includes(params.direction)) {
      this.log('状态同步效果：direction必须是to_opponent或from_opponent', 'error');
      return false;
    }

    return true;
  }
}
