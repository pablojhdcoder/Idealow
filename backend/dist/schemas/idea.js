"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refineAnswersBodySchema = exports.listIdeasQuerySchema = exports.createIdeaSchema = void 0;
const zod_1 = require("zod");
const MAX_FILES_PER_IDEA = 12;
exports.createIdeaSchema = zod_1.z
    .object({
    content: zod_1.z.string().optional(),
    /** Compatibilidad: un solo archivo */
    fileId: zod_1.z.string().uuid().optional(),
    /** Varias fuentes: varios archivos ya subidos */
    fileIds: zod_1.z.array(zod_1.z.string().uuid()).max(MAX_FILES_PER_IDEA).optional(),
    sector: zod_1.z.string().optional(),
})
    .refine((data) => {
    const hasText = Boolean(data.content?.trim());
    const hasOne = Boolean(data.fileId);
    const hasMany = Boolean(data.fileIds && data.fileIds.length > 0);
    return hasText || hasOne || hasMany;
}, {
    message: 'Debes enviar texto (content), fileId o al menos un fileIds',
});
exports.listIdeasQuerySchema = zod_1.z.object({
    cursor: zod_1.z.string().uuid().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(50).optional(),
});
const refineAnswerItemSchema = zod_1.z.object({
    questionId: zod_1.z.string().min(1).max(64),
    answer: zod_1.z.string().min(1).max(8000),
});
exports.refineAnswersBodySchema = zod_1.z.object({
    answers: zod_1.z.array(refineAnswerItemSchema).min(1).max(10),
});
