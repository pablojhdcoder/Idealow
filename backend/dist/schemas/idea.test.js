"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const idea_1 = require("./idea");
(0, vitest_1.describe)('createIdeaSchema', () => {
    (0, vitest_1.it)('acepta payload con contenido de texto valido', () => {
        // Arrange
        const payload = { content: 'Una idea concreta' };
        // Act
        const result = idea_1.createIdeaSchema.safeParse(payload);
        // Assert
        (0, vitest_1.expect)(result.success).toBe(true);
    });
    (0, vitest_1.it)('rechaza payload vacio', () => {
        // Arrange
        const payload = {};
        // Act
        const result = idea_1.createIdeaSchema.safeParse(payload);
        // Assert
        (0, vitest_1.expect)(result.success).toBe(false);
    });
    (0, vitest_1.it)('rechaza fileId con formato no UUID', () => {
        // Arrange
        const payload = { fileId: 'archivo-1' };
        // Act
        const result = idea_1.createIdeaSchema.safeParse(payload);
        // Assert
        (0, vitest_1.expect)(result.success).toBe(false);
    });
    (0, vitest_1.it)('rechaza cuando se envian mas de 12 fileIds', () => {
        // Arrange
        const payload = {
            fileIds: Array.from({ length: 13 }, (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`),
        };
        // Act
        const result = idea_1.createIdeaSchema.safeParse(payload);
        // Assert
        (0, vitest_1.expect)(result.success).toBe(false);
    });
});
