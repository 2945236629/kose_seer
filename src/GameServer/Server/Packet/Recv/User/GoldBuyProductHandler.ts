import { IClientSession, IHandler } from '../../IHandler';
import { HeadInfo } from '../../../../../shared/protocol';
import { Opcode, InjectType } from '../../../../../shared/decorators';
import { CommandID } from '../../../../../shared/protocol/CommandID';
import { GoldBuyProductReqProto } from '../../../../../shared/proto/packets/req/user/GoldBuyProductReqProto';
import { PacketGoldBuyProduct } from '../../Send/User/PacketGoldBuyProduct';
import { PacketEmpty } from '../../Send/PacketEmpty';
import { Logger } from '../../../../../shared/utils';
import { GameConfig } from '../../../../../shared/config/game/GameConfig';
import { ItemSystem } from '../../../../Game/Item/ItemSystem';

/**
 * [CMD: 1104 GOLD_BUY_PRODUCT] 使用金豆购买商品
 */
@Opcode(CommandID.GOLD_BUY_PRODUCT, InjectType.NONE)
export class GoldBuyProductHandler implements IHandler {
  public async Handle(session: IClientSession, head: HeadInfo, body: Buffer): Promise<void> {
    const player = session.Player;
    if (!player) return;

    const req = new GoldBuyProductReqProto();
    req.deserialize(body);

    Logger.Info(
      `[GoldBuyProductHandler] UserID=${player.Data.userID}, ProductId=${req.productId}, Count=${req.count}`
    );

    try {
      const productId = req.productId;
      const count = req.count;

      // 验证数量
      if (count <= 0) {
        Logger.Warn(`[GoldBuyProductHandler] 购买数量无效: Count=${count}`);
        await player.SendPacket(new PacketEmpty(CommandID.GOLD_BUY_PRODUCT).setResult(5001));
        return;
      }

      // 获取商品配置
      const product = GameConfig.GetProductById(productId);
      if (!product) {
        Logger.Warn(`[GoldBuyProductHandler] 商品不存在: ProductId=${productId}`);
        await player.SendPacket(new PacketEmpty(CommandID.GOLD_BUY_PRODUCT).setResult(5001));
        return;
      }

      // 验证物品存在（如果商品关联了物品）
      if (product.itemID > 0 && !ItemSystem.Exists(product.itemID)) {
        Logger.Warn(`[GoldBuyProductHandler] 商品关联的物品不存在: ItemId=${product.itemID}`);
        await player.SendPacket(new PacketEmpty(CommandID.GOLD_BUY_PRODUCT).setResult(5001));
        return;
      }

      // 检查唯一性物品
      if (product.itemID > 0 && ItemSystem.IsUniqueItem(product.itemID)) {
        if (player.ItemManager.ItemData.HasItem(product.itemID)) {
          Logger.Warn(`[GoldBuyProductHandler] 唯一物品已拥有: ItemId=${product.itemID}`);
          await player.SendPacket(new PacketEmpty(CommandID.GOLD_BUY_PRODUCT).setResult(103203));
          return;
        }
      }

      // 检查是否VIP
      const isVip = player.Data.vip > 0;

      // 计算价格（考虑VIP折扣）
      let unitPrice = product.price;
      if (isVip && product.vip > 0 && product.vip < 1) {
        unitPrice = Math.floor(product.price * product.vip);
      }
      const totalCost = unitPrice * count;

      // 检查金豆是否足够
      const currentGold = player.Data.gold || 0;
      
      if (currentGold < totalCost) {
        Logger.Warn(
          `[GoldBuyProductHandler] 金豆不足: 需要=${totalCost}, 拥有=${currentGold}`
        );
        await player.SendPacket(new PacketEmpty(CommandID.GOLD_BUY_PRODUCT).setResult(10016));
        return;
      }

      // 扣除金豆
      player.Data.gold = currentGold - totalCost;

      // 添加物品
      if (product.itemID > 0) {
        player.ItemManager.ItemData.AddItem(product.itemID, count, 0x057E40);
        Logger.Info(
          `[GoldBuyProductHandler] 添加物品: ItemId=${product.itemID}, Count=${count}`
        );
      }

      // 赠送赛尔豆（注意：配置中的 gold 字段表示赠送的赛尔豆数量）
      if (product.gold > 0) {
        const giftCoins = product.gold * count;
        player.Data.coins += giftCoins;
        Logger.Info(
          `[GoldBuyProductHandler] 赠送赛尔豆: ${giftCoins}, 新余额=${player.Data.coins}`
        );
      }

      // 发送成功响应
      await player.SendPacket(new PacketGoldBuyProduct(totalCost, player.Data.gold || 0));

      Logger.Info(
        `[GoldBuyProductHandler] 购买成功: UserID=${player.Data.userID}, ` +
        `ProductId=${productId}, ItemId=${product.itemID}, Count=${count}, ` +
        `UnitPrice=${unitPrice}, TotalCost=${totalCost}, CoinsGift=${product.gold * count}, ` +
        `RemainingGold=${player.Data.gold}, VIP=${isVip}, Discount=${isVip && product.vip ? product.vip : 1}`
      );
    } catch (error) {
      Logger.Error(`[GoldBuyProductHandler] 处理失败`, error as Error);
      await player.SendPacket(new PacketEmpty(CommandID.GOLD_BUY_PRODUCT).setResult(5000));
    }
  }
}
