/**
 * 为指定学生批量生成 AI 作品集（素材库全量），并设为扫码主页展示页。
 * 用法:
 *   node scripts/bulk-generate-portfolios.js
 *   node scripts/bulk-generate-portfolios.js --force 2607031
 *   node scripts/bulk-generate-portfolios.js --force 2607031,2607030
 */
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const ph = require(path.join(__dirname, '../packages/portfolio-html/index.js'));

const USERNAMES = [];
for (let i = 2607030; i <= 2607042; i += 1) USERNAMES.push(String(i));

const forceUsernames = process.argv
  .slice(2)
  .flatMap((arg) => {
    if (arg.startsWith('--force=')) return arg.slice('--force='.length).split(',');
    if (arg === '--force') return [];
    return [];
  })
  .concat(
    (() => {
      const idx = process.argv.indexOf('--force');
      if (idx === -1 || !process.argv[idx + 1] || process.argv[idx + 1].startsWith('--')) return [];
      return process.argv[idx + 1].split(',');
    })(),
  )
  .map((s) => s.trim())
  .filter(Boolean);

const forceSet = new Set(forceUsernames);

const PORTFOLIO_TITLE = '我的 AI 作品集';
const PORTFOLIO_DESC = '课程 · 第5课 AI 作品集';
const TYPE_LAYOUT_OPTION = ph.TYPE_LAYOUT_OPTION;

const DEFAULT_FORM = {
  audience: '给爸爸妈妈和老师看',
  goal: '我这学期用 AI 做的所有创意作品',
  style: '活泼可爱、五彩缤纷的颜色',
  cover: '大标题和一段自我介绍',
  cardLayout: TYPE_LAYOUT_OPTION,
  interactionRule: '鼠标移到卡片上，或用手指点一下卡片',
  interactionAction: '卡片会轻轻放大、出现阴影，并显示作品名称',
  interactionFeedback: '再点一次可以弹出大图或播放视频',
};

function webBasePath() {
  return (process.env.WEB_BASE_PATH || '/aisy').replace(/\/$/, '');
}

function publishPath(slug) {
  return `${webBasePath()}/p/${slug}`;
}

