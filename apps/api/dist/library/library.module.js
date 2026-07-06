"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LibraryModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const playlist_entity_1 = require("./entities/playlist.entity");
const playlist_track_entity_1 = require("./entities/playlist-track.entity");
const library_item_entity_1 = require("./entities/library-item.entity");
const library_service_1 = require("./library.service");
const library_controller_1 = require("./library.controller");
const auth_module_1 = require("../auth/auth.module");
const catalog_module_1 = require("../catalog/catalog.module");
let LibraryModule = class LibraryModule {
};
exports.LibraryModule = LibraryModule;
exports.LibraryModule = LibraryModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([playlist_entity_1.Playlist, playlist_track_entity_1.PlaylistTrack, library_item_entity_1.LibraryItem]),
            auth_module_1.AuthModule,
            catalog_module_1.CatalogModule,
        ],
        controllers: [library_controller_1.LibraryController],
        providers: [library_service_1.LibraryService],
        exports: [library_service_1.LibraryService, typeorm_1.TypeOrmModule],
    })
], LibraryModule);
//# sourceMappingURL=library.module.js.map