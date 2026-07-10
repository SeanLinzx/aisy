// Portable enum string unions. We use these everywhere instead of Prisma's
// native enum types because the schema currently targets SQLite, which does
// not support native enums. Values are plain strings written to the database.

export type Role = 'student' | 'parent' | 'teacher' | 'admin';
export const Roles: Role[] = ['student', 'parent', 'teacher', 'admin'];

export type UserStatus = 'active' | 'disabled';

export type AssetType = 'text' | 'image' | 'video' | 'audio' | 'poster' | 'ppt' | 'web' | 'code' | 'mixed';
export const AssetTypes: AssetType[] = ['text', 'image', 'video', 'audio', 'poster', 'ppt', 'web', 'code', 'mixed'];

export type JobType = 'text' | 'image' | 'video' | 'music' | 'web' | 'poster' | 'ppt' | 'mixed' | 'code';
export const JobTypes: JobType[] = ['text', 'image', 'video', 'music', 'web', 'poster', 'ppt', 'mixed', 'code'];

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'auto_flagged';

export type Visibility = 'private' | 'class_only' | 'public';

export type TaskStatus = 'draft' | 'published' | 'archived';

export type SubmissionStatus = 'submitted' | 'reviewed' | 'returned';

export type ProviderStatus = 'active' | 'disabled';

export type ModelCapability = 'text' | 'image' | 'video' | 'web' | 'poster' | 'ppt' | 'multimodal' | 'code';

export type QuotaTxnType = 'grant' | 'consume' | 'refund' | 'reset';

export type WebProjectStatus = 'draft' | 'published' | 'archived';
