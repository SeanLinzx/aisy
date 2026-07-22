export interface PmTextTemplate {
  id: string;
  title: string;
  emoji: string;
  system: string;
  desc: string;
  /** 用户自行添加的角色 */
  custom?: boolean;
}

export interface PmImageTemplate {
  id: string;
  title: string;
  emoji: string;
  prefix: string;
  desc: string;
  custom?: boolean;
}

/** 对照组：不附加任何系统提示词 */
export const PM_TEXT_CONTROL_ID = 'control-none';
export const PM_IMAGE_CONTROL_ID = 'control-none';

export const PM_TEXT_CONTROL: PmTextTemplate = {
  id: PM_TEXT_CONTROL_ID,
  title: '对照组',
  emoji: '🧪',
  desc: '裸奔模式：不加人设，看看 AI 原本怎么说话',
  system: '',
};

export const PM_IMAGE_CONTROL: PmImageTemplate = {
  id: PM_IMAGE_CONTROL_ID,
  title: '对照组',
  emoji: '🧪',
  desc: '不加画风滤镜，任务说什么就画什么',
  prefix: '',
};

export const PM_TEXT_TEMPLATES: PmTextTemplate[] = [
  {
    id: 'strict-teacher',
    title: '严谨小老师',
    emoji: '👩‍🏫',
    desc: '像班长一样认真：分点清楚，不胡编乱造',
    system: '你是一名严谨的小老师。回答要分点、用词准确、句子短，单次回复不超过 500 字，适合小学生阅读。',
  },
  {
    id: 'creative-story',
    title: '创意故事家',
    emoji: '📖',
    desc: '脑洞大开，三句话也能讲出冒险故事',
    system: '你是一名充满想象力的故事家。回答要生动、有画面感、可以用比喻，语气活泼，适合小朋友；单次回复不超过 500 字。',
  },
  {
    id: 'concise-helper',
    title: '简洁助手',
    emoji: '⚡',
    desc: '能三个字说完，绝不用四个字',
    system: '你是简洁助手。用最少的字回答问题，每句不超过 15 字，单次回复总共不超过 80 字。',
  },
  {
    id: 'friendly-coach',
    title: '热情教练',
    emoji: '🎉',
    desc: '啦啦队附体：夸到你还想再试一次',
    system: '你是热情的小教练。每句话都要鼓励孩子，用 emoji，语气超级正面、像运动会上的加油声；单次回复不超过 500 字。',
  },
];

export const PM_IMAGE_TEMPLATES: PmImageTemplate[] = [
  {
    id: 'realistic',
    title: '写实风画家',
    emoji: '📷',
    prefix: '你是一名写实风画家。请用写实摄影风格作画，细节清晰，自然光线，',
    desc: '像相机「咔嚓」一声拍下来的画面',
  },
  {
    id: 'cartoon',
    title: '卡通风画家',
    emoji: '🎨',
    prefix: '你是一名卡通风画家。请用儿童卡通插画风格，明亮色彩，圆润造型，可爱风格，',
    desc: 'Q 版圆滚滚，色彩会跳舞的那种',
  },
  {
    id: 'watercolor',
    title: '水彩绘本风画家',
    emoji: '🖌️',
    prefix: '你是一名水彩绘本风画家。请用水彩绘本风格，柔和笔触，温馨氛围，',
    desc: '睡前绘本里那种软乎乎、暖洋洋的感觉',
  },
  {
    id: 'flat-icon',
    title: '扁平贴纸风画家',
    emoji: '🔷',
    prefix: '你是一名扁平贴纸风画家。请用扁平插画风格，简洁几何形状，高对比配色，适合贴纸或小游戏图标，',
    desc: '几何简洁，像贴纸、徽章或小图标',
  },
];

/** 课堂一键换任务：有趣为主，少量产品向案例 */
export const PM_TASK_SUGGESTIONS = {
  text: [
    '给一只会打篮球的猫咪起 3 个酷名字',
    '如果书包会说话，它今天会吐槽什么？',
    '用 4 句话讲：小侦探在教室弄丢橡皮的悬疑故事',
    '帮「不想睡觉的小朋友」写 3 条有趣睡前小建议',
    '描述你理想中的树屋图书馆（50 字以内）',
    '给「单词魔法故事机」写一句超吸引小朋友的口号',
    '写一段 50 字的外星宠物店开业广告',
    '假如铅笔是超级英雄，它的超能力是什么？',
  ],
  image: [
    '一只戴侦探帽的柯基，在找掉落的星星',
    '会飞的披萨外卖机器人，穿过城市夜景',
    '海底学校里，章鱼班长在发作业',
    '小朋友和 friendly 机器人一起搭积木城堡',
    '用糖果和饼干搭成的童话城堡',
    '赛博朋克风格的猫咪咖啡馆，霓虹灯闪闪',
    '树屋图书馆，窗外有萤火虫和月亮',
    '画一张图标：会记单词的魔法书在发光',
  ],
};

export function defaultTextSystems(): Record<string, string> {
  return {
    ...Object.fromEntries(PM_TEXT_TEMPLATES.map((t) => [t.id, t.system])),
    [PM_TEXT_CONTROL_ID]: '',
  };
}

export function defaultImagePrefixes(): Record<string, string> {
  return {
    ...Object.fromEntries(PM_IMAGE_TEMPLATES.map((t) => [t.id, t.prefix])),
    [PM_IMAGE_CONTROL_ID]: '',
  };
}

export function createCustomTextTemplate(title: string): PmTextTemplate {
  const id = `custom-text-${Date.now()}`;
  return {
    id,
    title: title.trim() || '我的角色',
    emoji: '✨',
    desc: '你亲手捏的角色，风格自己说了算',
    system: '你是自定义生文角色。回答简洁清楚、有趣好懂，单次回复不超过 500 字，适合小学生阅读。',
    custom: true,
  };
}

export function createCustomImageTemplate(title: string): PmImageTemplate {
  const id = `custom-image-${Date.now()}`;
  return {
    id,
    title: title.trim() || '我的画家',
    emoji: '🖼️',
    desc: '专属画风实验室，想怎么画就怎么画',
    prefix: '请用儿童友好的插画风格，色彩明亮、造型可爱，',
    custom: true,
  };
}

export const PM_PROMPT_TEST_STORAGE_KEY = 'course.pm.prompt-test';
