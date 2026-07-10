/**
 * Common types shared by every AI provider.
 *
 * The goal of this adapter layer is simple: business code never imports
 * a specific provider. It only talks to a registry and always sees the
 * same normalized inputs and outputs, no matter which model is wired
 * up (Volcengine Ark, a mock, or something future like OpenAI).
 */

export type GenerationKind = 'text' | 'image' | 'video' | 'web' | 'poster' | 'ppt' | 'mixed' | 'code';

export interface ReferenceMediaItem {
  type: 'image' | 'video' | 'audio';
  url: string;
  role?: string; // provider-specific role hint (e.g. reference_image)
}

export interface BaseGenerateInput {
  prompt: string;
  model?: string;
  references?: ReferenceMediaItem[];
  options?: Record<string, any>;
}

export interface TextResult {
  text: string;
  raw?: any;
}

export interface ImageResult {
  imageUrls: string[];
  raw?: any;
}

export interface VideoTaskResult {
  taskId: string;          // opaque to the platform
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  videoUrl?: string;
  raw?: any;
  error?: string;
}

export interface WebPageResult {
  html: string;
  css?: string;
  js?: string;
  raw?: any;
}

export interface PosterResult {
  imageUrl?: string;
  html?: string;
  raw?: any;
}

export interface PptResult {
  slides: Array<{ title: string; body: string; imageUrl?: string }>;
  raw?: any;
}

export interface MixedContentResult {
  text?: string;
  imageUrls?: string[];
  raw?: any;
}

export interface VideoSubmitInput extends BaseGenerateInput {
  duration?: number;
  ratio?: string;
  watermark?: boolean;
  generateAudio?: boolean;
}

export interface ProviderCapabilities {
  text: boolean;
  image: boolean;
  video: boolean;
  web: boolean;
  poster: boolean;
  ppt: boolean;
  mixed: boolean;
  code: boolean;
}

export interface AiProviderAdapter {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  generateText(input: BaseGenerateInput): Promise<TextResult>;
  generateImage(input: BaseGenerateInput): Promise<ImageResult>;
  generateWebPage(input: BaseGenerateInput): Promise<WebPageResult>;
  generatePoster(input: BaseGenerateInput): Promise<PosterResult>;
  generatePpt(input: BaseGenerateInput): Promise<PptResult>;
  generateMixedContent(input: BaseGenerateInput): Promise<MixedContentResult>;
  generateCode(input: BaseGenerateInput): Promise<TextResult>;

  /** Video is always async. submit returns a taskId; poll resolves final status + url. */
  submitVideoTask(input: VideoSubmitInput): Promise<VideoTaskResult>;
  pollVideoTask(taskId: string): Promise<VideoTaskResult>;
}
