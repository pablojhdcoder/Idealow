"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.signToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const signToken = (userId) => jsonwebtoken_1.default.sign({ userId }, config_1.config.jwtSecret, { expiresIn: '7d' });
exports.signToken = signToken;
const verifyToken = (token) => jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
exports.verifyToken = verifyToken;
