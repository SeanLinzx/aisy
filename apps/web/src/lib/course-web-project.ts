import { api } from '@/lib/api';

/** 课程里生成的 HTML 网页：写入「我的网页」并发布可访问链接 */
export async function persistCourseWebProject(opts: {
  title: string;
  html: string;
  css?: string;
  js?: string;
  prompt?: string;
  projectId?: string | null;
  /** 写入项目描述，便于在「我的网页」识别来源 */
  description?: string;
  /** 生成后自动设为课程主页展示页 */
  setAsHomepage?: boolean;
}): Promise<{ projectId: string; slug: string; url: string }> {
  let pid = opts.projectId ?? null;
  if (!pid) {
    const r = await api.post('/web-projects', {
      title: opts.title,
      html: opts.html,
      css: opts.css,
      js: opts.js,
      prompt: opts.prompt,
      description: opts.description,
    });
    pid = r.data.id as string;
  } else {
    await api.post(`/web-projects/${pid}/versions`, {
      html: opts.html,
      css: opts.css,
      js: opts.js,
      prompt: opts.prompt,
      notes: '课程作品更新',
    });
    if (opts.description) {
      await api.patch(`/web-projects/${pid}`, { description: opts.description });
    }
  }
  const pub = await api.post(`/web-projects/${pid}/publish`);
  const slug = pub.data.slug as string;

  if (opts.setAsHomepage) {
    try {
      await api.patch('/homepages/mine', { featuredWebProjectId: pid });
    } catch {
      // 非致命：网页已保存，主页设置可稍后在「我的主页」完成
    }
  }

  return { projectId: pid, slug, url: `/p/${slug}` };
}
