"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonLogger = void 0;
const common_1 = require("@nestjs/common");
let JsonLogger = class JsonLogger {
    formatMessage(level, message, context, trace) {
        const logObject = {
            timestamp: new Date().toISOString(),
            level,
            context: context || 'Application',
            message: typeof message === 'object'
                ? message
                : String(message),
            ...(trace && { trace }),
        };
        return JSON.stringify(logObject);
    }
    log(message, context) {
        console.log(this.formatMessage('INFO', message, context));
    }
    error(message, trace, context) {
        console.error(this.formatMessage('ERROR', message, context, trace));
    }
    warn(message, context) {
        console.warn(this.formatMessage('WARN', message, context));
    }
    debug(message, context) {
        console.debug(this.formatMessage('DEBUG', message, context));
    }
    verbose(message, context) {
        console.log(this.formatMessage('VERBOSE', message, context));
    }
};
exports.JsonLogger = JsonLogger;
exports.JsonLogger = JsonLogger = __decorate([
    (0, common_1.Injectable)()
], JsonLogger);
//# sourceMappingURL=json-logger.js.map