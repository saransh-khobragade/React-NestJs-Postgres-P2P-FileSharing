import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RoomsService, RoomInfo } from './rooms.service';

@Controller('api/rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Post()
  createRoom(): { id: string } {
    const room = this.rooms.createRoom();
    return { id: room.id };
  }

  @Get(':id')
  getRoom(@Param('id') id: string): RoomInfo | { error: string } {
    const room = this.rooms.getRoom(id);
    if (!room) return { error: 'Room not found' };
    return room;
  }
}

