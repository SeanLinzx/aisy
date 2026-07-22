import { NextRequest } from 'next/server';

const API_ORIGIN = (process.env.API_ORIGIN || 'http://localhost:3001').replace(/\/+$/, '');

/** 代理已发布网页 HTML，避免 /p/:slug 无 App 路由时命中 404。 */
export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const slug = params.slug?.trim();
  if (!slug) {
    return new Response('缺少页面标识', { status: 400 });
  }

  const res = await fetch(`${API_ORIGIN}/p/${encodeURIComponent(slug)}`, { cache: 'no-store' });
  if (!res.ok) {
    return new Response(await res.text(), {
      status: res.status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const html = await res.text();
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
