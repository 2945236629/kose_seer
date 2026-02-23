import { CommandMetaRegistry } from './CommandMetaRegistry';
import { loginMeta } from './login.meta';
import { serverMeta } from './server.meta';
import { chatMeta } from './chat.meta';
import { mapMeta } from './map.meta';
import { petMeta } from './pet.meta';
import { systemMeta } from './system.meta';
import { itemMeta } from './item.meta';
import { socialMeta } from './social.meta';
import { nonoMeta } from './nono.meta';
import { battleMeta } from './battle.meta';

// 导出类型和接口
export * from './CommandMetaRegistry';

// 创建全局注册表实例
export const CmdMeta = new CommandMetaRegistry();

// 注册所有元数据
CmdMeta.RegisterBatch(loginMeta);
CmdMeta.RegisterBatch(serverMeta);
CmdMeta.RegisterBatch(chatMeta);
CmdMeta.RegisterBatch(mapMeta);
CmdMeta.RegisterBatch(petMeta);
CmdMeta.RegisterBatch(systemMeta);
CmdMeta.RegisterBatch(itemMeta);
CmdMeta.RegisterBatch(socialMeta);
CmdMeta.RegisterBatch(nonoMeta);
CmdMeta.RegisterBatch(battleMeta);

