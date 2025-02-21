/**
 * Global configuration for Twilio demo project
 */

export const CONFIG = {
  // Service ports
  ports: {
    webapp: 3000,
    websocket: 8081,
    ngrok: 4040
  },

  // Timeouts (in milliseconds)
  timeouts: {
    websocketConnection: 5000,
    additionalLogs: 30000,
    serviceStartup: 30000,
    ngrokTunnel: 10000,
    retryInterval: 1000
  },

  // Maximum retry attempts
  maxRetries: {
    websocket: 3,
    services: 5,
    ngrok: 5
  },

  // Ngrok configuration
  ngrok: {
    domain: 'mereka.ngrok.io',
    authToken: '2sy7rzIlzrNhrpsYw151gKDIXcy_3aPfJJCdxwkyJ19KF9XnF'
  },

  // Twilio configuration
  twilio: {
    accountSid: 'ACab6a3b51e6078865e1e39e8005dc2bcd',
    authToken: '783607c12b78f3d08a581379d775118b',
    numbers: {
      inbound: '60393880467',    // Users call this number
      outbound: '+60393880542'   // AI uses this number for outbound calls
    }
  },

  // OpenAI configuration
  openai: {
    apiKey: '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'
  },

  // Log configuration
  logs: {
    directory: 'logs',
    timestampFormat: 'YYYY-MM-DD_HH-mm-ss'
  }
}
