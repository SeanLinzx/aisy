'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GameShell } from '@/components/course/game-shell';
import { useLazyModel } from '@/hooks/use-ml-model';

const MNIST_MODEL_URL = 'https://storage.googleapis.com/tfjs-models/tfjs/mnist/model.json';

type TfModule = typeof import('@tensorflow/tfjs');
type LayersModel = import('@tensorflow/tfjs').LayersModel;

async function loadMnistModel(): Promise<LayersModel> {
  const tf = await import('@tensorflow/tfjs');
  await tf.ready();
  return tf.loadLayersModel(MNIST_MODEL_URL);
}

function prepareCanvasInput(canvas: HTMLCanvasElement, tf: TfModule) {
  const tmp = document.createElement('canvas');
  tmp.width = 28;
  tmp.height = 28;
  const ctx = tmp.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 28, 28);
  ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, 28, 28);
  const img = ctx.getImageData(0, 0, 28, 28);
  const values: number[] = [];
  for (let i = 0; i < img.data.length; i += 4) {
    values.push(img.data[i] / 255);
  }
  return tf.tensor(values, [1, 28, 28, 1]);
}

export function DigitDetectiveGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [busy, setBusy] = useState(false);
  const { model, loading, error, load } = useLazyModel(loadMnistModel);

  useEffect(() => {
    void load().catch(() => {});
  }, [load]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setPrediction(null);
    setConfidence(0);
  }, []);

  useEffect(() => {
    clearCanvas();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';

    function pos(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * canvas!.width,
        y: ((e.clientY - rect.top) / rect.height) * canvas!.height,
      };
    }

    function start(e: PointerEvent) {
      drawing.current = true;
      const p = pos(e);
      ctx!.beginPath();
      ctx!.moveTo(p.x, p.y);
    }
    function move(e: PointerEvent) {
      if (!drawing.current) return;
      const p = pos(e);
      ctx!.lineTo(p.x, p.y);
      ctx!.stroke();
    }
    function end() {
      drawing.current = false;
    }

    canvas.addEventListener('pointerdown', start);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointerleave', end);
    return () => {
      canvas.removeEventListener('pointerdown', start);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', end);
      canvas.removeEventListener('pointerleave', end);
    };
  }, [clearCanvas]);

  async function guess() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    try {
      const m = model || (await load());
      const tf = await import('@tensorflow/tfjs');
      const input = prepareCanvasInput(canvas, tf);
      const logits = m.predict(input) as import('@tensorflow/tfjs').Tensor;
      const probs = (await logits.data()) as Float32Array;
      input.dispose();
      logits.dispose();
      let best = 0;
      let bestScore = probs[0];
      for (let i = 1; i < probs.length; i += 1) {
        if (probs[i] > bestScore) {
          best = i;
          bestScore = probs[i];
        }
      }
      setPrediction(best);
      setConfidence(Math.round(bestScore * 100));
    } catch {
      /* error shown via hook */
    } finally {
      setBusy(false);
    }
  }

  return (
    <GameShell slug="digit-detective">
      <div className="kid-card space-y-4 !p-5">
        <p className="text-sm text-ink-soft leading-relaxed">
          ✏️ 在方格里写一个大数字（0–9），点击「AI 猜一猜」。AI 会从很多手写例子里学习认字——就像小朋友练字一样！
        </p>
        <div className="flex flex-col items-center gap-4">
          <canvas
            ref={canvasRef}
            width={280}
            height={280}
            className="rounded-2xl border-4 border-orange-200 bg-white touch-none cursor-crosshair shadow-inner max-w-full"
          />
          <div className="flex flex-wrap gap-2 justify-center">
            <button type="button" className="kid-button-primary !py-3 !px-6" onClick={guess} disabled={busy || loading}>
              {busy ? '🤔 AI 正在想…' : '🔮 AI 猜一猜'}
            </button>
            <button type="button" className="kid-button-ghost !py-3 !px-6" onClick={clearCanvas}>
              🧹 擦掉重画
            </button>
          </div>
          {loading && !model && <p className="text-sm text-ink-soft">正在加载 AI 大脑…</p>}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          {prediction != null && (
            <div className="text-center kid-card-sky !p-4 w-full max-w-sm">
              <div className="text-5xl font-display font-extrabold text-brand">{prediction}</div>
              <p className="mt-2 text-sm font-bold text-ink">
                AI 看到了一个 <span className="text-brand text-lg">{prediction}</span> ！
              </p>
              <p className="text-xs text-ink-soft mt-1">把握度：{confidence}%</p>
            </div>
          )}
        </div>
      </div>
    </GameShell>
  );
}
