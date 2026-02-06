const fs = require('fs');

// 读取 JSON 文件
const jsonData = JSON.parse(fs.readFileSync('config/data/json/skill_effects_v2.json', 'utf8'));
const jsonEffectIds = new Set(jsonData.effects.map(e => e.effectId));

// 从 boss所有特性.txt 中提取的特性ID
const bossEffectIds = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
  31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 50,
  51, 52, 53, 54, 55, 56, 57, 58, 59, 60,
  61, 62, 63, 64, 65, 66, 67, 68, 69, 70,
  71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
  81, 82, 83, 97, 98, 185, 205, 772
];

console.log('=== BOSS特性对比分析 ===\n');
console.log(`JSON文件中的特性数量: ${jsonEffectIds.size}`);
console.log(`BOSS特性文件中的特性数量: ${bossEffectIds.length}`);
console.log(`JSON中的特性ID: ${Array.from(jsonEffectIds).sort((a,b)=>a-b).join(', ')}\n`);

// 检查哪些BOSS特性在JSON中
const inJson = [];
const notInJson = [];

for (const id of bossEffectIds) {
  if (jsonEffectIds.has(id)) {
    inJson.push(id);
  } else {
    notInJson.push(id);
  }
}

console.log(`\n在JSON中的BOSS特性 (${inJson.length}个):`);
console.log(inJson.join(', '));

console.log(`\n不在JSON中的BOSS特性 (${notInJson.length}个):`);
console.log(notInJson.join(', '));

console.log(`\n覆盖率: ${(inJson.length / bossEffectIds.length * 100).toFixed(2)}%`);

// 显示缺失的特性详情
if (notInJson.length > 0) {
  console.log('\n=== 缺失的特性详情 ===');
  const bossText = fs.readFileSync('../boss所有特性.txt', 'utf8');
  const lines = bossText.split('\n');
  
  for (const id of notInJson.slice(0, 10)) { // 只显示前10个
    const regex = new RegExp(`^${id}\\.\\s+(.+)$`, 'm');
    const match = bossText.match(regex);
    if (match) {
      console.log(`\n${id}. ${match[1]}`);
    }
  }
  
  if (notInJson.length > 10) {
    console.log(`\n... 还有 ${notInJson.length - 10} 个特性未显示`);
  }
}
