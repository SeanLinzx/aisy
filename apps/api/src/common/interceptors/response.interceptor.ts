import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ApiResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
  intercept(ctx: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T> | T> {
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