function parseAssetMeta(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function isPortfolioAsset(asset) {
  return parseAssetMeta(asset.meta).kind === 'portfolio';
}

function isSelectableAsset(asset) {
  if (asset.archived) return false;
  if (!ph.PORTFOLIO_SELECTABLE_TYPES.includes(asset.type)) return false;
  return parseAssetMeta(asset.meta).kind !== 'portfolio';
}

function makeSlug(base) {
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
  let suffix = '';
  for (let i = 0; i < 8; i += 1) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  const clean = String(base || '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 24);
  return clean ? `${clean}-${suffix}` : suffix;
}

async function ensureHomepage(prisma, user) {
  let hp = await prisma.studentHomepage.findUnique({ where: { userId: user.id } });
  if (!hp) {
    hp = await prisma.studentHomepage.create({
      data: {
        userId: user.id,
        slug: makeSlug(user.username),
        title: `${user.displayName} 的 AI 作品主页`,
        published: true,
      },
    });
  } else if (!hp.published) {
    hp = await prisma.studentHomepage.update({
      where: { id: hp.id },
      data: { published: true },
    });
  }
  return hp;
}

async function createPublishedPortfolio(prisma, user, chosen, html) {
  const project = await prisma.webProject.create({
    data: {
      ownerId: user.id,
      title: PORTFOLIO_TITLE,
      description: PORTFOLIO_DESC,
      currentVersion: 1,
      status: 'published',
      slug: makeSlug(PORTFOLIO_TITLE),
      visibility: 'public',
      versions: {
        create: {
          version: 1,
          html,
          css: '',
          js: '',
          notes: '批量自动生成作品集',
          prompt: 'bulk-generate-portfolios.js',
        },
      },
    },
    include: { versions: true },
  });

  const version = project.versions[0];
  const published = await prisma.webProject.update({
    where: { id: project.id },
    data: {
      headVersionId: version.id,
      publishedVersionId: version.id,
    },
  });

  const pageUrl = publishPath(published.slug);
  const pickedAssetIds = chosen.map((a) => a.id);
  const meta = {
    kind: 'portfolio',
    pickedAssetIds,
    projectId: project.id,
    slug: published.slug,
    headVersionId: version.id,
    linkUrl: pageUrl,
    ...DEFAULT_FORM,
  };

  const asset = await prisma.asset.create({
    data: {
      ownerId: user.id,
      type: 'web',
      title: PORTFOLIO_TITLE,
      summary: `共 ${chosen.length} 个作品的展示网页`,
      content: html,
      url: pageUrl,
      meta: JSON.stringify(meta),
      visibility: 'public',
      reviewStatus: 'approved',
    },
  });

  const hp = await ensureHomepage(prisma, user);
  await prisma.studentHomepage.update({
    where: { id: hp.id },
    data: { featuredWebProjectId: project.id, published: true },
  });

  return { projectId: project.id, slug: published.slug, assetId: asset.id, count: chosen.length };
}

async function regeneratePublishedPortfolio(prisma, user, portfolioAsset, chosen, html) {
  const meta = parseAssetMeta(portfolioAsset.meta);
  let projectId = typeof meta.projectId === 'string' ? meta.projectId : null;

  if (!projectId && portfolioAsset.url) {
    const m = portfolioAsset.url.match(/\/p\/([^/?#]+)/);
    if (m) {
      const wp = await prisma.webProject.findUnique({ where: { slug: m[1] } });
      if (wp?.ownerId === user.id) projectId = wp.id;
    }
  }

  if (!projectId) {
    return createPublishedPortfolio(prisma, user, chosen, html);
  }

  const project = await prisma.webProject.findUnique({
    where: { id: projectId },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
  });
  if (!project || project.ownerId !== user.id) {
    return createPublishedPortfolio(prisma, user, chosen, html);
  }

  const last = project.versions[0];
  const newVersionNum = (last?.version ?? 0) + 1;
  const version = await prisma.webProjectVersion.create({
    data: {
      projectId: project.id,
      version: newVersionNum,
      html,
      css: '',
      js: '',
      notes: '强制重新生成作品集（素材库全量）',
      prompt: 'bulk-generate-portfolios.js --force',
      parentVersionId: project.headVersionId ?? last?.id ?? null,
    },
  });

  const slug = project.slug ?? makeSlug(PORTFOLIO_TITLE);
  const published = await prisma.webProject.update({
    where: { id: project.id },
    data: {
      currentVersion: newVersionNum,
      headVersionId: version.id,
      publishedVersionId: version.id,
      status: 'published',
      slug,
      visibility: 'public',
    },
  });

  const pageUrl = publishPath(published.slug);
  const pickedAssetIds = chosen.map((a) => a.id);
  const nextMeta = {
    ...DEFAULT_FORM,
    ...meta,
    kind: 'portfolio',
    pickedAssetIds,
    projectId: project.id,
    slug: published.slug,
    headVersionId: version.id,
    linkUrl: pageUrl,
  };

  await prisma.asset.update({
    where: { id: portfolioAsset.id },
    data: {
      summary: `共 ${chosen.length} 个作品的展示网页`,
      content: html,
      url: pageUrl,
      meta: JSON.stringify(nextMeta),
      visibility: 'public',
    },
  });

  const hp = await ensureHomepage(prisma, user);
  await prisma.studentHomepage.update({
    where: { id: hp.id },
    data: { featuredWebProjectId: project.id, published: true },
  });

  return { projectId: project.id, slug: published.slug, assetId: portfolioAsset.id, count: chosen.length, regenerated: true };
}

async function main() {
  const prisma = new PrismaClient();
  const targetUsernames = forceSet.size > 0 ? [...forceSet] : USERNAMES;
  const summary = { created: [], regenerated: [], skippedPortfolio: [], skippedEmpty: [], failed: [], missing: [] };

  try {
    for (const username of targetUsernames) {
      try {
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
          summary.missing.push(username);
          continue;
        }

        const allAssets = await prisma.asset.findMany({
          where: { ownerId: user.id, archived: false },
          orderBy: { createdAt: 'desc' },
        });

        const portfolioAsset = allAssets.find(isPortfolioAsset);
        const force = forceSet.has(username);

        if (portfolioAsset && !force) {
          summary.skippedPortfolio.push(`${username} (${user.displayName})`);
          continue;
        }

        const chosen = allAssets.filter(isSelectableAsset).map((a) => ({
          id: a.id,
          type: a.type,
          title: a.title,
          url: a.url || undefined,
          thumbnailUrl: a.thumbnailUrl || undefined,
          content: a.content || undefined,
          summary: a.summary || undefined,
          meta: parseAssetMeta(a.meta),
        }));

        if (!chosen.length) {
          summary.skippedEmpty.push(`${username} (${user.displayName})`);
          continue;
        }

        const html = ph.buildFullPortfolioHtml(chosen, TYPE_LAYOUT_OPTION, user.displayName);
        const result = portfolioAsset
          ? await regeneratePublishedPortfolio(prisma, user, portfolioAsset, chosen, html)
          : await createPublishedPortfolio(prisma, user, chosen, html);

        const line = `${username} (${user.displayName}) · ${result.count} 件 · /p/${result.slug}`;
        if (result.regenerated) {
          summary.regenerated.push(line);
          console.log(`[regen] ${username} ${user.displayName} -> ${result.count} assets, slug=${result.slug}`);
        } else {
          summary.created.push(line);
          console.log(`[ok] ${username} ${user.displayName} -> ${result.count} assets, slug=${result.slug}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        summary.failed.push(`${username}: ${msg}`);
        console.error(`[fail] ${username}:`, msg);
      }
    }

    console.log('\n=== bulk-generate-portfolios summary ===');
    console.log(`created (${summary.created.length}):`, summary.created.join('\n  ') || '(none)');
    console.log(`regenerated (${summary.regenerated.length}):`, summary.regenerated.join('\n  ') || '(none)');
    console.log(`skipped existing portfolio (${summary.skippedPortfolio.length}):`, summary.skippedPortfolio.join(', ') || '(none)');
    console.log(`skipped no assets (${summary.skippedEmpty.length}):`, summary.skippedEmpty.join(', ') || '(none)');
    console.log(`missing users (${summary.missing.length}):`, summary.missing.join(', ') || '(none)');
    console.log(`failed (${summary.failed.length}):`, summary.failed.join('\n  ') || '(none)');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[bulk-generate-portfolios] fatal:', err);
  process.exit(1);
});
