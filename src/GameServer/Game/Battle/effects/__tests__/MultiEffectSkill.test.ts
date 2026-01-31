/**
 * 多效果技能测试
 * 测试全属性提升等多效果技能的正确性
 */

import { EffectTrigger } from '../../EffectTrigger';
import { IBattlePet } from '../../../../../shared/models/BattleModel';
import { ISkillConfig } from '../../../../../shared/models/SkillModel';
import { EffectTiming } from '../core/EffectContext';

/**
 * 创建测试用的战斗精灵
 */
function createTestPet(id: number = 1): IBattlePet {
  return {
    id,
    name: '测试精灵',
    level: 50,
    hp: 200,
    maxHp: 200,
    attack: 100,
    defense: 100,
    spAttack: 100,
    spDefense: 100,
    speed: 100,
    skills: [10001, 10002, 10003, 10004],
    skillPP: [20, 20, 20, 20],
    catchTime: Date.now(),
    status: 0,
    statusTurns: 0,
    battleLv: [0, 0, 0, 0, 0, 0],  // 初始战斗等级
    statusDurations: new Array(20).fill(0)
  };
}

describe('多效果技能测试', () => {
  
  describe('全属性提升 - 万山绝影', () => {
    it('应该提升所有6项能力各1级', () => {
      const attacker = createTestPet(1);
      const defender = createTestPet(2);
      
      // 万山绝影技能配置
      const skill: ISkillConfig = {
        id: 21890,
        name: '万山绝影',
        category: 4,  // 变化类
        type: 8,      // 普通系
        power: 0,
        maxPP: 10,
        accuracy: 100,
        critRate: 1,
        priority: 0,
        mustHit: true,
        sideEffect: '4 4 4 4 4 4',  // 6个效果ID=4
        sideEffectArg: '0 100 1 1 100 1 2 100 1 3 100 1 4 100 1 5 100 1'
      };
      
      // 初始战斗等级应该全为0
      expect(attacker.battleLv).toEqual([0, 0, 0, 0, 0, 0]);
      
      // 触发技能效果
      const results = EffectTrigger.TriggerSkillEffect(
        skill,
        attacker,
        defender,
        0,
        EffectTiming.AFTER_DAMAGE_APPLY
      );
      
      // 应该有6个效果结果
      expect(results.length).toBe(6);
      
      // 应用效果结果
      EffectTrigger.ApplyEffectResults(results, attacker, defender);
      
      // 验证所有能力都提升了1级
      expect(attacker.battleLv).toEqual([1, 1, 1, 1, 1, 1]);
    });
    
    it('连续使用应该累加等级', () => {
      const attacker = createTestPet(1);
      const defender = createTestPet(2);
      
      const skill: ISkillConfig = {
        id: 21890,
        name: '万山绝影',
        category: 4,
        type: 8,
        power: 0,
        maxPP: 10,
        accuracy: 100,
        critRate: 1,
        priority: 0,
        mustHit: true,
        sideEffect: '4 4 4 4 4 4',
        sideEffectArg: '0 100 1 1 100 1 2 100 1 3 100 1 4 100 1 5 100 1'
      };
      
      // 使用3次
      for (let i = 0; i < 3; i++) {
        const results = EffectTrigger.TriggerSkillEffect(
          skill,
          attacker,
          defender,
          0,
          EffectTiming.AFTER_DAMAGE_APPLY
        );
        EffectTrigger.ApplyEffectResults(results, attacker, defender);
      }
      
      // 验证等级累加到3
      expect(attacker.battleLv).toEqual([3, 3, 3, 3, 3, 3]);
    });
    
    it('等级不应超过+6上限', () => {
      const attacker = createTestPet(1);
      const defender = createTestPet(2);
      
      const skill: ISkillConfig = {
        id: 21890,
        name: '万山绝影',
        category: 4,
        type: 8,
        power: 0,
        maxPP: 10,
        accuracy: 100,
        critRate: 1,
        priority: 0,
        mustHit: true,
        sideEffect: '4 4 4 4 4 4',
        sideEffectArg: '0 100 1 1 100 1 2 100 1 3 100 1 4 100 1 5 100 1'
      };
      
      // 使用10次（远超上限）
      for (let i = 0; i < 10; i++) {
        const results = EffectTrigger.TriggerSkillEffect(
          skill,
          attacker,
          defender,
          0,
          EffectTiming.AFTER_DAMAGE_APPLY
        );
        EffectTrigger.ApplyEffectResults(results, attacker, defender);
      }
      
      // 验证等级上限为6
      expect(attacker.battleLv).toEqual([6, 6, 6, 6, 6, 6]);
    });
  });
  
  describe('部分属性提升 - 天马行空', () => {
    it('应该提升特攻、防御、特防、速度各1级', () => {
      const attacker = createTestPet(1);
      const defender = createTestPet(2);
      
      // 天马行空技能配置
      const skill: ISkillConfig = {
        id: 21273,
        name: '天马行空',
        category: 4,
        type: 8,
        power: 0,
        maxPP: 10,
        accuracy: 100,
        critRate: 1,
        priority: 0,
        mustHit: true,
        sideEffect: '4 4 4 4',  // 4个效果ID=4
        sideEffectArg: '2 100 1 1 100 1 3 100 1 4 100 1'  // 特攻、防御、特防、速度
      };
      
      // 触发技能效果
      const results = EffectTrigger.TriggerSkillEffect(
        skill,
        attacker,
        defender,
        0,
        EffectTiming.AFTER_DAMAGE_APPLY
      );
      
      // 应该有4个效果结果
      expect(results.length).toBe(4);
      
      // 应用效果结果
      EffectTrigger.ApplyEffectResults(results, attacker, defender);
      
      // 验证：攻击(0)不变，防御(1)+1，特攻(2)+1，特防(3)+1，速度(4)+1，命中(5)不变
      expect(attacker.battleLv).toEqual([0, 1, 1, 1, 1, 0]);
    });
  });
  
  describe('单效果技能兼容性', () => {
    it('单效果技能应该正常工作', () => {
      const attacker = createTestPet(1);
      const defender = createTestPet(2);
      
      // 单效果技能（只提升攻击）
      const skill: ISkillConfig = {
        id: 10001,
        name: '剑舞',
        category: 4,
        type: 8,
        power: 0,
        maxPP: 20,
        accuracy: 100,
        critRate: 1,
        priority: 0,
        mustHit: true,
        sideEffect: 4,  // 单个数字
        sideEffectArg: '0 100 2'  // 攻击+2
      };
      
      // 触发技能效果
      const results = EffectTrigger.TriggerSkillEffect(
        skill,
        attacker,
        defender,
        0,
        EffectTiming.AFTER_DAMAGE_APPLY
      );
      
      // 应该有1个效果结果
      expect(results.length).toBe(1);
      
      // 应用效果结果
      EffectTrigger.ApplyEffectResults(results, attacker, defender);
      
      // 验证只有攻击提升了2级
      expect(attacker.battleLv).toEqual([2, 0, 0, 0, 0, 0]);
    });
  });
  
  describe('参数解析测试', () => {
    it('应该正确解析多效果参数序列', () => {
      const attacker = createTestPet(1);
      const defender = createTestPet(2);
      
      // 测试不同等级的提升
      const skill: ISkillConfig = {
        id: 99999,
        name: '测试技能',
        category: 4,
        type: 8,
        power: 0,
        maxPP: 10,
        accuracy: 100,
        critRate: 1,
        priority: 0,
        mustHit: true,
        sideEffect: '4 4 4',  // 3个效果
        sideEffectArg: '0 100 1 1 100 2 2 100 3'  // 攻击+1, 防御+2, 特攻+3
      };
      
      const results = EffectTrigger.TriggerSkillEffect(
        skill,
        attacker,
        defender,
        0,
        EffectTiming.AFTER_DAMAGE_APPLY
      );
      
      EffectTrigger.ApplyEffectResults(results, attacker, defender);
      
      // 验证不同的提升等级
      expect(attacker.battleLv[0]).toBe(1);  // 攻击+1
      expect(attacker.battleLv[1]).toBe(2);  // 防御+2
      expect(attacker.battleLv[2]).toBe(3);  // 特攻+3
      expect(attacker.battleLv[3]).toBe(0);  // 特防不变
      expect(attacker.battleLv[4]).toBe(0);  // 速度不变
      expect(attacker.battleLv[5]).toBe(0);  // 命中不变
    });
  });
});
