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
    namespace: '/video',
})
export class VideoGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(VideoGateway.name);

    // Track which user is in which room
    private roomParticipants = new Map<string, Set<string>>();

    afterInit() {
        this.logger.log('Video WebSocket Gateway initialized');
    }

    handleConnection(client: Socket) {
        this.logger.log(`Video client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Video client disconnected: ${client.id}`);

        // Remove from all rooms on disconnect
        this.roomParticipants.forEach((participants, roomId) => {
            if (participants.has(client.id)) {
                participants.delete(client.id);
                // Notify others in the room
                client.to(`video:${roomId}`).emit('participantLeft', {
                    socketId: client.id,
                    message: 'A participant has left the call',
                });
                this.logger.log(`Client ${client.id} removed from room ${roomId}`);
            }
        });
    }

    // ─── Join video room ─────────────────────────────────────────
    @SubscribeMessage('joinVideoRoom')
    handleJoinRoom(
        @MessageBody() data: { roomId: string; userId: string; role: string },
        @ConnectedSocket() client: Socket,
    ) {
        const room = `video:${data.roomId}`;
        client.join(room);

        // Track participants
        if (!this.roomParticipants.has(data.roomId)) {
            this.roomParticipants.set(data.roomId, new Set());
        }
        this.roomParticipants.get(data.roomId).add(client.id);

        const participantCount = this.roomParticipants.get(data.roomId).size;

        this.logger.log(
            `Client ${client.id} (${data.role}) joined video room ${data.roomId}`,
        );

        // Notify others that someone joined
        client.to(room).emit('participantJoined', {
            socketId: client.id,
            userId: data.userId,
            role: data.role,
            message: `${data.role} has joined the call`,
        });

        return {
            event: 'joinedVideoRoom',
            roomId: data.roomId,
            participantCount,
            message: 'Joined video room successfully',
        };
    }

    // ─── Leave video room ────────────────────────────────────────
    @SubscribeMessage('leaveVideoRoom')
    handleLeaveRoom(
        @MessageBody() data: { roomId: string },
        @ConnectedSocket() client: Socket,
    ) {
        const room = `video:${data.roomId}`;
        client.leave(room);

        // Remove from tracking
        if (this.roomParticipants.has(data.roomId)) {
            this.roomParticipants.get(data.roomId).delete(client.id);
        }

        client.to(room).emit('participantLeft', {
            socketId: client.id,
            message: 'A participant has left the call',
        });

        this.logger.log(`Client ${client.id} left video room ${data.roomId}`);

        return { event: 'leftVideoRoom', roomId: data.roomId };
    }

    // ─── WebRTC Offer ────────────────────────────────────────────
    @SubscribeMessage('offer')
    handleOffer(
        @MessageBody() data: { roomId: string; offer: RTCSessionDescriptionInit },
        @ConnectedSocket() client: Socket,
    ) {
        this.logger.log(`Offer received in room ${data.roomId}`);

        // Forward offer to all other participants in the room
        client.to(`video:${data.roomId}`).emit('offer', {
            offer: data.offer,
            from: client.id,
        });
    }

    @SubscribeMessage('answer')
    handleAnswer(
        @MessageBody() data: { roomId: string; answer: RTCSessionDescriptionInit },
        @ConnectedSocket() client: Socket,
    ) {
        this.logger.log(`Answer received in room ${data.roomId}`);

        // Forward answer to all other participants in the room
        client.to(`video:${data.roomId}`).emit('answer', {
            answer: data.answer,
            from: client.id,
        });
    }

    @SubscribeMessage('ice-candidate')
    handleIceCandidate(
        @MessageBody() data: { roomId: string; candidate: RTCIceCandidateInit },
        @ConnectedSocket() client: Socket,
    ) {
        // Forward ICE candidate to all other participants
        client.to(`video:${data.roomId}`).emit('ice-candidate', {
            candidate: data.candidate,
            from: client.id,
        });
    }

    @SubscribeMessage('endCall')
    handleEndCall(
        @MessageBody() data: { roomId: string },
        @ConnectedSocket() client: Socket,
    ) {
        const room = `video:${data.roomId}`;

        this.logger.log(`Call ended in room ${data.roomId}`);


        this.server.to(room).emit('callEnded', {
            message: 'The call has been ended',
            endedBy: client.id,
        });

        this.roomParticipants.delete(data.roomId);
    }

    @SubscribeMessage('toggleMedia')
    handleToggleMedia(
        @MessageBody() data: {
            roomId: string;
            type: 'audio' | 'video';
            enabled: boolean;
        },
        @ConnectedSocket() client: Socket,
    ) {
        client.to(`video:${data.roomId}`).emit('mediaToggled', {
            socketId: client.id,
            type: data.type,
            enabled: data.enabled,
        });
    }

    emitSessionStarted(roomId: string, payload: any) {
        this.server.to(`video:${roomId}`).emit('sessionStarted', payload);
    }

    emitSessionEnded(roomId: string, payload: any) {
        this.server.to(`video:${roomId}`).emit('sessionEnded', payload);
    }
}