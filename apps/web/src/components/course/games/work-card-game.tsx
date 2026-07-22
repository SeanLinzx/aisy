'use client';
import { WorkCard, type WorkCardField } from '@/components/course/work-card';
import { useLanguage } from '@/contexts/language-context';

const FINAL_FIELDS: WorkCardField[] = [
  { key: 'learned', label: '我学会了什么？', emoji: '💡', placeholder: '例如：我学会了用提示词让 AI 画出我想要的画面。' },
  { key: 'made', label: '我完成了什么？', emoji: '🎁', placeholder: '例如：我做了一个奶龙房间和一个会发声音的小交互。' },
  { key: 'future', label: '我未来想做什么？', emoji: '🚀', placeholder: '例如：我想用 AI 做一个帮小动物找家的网站。' },
];

const DAY1_FIELDS: WorkCardField[] = [
  { key: 'know', label: '我今天认识的 AI 是什么？', emoji: '🤖', placeholder: '例如：AI 有眼睛能看、有耳朵能听、有大脑会思考。' },
  { key: 'found', label: '我在生活里发现了哪些 AI？', emoji: '🔍', placeholder: '例如：扫地机器人、语音助手、人脸识别门禁。' },
  { key: 'wonder', label: '我还想知道关于 AI 的什么？', emoji: '❓', placeholder: '例如：AI 为什么会画画？它会不会出错？' },
];

function Intro({ text }: { text: string }) {
  const { tx } = useLanguage();
  return (
    <div className="kid-card-mint">
      <p className="text-sm font-semibold text-ink-soft leading-relaxed">📝 {tx(text)}</p>
    </div>
  );
}

export function WorkCardGame() {
  const { tx } = useLanguage();
  const fields = FINAL_FIELDS.map((f) => ({
    ...f,
    label: tx(f.label),
    placeholder: tx(f.placeholder),
  }));

  return (
    <div className="space-y-4">
      <Intro text="这是你这次训练营的「作品卡 2.0」。说说看你的收获吧！" />
      <WorkCard fields={fields} version="2.0" />
    </div>
  );
}

export function WorkCard1Game() {
  const { tx } = useLanguage();
  const fields = DAY1_FIELDS.map((f) => ({
    ...f,
    label: tx(f.label),
    placeholder: tx(f.placeholder),
  }));

  return (
    <div className="space-y-4">
      <Intro text="第一天的作品卡 1.0：记录你对 AI 的第一印象和发现。" />
      <WorkCard fields={fields} version="1.0" titlePrefix={tx('我的 AI 发现卡')} />
    </div>
  );
}
