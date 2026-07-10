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
