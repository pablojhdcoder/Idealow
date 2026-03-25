"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerValidationSseClient = registerValidationSseClient;
exports.unregisterValidationSseClient = unregisterValidationSseClient;
exports.emitValidationSse = emitValidationSse;
const clients = new Map();
function registerValidationSseClient(ideaId, res) {
    const list = clients.get(ideaId) ?? [];
    list.push(res);
    clients.set(ideaId, list);
}
function unregisterValidationSseClient(ideaId, res) {
    const list = (clients.get(ideaId) ?? []).filter(c => c !== res);
    if (list.length === 0) {
        clients.delete(ideaId);
    }
    else {
        clients.set(ideaId, list);
    }
}
function emitValidationSse(ideaId, data) {
    const line = `data: ${JSON.stringify(data)}\n\n`;
    for (const res of clients.get(ideaId) ?? []) {
        try {
            res.write(line);
        }
        catch {
            // cliente desconectado; se limpia en close
        }
    }
}
