"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const database_config_1 = require("./database.config");
const auth_module_1 = require("./auth/auth.module");
const catalog_module_1 = require("./catalog/catalog.module");
const library_module_1 = require("./library/library.module");
const playback_module_1 = require("./playback/playback.module");
const search_module_1 = require("./search/search.module");
const discovery_module_1 = require("./discovery/discovery.module");
const social_module_1 = require("./social/social.module");
const connect_module_1 = require("./connect/connect.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRoot((0, database_config_1.getTypeOrmConfig)()),
            auth_module_1.AuthModule,
            catalog_module_1.CatalogModule,
            library_module_1.LibraryModule,
            playback_module_1.PlaybackModule,
            search_module_1.SearchModule,
            discovery_module_1.DiscoveryModule,
            social_module_1.SocialModule,
            connect_module_1.ConnectModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map