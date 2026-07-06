import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import Redis from 'ioredis';

export interface Device {
  id: string;
  name: string;
  isActive: boolean;
  volume: number;
  position: number;
  updatedAt: number;
}

@Injectable()
export class ConnectService {
  private readonly logger = new Logger(ConnectService.name);
  private readonly redisClient: Redis | null = null;
  private readonly memoryStore = new Map<string, string>(); // user fallback storage

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.redisClient = new Redis(redisUrl);
      } catch (err) {
        this.logger.error('Failed to initialize Redis in ConnectService', err);
      }
    }
  }

  private getKey(userId: string) {
    return `connect:devices:${userId}`;
  }

  async registerDevice(
    userId: string,
    deviceInput: {
      id: string;
      name: string;
      volume: number;
      position: number;
      isActive?: boolean;
    },
  ) {
    const key = this.getKey(userId);
    let devices: Device[] = [];

    // Fetch existing
    if (this.redisClient) {
      const raw = await this.redisClient.get(key);
      if (raw) devices = JSON.parse(raw);
    } else {
      const raw = this.memoryStore.get(key);
      if (raw) devices = JSON.parse(raw);
    }

    // Prune devices inactive for > 45 seconds
    const now = Date.now();
    devices = devices.filter((d) => now - d.updatedAt < 45000);

    // Find and update or insert new
    const idx = devices.findIndex((d) => d.id === deviceInput.id);
    const newDevice: Device = {
      id: deviceInput.id,
      name: deviceInput.name,
      isActive: deviceInput.isActive ?? devices.length === 0, // Default first registered to active
      volume: deviceInput.volume,
      position: deviceInput.position,
      updatedAt: now,
    };

    // If setting active, deactivate others
    if (newDevice.isActive) {
      devices.forEach((d) => {
        d.isActive = false;
      });
    }

    if (idx !== -1) {
      devices[idx] = newDevice;
    } else {
      devices.push(newDevice);
    }

    // Save
    const val = JSON.stringify(devices);
    if (this.redisClient) {
      await this.redisClient.set(key, val, 'EX', 86400); // 24h
    } else {
      this.memoryStore.set(key, val);
    }

    return newDevice;
  }

  async getDevices(userId: string) {
    const key = this.getKey(userId);
    let devices: Device[] = [];

    if (this.redisClient) {
      const raw = await this.redisClient.get(key);
      if (raw) devices = JSON.parse(raw);
    } else {
      const raw = this.memoryStore.get(key);
      if (raw) devices = JSON.parse(raw);
    }

    // Prune inactive before return
    const now = Date.now();
    return devices.filter((d) => now - d.updatedAt < 45000);
  }

  async transferPlayback(userId: string, deviceId: string) {
    const key = this.getKey(userId);
    let devices: Device[] = [];

    if (this.redisClient) {
      const raw = await this.redisClient.get(key);
      if (raw) devices = JSON.parse(raw);
    } else {
      const raw = this.memoryStore.get(key);
      if (raw) devices = JSON.parse(raw);
    }

    const target = devices.find((d) => d.id === deviceId);
    if (!target) {
      throw new NotFoundException('Device not registered');
    }

    // Deactivate all, activate target
    devices.forEach((d) => {
      d.isActive = d.id === deviceId;
      d.updatedAt = Date.now();
    });

    const val = JSON.stringify(devices);
    if (this.redisClient) {
      await this.redisClient.set(key, val, 'EX', 86400);
    } else {
      this.memoryStore.set(key, val);
    }

    return { status: 'transferred', deviceId };
  }
}
