"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const follow_entity_1 = require("./entities/follow.entity");
const social_service_1 = require("./social.service");
const social_controller_1 = require("./social.controller");
const auth_module_1 = require("../auth/auth.module");
const catalog_module_1 = require("../catalog/catalog.module");
const library_module_1 = require("../library/library.module");
const playback_event_entity_1 = require("../playback/entities/playback-event.entity");
let SocialModule = class SocialModule {
};
exports.SocialModule = SocialModule;
exports.SocialModule = SocialModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([follow_entity_1.Follow, playback_event_entity_1.PlaybackEvent]),
            auth_module_1.AuthModule,
            catalog_module_1.CatalogModule,
            library_module_1.LibraryModule,
        ],
        controllers: [social_controller_1.SocialController],
        providers: [social_service_1.SocialService],
        exports: [social_service_1.SocialService, typeorm_1.TypeOrmModule],
    })
], SocialModule);
//# sourceMappingURL=social.module.js.map