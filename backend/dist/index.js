"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const config_1 = require("./config");
const auth_1 = __importDefault(require("./routes/auth"));
const ideas_1 = __importDefault(require("./routes/ideas"));
const validation_1 = __importDefault(require("./routes/validation"));
const users_1 = __importDefault(require("./routes/users"));
const feed_1 = __importDefault(require("./routes/feed"));
const files_1 = __importDefault(require("./routes/files"));
const semantic_1 = __importDefault(require("./routes/semantic"));
const errors_1 = require("./middleware/errors");
const requestLogger_1 = require("./middleware/requestLogger");
const logger_1 = require("./lib/logger");
const app = (0, express_1.default)();
app.set('trust proxy', config_1.config.trustProxy);
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    ...(config_1.config.nodeEnv !== 'production' ? { strictTransportSecurity: false } : {}),
}));
const corsOptions = {
    origin(origin, callback) {
        if (!origin) {
            callback(null, true);
            return;
        }
        callback(null, config_1.config.corsOrigins.includes(origin));
    },
    credentials: true,
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use(requestLogger_1.requestLogger);
app.use('/api/auth', auth_1.default);
app.use('/api/ideas', ideas_1.default);
app.use('/api/files', files_1.default);
app.use('/api/validation', validation_1.default);
app.use('/api/users', users_1.default);
app.use('/api/feed', feed_1.default);
app.use('/api/semantic', semantic_1.default);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use(errors_1.errorHandler);
app.listen(config_1.config.port, () => {
    logger_1.logger.info({
        port: config_1.config.port,
        nodeEnv: config_1.config.nodeEnv,
    }, 'backend server started');
});
