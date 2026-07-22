import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * 已登录用户按 userId 限流，未登录仍按 IP。
 * 机房 NAT 共 IP 时，避免 30 个学生共享同一个 600/min 桶。
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req.user as { id?: string } | undefined;
    if (user?.id) return `user:${user.id}`;
    const ip = (req as { ip?: string; ips?: string[] }).ip;
    const ips = (req as { ips?: string[] }).ips;
    return `ip:${ips?.length ? ips[0] : ip ?? 'unknown'}`;
  }
}
