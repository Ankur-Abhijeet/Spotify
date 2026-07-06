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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectController = void 0;
const common_1 = require("@nestjs/common");
const connect_service_1 = require("./connect.service");
const auth_guard_1 = require("../auth/auth.guard");
let ConnectController = class ConnectController {
    connectService;
    constructor(connectService) {
        this.connectService = connectService;
    }
    async registerDevice(req, body) {
        return this.connectService.registerDevice(req.user.sub, body);
    }
    async getDevices(req) {
        return this.connectService.getDevices(req.user.sub);
    }
    async transferPlayback(req, deviceId) {
        return this.connectService.transferPlayback(req.user.sub, deviceId);
    }
};
exports.ConnectController = ConnectController;
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ConnectController.prototype, "registerDevice", null);
__decorate([
    (0, common_1.Get)('devices'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ConnectController.prototype, "getDevices", null);
__decorate([
    (0, common_1.Post)('transfer'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)('deviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ConnectController.prototype, "transferPlayback", null);
exports.ConnectController = ConnectController = __decorate([
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.Controller)('connect'),
    __metadata("design:paramtypes", [connect_service_1.ConnectService])
], ConnectController);
//# sourceMappingURL=connect.controller.js.map