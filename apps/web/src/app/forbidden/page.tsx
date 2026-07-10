import Link from 'next/link';
export default function Forbidden() {
  return (
    <main className="relative min-h-screen overflow-hidden flex items-center justify-center px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="deco-blob bg-candy-pink w-72 h-72 -top-10 left-10 animate-float-slow" />
        <div className="deco-blob bg-candy-yellow w-72 h-72 -bottom-10 right-10 animate-float" />
      </div>
      <div className="relative text-center max-w-md">
        <div className="kid-emoji-bubble-lg bg-gradient-to-br from-rose-200 to-pink-300 mx-auto mb-5 animate-bounceSoft">🙅</div>
        <h1 className="font-display text-3xl font-extrabold text-rose-600">哎呀，进不去这里！</h1>
        <p className="text-ink-soft font-semibold mt-3">这个页面对你的角色不开放，去你的工作台看看吧～</p>
        <Link href="/" className="mt-6 inline-block kid-button-primary">🏠 回首页</Link>
      </div>
    </main>
  );
}
