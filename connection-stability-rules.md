# Connection Stability Rules

## WebSocket Connection Management

### Retry Logic
```typescript
// Client-side configuration
const WS_CONFIG = {
  initialRetryDelay: 1000,
  maxRetryDelay: 30000,
  maxRetryAttempts: 10,
  connectionTimeout: 5000,
  heartbeatInterval: 30000,
  latencyThreshold: 200 // Based on observed latency in logs (55-180ms)
}
```

### Connection States
1. Monitor and handle these connection states:
   - `CONNECTING`: Initial connection attempt
   - `CONNECTED`: Successfully established
   - `RECONNECTING`: Attempting to reconnect
   - `DISCONNECTED`: Connection lost
   - `FAILED`: All retry attempts exhausted

### Health Checks
1. Server Health Endpoint:
   ```
   GET /health
   Response: {
     status: "healthy" | "degraded" | "unhealthy",
     uptime: number,
     connections: number,
     latency: number
   }
   ```

2. Client Health Monitoring:
   - Implement heartbeat mechanism
   - Track round-trip time
   - Monitor message queue length
   - Log connection quality metrics

## Process Management

### Ngrok Service
1. Always use background execution:
   ```bash
   nohup ngrok http --domain=mereka.ngrok.io 8081 > ngrok.log 2>&1 &
   ```

2. Monitor ngrok process:
   - Check process status every 60 seconds
   - Restart if connection drops
   - Log all connection events

### WebSocket Server
1. Process Supervision:
   ```bash
   # Install PM2
   npm install -g pm2

   # Start server with PM2
   pm2 start dist/server.js --name "ws-server" \
     --max-memory-restart 500M \
     --restart-delay 3000 \
     --exp-backoff-restart-delay=100
   ```

2. Recovery Settings:
   - Max restart attempts: 10
   - Restart delay: 3000ms
   - Memory limit: 500MB
   - CPU limit: 80%

## Error Handling

### Connection Errors
1. Implement specific error codes:
   ```typescript
   enum ConnectionError {
     TIMEOUT = 'CONNECTION_TIMEOUT',
     NETWORK_FAILURE = 'NETWORK_FAILURE',
     AUTH_FAILURE = 'AUTH_FAILURE',
     SERVER_ERROR = 'SERVER_ERROR',
     RATE_LIMIT = 'RATE_LIMIT'
   }
   ```

2. Circuit Breaker Pattern:
   - Trip after 5 failures in 60 seconds
   - Half-open state after 30 seconds
   - Reset after successful connection

### Logging
1. Structured Log Format:
   ```typescript
   interface LogEntry {
     timestamp: string;
     level: 'info' | 'warn' | 'error';
     component: 'websocket' | 'ngrok' | 'server';
     event: string;
     data: Record<string, any>;
     connectionId?: string;
   }
   ```

2. Critical Events to Log:
   - Connection state changes
   - Latency spikes (>200ms)
   - Failed retry attempts
   - CORS issues
   - Authentication failures

## Environment Validation

### Startup Checks
1. Required Environment Variables:
   ```typescript
   const REQUIRED_ENV = [
     'TWILIO_ACCOUNT_SID',
     'TWILIO_AUTH_TOKEN',
     'TWILIO_PHONE_NUMBER',
     'PUBLIC_URL'
   ]
   ```

2. Port Availability:
   - Check ports 8081 (WebSocket)
   - Check port 4040 (Ngrok)
   - Check port 3000 (Frontend)

### Service Dependencies
1. Startup Order:
   1. Kill existing processes (cleanup.sh)
   2. Start ngrok
   3. Verify ngrok connection
   4. Start WebSocket server
   5. Verify WebSocket health
   6. Start frontend application

## Client-Side Improvements

### Connection Status
1. UI Indicators:
   ```typescript
   enum ConnectionStatus {
     CONNECTED = 'Connected',
     CONNECTING = 'Connecting...',
     RECONNECTING = 'Reconnecting...',
     OFFLINE = 'Offline'
   }
   ```

2. Offline Support:
   - Cache critical data
   - Queue outgoing messages
   - Implement retry mechanism
   - Show sync status

### Performance Monitoring
1. Track Metrics:
   - Connection latency
   - Message delivery rate
   - Failed attempts
   - Reconnection success rate

2. Alert Thresholds:
   - Latency > 200ms
   - > 3 reconnection attempts
   - > 5 failed messages
   - Connection downtime > 30s

## Security Considerations

### Connection Security
1. Enforce HTTPS/WSS only
2. Validate origin headers
3. Rate limit connection attempts
4. Monitor for unusual patterns

### Authentication
1. Implement token-based auth
2. Expire tokens appropriately
3. Validate on reconnection
4. Log authentication failures

## Deployment Checklist

### Pre-deployment
1. Verify all environment variables
2. Check service dependencies
3. Test connection recovery
4. Validate security settings

### Post-deployment
1. Monitor connection stability
2. Check error rates
3. Verify logging
4. Test recovery procedures

## Troubleshooting Guide

### Common Issues
1. Connection Drops:
   - Check ngrok status
   - Verify WebSocket server health
   - Review error logs
   - Check network stability

2. High Latency:
   - Monitor server resources
   - Check network conditions
   - Review connection count
   - Analyze message volume

3. Authentication Failures:
   - Verify credentials
   - Check token expiration
   - Validate configuration
   - Review security logs

### Recovery Steps
1. Connection Loss:
   ```bash
   # 1. Clean up existing processes
   ./cleanup.sh

   # 2. Restart ngrok
   ./start-ngrok.sh

   # 3. Restart WebSocket server
   pm2 restart ws-server

   # 4. Verify health
   curl https://mereka.ngrok.io/health
   ```

2. Performance Issues:
   - Reduce connection count
   - Clear message queues
   - Restart problematic services
   - Monitor recovery 