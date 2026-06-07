import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/queue',
})
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ─── Client joins a doctor's queue room ──────────────────────
  @SubscribeMessage('joinQueueRoom')
  async handleJoinRoom(
    @MessageBody() data: { doctorId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `queue:${data.doctorId}`;
    await client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room}`);
    return { event: 'joinedRoom', room };
  }

  // ─── Client leaves a doctor's queue room ─────────────────────
  @SubscribeMessage('leaveQueueRoom')
  async handleLeaveRoom(
    @MessageBody() data: { doctorId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `queue:${data.doctorId}`;
    await client.leave(room);
    this.logger.log(`Client ${client.id} left room ${room}`);
    return { event: 'leftRoom', room };
  }

  // ─── Emit queue update to all clients in a room ──────────────
  emitQueueUpdate(doctorId: string, payload: any) {
    this.server.to(`queue:${doctorId}`).emit('queueUpdated', payload);
  }

  // ─── Emit position change to a specific patient ──────────────
  emitPositionChange(doctorId: string, payload: any) {
    this.server.to(`queue:${doctorId}`).emit('positionChanged', payload);
  }

  // ─── Emit consultation started to a specific room ────────────
  emitConsultationStarted(doctorId: string, payload: any) {
    this.server.to(`queue:${doctorId}`).emit('consultationStarted', payload);
  }
}
