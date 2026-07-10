export type Role = 'student' | 'parent' | 'teacher' | 'admin';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  timestamp: string;
}
