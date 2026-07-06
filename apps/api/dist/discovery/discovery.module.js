"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscoveryModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const discovery_event_entity_1 = require("./entities/discovery-event.entity");
const user_embedding_entity_1 = require("./entities/user-embedding.entity");
const track_feature_entity_1 = require("./entities/track-feature.entity");
const discovery_service_1 = require("./discovery.service");
const discovery_controller_1 = require("./discovery.controller");
const cohort_helper_1 = require("./cohort.helper");
const playlist_entity_1 = require("../library/entities/playlist.entity");
const playlist_track_entity_1 = require("../library/entities/playlist-track.entity");
const auth_module_1 = require("../auth/auth.module");
const catalog_module_1 = require("../catalog/catalog.module");
let DiscoveryModule = class DiscoveryModule {
};
exports.DiscoveryModule = DiscoveryModule;
exports.DiscoveryModule = DiscoveryModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                discovery_event_entity_1.DiscoveryEvent,
                user_embedding_entity_1.UserEmbedding,
                track_feature_entity_1.TrackFeature,
                playlist_entity_1.Playlist,
                playlist_track_entity_1.PlaylistTrack,
            ]),
            auth_module_1.AuthModule,
            catalog_module_1.CatalogModule,
        ],
        controllers: [discovery_controller_1.DiscoveryController],
        providers: [discovery_service_1.DiscoveryService, cohort_helper_1.CohortHelper],
        exports: [discovery_service_1.DiscoveryService, cohort_helper_1.CohortHelper, typeorm_1.TypeOrmModule],
    })
], DiscoveryModule);
//# sourceMappingURL=discovery.module.js.map