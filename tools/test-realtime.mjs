import { io } from 'socket.io-client';

const token = process.argv[2];
if (!token) {
  console.error('token required');
  process.exit(1);
}

const socket = io('http://localhost:3000/realtime', {
  auth: { token },
  transports: ['websocket'],
});

const timer = setTimeout(() => {
  console.error('timeout waiting for pedido.creado');
  socket.close();
  process.exit(2);
}, 10000);

socket.on('connect', () => console.log('connected', socket.id));
socket.on('connect_error', (error) => {
  console.error('connect_error', error.message);
  clearTimeout(timer);
  socket.close();
  process.exit(1);
});
socket.on('pedido.creado', (payload) => {
  console.log('pedido.creado', JSON.stringify(payload));
  clearTimeout(timer);
  socket.close();
  process.exit(0);
});
