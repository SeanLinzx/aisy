export interface MusicGenerateInput {
  lyrics: string;
  genre?: string;
  mood?: string;
  gender?: string;
  timbre?: string;
  duration?: number;
}

export interface MusicTaskResult {
  taskId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  audioUrl?: string;
  error?: string;
  raw?: any;
}

export interface MusicClient {
  readonly providerName: string;
  submitSongTask(input: MusicGenerateInput): Promise<MusicTaskResult>;
  pollSongTask(taskId: string, input?: MusicGenerateInput): Promise<MusicTaskResult>;
}
