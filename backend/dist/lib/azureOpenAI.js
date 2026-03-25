"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAzureOpenAIClient = getAzureOpenAIClient;
const openai_1 = require("openai");
const config_1 = require("../config");
let client = null;
/** Cliente singleton; el nombre del deployment se pasa en cada llamada (`model`). */
function getAzureOpenAIClient() {
    if (!client) {
        client = new openai_1.AzureOpenAI({
            endpoint: config_1.config.azure.endpoint,
            apiKey: config_1.config.azure.apiKey,
            apiVersion: config_1.config.azure.apiVersion,
        });
    }
    return client;
}
