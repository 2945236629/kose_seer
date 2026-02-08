import { IClientSession, IHandler } from '../../IHandler';
import { HeadInfo } from '../../../../../shared/protocol';
import { Opcode, InjectType } from '../../../../../shared/decorators';
import { CommandID } from '../../../../../shared/protocol/CommandID';
import { ChallengeBossReqProto } from '../../../../../shared/proto/packets/req/battle/ChallengeBossReqProto';
import { Logger } from '../../../../../shared/utils/Logger';

/**
 * [CMD: 2411 CHALLENGE_BOSS] 挑战BOSS
 */
@Opcode(CommandID.CHALLENGE_BOSS, InjectType.NONE)
export class ChallengeBossHandler implements IHandler {
  public async Handle(session: IClientSession, head: HeadInfo, body: Buffer): Promise<void> {
    const player = session.Player;
    if (!player) {
      return;
    }

    // 解析请求
    const req = new ChallengeBossReqProto();
    if (body.length > 0) {
      req.deserialize(body);
    }

    Logger.Info(
      `[ChallengeBossHandler] 玩家挑战BOSS: UserID=${player.Uid}, ` +
      `BossID=${req.bossId}`
    );

    // 调用 BattleManager 处理
    await player.BattleManager.HandleChallengeBoss(req.bossId);
  }
}
