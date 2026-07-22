import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { BYPASS_RESPONSE_WRAP_KEY } from '../decorators/bypass-response-wrap.decorator';

export interface ApiResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(ctx: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T> | T> {
    const bypass = this.reflector.getAllAndOverride<boolean>(BYPASS_RESPONSE_WRAP_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (bypass) return next.handle();

    return next.handle().pipe(
      map((data) => {
        // Pass raw stream / file responses through.
        const http = ctx.switchToHttp();
        const res = http.getResponse();
        if (res?.headersSent) return data;
        const contentType = res?.getHeader?.('content-type');
        if (typeof contentType === 'string' && contentType.startsWith('text/html')) {
          return data;
        }
        return {
          success: true as const,
          data: data as T,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
