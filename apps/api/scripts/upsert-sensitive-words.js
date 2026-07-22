/**
 * 启动时幂等同步基础敏感词（生产库已有数据时 seed 不会重跑，靠此脚本补齐新词）。
 */
const { PrismaClient } = require('@prisma/client');

const WORDS = [
  '色情',
  '暴力',
  '血腥',
  '毒品',
  '赌博',
  '诈骗',
  '吃人',
  '恐怖',
  '惊悚',
  '杀人',
  '僵尸',
  '恶魔',
  '自杀',
  '自残',
];

async function main() {
  const prisma = new PrismaClient();
  try {
    for (const word of WORDS) {
      await prisma.sensitiveWord.upsert({
        where: { word },
        create: { word, severity: 3, enabled: true },
        update: { enabled: true },
      });
    }
    console.log(`[sensitive-words] synced ${WORDS.length} words`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[sensitive-words] failed:', err);
  process.exit(1);
});
