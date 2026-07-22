import type { SummaryQuestion } from '@/lib/detective-summary';

export const SUMMARY_QUESTIONS_EN: SummaryQuestion[] = [
  {
    id: 'hallucination',
    kind: 'quiz',
    emoji: '🤯',
    title: 'Watch out! AI can "make things up"! Which is an example of an "AI hallucination"?',
    desc: 'AI hallucination = when AI confidently says something that\'s wrong.',
    options: [
      { id: 'a', label: 'Drawing a rabbit with 3 ears, or a pigeon as a duck', correct: true },
      { id: 'b', label: 'A dream AI has while sleeping' },
    ],
  },
  {
    id: 'aigc',
    kind: 'quiz',
    emoji: '🎨',
    title: 'In AIGC, what does the "G" stand for?',
    desc: 'AIGC means "AI Generated Content".',
    options: [
      { id: 'a', label: 'Generate — create, make', correct: true },
      { id: 'b', label: 'Game — play' },
    ],
  },
  {
    id: 'shield',
    kind: 'quiz',
    emoji: '🛡️',
    title: 'What is the "Shield of Wisdom" for becoming an AIGC pro?',
    desc: 'It\'s like putting a "filter" on your brain 🧠',
    options: [
      { id: 'a', label: 'Don\'t trust everything — ask questions and look for proof', correct: true },
      { id: 'b', label: 'Believe everything you see' },
    ],
  },
  {
    id: 'thinking',
    kind: 'quiz',
    emoji: '⚡',
    title: 'AI can help us do many things — but who is the real thinker?',
    options: [
      { id: 'a', label: 'AI has no ideas of its own — WE are the thinkers', correct: true },
      { id: 'b', label: 'AI can think for us about everything' },
    ],
  },
  {
    id: 'debate',
    kind: 'debate',
    emoji: '⚖️',
    title: 'Group debate: Should AI teachers grade homework?',
    desc: 'Note: Your opinion becomes a clue to crack the truth!',
    options: [
      { id: 'pro', label: 'Pro: Yes! AI grading is fast and fair — teachers get more time to help us' },
      { id: 'con', label: 'Con: No! AI doesn\'t understand our thinking or feelings — it could hurt our motivation' },
    ],
    withText: true,
    textLabel: '💬 Tell us why',
    textPlaceholder: 'Why? Think about class — finding balance between speed and warmth…',
  },
  {
    id: 'share',
    kind: 'share',
    emoji: '🎉',
    title: 'Digital celebration · My share: What do you most want to talk about from these 6 AI adventures?',
    desc: 'After an amazing journey, you\'ve surely grown in your own way.',
    options: [
      { id: 'change', label: '🌱 How I changed' },
      { id: 'feeling', label: '💖 How I feel' },
      { id: 'work', label: '🖼️ My creations' },
      { id: 'future', label: '🚀 My hopes for the future' },
    ],
    withText: true,
    textLabel: '🎤 Tell us more',
    textPlaceholder: 'For example: I learned to write prompts and made Nai Long\'s room come alive — I want to use AI to help more people…',
  },
];
