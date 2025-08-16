import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomsService } from './rooms.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/signal' })
export class SignalGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly rooms: RoomsService) {}

  handleDisconnect(client: Socket) {
    const removed = this.rooms.removePeerBySocket(client.id);
    if (removed) {
      const { roomId } = removed;
      this.server.to(`room:${roomId}`).emit('peer-left', { id: removed.peer.id, name: removed.peer.name });
    }
  }

  @SubscribeMessage('join-room')
  onJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string; name: string },
  ) {
    const { roomId, userId, name } = data;
    const room = this.rooms.addPeer(roomId, { id: userId, name, socketId: client.id });
    if (!room) return { error: 'Room not found' };
    const channel = `room:${roomId}`;
    void client.join(channel);
    client.emit('peers', room.peers.filter((p) => p.socketId !== client.id).map((p) => ({ id: p.id, name: p.name })));
    client.to(channel).emit('peer-joined', { id: userId, name });
    return { joined: roomId };
  }

  // Generic signaling relay: offer/answer/ice-candidate
  @SubscribeMessage('signal')
  onSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetId: string; payload: any },
  ) {
    const targetSocketId = this.rooms.findSocketIdByUserId(data.targetId);
    const fromPeer = this.rooms.findPeerBySocketId(client.id);
    if (targetSocketId) {
      this.server.to(targetSocketId).emit('signal', { from: fromPeer?.id ?? client.id, payload: data.payload });
    }
  }
}

