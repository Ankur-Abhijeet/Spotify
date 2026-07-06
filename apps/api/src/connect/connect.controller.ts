import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ConnectService } from './connect.service';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('connect')
export class ConnectController {
  constructor(private readonly connectService: ConnectService) {}

  @Post('register')
  async registerDevice(
    @Req() req: any,
    @Body()
    body: {
      id: string;
      name: string;
      volume: number;
      position: number;
      isActive?: boolean;
    },
  ) {
    return this.connectService.registerDevice(req.user.sub, body);
  }

  @Get('devices')
  async getDevices(@Req() req: any) {
    return this.connectService.getDevices(req.user.sub);
  }

  @Post('transfer')
  async transferPlayback(@Req() req: any, @Body('deviceId') deviceId: string) {
    return this.connectService.transferPlayback(req.user.sub, deviceId);
  }
}
