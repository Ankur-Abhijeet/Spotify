import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(
    @Body()
    body: {
      email: string;
      password?: string;
      firstName?: string;
      lastName?: string;
    },
  ) {
    // If password is not provided, create a mock one for OAuth/Social compatibility
    const password = body.password || Math.random().toString(36).slice(-10);
    return this.authService.signup(
      body.email,
      password,
      body.firstName,
      body.lastName,
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { email: string; password?: string }) {
    return this.authService.login(body.email, body.password || '');
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async getMe(@Req() req: any) {
    return this.authService.getUserProfile(req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Delete('me')
  async deleteMe(@Req() req: any) {
    return this.authService.deleteProfile(req.user.sub);
  }
}
