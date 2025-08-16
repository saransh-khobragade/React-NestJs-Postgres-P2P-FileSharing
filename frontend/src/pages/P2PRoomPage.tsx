import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { io, Socket } from 'socket.io-client';

type Peer = { id: string; name: string };

export function P2PRoomPage() {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [receivingFileUrl, setReceivingFileUrl] = useState<string | null>(null);
  const [receivingFileName, setReceivingFileName] = useState<string>('received.bin');
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // const fileReaderRef = useRef<FileReader | null>(null);
  const targetRef = useRef<Peer | null>(null);

  const name = useMemo(() => localStorage.getItem('p2p:name') || 'Anonymous', []);
  const { roomId } = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return { roomId: params.get('roomId') || '' };
  }, []);

  const apiUrl = import.meta.env['VITE_API_URL'] as string;

  useEffect(() => {
    const socket = io(apiUrl + '/signal');
    socketRef.current = socket;
    socket.on('connect', () => {
      setLog((l) => [...l, 'connected']);
      socket.emit('join-room', { roomId, userId: socket.id, name });
    });
    socket.on('peers', (list: Peer[]) => setPeers(list));
    socket.on('peer-joined', (p: Peer) => setPeers((prev) => [...prev, p]));
    socket.on('peer-left', (p: Peer) => setPeers((prev) => prev.filter((x) => x.id !== p.id)));
    socket.on('signal', async ({ from, payload }: { from: string; payload: any }) => {
      const pc = ensurePeerConnection(socket);
      if (payload.type === 'offer') {
        targetRef.current = { id: from, name: 'Peer' };
        await pc.setRemoteDescription(new RTCSessionDescription(payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('signal', { targetId: from, payload: answer });
      } else if (payload.type === 'answer') {
        if (!targetRef.current) targetRef.current = { id: from, name: 'Peer' };
        await pc.setRemoteDescription(new RTCSessionDescription(payload));
      } else if (payload.candidate) {
        await pc.addIceCandidate(payload);
      }
    });
    return () => { socket.disconnect(); };
  }, [apiUrl, roomId, name]);

  function ensurePeerConnection(socket: Socket): RTCPeerConnection {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.onicecandidate = (e) => { if (e.candidate && targetRef.current) socket.emit('signal', { targetId: targetRef.current.id, payload: e.candidate }); };
    pc.ondatachannel = (e) => setupDataChannel(e.channel);
    pcRef.current = pc;
    return pc;
  }

  function setupDataChannel(dc: RTCDataChannel) {
    dcRef.current = dc;
    dc.binaryType = 'arraybuffer';
    dc.onopen = () => setLog((l) => [...l, 'datachannel open']);
    dc.onmessage = (e) => {
      if (typeof e.data === 'string' && e.data.startsWith('FILE_META:')) {
        const meta = JSON.parse(e.data.slice('FILE_META:'.length));
        setReceivingFileName(meta.name || 'received.bin');
        chunksRef.current = [];
      } else if (e.data === 'FILE_END') {
        const blob = new Blob(chunksRef.current);
        const url = URL.createObjectURL(blob);
        setReceivingFileUrl(url);
        chunksRef.current = [];
      } else {
        const data = e.data instanceof ArrayBuffer ? e.data : (e.data as Blob);
        chunksRef.current.push(new Blob([data]));
      }
    };
  }

  async function call(peer: Peer) {
    targetRef.current = peer;
    const socket = socketRef.current!;
    const pc = ensurePeerConnection(socket);
    const dc = pc.createDataChannel('file');
    setupDataChannel(dc);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('signal', { targetId: peer.id, payload: offer });
  }

  async function sendFile(file: File) {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== 'open') { setLog((l) => [...l, 'datachannel not open']); return; }
    dc.send('FILE_META:' + JSON.stringify({ name: file.name, size: file.size }));
    const chunkSize = 16 * 1024;
    let offset = 0;
    while (offset < file.size) {
      const slice = file.slice(offset, offset + chunkSize);
      const buf = await slice.arrayBuffer();
      dc.send(buf);
      offset += chunkSize;
      await new Promise((r) => setTimeout(r));
    }
    dc.send('FILE_END');
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-medium">Room: {roomId}</div>
        <div className="opacity-70">You: {name}</div>
      </div>
      <div className="space-y-2">
        <div className="font-semibold">Peers</div>
        <div className="flex gap-2 flex-wrap">
          {peers.map((p) => (
            <div key={p.id} className="border rounded p-2 space-x-2">
              <span>{p.name}</span>
              <Button size="sm" onClick={() => call(p)}>Connect</Button>
            </div>
          ))}
          {peers.length === 0 && <div className="text-sm opacity-70">No peers yet</div>}
        </div>
      </div>
      <div className="space-y-2">
        <div className="font-semibold">Send a file</div>
        <Input type="file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void sendFile(f); }} />
      </div>
      {receivingFileUrl && (
        <div className="space-y-1">
          <div className="font-semibold">Received:</div>
          <a className="text-blue-500 underline" href={receivingFileUrl} download={receivingFileName}>Download {receivingFileName}</a>
        </div>
      )}
      <div className="space-y-1">
        <div className="font-semibold">Log</div>
        <div className="text-xs bg-muted p-2 rounded min-h-[80px]">
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    </div>
  );
}

