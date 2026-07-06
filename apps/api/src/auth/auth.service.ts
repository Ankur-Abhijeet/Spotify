import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async signup(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
  ) {
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = this.userRepository.create({
      email,
      passwordHash,
      firstName,
      lastName,
    });

    const savedUser = await this.userRepository.save(user);
    return this.generateTokens(savedUser.id, savedUser.email);
  }

  async login(email: string, password: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.generateTokens(user.id, user.email);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret:
          process.env.JWT_REFRESH_SECRET ||
          'super_secret_jwt_refresh_key_change_me_in_production',
      });
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      return this.generateTokens(user.id, user.email);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async getUserProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    return user;
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret:
        process.env.JWT_SECRET ||
        'super_secret_jwt_access_key_change_me_in_production',
      expiresIn: '15m',
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret:
        process.env.JWT_REFRESH_SECRET ||
        'super_secret_jwt_refresh_key_change_me_in_production',
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      user: { id: userId, email },
    };
  }

  async deleteProfile(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPostgres =
      this.userRepository.metadata.connection.options.type === 'postgres';
    try {
      if (isPostgres) {
        await this.userRepository.query(
          'DELETE FROM user_embeddings WHERE "userId" = $1',
          [userId],
        );
      } else {
        await this.userRepository.query(
          'DELETE FROM user_embeddings WHERE userId = ?',
          [userId],
        );
      }
    } catch (err) {
      // ignore if table doesn't exist
    }

    await this.userRepository.remove(user);
    return { status: 'deleted', userId };
  }
}
