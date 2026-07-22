import type { Locale } from './types';
import { en, tEn } from './en';
import { GAMES_TEXT_EN } from './games-en';
import { GAMES_REMAINING_EN } from './games-remaining-en';
import { FIND_AI_TEXT_EN } from './find-ai-en';
import { TEXT_EN_STUDENT_PAGES } from './student-pages-en';

/** Inline Chinese → English text map for gradual migration */
const TEXT_EN: Record<string, string> = {
  // Greetings
  '今天也要加油哦': 'Keep going today!',
  '夜深啦，记得早点休息': 'It\'s late — time to rest!',
  '早上好': 'Good morning',
  '中午好': 'Good afternoon',
  '下午好': 'Good afternoon',
  '晚上好': 'Good evening',

  // Nav labels (Chinese originals from layout)
  '首页': 'Home',
  '课程模式': 'Course Mode',
  '探索模式': 'Explore',
  '我的素材库': 'My Library',
  '我的网页': 'My Web Pages',
  '我的设置': 'Settings',
  '跟课': 'Follow Class',
  '课程': 'Course',
  '素材': 'Library',

  // Shell
  '学生工作台': 'Student Desk',
  '平板跟课': 'Tablet Class',
  '退出': 'Log Out',
  '退出登录': 'Log Out',
  '展开侧边栏': 'Expand sidebar',
  '收起侧边栏': 'Collapse sidebar',
  '上课锁定中': 'Class Locked',
  '请跟随老师屏幕，暂时不能浏览其它页面。': 'Follow the teacher\'s screen — you can\'t browse other pages for now.',
  '当前：': 'Now:',
  '跟课中': 'In Class',
  '上课中': 'In Class',
  '跟随老师': 'Following Teacher',

  // Classroom
  '🔒 上课锁定：': '🔒 Class locked:',
  '🎓 正在上课：': '🎓 In class:',
  '↩️ 回到课堂': '↩️ Back to Class',
  '等待老师': 'Waiting for teacher',
  '小游戏': 'Mini Game',
  '互动课件': 'Interactive Slides',
  '课件': 'Slides',

  // Game shell
  '🏠 返回课程地图': '🏠 Back to Course Map',
  '🔒 上课中，请完成老师布置的这一步，不要离开当前页面。': '🔒 Class is on — finish this step and stay on this page.',
  '上一个': 'Previous',
  '下一个游戏': 'Next Game',
  '🎉 全部玩完啦 · 回到课程地图': '🎉 All done · Back to Course Map',
  '(预告)': '(Coming Soon)',

  // Student home
  '欢迎回来，': 'Welcome back,',
  '跟着课程闯关，或在探索模式里自由创作 —— 作品都会进素材库和「我的网页」。': 'Follow the course or create freely in Explore — all works go to your library and web pages.',
  '推荐 · 跟着课程一步步学': 'Recommended · Learn step by step',
  '📚 课程模式': '📚 Course Mode',
  '6 节课闯关，从认识 AI 到做出自己的作品集。': '7 lessons from meeting AI to building your own portfolio.',
  '开始闯关 →': 'Start the adventure →',
  '自由探索 · 想玩啥玩啥': 'Free Explore · Play what you like',
  '🎧 探索模式': '🎧 Explore Mode',
  '生文、生图、生视频、图文理解、AI 小应用、AI 作曲，都在这里。': 'Writing, images, videos, image understanding, AI mini apps, and music — all here.',
  '进入探索 →': 'Go explore →',
  '🎧 探索模式 · 创作工具': '🎧 Explore · Creative Tools',
  '查看全部 →': 'View all →',
  '开始创作': 'Start creating',
  '我的最近作品': 'My Recent Works',
  '还没作品，去创作一个吧！': 'No works yet — go make something!',
  '查看全部素材': 'View all in library',
  '小创作家': 'Little Creator',

  // Course page
  '课程模式 · 6 节课闯关 🎒': 'Course Mode · 7 Lessons 🎒',
  'AI 训练营冒险地图': 'AI Camp Adventure Map',
  '一节一节闯过去，做出属于你自己的 AI 作品！想自由玩工具？去': 'Complete lessons one by one and make your own AI creations! Want free tools? Go to',
  '第': 'Lesson',

  // Login
  '加载中…': 'Loading…',
  '平板课堂登录': 'Tablet Class Login',
  '欢迎回来！': 'Welcome back!',
  '老师用平板控制台，学生用平板跟课 ✨': 'Teachers use the tablet console, students follow on tablet ✨',
  '用老师给你的账号和密码登录吧 ✨': 'Log in with the username and password your teacher gave you ✨',
  '👤 用户名': '👤 Username',
  '🔑 密码': '🔑 Password',
  '登录失败': 'Login failed',
  '登录中…': 'Logging in…',
  '🚀 一起出发！': '🚀 Let\'s go!',
  '← 返回首页': '← Back to home',
  '💡 小提示：登录后可以使用 AI 写文字、画画、做网页哦~': '💡 Tip: After login you can use AI to write, draw, and build web pages!',

  // Explore tools
  '生文': 'Writing',
  '写故事、写报告、写文案': 'Stories, reports, and copy',
  '生图': 'Images',
  '关键词生图 + 自由生图（描述后直接生成）': 'Keyword images + free drawing from descriptions',
  '生视频': 'Videos',
  '模板生视频 + 自由生视频（无首帧或有首帧）': 'Template videos + free video (with or without first frame)',
  '图文理解': 'Image Understanding',
  '上传图片让 AI 看一看': 'Upload a picture and let AI look at it',
  '网页工作台': 'Web Studio',
  '场景构思 → 布局排版 → 交互发布，三步做出你的网页': 'Scene → layout → interaction — build your web page in 3 steps',
  'AI 海报': 'AI Poster',
  '生成可下载的创意海报': 'Create downloadable creative posters',
  'AI PPT': 'AI Slides',
  '快速生成演示文稿提纲': 'Quick presentation outlines',
  'AI 作曲': 'AI Music',
  '输入歌词，五维调节，生成专属音乐': 'Enter lyrics, tune 5 sliders, make your own song',

  // Common UI
  '保存': 'Save',
  '取消': 'Cancel',
  '确认': 'Confirm',
  '提交': 'Submit',
  '返回': 'Back',
  '下一步': 'Next',
  '完成': 'Done',
  '重试': 'Try again',
  '生成中…': 'Creating…',
  '请稍候…': 'Please wait…',
  '提交检查': 'Submit & Check',
  '开始游戏': 'Start Game',
  '再玩一次': 'Play Again',
  '继续': 'Continue',
  '跳过': 'Skip',
  '关闭': 'Close',
  '确定': 'OK',
  '删除': 'Delete',
  '编辑': 'Edit',
  '预览': 'Preview',
  '下载': 'Download',
  '上传': 'Upload',
  '选择图片': 'Choose Image',
  '从素材库选择': 'Pick from Library',
  '暂无数据': 'No data yet',
  '操作成功': 'Done!',
  '操作失败': 'Something went wrong',
};

export function createTranslator(locale: Locale) {
  function t(key: string, fallback?: string): string {
    if (locale === 'zh') return fallback ?? key;
    return tEn(key, fallback);
  }

  /** Translate inline Chinese text */
  function tx(zh: string): string {
    if (locale === 'zh') return zh;
    return TEXT_EN[zh] ?? TEXT_EN_STUDENT_PAGES[zh] ?? GAMES_TEXT_EN[zh] ?? GAMES_REMAINING_EN[zh] ?? FIND_AI_TEXT_EN[zh] ?? en[zh] ?? zh;
  }

  return { t, tx, locale };
}

export type Translator = ReturnType<typeof createTranslator>;

export { en, TEXT_EN };
