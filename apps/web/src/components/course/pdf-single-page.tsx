'use client';
import { useEffect, useRef, useState } from 'react';
import { resolveUploadPath } from '@/lib/upload-url';

type PdfJsModule = typeof import('pdfjs-dist');

let pdfjsReady: Promise<PdfJsModule> | null = null;

async function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfjsReady) {
    pdfjsReady = import('pdfjs-dist').then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      return pdfjs;
    });
  }
  return pdfjsReady;
}

/** 学生端课件：只渲染 PDF 的指定一页，不显示浏览器内置预览侧栏。 */
export function PdfSinglePage({
  url,
  page,
  className = '',
}: {
  url: string;
  page: number;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let doc: import('pdfjs-dist').PDFDocumentProxy | null = null;

    async function render() {
      setLoading(true);
      setError(null);
      try {
        const pdfjs = await loadPdfJs();
        const src = resolveUploadPath(url);
        doc = await pdfjs.getDocument(src).promise;
        const pageNum = Math.min(Math.max(1, page), doc.numPages);
        const pdfPage = await doc.getPage(pageNum);
        if (cancelled) return;

        const wrap = wrapRef.current;
        const canvas = canvasRef.current;
        if (!wrap || !canvas) return;

        const base = pdfPage.getViewport({ scale: 1 });
        const maxWidth = wrap.clientWidth || base.width;
        const scale = Math.min(maxWidth / base.width, 2.5);
        const viewport = pdfPage.getViewport({ scale });
        const dpr = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        await pdfPage.render({ canvasContext: ctx, viewport }).promise;
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : '课件加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    render();
    return () => {
      cancelled = true;
      void doc?.destroy();
    };
  }, [url, page]);

  return (
    <div
      ref={wrapRef}
      className={`relative flex justify-center items-start bg-white overflow-hidden ${className}`}
    >
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 text-sm font-semibold text-ink-soft">
          加载第 {page} 页…
        </div>
      )}
      {error ? (
        <div className="w-full p-8 text-center text-sm text-rose-600">{error}</div>
      ) : (
        <canvas ref={canvasRef} className="block max-w-full h-auto" aria-label={`课件第 ${page} 页`} />
      )}
    </div>
  );
}
