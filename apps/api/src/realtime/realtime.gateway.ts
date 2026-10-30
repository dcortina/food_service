import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RealtimeService } from './realtime.service';

@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly realtime: RealtimeService,
  ) {}

  afterInit(server: Server): void {
    this.realtime.setServer(server);
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwt.verifyAsync<{
        sub: string;
        negocioId: string;
        sucursalId: string;
        typ?: string;
      }>(token, {
        algorithms: ['RS256'],
        issuer: this.config.get<string>('JWT_ISSUER') ?? 'cafeqr',
        audience: this.config.get<string>('JWT_AUDIENCE') ?? 'cafeqr-api',
      });

      if (payload.typ !== 'access') {
        client.disconnect();
        return;
      }

      client.data.user = payload;
      await client.join(`sucursal:${payload.sucursalId}`);
      await client.join(`kds:${payload.sucursalId}`);
    } catch {
      this.logger.warn('Conexión WebSocket rechazada');
      client.disconnect();
    }
  }

  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string') return authToken;

    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string') return queryToken;
    if (Array.isArray(queryToken)) return queryToken[0];

    return undefined;
  }
}
