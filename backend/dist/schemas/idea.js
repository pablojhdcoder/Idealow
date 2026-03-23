"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIdeaSchema = void 0;
const zod_1 = require("zod");
exports.createIdeaSchema = zod_1.z
    .object({
    content: zod_1.z.string().optional(),
    fileId: zod_1.z.string().uuid().optional(),
    sector: zod_1.z.string().optional(),
})
    .refine((data) => data.content || data.fileId, {
    message: 'Either content or fileId must be provided',
});
