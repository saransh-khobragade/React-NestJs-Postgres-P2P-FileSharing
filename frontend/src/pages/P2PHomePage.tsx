import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/services/api';

export function P2PHomePage() {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');

  const createRoom = async () => {
    const resp = await api.post<{ id: string }>('/api/rooms', {});
    const id = resp.id;
    localStorage.setItem('p2p:name', name);
    window.location.href = `/p2p/room?roomId=${encodeURIComponent(id)}`;
  };

  const joinRoom = () => {
    localStorage.setItem('p2p:name', name);
    window.location.href = `/p2p/room?roomId=${encodeURIComponent(roomId)}`;
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Minimal P2P Share</h1>
      <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="flex gap-2">
        <Button className="flex-1" disabled={!name} onClick={createRoom}>Create Room</Button>
      </div>
      <div className="space-y-2">
        <Input placeholder="Room ID" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
        <Button disabled={!name || !roomId} onClick={joinRoom}>Join Room</Button>
      </div>
    </div>
  );
}

