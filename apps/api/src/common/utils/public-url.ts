/** 公开分享页的基础 URL（用于二维码） */
export function webOrigin(): string {
  return (process.env.WEB_ORIGIN || 'http://localhost:3000').replace(/\/$/, '');
}

function webBasePath(): string {
  return (process.env.WEB_BASE_PATH || '').replace(/\/$/, '');
}

export function courseHomeUrl(slug: string): string {
  return `${webOrigin()}${webBasePath()}/s/${slug}`;
}

export function growthUrl(slug: string): string {
  return `${webOrigin()}${webBasePath()}/g/${slug}`;
}

/** 已发布网页路径（含 WEB_BASE_PATH，用于服务端生成的 HTML / 素材 url） */
export function publishPath(slug: string): string {
  return `${webBasePath()}/p/${slug}`;
}
