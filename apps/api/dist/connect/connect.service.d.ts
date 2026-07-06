export interface Device {
    id: string;
    name: string;
    isActive: boolean;
    volume: number;
    position: number;
    updatedAt: number;
}
export declare class ConnectService {
    private readonly logger;
    private readonly redisClient;
    private readonly memoryStore;
    constructor();
    private getKey;
    registerDevice(userId: string, deviceInput: {
        id: string;
        name: string;
        volume: number;
        position: number;
        isActive?: boolean;
    }): Promise<Device>;
    getDevices(userId: string): Promise<Device[]>;
    transferPlayback(userId: string, deviceId: string): Promise<{
        status: string;
        deviceId: string;
    }>;
}
