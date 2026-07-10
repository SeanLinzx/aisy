import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { PUBLIC_KEY } from '../decorators/roles.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const token = this.extract(req);
    if (!token) throw new UnauthorizedException('未登录');
    try {
      const payload = await this.jwt.verifyAsync<Record<string, unknown>>(token, {
        secret: process.env.JWT_SECRET || 'replace_me',
      });
      const userId = payload.sub ?? payload.id ?? payload.userId;
      if (!userId || typeof userId !== 'string') {
        throw new UnauthorizedException('登录态无效，请重新登录');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, role: true, displayName: true, status: true },
      });
      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('账号不存在或已失效，请重新登录');
      }

      (req as any).user = {
        id: user.id,
        username: user.username,
        role: user.role,
        displayName: user.displayName,
      };
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('登录态失效，请重新登录');
    }
  }

  private extract(req: Request): string | null {
    const cookieName = process.env.COOKIE_NAME || 'ai_camp_token';
    const fromCookie = req.cookies?.[cookieName];
    if (fromCookie) return fromCookie;
    const h = req.headers.authorization;
    if (h?.startsWith('Bearer ')) return h.slice(7);
    return null;
  }
}
