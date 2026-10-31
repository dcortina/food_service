import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from '@cafeqr/auth';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class KdsRealtimeService {
  private readonly auth = inject(AuthService);

  private socket: Socket | null = null;
  private readonly orderChanged = new Subject<void>();
  private readonly connectedState = signal(false);

  readonly orderChanged$ = this.orderChanged.asObservable();
  readonly connected = this.connectedState.asReadonly();

  connect(): void {
    if (this.socket || !this.auth.accessToken()) {
      return;
    }

    this.socket = io(`${window.location.origin}/realtime`, {
      auth: (callback) => callback({ token: this.auth.accessToken() }),
      transports: ['websocket'],
    });

    this.socket.on('connect', () => this.connectedState.set(true));
    this.socket.on('disconnect', () => this.connectedState.set(false));
    this.socket.on('connect_error', () => this.connectedState.set(false));

    for (const event of [
      'pedido.creado',
      'pedido.actualizado',
      'pedido.item.actualizado',
    ]) {
      this.socket.on(event, () => this.orderChanged.next());
    }
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.connectedState.set(false);
  }
}
