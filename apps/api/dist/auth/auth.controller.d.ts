import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    signup(body: {
        email: string;
        password?: string;
        firstName?: string;
        lastName?: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
        };
    }>;
    login(body: {
        email: string;
        password?: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
        };
    }>;
    refresh(body: {
        refreshToken: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
        };
    }>;
    getMe(req: any): Promise<import("./entities/user.entity").User>;
    deleteMe(req: any): Promise<{
        status: string;
        userId: string;
    }>;
}
