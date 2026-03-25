"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const config_1 = require("../config");
const isProduction = config_1.config.nodeEnv === 'production';
exports.logger = (0, pino_1.default)({
    level: isProduction ? 'info' : 'debug',
    base: {
        service: 'backend',
        env: config_1.config.nodeEnv,
    },
    redact: {
        paths: [
            'req.headers.authorization',
            'authorization',
            'token',
            'password',
            '*.password',
            '*.apiKey',
            '*.secret',
            '*.jwt',
        ],
        censor: '[redacted]',
    },
    transport: isProduction
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        },
});
