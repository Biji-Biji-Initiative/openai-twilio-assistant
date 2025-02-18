"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webappEnvSchema = exports.devPhoneEnvSchema = exports.wsServerEnvSchema = void 0;
exports.validateEnv = validateEnv;
const zod_1 = require("zod");
// Base environment schema shared between all services
const baseEnvSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test'])
        .default('development'),
    TWILIO_ACCOUNT_SID: zod_1.z.string()
        .min(1, 'Twilio Account SID is required'),
    TWILIO_AUTH_TOKEN: zod_1.z.string()
        .min(1, 'Twilio Auth Token is required'),
    TWILIO_PHONE_NUMBER: zod_1.z.string()
        .min(1, 'Twilio Phone Number is required'),
    OPENAI_API_KEY: zod_1.z.string()
        .optional()
        .describe('OpenAI API Key (optional)'),
});
// WebSocket server specific schema
exports.wsServerEnvSchema = baseEnvSchema.extend({
    PORT: zod_1.z.string()
        .default('8081')
        .transform((val) => {
        const port = Number(val);
        if (isNaN(port) || port < 1 || port > 65535) {
            throw new Error('Port must be a valid number between 1 and 65535');
        }
        return port;
    }),
    PUBLIC_URL: zod_1.z.string()
        .url()
        .default('http://localhost:8081'),
});
// Dev phone server specific schema
exports.devPhoneEnvSchema = baseEnvSchema.extend({
    DEV_PHONE_PORT: zod_1.z.string()
        .default('3001')
        .transform((val) => {
        const port = Number(val);
        if (isNaN(port) || port < 1 || port > 65535) {
            throw new Error('Port must be a valid number between 1 and 65535');
        }
        return port;
    }),
});
// Web app specific schema
exports.webappEnvSchema = baseEnvSchema.extend({
    NEXT_PUBLIC_BACKEND_URL: zod_1.z.string()
        .url()
        .default('http://localhost:8081'),
    NEXT_PUBLIC_DEV_PHONE_URL: zod_1.z.string()
        .url()
        .default('http://localhost:3001'),
});
function validateEnv(schema, env = process.env) {
    try {
        const result = schema.safeParse(env);
        if (!result.success) {
            const formatted = result.error.format();
            const errors = Object.entries(formatted)
                .filter(([key]) => key !== '_errors')
                .map(([key, value]) => ({
                field: key,
                errors: value._errors || []
            }))
                .filter(item => item.errors.length > 0);
            console.error('Environment validation failed:', errors);
            process.exit(1);
        }
        return result.data;
    }
    catch (error) {
        console.error('Unexpected error validating environment:', error);
        process.exit(1);
    }
}
