'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GameShell } from '@/components/course/game-shell';
import { useLazyModel } from '@/hooks/use-ml-model';

type PoseLandmarker = import('@mediapipe/tasks-vision').PoseLandmarker;
type NormalizedLandmark = import('@mediapipe/tasks-vision').NormalizedLandmark;

const CHALLENGES = [
  { id: 'hands-up', emoji: '🙌', title: '举起双手', hint: '把两只手举过头顶！' },
  { id: 'scissors', emoji: '✌️', title: '比剪刀手', hint: '一只手比 V 字，另一只手自然放下～' },
  { id: 'one-leg', emoji: '🦩', title: '单脚站立', hint: '抬起一只脚，像 flamingo 一样！' },
] as const;

async function loadPoseLandmarker(): Promise<PoseLandmarker> {
  const vision = await import('@mediapipe/tasks-vision');
  const fileset = await vision.FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm',
  );
  return vision.PoseLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numPoses: 1,
  });
}

function lm(landmarks: NormalizedLandmark[] | undefined, idx: number) {
  return landmarks?.[idx];
}

function detectChallenge(id: (typeof CHALLENGES)[number]['id'], landmarks: NormalizedLandmark[] | undefined): boolean {
  const ls = lm(landmarks, 11);
  const rs = lm(landmarks, 12);
  const lw = lm(landmarks, 15);
  const rw = lm(landmarks, 16);
  const le = lm(landmarks, 13);
  const re = lm(landmarks, 14);
  const la = lm(landmarks, 27);
  const ra = lm(landmarks, 28);
  if (!ls || !rs || !lw || !rw || !le || !re || !la || !ra) return false;

  if (id === 'hands-up') {
    return lw.y < ls.y - 0.08 && rw.y < rs.y - 0.08;
  }
  if (id === 'scissors') {
    const leftUp = lw.y < le.y - 0.05;
    const rightDown = rw.y > re.y;
    const rightUp = rw.y < re.y - 0.05;
    const leftDown = lw.y > le.y;
    return (leftUp && rightDown) || (rightUp && leftDown);
  }
  if (id === 'one-leg') {
    return Math.abs(la.y - ra.y) > 0.12;
  }
  return false;
}

export function PosePlayGame() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [cameraOk, setCameraOk] = useState<boolean | null>(null);
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [passed, setPassed] = useState<boolean[]>(() => CHALLENGES.map(() => false));
  const [celebrate, setCelebrate] = useState(false);
  const holdRef = useRef(0);
  const { model, loading, error, load } = useLazyModel(loadPoseLandmarker);

  const challenge = CHALLENGES[challengeIdx];
  const allDone = passed.every(Boolean);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false,
      });
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setCameraOk(true);
    } catch {
      setCameraOk(false);
    }
  }, []);

  useEffect(() => {
    void startCamera();
    return () => {
      const video = videoRef.current;
      const stream = video?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [startCamera]);

  useEffect(() => {
    if (!cameraOk) return;
    let cancelled = false;

    async function loop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        if (!cancelled) rafRef.current = requestAnimationFrame(loop);
        return;
      }
      try {
        const landmarker = model || (await load());
        if (cancelled) return;
        const result = landmarker.detectForVideo(video, performance.now());
        const landmarks = result.landmarks[0];
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 3;
          const pairs: Array<[number, number]> = [
            [11, 13], [13, 15], [12, 14], [14, 16], [11, 12], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28],
          ];
          for (const [a, b] of pairs) {
            const p1 = lm(landmarks, a);
            const p2 = lm(landmarks, b);
            if (!p1 || !p2) continue;
            ctx.beginPath();
            ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
            ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
            ctx.stroke();
          }
        }
        if (detectChallenge(challenge.id, landmarks)) {
          holdRef.current += 1;
          if (holdRef.current > 8 && !passed[challengeIdx]) {
            setPassed((prev) => {
              const next = [...prev];
              next[challengeIdx] = true;
              return next;
            });
            setCelebrate(true);
            window.setTimeout(() => setCelebrate(false), 1200);
            if (challengeIdx < CHALLENGES.length - 1) {
              setChallengeIdx((i) => i + 1);
            }
            holdRef.current = 0;
          }
        } else {
          holdRef.current = 0;
        }
      } catch {
        /* model load errors handled by hook */
      }
      if (!cancelled) rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [cameraOk, model, load, challenge.id, challengeIdx, passed]);

  return (
    <GameShell slug="pose-play">
      <div className="kid-card space-y-4 !p-5">
        <p className="text-sm text-ink-soft leading-relaxed">
          📷 打开摄像头，跟着挑战做动作。AI 会实时「看见」你的骨架，就像计算机视觉一样！
        </p>

        {cameraOk === false && (
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            暂时无法打开摄像头。请让老师帮忙检查浏览器权限，或换一台带摄像头的电脑～
          </div>
        )}

        <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video max-h-[420px]">
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover -scale-x-100" playsInline muted />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover -scale-x-100 pointer-events-none" />
          {loading && !model && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-sm font-bold">
              正在加载姿势 AI…
            </div>
          )}
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        {!allDone ? (
          <div className="kid-card-sky !p-4 text-center space-y-2">
            <div className="text-4xl">{challenge.emoji}</div>
            <h2 className="font-display text-xl font-extrabold text-ink">挑战 {challengeIdx + 1}：{challenge.title}</h2>
            <p className="text-sm text-ink-soft">{challenge.hint}</p>
            <p className="text-xs text-violet-600 font-bold">保持动作 1 秒，就算过关！</p>
          </div>
        ) : (
          <div className="kid-card-sky !p-4 text-center space-y-2">
            <div className="text-5xl">🏆</div>
            <h2 className="font-display text-xl font-extrabold text-emerald-700">全部挑战完成！</h2>
            <p className="text-sm text-ink-soft">你已经体验了 AI 的「眼睛」——它能看懂人的姿势！</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 justify-center">
          {CHALLENGES.map((c, i) => (
            <span
              key={c.id}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${
                passed[i] ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : i === challengeIdx ? 'bg-violet-50 border-violet-300 text-violet-700' : 'bg-white border-orange-100 text-slate-400'
              }`}
            >
              {c.emoji} {c.title}
            </span>
          ))}
        </div>

        {celebrate && (
          <p className="text-center text-lg font-extrabold text-brand animate-pulse">🎉 太棒了，过关！</p>
        )}
      </div>
    </GameShell>
  );
}
