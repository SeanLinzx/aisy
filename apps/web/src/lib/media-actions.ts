import { resolveUploadPath } from '@/lib/upload-url';

export async function downloadMedia(url: string, filename: string) {
  const src = resolveUploadPath(url);
  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(src, '_blank', 'noopener,noreferrer');
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

export function buildVideoPageHref(refImageUrl: string, fromCourse?: boolean, lessonSlug?: string) {
  const params = new URLSearchParams();
  params.set('refImage', refImageUrl);
  if (fromCourse && lessonSlug) {
    params.set('from', 'course');
    params.set('lesson', lessonSlug);
  }
  return `/student/video?${params.toString()}`;
}
