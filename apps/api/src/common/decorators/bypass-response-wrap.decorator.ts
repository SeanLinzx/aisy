import { SetMetadata } from '@nestjs/common';

export const BYPASS_RESPONSE_WRAP_KEY = 'bypass_response_wrap';
/** SSE / 流式响应：跳过全局 { success, data } 包装 */
export const BypassResponseWrap = () => SetMetadata(BYPASS_RESPONSE_WRAP_KEY, true);
