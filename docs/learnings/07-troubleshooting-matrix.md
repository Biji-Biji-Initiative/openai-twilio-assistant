# Troubleshooting Matrix

## Connection Issues

### 1. WebSocket Connection Fails

| Symptom | Possible Causes | Diagnostic Steps | Solution |
|---------|----------------|------------------|-----------|
| No WebSocket upgrade | - Incorrect URL<br>- Wrong protocol<br>- Ngrok not running | 1. Check ngrok logs<br>2. Verify URL in TwiML<br>3. Test direct connection | - Update TwiML URL<br>- Restart ngrok<br>- Fix protocol (wss://) |
| Connection drops immediately | - Protocol mismatch<br>- Invalid response<br>- Track ID mismatch | 1. Check start message<br>2. Verify response format<br>3. Monitor logs | - Fix track IDs<br>- Update protocol version<br>- Match Twilio format |
| Connection times out | - Server unreachable<br>- Network issues<br>- Port blocked | 1. Test server status<br>2. Check firewall<br>3. Verify routing | - Check server status<br>- Update firewall rules<br>- Fix routing |

### 2. Audio Stream Issues

| Symptom | Possible Causes | Diagnostic Steps | Solution |
|---------|----------------|------------------|-----------|
| No audio received | - Wrong format<br>- Missing parameters<br>- Track mismatch | 1. Check TwiML config<br>2. Verify format params<br>3. Test track setup | - Update audio params<br>- Fix track config<br>- Match format specs |
| Audio quality poor | - Wrong sample rate<br>- Channel mismatch<br>- Format issues | 1. Verify audio config<br>2. Check processing<br>3. Test format | - Set correct rate<br>- Fix channel count<br>- Update format |
| One-way audio | - Track config<br>- Response format<br>- Stream handling | 1. Check track setup<br>2. Verify handlers<br>3. Test flow | - Fix track setup<br>- Update handlers<br>- Fix stream flow |

## Protocol Issues

### 1. Message Exchange

| Symptom | Possible Causes | Diagnostic Steps | Solution |
|---------|----------------|------------------|-----------|
| No start message | - Connection issue<br>- Wrong path<br>- Protocol error | 1. Check connection<br>2. Verify path<br>3. Monitor logs | - Fix connection<br>- Update path<br>- Fix protocol |
| Invalid response | - Wrong format<br>- Missing fields<br>- Protocol mismatch | 1. Check response<br>2. Verify format<br>3. Test protocol | - Fix format<br>- Add fields<br>- Update protocol |
| Message parsing fails | - Invalid JSON<br>- Wrong format<br>- Data corruption | 1. Log raw message<br>2. Check parsing<br>3. Verify format | - Fix parsing<br>- Update format<br>- Handle errors |

### 2. State Management

| Symptom | Possible Causes | Diagnostic Steps | Solution |
|---------|----------------|------------------|-----------|
| State out of sync | - Race condition<br>- Missing update<br>- Cleanup issue | 1. Check state flow<br>2. Monitor updates<br>3. Verify cleanup | - Fix race conditions<br>- Add updates<br>- Improve cleanup |
| Multiple connections | - Cleanup failure<br>- Connection leak<br>- Handler issue | 1. Check cleanup<br>2. Monitor connections<br>3. Verify handlers | - Fix cleanup<br>- Update handlers<br>- Add monitoring |
| Resource leaks | - Missing cleanup<br>- Handler leak<br>- Memory issue | 1. Monitor resources<br>2. Check cleanup<br>3. Test memory | - Add cleanup<br>- Fix handlers<br>- Optimize memory |

## Environment Issues

### 1. Configuration

| Symptom | Possible Causes | Diagnostic Steps | Solution |
|---------|----------------|------------------|-----------|
| Missing credentials | - Env not loaded<br>- Wrong path<br>- File missing | 1. Check env files<br>2. Verify paths<br>3. Test loading | - Fix env files<br>- Update paths<br>- Add validation |
| Wrong URLs | - Config error<br>- Env mismatch<br>- Update needed | 1. Check config<br>2. Verify URLs<br>3. Test access | - Update config<br>- Fix URLs<br>- Add validation |
| Port conflicts | - Service running<br>- Port in use<br>- Config issue | 1. Check ports<br>2. Monitor services<br>3. Test config | - Update ports<br>- Stop services<br>- Fix config |

### 2. Dependencies

| Symptom | Possible Causes | Diagnostic Steps | Solution |
|---------|----------------|------------------|-----------|
| Service unavailable | - Not running<br>- Wrong config<br>- Access issue | 1. Check service<br>2. Verify config<br>3. Test access | - Start service<br>- Fix config<br>- Update access |
| Version mismatch | - Wrong version<br>- Update needed<br>- Compatibility | 1. Check versions<br>2. Verify compat<br>3. Test updates | - Update version<br>- Fix compat<br>- Test system |
| Integration fails | - API change<br>- Config issue<br>- Access problem | 1. Check API<br>2. Verify config<br>3. Test integration | - Update API<br>- Fix config<br>- Add tests |

## Recovery Procedures

### 1. Connection Recovery

```typescript
class ConnectionRecovery {
  private retryCount = 0;
  private maxRetries = 3;
  private backoffTime = 1000;

  async recover() {
    if (this.retryCount >= this.maxRetries) {
      console.error('❌ Max retries reached');
      return false;
    }

    try {
      await this.cleanup();
      await this.reconnect();
      this.retryCount = 0;
      return true;
    } catch (error) {
      this.retryCount++;
      await this.wait();
      return this.recover();
    }
  }

  private async wait() {
    const delay = this.backoffTime * Math.pow(2, this.retryCount);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}
```

### 2. State Recovery

```typescript
class StateRecovery {
  private state: any = null;
  private timestamp: number = 0;

  saveState(state: any) {
    this.state = state;
    this.timestamp = Date.now();
  }

  async recover() {
    if (!this.state) return false;
    if (Date.now() - this.timestamp > 30000) {
      return this.fullRecovery();
    }
    return this.quickRecovery();
  }

  private async quickRecovery() {
    // Implement quick state recovery
  }

  private async fullRecovery() {
    // Implement full state recovery
  }
}
```

## Verification Steps

### 1. Connection Verification
1. Check WebSocket upgrade
2. Verify protocol handshake
3. Monitor message exchange
4. Test audio flow

### 2. State Verification
1. Check connection state
2. Verify call status
3. Test state transitions
4. Monitor cleanup

### 3. Resource Verification
1. Check memory usage
2. Monitor connections
3. Verify cleanup
4. Test recovery
