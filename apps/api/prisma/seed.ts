import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { customAlphabet } from 'nanoid';

const prisma = new PrismaClient();
const nano = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);

async function main() {
  console.log('🌱 Seeding AI Camp demo data...');
  const passwordHash = await bcrypt.hash('123456', 10);

  // ---- Users ----
  async function upsertUser(input: {
    username: string; role: any; displayName: string; email?: string;
  }) {
    return prisma.user.upsert({
      where: { username: input.username },
      create: { ...input, passwordHash, passwordPlain: '123456' },
      update: { displayName: input.displayName, role: input.role, passwordPlain: '123456' },
    });
  }

  const admin = await upsertUser({ username: 'admin', role: 'admin', displayName: '系统管理员' });
  const teacher1 = await upsertUser({ username: 'teacher1', role: 'teacher', displayName: '王老师' });
  const teacher2 = await upsertUser({ username: 'teacher2', role: 'teacher', displayName: '李老师' });
  const parent1 = await upsertUser({ username: 'parent1', role: 'parent', displayName: '小爱家长' });
  const alice = await upsertUser({ username: 'alice', role: 'student', displayName: '小爱' });
  const bob = await upsertUser({ username: 'bob', role: 'student', displayName: '小博' });
  const charlie = await upsertUser({ username: 'charlie', role: 'student', displayName: '小超' });
  const dora = await upsertUser({ username: 'dora', role: 'student', displayName: '小朵' });

  // ---- Student profile / homepage / quota for students ----
  for (const s of [alice, bob, charlie, dora]) {
    await prisma.studentProfile.upsert({
      where: { userId: s.id },
      create: { userId: s.id, nickname: s.displayName, bio: `大家好，我是${s.displayName}！` },
      update: {},
    });
    await prisma.quotaAccount.upsert({
      where: { userId: s.id },
      create: { userId: s.id, balance: 9999, monthly: 9999 },
      update: {},
    });
    await prisma.studentHomepage.upsert({
      where: { userId: s.id },
      create: {
        userId: s.id,
        title: `${s.displayName} 的 AI 作品主页`,
        intro: `这是 ${s.displayName} 在 AI 训练营的成长展示！`,
        slug: `${s.username}-${nano()}`,
      },
      update: {},
    });
  }

  // ---- Parent binding ----
  await prisma.parentStudentRelation.upsert({
    where: { parentId_studentId: { parentId: parent1.id, studentId: alice.id } },
    create: { parentId: parent1.id, studentId: alice.id, relation: 'parent' },
    update: {},
  });

  // ---- Class / group ----
  const klass = await prisma.class.upsert({
    where: { code: 'summer-2026-a' },
    create: { name: '2026 暑期 A 班', code: 'summer-2026-a', description: 'AI 创作与网页实践训练营 A 班', ownerId: teacher1.id },
    update: {},
  });

  for (const u of [teacher1, alice, bob, charlie, dora]) {
    await prisma.classMember.upsert({
      where: { classId_userId: { classId: klass.id, userId: u.id } },
      create: { classId: klass.id, userId: u.id, role: u.role },
      update: {},
    });
  }

  const groupA = await prisma.group.upsert({
    where: { id: 'seed-group-a' },
    create: { id: 'seed-group-a', classId: klass.id, name: '红色小组', description: '热情似火的红色小组' },
    update: {},
  });
  const groupB = await prisma.group.upsert({
    where: { id: 'seed-group-b' },
    create: { id: 'seed-group-b', classId: klass.id, name: '蓝色小组', description: '冷静睿智的蓝色小组' },
    update: {},
  });
  for (const [g, members] of [[groupA, [alice, bob]], [groupB, [charlie, dora]]] as const) {
    for (const u of members) {
      await prisma.groupMember.upsert({
        where: { groupId_userId: { groupId: g.id, userId: u.id } },
        create: { groupId: g.id, userId: u.id },
        update: {},
      });
    }
  }

  // ---- Tasks ----
  const taskDefs = [
    { title: '第一课作业：用 AI 写一段自我介绍', type: 'text' as const, description: '用 AI 帮你写一段 100 字以内的自我介绍，并保存到素材库。' },
    { title: '第二课作业：让 AI 画一张你心目中的暑假', type: 'image' as const, description: '描述你心目中的暑假画面，保存最好看的一张图。' },
    { title: '第三课作业：制作一个简短视频', type: 'video' as const, description: '用文字描述生成一个 5~8 秒的短视频。' },
    { title: '第四课作业：搭建你的第一个网页', type: 'web' as const, description: '使用网页工作台生成一个属于你自己的小网页，并发布。' },
    { title: '综合作业：提交你最满意的 AI 作品集', type: 'mixed' as const, description: '把你的得意作品组合成一个网页主页提交。' },
  ];
  for (const def of taskDefs) {
    await prisma.task.upsert({
      where: { id: `seed-task-${def.title.slice(0, 3)}` },
      create: { id: `seed-task-${def.title.slice(0, 3)}`, ...def, classId: klass.id, ownerId: teacher1.id },
      update: {},
    });
  }

  // ---- AI provider records ----
  const providerMock = await prisma.aiProvider.upsert({
    where: { name: 'mock' },
    create: { name: 'mock', displayName: '安全演示 Mock', type: 'mock', status: 'active' },
    update: { status: 'active' },
  });
  const providerArk = await prisma.aiProvider.upsert({
    where: { name: 'volcengine-ark' },
    create: {
      name: 'volcengine-ark', displayName: '火山方舟 Volcengine Ark',
      type: 'volcengine-ark',
      baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
      authKeyRef: 'ARK_API_KEY',
      status: 'active',
    },
    update: { status: 'active' },
  });
  const arkModels = [
    { code: 'doubao-seed-2-1-pro-260628', displayName: '豆包 2.1 Pro（多模态/网页）', capability: 'multimodal' as const, cost: 2, enabled: true },
    { code: 'doubao-seed-2-0-pro-260215', displayName: '豆包多模态 Pro 2.0', capability: 'multimodal' as const, cost: 2, enabled: true },
    { code: 'doubao-seed-evolving', displayName: '豆包 Seed Evolving（长上下文）', capability: 'multimodal' as const, cost: 3, enabled: false },
    { code: 'doubao-seedance-2-0-mini-260615', displayName: '豆包 Seedance 2.0 Mini 视频', capability: 'video' as const, cost: 8, enabled: true },
    { code: 'doubao-seedance-2-0-260128', displayName: '豆包 Seedance 视频（旧）', capability: 'video' as const, cost: 8, enabled: false },
    { code: 'doubao-seedream-5-0-260128', displayName: '豆包 Seedream 5.0 文生图', capability: 'image' as const, cost: 3, enabled: true },
    { code: 'doubao-seedream-3-0-t2i-250415', displayName: '豆包 Seedream 3.0 文生图（旧）', capability: 'image' as const, cost: 3, enabled: true },
  ];
  for (const m of arkModels) {
    await prisma.aiModel.upsert({
      where: { providerId_code: { providerId: providerArk.id, code: m.code } },
      create: { providerId: providerArk.id, code: m.code, displayName: m.displayName, capability: m.capability, cost: m.cost, enabled: m.enabled },
      update: { displayName: m.displayName, capability: m.capability, enabled: m.enabled },
    });
  }
  // mock models
  const mockCaps = ['text', 'image', 'video', 'web', 'poster', 'ppt', 'multimodal', 'code'] as const;
  for (const cap of mockCaps) {
    await prisma.aiModel.upsert({
      where: { providerId_code: { providerId: providerMock.id, code: `mock-${cap}` } },
      create: { providerId: providerMock.id, code: `mock-${cap}`, displayName: `演示 ${cap}`, capability: cap as any, cost: 1 },
      update: {},
    });
  }

  // ---- Prompt templates ----
  const templates = [
    { name: '我的自我介绍', category: 'text' as const, prompt: '请用 100 字写一段活泼的小朋友自我介绍，包含：名字、兴趣、最喜欢的事情。', tags: ['儿童', '介绍'] },
    { name: '续写童话', category: 'text' as const, prompt: '请续写一个关于森林精灵的童话故事，要有正能量。', tags: ['故事'] },
    { name: '梦中宇宙', category: 'image' as const, prompt: '一个充满星星和糖果的梦幻宇宙，柔和色彩，卡通风格。', tags: ['插画', '宇宙'] },
    { name: '海报：暑假画展', category: 'poster' as const, prompt: '请生成一张「暑假儿童画展」的海报，主色橙黄色，活泼可爱风格。', tags: ['海报'] },
    { name: 'PPT：我的暑假学习计划', category: 'ppt' as const, prompt: '帮我做一个 5 页 PPT：暑假学习计划。', tags: ['PPT'] },
    { name: '网页：我的小宠物展示', category: 'web' as const, prompt: '帮我做一个介绍我家小猫的网页，含一段介绍文字、3 张照片占位、一张时间线。', tags: ['网页'] },
    { name: '视频：动起来的水彩花朵', category: 'video' as const, prompt: '一朵水彩风格的花朵在镜头前慢慢绽放，背景柔和。', tags: ['视频'] },
    { name: '图文理解：图片里有什么', category: 'mixed' as const, prompt: '请观察这张图片，告诉我图片里有哪些可爱的元素。', tags: ['图文'] },
  ];
  for (const t of templates) {
    const { tags, ...tpl } = t;
    await prisma.promptTemplate.upsert({
      where: { id: `seed-tpl-${t.name}` },
      create: { id: `seed-tpl-${t.name}`, ...tpl, tags: JSON.stringify(tags), builtIn: true },
      update: {},
    });
  }

  // ---- Sensitive words ----
  const baseWords = ['色情', '暴力', '血腥', '毒品', '赌博', '诈骗', '吃人', '恐怖', '惊悚', '杀人', '僵尸', '恶魔', '自杀', '自残'];
  for (const w of baseWords) {
    await prisma.sensitiveWord.upsert({
      where: { word: w },
      create: { word: w, severity: 3 },
      update: {},
    });
  }

  // ---- A demo asset & web project for alice ----
  await prisma.asset.upsert({
    where: { id: 'seed-asset-alice-text' },
    create: {
      id: 'seed-asset-alice-text',
      ownerId: alice.id,
      type: 'text',
      title: '小爱的第一段 AI 文字',
      content: '我叫小爱，今年 9 岁，喜欢画画和小动物。我希望长大成为一个发明家！',
      meta: JSON.stringify({ provider: 'mock', model: 'mock-text' }),
    },
    update: { ownerId: alice.id },
  });

  await prisma.asset.upsert({
    where: { id: 'seed-asset-alice-image' },
    create: {
      id: 'seed-asset-alice-image',
      ownerId: alice.id,
      type: 'image',
      title: '梦中的小猫',
      url: 'https://picsum.photos/seed/alice-cat/800/600',
      thumbnailUrl: 'https://picsum.photos/seed/alice-cat/400/300',
      meta: JSON.stringify({ provider: 'mock' }),
    },
    update: { ownerId: alice.id },
  });

  const webProj = await prisma.webProject.upsert({
    where: { id: 'seed-web-alice' },
    create: {
      id: 'seed-web-alice',
      ownerId: alice.id,
      title: '小爱的第一个网页',
      description: '小爱用 AI 制作的演示网页',
      currentVersion: 1,
      status: 'published',
      slug: 'alice-demo',
      versions: {
        create: {
          version: 1,
          html: `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>小爱的小宇宙</title><style>body{margin:0;font-family:system-ui;background:linear-gradient(135deg,#fef9c3,#fce7f3);min-height:100vh;display:flex;align-items:center;justify-content:center;}main{background:white;border-radius:24px;padding:40px;max-width:560px;text-align:center;box-shadow:0 16px 48px rgba(0,0,0,0.08);}h1{color:#ec4899;margin:0 0 12px;font-size:32px;}img{max-width:100%;border-radius:16px;margin-top:16px;}</style></head><body><main><h1>🌟 你好，我是小爱！</h1><p>欢迎来到我的 AI 暑假作品集，这是我用 AI 工具做的第一个网页。</p><img src="https://picsum.photos/seed/alice-cat/600/400" alt="梦中的小猫" /></main></body></html>`,
          css: '',
          js: '',
          prompt: '帮我做一个介绍自己的小网页',
        },
      },
    },
    update: {},
    include: { versions: true },
  });
  await prisma.webProject.update({
    where: { id: webProj.id },
    data: { publishedVersionId: webProj.versions[0].id },
  });

  // ---- Demo conversation (teacher1 <-> parent1, about alice) ----
  const demoConv = await prisma.conversation.upsert({
    where: {
      parentId_teacherId_studentId: { parentId: parent1.id, teacherId: teacher1.id, studentId: alice.id },
    },
    create: {
      parentId: parent1.id, teacherId: teacher1.id, studentId: alice.id,
      parentUnread: 1, teacherUnread: 0,
    },
    update: {},
  });
  const existingMsg = await prisma.message.findFirst({ where: { conversationId: demoConv.id } });
  if (!existingMsg) {
    await prisma.message.createMany({
      data: [
        { conversationId: demoConv.id, senderId: teacher1.id, body: '您好，我是小爱的王老师，欢迎来到 AI 训练营！这里可以随时和我交流孩子在课程里的进步～' },
        { conversationId: demoConv.id, senderId: teacher1.id, body: '小爱今天用 AI 写了一段自我介绍，挺有想法的，您可以在主页里看到。' },
      ],
    });
  }

  // Plaza item
  await prisma.plazaItem.upsert({
    where: { id: 'seed-plaza-1' },
    create: {
      id: 'seed-plaza-1',
      title: '小爱的小宇宙',
      summary: '一个用 AI 做的可爱网页作品',
      coverUrl: 'https://picsum.photos/seed/alice-cat/600/400',
      targetType: 'web_project',
      targetId: 'alice-demo', // store the publish slug so /p/{slug} works
      studentId: alice.id,
      featured: true,
    },
    update: {},
  });

  console.log('✅ Seed completed!');
  console.log('Demo accounts (password = 123456):');
  console.log('  admin    - 系统管理员');
  console.log('  teacher1 - 王老师');
  console.log('  parent1  - 小爱家长 (绑定学生：alice)');
  console.log('  alice    - 学生 小爱');
  console.log('  bob      - 学生 小博');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
