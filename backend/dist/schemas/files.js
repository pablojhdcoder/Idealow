"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.abandonUploadsBodySchema = void 0;
const zod_1 = require("zod");
exports.abandonUploadsBodySchema = zod_1.z.object({
    fileIds: zod_1.z.array(zod_1.z.string().uuid()).min(1).max(50),
});
