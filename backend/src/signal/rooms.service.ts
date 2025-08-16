import { Injectable } from '@nestjs/common';

export interface PeerInfo {
  id: string; // user id
  name: string;
  socketId: string;
}

export interface RoomInfo {
  id: string;
  peers: PeerInfo[];
}

@Injectable()
export class RoomsService {
  private readonly rooms = new Map<string, RoomInfo>();

  createRoom(): RoomInfo {
    const id = Math.random().toString(36).slice(2, 8);
    const room: RoomInfo = { id, peers: [] };
    this.rooms.set(id, room);
    return room;
  }

  getRoom(id: string): RoomInfo | undefined {
    return this.rooms.get(id);
  }

  listPeers(id: string): PeerInfo[] {
    return this.rooms.get(id)?.peers ?? [];
  }

  addPeer(roomId: string, peer: PeerInfo): RoomInfo | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    const existingIdx = room.peers.findIndex((p) => p.id === peer.id);
    if (existingIdx >= 0) room.peers[existingIdx] = peer; else room.peers.push(peer);
    return room;
  }

  removePeerBySocket(socketId: string): { roomId: string; peer: PeerInfo } | null {
    for (const [roomId, room] of this.rooms.entries()) {
      const idx = room.peers.findIndex((p) => p.socketId === socketId);
      if (idx >= 0) {
        const [peer] = room.peers.splice(idx, 1);
        return { roomId, peer };
      }
    }
    return null;
  }

  findSocketIdByUserId(userId: string): string | null {
    for (const room of this.rooms.values()) {
      const peer = room.peers.find((p) => p.id === userId);
      if (peer) return peer.socketId;
    }
    return null;
  }

  findPeerBySocketId(socketId: string): PeerInfo | null {
    for (const room of this.rooms.values()) {
      const peer = room.peers.find((p) => p.socketId === socketId);
      if (peer) return peer;
    }
    return null;
  }
}

