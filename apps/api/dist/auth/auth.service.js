"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const user_entity_1 = require("./entities/user.entity");
let AuthService = class AuthService {
    userRepository;
    jwtService;
    constructor(userRepository, jwtService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }
    async signup(email, password, firstName, lastName) {
        const existing = await this.userRepository.findOne({ where: { email } });
        if (existing) {
            throw new common_1.ConflictException('A user with this email already exists');
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
    async login(email, password) {
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        return this.generateTokens(user.id, user.email);
    }
    async refresh(refreshToken) {
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: process.env.JWT_REFRESH_SECRET ||
                    'super_secret_jwt_refresh_key_change_me_in_production',
            });
            const user = await this.userRepository.findOne({
                where: { id: payload.sub },
            });
            if (!user) {
                throw new common_1.UnauthorizedException('User not found');
            }
            return this.generateTokens(user.id, user.email);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
    }
    async getUserProfile(userId) {
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
            throw new common_1.NotFoundException('User profile not found');
        }
        return user;
    }
    async generateTokens(userId, email) {
        const payload = { sub: userId, email };
        const accessToken = await this.jwtService.signAsync(payload, {
            secret: process.env.JWT_SECRET ||
                'super_secret_jwt_access_key_change_me_in_production',
            expiresIn: '15m',
        });
        const refreshToken = await this.jwtService.signAsync(payload, {
            secret: process.env.JWT_REFRESH_SECRET ||
                'super_secret_jwt_refresh_key_change_me_in_production',
            expiresIn: '7d',
        });
        return {
            accessToken,
            refreshToken,
            user: { id: userId, email },
        };
    }
    async deleteProfile(userId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const isPostgres = this.userRepository.metadata.connection.options.type === 'postgres';
        try {
            if (isPostgres) {
                await this.userRepository.query('DELETE FROM user_embeddings WHERE "userId" = $1', [userId]);
            }
            else {
                await this.userRepository.query('DELETE FROM user_embeddings WHERE userId = ?', [userId]);
            }
        }
        catch (err) {
        }
        await this.userRepository.remove(user);
        return { status: 'deleted', userId };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map