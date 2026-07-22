export * from './ai-camp-runtime';
export * from './declarative-ai-bridge';

export type Role = 'student' | 'parent' | 'teacher' | 'admin';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  timestamp: string;
}
