import { ConnectService } from './connect.service';
export declare class ConnectController {
    private readonly connectService;
    constructor(connectService: ConnectService);
    registerDevice(req: any, body: {
        id: string;
        name: string;
        volume: number;
        position: number;
        isActive?: boolean;
    }): Promise<import("./connect.service").Device>;
    getDevices(req: any): Promise<import("./connect.service").Device[]>;
    transferPlayback(req: any, deviceId: string): Promise<{
        status: string;
        deviceId: string;
    }>;
}
