"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHealthCheck = createHealthCheck;
exports.createStatusCheck = createStatusCheck;
function createHealthCheck(serviceName, version, port, publicUrl) {
    return async (req, res) => {
        try {
            // Set appropriate headers
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Content-Type', 'application/json');
            const status = {
                status: 'ok',
                service: serviceName,
                version,
                timestamp: new Date().toISOString(),
                environment: {
                    mode: process.env.NODE_ENV || 'development',
                    publicUrl
                },
                dependencies: {
                    twilio: {
                        hasTwilioSid: !!process.env.TWILIO_ACCOUNT_SID,
                        hasTwilioToken: !!process.env.TWILIO_AUTH_TOKEN,
                        hasTwilioPhone: !!process.env.TWILIO_PHONE_NUMBER
                    },
                    openai: {
                        hasApiKey: !!process.env.OPENAI_API_KEY
                    }
                },
                server: {
                    uptime: process.uptime(),
                    memoryUsage: process.memoryUsage(),
                    port
                }
            };
            res.status(200).json(status);
        }
        catch (error) {
            console.error('Health check error:', error);
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Content-Type', 'application/json');
            res.status(500).json({
                status: 'error',
                service: serviceName,
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };
}
function createStatusCheck(serviceName, version, port, publicUrl, getConnectionStats) {
    return async (req, res) => {
        try {
            const healthStatus = await new Promise((resolve) => {
                createHealthCheck(serviceName, version, port, publicUrl)(req, res);
                resolve(res);
            });
            const status = {
                ...healthStatus,
                connections: {
                    websocket: getConnectionStats()
                },
                latency: {
                // Add latency checks if needed
                }
            };
            res.status(200).json(status);
        }
        catch (error) {
            console.error('Status check error:', error);
            res.status(500).json({
                status: 'error',
                service: serviceName,
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };
}
