import { BaseAtomicEffect } from '../core/BaseAtomicEffect';
import { AtomicEffectType } from '../core/IAtomicEffect';
import { IEffectContext, IEffectResult, EffectTiming } from '../../core/EffectContext';

/**
 * 必中效果参数接口
 */
export interface ISureHitParams {
  type: AtomicEffectType.SPECIAL;
  specialType: 'sure_hit';
  duration: number;             // 持续回合数
  ignoreEvasion?: boolean;      // 是否无视闪避
}

/**
 * 必中原子效果
 * 在X回合内，攻击必定命中
 * 
 * 用途：
 * - Effect_81: 持续必中（3回合）
 * 
 * 特性：
 * - 设置命中率为100%
 * - 可以无视对方的闪避提升
 * - 持续多回合
 * 
 * @example
 * // 3回合内攻击必定命中
 * {
 *   type: 'special',
 *   specialType: 'sure_hit',
 *   duration: 3,
 *   ignoreEvasion: true
 * }
 * 
 * @category Modifier
 */
export class SureHit extends BaseAtomicEffect {
  private params: ISureHitParams;

  constructor(params: ISureHitParams) {
    super(AtomicEffectType.SPECIAL, 'Sure Hit', [EffectTiming.BEFORE_HIT_CHECK]);
    this.params = params;
  }

  public execute(context: IEffectContext): IEffectResult[] {
    const results: IEffectResult[] = [];
    
    // 设置必中标志
    context.mustHit = true;
    
    // 设置命中率为100%
    if (context.skill) {
      context.skill.accuracy = 100;
    }
    context.hitRateModifier = 100;
    
    // 如果无视闪避，可以在这里添加额外逻辑
    if (this.params.ignoreEvasion) {
      // 存储到effectData供命中判定使用
      if (!context.effectData) context.effectData = {};
      context.effectData.ignoreEvasion = true;
    }
    
    results.push(this.createResult(
      true,
      'attacker',
      'sure_hit',
      '必中状态：攻击必定命中',
      100,
      { ignoreEvasion: this.params.ignoreEvasion }
    ));
    
    this.log(`必中效果: 攻击必定命中${this.params.ignoreEvasion ? '（无视闪避）' : ''}`);
    
    return results;
  }

  public validate(params: any): boolean {
    return params &&
           params.type === AtomicEffectType.SPECIAL &&
           params.specialType === 'sure_hit' &&
           typeof params.duration === 'number' &&
           params.duration > 0;
  }
}
