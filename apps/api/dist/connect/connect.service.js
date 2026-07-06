"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ConnectService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
let ConnectService = ConnectService_1 = class ConnectService {
    logger = new common_1.Logger(ConnectService_1.name);
    redisClient = null;
    memoryStore = new Map();
    constructor() {
        const redisUrl = process.env.REDIS_URL;
        if (redisUrl) {
            try {
                this.redisClient = new ioredis_1.default(redisUrl);
            }
            catch (err) {
                this.logger.error('Failed to initialize Redis in ConnectService', err);
            }
        }
    }
    getKey(userId) {
        return `connect:devices:${userId}`;
    }
    async registerDevice(userId, deviceInput) {
        const key = this.getKey(userId);
        let devices = [];
        if (this.redisClient) {
            const raw = await this.redisClient.get(key);
            if (raw)
                devices = JSON.parse(raw);
        }
        else {
            const raw = this.memoryStore.get(key);
            if (raw)
                devices = JSON.parse(raw);
        }
        const now = Date.now();
        devices = devices.filter((d) => now - d.updatedAt < 45000);
        const idx = devices.findIndex((d) => d.id === deviceInput.id);
        const newDevice = {
            id: deviceInput.id,
            name: deviceInput.name,
            isActive: deviceInput.isActive ?? devices.length === 0,
            volume: deviceInput.volume,
            position: deviceInput.position,
            updatedAt: now,
        };
        if (newDevice.isActive) {
            devices.forEach((d) => {
                d.isActive = false;
            });
        }
        if (idx !== -1) {
            devices[idx] = newDevice;
        }
        else {
            devices.push(newDevice);
        }
        const val = JSON.stringify(devices);
        if (this.redisClient) {
            await this.redisClient.set(key, val, 'EX', 86400);
        }
        else {
            this.memoryStore.set(key, val);
        }
        return newDevice;
    }
    async getDevices(userId) {
        const key = this.getKey(userId);
        let devices = [];
        if (this.redisClient) {
            const raw = await this.redisClient.get(key);
            if (raw)
                devices = JSON.parse(raw);
        }
        else {
            const raw = this.memoryStore.get(key);
            if (raw)
                devices = JSON.parse(raw);
        }
        const now = Date.now();
        return devices.filter((d) => now - d.updatedAt < 45000);
    }
    async transferPlayback(userId, deviceId) {
        const key = this.getKey(userId);
        let devices = [];
        if (this.redisClient) {
            const raw = await this.redisClient.get(key);
            if (raw)
                devices = JSON.parse(raw);
        }
        else {
            const raw = this.memoryStore.get(key);
            if (raw)
                devices = JSON.parse(raw);
        }
        const target = devices.find((d) => d.id === deviceId);
        if (!target) {
            throw new common_1.NotFoundException('Device not registered');
        }
        devices.forEach((d) => {
            d.isActive = d.id === deviceId;
            d.updatedAt = Date.now();
        });
        const val = JSON.stringify(devices);
        if (this.redisClient) {
            await this.redisClient.set(key, val, 'EX', 86400);
        }
        else {
            this.memoryStore.set(key, val);
        }
        return { status: 'transferred', deviceId };
    }
};
exports.ConnectService = ConnectService;
exports.ConnectService = ConnectService = ConnectService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], ConnectService);
//# sourceMappingURL=connect.service.js.map