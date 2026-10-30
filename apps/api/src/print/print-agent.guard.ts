import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrintAgentGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined> }>();
    const expected = this.config.get<string>('PRINT_AGENT_TOKEN');

    if (!expected) {
      throw new UnauthorizedException(
        'PRINT_AGENT_TOKEN no está configurado',
      );
    }

    const header = request.headers['authorization'];
    const token = header?.startsWith('Bearer ')
      ? header.slice(7)
      : undefined;

    if (token !== expected) {
      throw new UnauthorizedException('Token de impresión inválido');
    }

    return true;
  }
}
