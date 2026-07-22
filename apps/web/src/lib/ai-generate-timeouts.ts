/** 网页 AI 生成/迭代（含 PM 小应用接线）单次 HTTP 请求超时
 * 迭代时会把上一版完整 HTML 作为上下文一起发给模型，生成耗时可达 5-7 分钟，
 * 这里留出比后端 Ark 超时（7 分钟）更宽的余量，避免前端先于后端判定失败。
 */
export const AI_GENERATE_WEB_TIMEOUT_MS = 480_000;

/** 进度条动画时长（UI 展示，略短于真实超时） */
export const AI_GENERATE_WEB_PROGRESS_MS = 240_000;

export const AI_GENERATE_WEB_PROGRESS_ESTIMATE = '预计约 2–7 分钟，内容较多时会更久';
