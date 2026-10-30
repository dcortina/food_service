import { Request } from 'express';

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

export function getRequestMeta(request: Request): RequestMeta {
  return {
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    requestId:
      (request.headers['x-request-id'] as string | undefined) ?? undefined,
  };
}
