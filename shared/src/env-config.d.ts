import { z } from 'zod';
export declare const wsServerEnvSchema: z.ZodObject<z.objectUtil.extendShape<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    TWILIO_ACCOUNT_SID: z.ZodString;
    TWILIO_AUTH_TOKEN: z.ZodString;
    TWILIO_PHONE_NUMBER: z.ZodString;
    OPENAI_API_KEY: z.ZodOptional<z.ZodString>;
}, {
    PORT: z.ZodEffects<z.ZodDefault<z.ZodString>, number, string | undefined>;
    PUBLIC_URL: z.ZodDefault<z.ZodString>;
}>, "strip", z.ZodTypeAny, {
    NODE_ENV: "development" | "production" | "test";
    TWILIO_ACCOUNT_SID: string;
    TWILIO_AUTH_TOKEN: string;
    TWILIO_PHONE_NUMBER: string;
    PORT: number;
    PUBLIC_URL: string;
    OPENAI_API_KEY?: string | undefined;
}, {
    TWILIO_ACCOUNT_SID: string;
    TWILIO_AUTH_TOKEN: string;
    TWILIO_PHONE_NUMBER: string;
    NODE_ENV?: "development" | "production" | "test" | undefined;
    OPENAI_API_KEY?: string | undefined;
    PORT?: string | undefined;
    PUBLIC_URL?: string | undefined;
}>;
export declare const devPhoneEnvSchema: z.ZodObject<z.objectUtil.extendShape<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    TWILIO_ACCOUNT_SID: z.ZodString;
    TWILIO_AUTH_TOKEN: z.ZodString;
    TWILIO_PHONE_NUMBER: z.ZodString;
    OPENAI_API_KEY: z.ZodOptional<z.ZodString>;
}, {
    DEV_PHONE_PORT: z.ZodEffects<z.ZodDefault<z.ZodString>, number, string | undefined>;
}>, "strip", z.ZodTypeAny, {
    NODE_ENV: "development" | "production" | "test";
    TWILIO_ACCOUNT_SID: string;
    TWILIO_AUTH_TOKEN: string;
    TWILIO_PHONE_NUMBER: string;
    DEV_PHONE_PORT: number;
    OPENAI_API_KEY?: string | undefined;
}, {
    TWILIO_ACCOUNT_SID: string;
    TWILIO_AUTH_TOKEN: string;
    TWILIO_PHONE_NUMBER: string;
    NODE_ENV?: "development" | "production" | "test" | undefined;
    OPENAI_API_KEY?: string | undefined;
    DEV_PHONE_PORT?: string | undefined;
}>;
export declare const webappEnvSchema: z.ZodObject<z.objectUtil.extendShape<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    TWILIO_ACCOUNT_SID: z.ZodString;
    TWILIO_AUTH_TOKEN: z.ZodString;
    TWILIO_PHONE_NUMBER: z.ZodString;
    OPENAI_API_KEY: z.ZodOptional<z.ZodString>;
}, {
    NEXT_PUBLIC_BACKEND_URL: z.ZodDefault<z.ZodString>;
    NEXT_PUBLIC_DEV_PHONE_URL: z.ZodDefault<z.ZodString>;
}>, "strip", z.ZodTypeAny, {
    NODE_ENV: "development" | "production" | "test";
    TWILIO_ACCOUNT_SID: string;
    TWILIO_AUTH_TOKEN: string;
    TWILIO_PHONE_NUMBER: string;
    NEXT_PUBLIC_BACKEND_URL: string;
    NEXT_PUBLIC_DEV_PHONE_URL: string;
    OPENAI_API_KEY?: string | undefined;
}, {
    TWILIO_ACCOUNT_SID: string;
    TWILIO_AUTH_TOKEN: string;
    TWILIO_PHONE_NUMBER: string;
    NODE_ENV?: "development" | "production" | "test" | undefined;
    OPENAI_API_KEY?: string | undefined;
    NEXT_PUBLIC_BACKEND_URL?: string | undefined;
    NEXT_PUBLIC_DEV_PHONE_URL?: string | undefined;
}>;
export type WebSocketServerEnv = z.infer<typeof wsServerEnvSchema>;
export type DevPhoneEnv = z.infer<typeof devPhoneEnvSchema>;
export type WebappEnv = z.infer<typeof webappEnvSchema>;
export declare function validateEnv<T extends z.ZodSchema>(schema: T, env?: NodeJS.ProcessEnv): z.infer<T>;
