'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QrImage({ url, size = 120, label }: { url: string; size?: number; label?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { width: size * 2, margin: 2, errorCorrectionLevel: 'M' })
      .then((d) => { if (!cancelled) setSrc(d); })
      .catch(() => { if (!cancelled) setSrc(null); });
    return () => { cancelled = true; };
  }, [url, size]);

  if (!src) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="bg-orange-50 rounded-xl animate-pulse" style={{ width: size, height: size }} />
        {label && <span className="text-[10px] text-slate-400">{label}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <img src={src} alt={label || '二维码'} width={size} height={size} className="rounded-xl border-2 border-orange-100 bg-white" />
      {label && <span className="text-[10px] font-bold text-slate-500">{label}</span>}
    </div>
  );
}
