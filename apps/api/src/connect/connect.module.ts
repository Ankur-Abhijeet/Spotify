import { Module } from '@nestjs/common';
import { ConnectService } from './connect.service';
import { ConnectController } from './connect.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ConnectController],
  providers: [ConnectService],
  exports: [ConnectService],
})
export class ConnectModule {}
