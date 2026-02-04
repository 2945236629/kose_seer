import { CompositeEffect } from './composite/CompositeEffect';
import { IAtomicEffectParams } from './atomic/core/IAtomicEffect';
import { atomicEffectFactory } from './atomic/core/AtomicEffectFactory';
import { EffectTiming } from './core/EffectContext';
import { GameConfig } from '../../../../shared/config/game/GameConfig';
import { Logger } from '../../../../shared/utils';

/**
 * 效果工厂
 * 从JSON配置创建CompositeEffect实例
 */
export class EffectFactory {
  private static instance: EffectFactory;
  private effectCache: Map<number, CompositeEffect>;

  private constructor() {
    this.effectCache = new Map();
  }

  public static getInstance(): EffectFactory {
    if (!EffectFactory.instance) {
      EffectFactory.instance = new EffectFactory();
    }
    return EffectFactory.instance;
  }

  /**
   * 根据effectId创建效果
   * @param effectId 效果ID
   */
  public createEffect(effectId: number): CompositeEffect | null {
    // 检查缓存
    if (this.effectCache.has(effectId)) {
      return this.effectCache.get(effectId)!;
    }

    // 从配置获取效果定义
    const effectConfig = GameConfig.GetEffectById(effectId);
    if (!effectConfig) {
      Logger.Warn(`[EffectFactory] 效果配置不存在: effectId=${effectId}`);
      return null;
    }

    try {
      // 解析timing
      const timings = this.parseTimings(effectConfig.timing);

      // 解析原子效果组合
      const atomParams = this.parseAtomicComposition(effectConfig);
      if (atomParams.length === 0) {
        Logger.Warn(`[EffectFactory] 效果 ${effectId} 没有原子效果组合配置`);
        return null;
      }

      // 创建原子效果实例
      const atoms = atomicEffectFactory.createBatch(atomParams);
      if (atoms.length === 0) {
        Logger.Warn(`[EffectFactory] 效果 ${effectId} 创建原子效果失败`);
        return null;
      }

      // 创建组合效果
      const effect = new CompositeEffect(
        effectId,
        effectConfig.name,
        timings,
        atoms,
        atomParams
      );

      // 缓存效果
      this.effectCache.set(effectId, effect);

      Logger.Info(`[EffectFactory] 创建效果: ${effectId} - ${effectConfig.name}`);

      return effect;
    } catch (error) {
      Logger.Error(`[EffectFactory] 创建效果失败: effectId=${effectId}`, error as Error);
      return null;
    }
  }

  /**
   * 批量创建效果
   */
  public createEffects(effectIds: number[]): CompositeEffect[] {
    const effects: CompositeEffect[] = [];

    for (const effectId of effectIds) {
      const effect = this.createEffect(effectId);
      if (effect) {
        effects.push(effect);
      }
    }

    return effects;
  }

  /**
   * 解析timing字符串数组为EffectTiming枚举数组
   */
  private parseTimings(timings: string[]): EffectTiming[] {
    const result: EffectTiming[] = [];

    for (const timing of timings) {
      // 将大写下划线格式转换为小写下划线格式
      const timingKey = timing.toLowerCase() as EffectTiming;
      result.push(timingKey);
    }

    return result;
  }

  /**
   * 解析原子效果组合
   * TODO: 目前返回空数组，需要在JSON中添加atomicComposition字段
   */
  private parseAtomicComposition(effectConfig: any): IAtomicEffectParams[] {
    // 检查是否有atomicComposition字段
    if (effectConfig.atomicComposition) {
      return this.parseAtomicCompositionFromConfig(effectConfig.atomicComposition);
    }

    // 如果没有配置，返回空数组
    // TODO: 后续需要为所有效果添加atomicComposition配置
    Logger.Debug(`[EffectFactory] 效果 ${effectConfig.effectId} 缺少 atomicComposition 配置`);
    return [];
  }

  /**
   * 从配置解析原子效果组合
   */
  private parseAtomicCompositionFromConfig(composition: any): IAtomicEffectParams[] {
    const params: IAtomicEffectParams[] = [];

    if (composition.type === 'composite' && Array.isArray(composition.atoms)) {
      for (const atomConfig of composition.atoms) {
        params.push(atomConfig as IAtomicEffectParams);
      }
    }

    return params;
  }

  /**
   * 清空缓存
   */
  public clearCache(): void {
    this.effectCache.clear();
    Logger.Info('[EffectFactory] 清空效果缓存');
  }

  /**
   * 获取缓存大小
   */
  public getCacheSize(): number {
    return this.effectCache.size;
  }
}

// 导出单例访问方法
export const effectFactory = EffectFactory.getInstance();
