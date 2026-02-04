import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { IEffectContext, IEffectResult } from '../../core/EffectContext';
import { AtomicEffectType } from '../core/IAtomicEffect';

/**
 * 击败转移对方强化参数接口
 */
export interface IKoTransferBuffParams {
  /** 是否只转移正面效果 */
  onlyPositive?: boolean;
}

/**
 * 击败转移对方强化效果
 * 
 * 击败对手时，将对手的能力提升转移到自己身上
 * 
 * @category Special
 */
export class KoTransferBuff extends BaseAtomicEffect {
  private onlyPositive: boolean;

  constructor(params: IKoTransferBuffParams) {
    super(AtomicEffectType.SPECIAL, 'KoTransferBuff', []);
    this.onlyPositive = params.onlyPositive !== false;
  }

  public validate(params: any): boolean {
    return true;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const { attacker, defender, damage } = context;

    // 检查是否击败对手
    const defenderHp = defender.hp;
    const willKo = damage !== undefined && damage >= defenderHp;

    if (!willKo) {
      return [this.createResult(
        false,
        'attacker',
        'ko_transfer_buff',
        '未击败对手'
      )];
    }

    let transferredCount = 0;

    // 转移能力提升
    if (defender.battleLevels && attacker.battleLevels) {
      for (let i = 0; i < defender.battleLevels.length; i++) {
        const defenderLevel = defender.battleLevels[i];
        
        // 只转移正面效果
        if (this.onlyPositive && defenderLevel > 0) {
          attacker.battleLevels[i] = Math.min(6, attacker.battleLevels[i] + defenderLevel);
          transferredCount++;
        } else if (!this.onlyPositive && defenderLevel !== 0) {
          attacker.battleLevels[i] = Math.max(-6, Math.min(6, attacker.battleLevels[i] + defenderLevel));
          transferredCount++;
        }
      }
    }

    return [this.createResult(
      transferredCount > 0,
      'attacker',
      'ko_transfer_buff',
      `击败转移强化（${transferredCount}个能力）`,
      transferredCount,
      {
        transferredCount,
        onlyPositive: this.onlyPositive
      }
    )];
  }
}
