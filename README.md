# OpenAI Twilio Assistant

This project combines OpenAI's Realtime API with Twilio's phone calling capability to build an AI calling assistant.

## Quick Setup with GitHub Codespaces

1. Click the "Code" button on the repository
2. Select "Create codespace on main"
3. Wait for the codespace to be created and initialized

## Configuration Best Practices

### Environment Variables
The application uses environment variables for all URLs and credentials. Never hardcode these values:

1. Webapp (.env):
```bash
OPENAI_API_KEY=your_key
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_number
NEXT_PUBLIC_BACKEND_URL=https://your-ngrok-domain.ngrok.io  # Must match websocket-server
```

2. Websocket Server (.env):
```bash
PUBLIC_URL=https://your-ngrok-domain.ngrok.io  # Must match webapp
OPENAI_API_KEY=your_key
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_number
```

### Critical Rules
1. Always use environment variables for URLs - never hardcode localhost or domain names
2. Keep `NEXT_PUBLIC_BACKEND_URL` and `PUBLIC_URL` in sync between webapp and websocket-server
3. Use the fixed ngrok domain `mereka.ngrok.io` - this is a paid account with a permanent domain
4. Start services in this exact order:
   - Run cleanup script first (`./cleanup.sh`)
   - Start ngrok with fixed domain (`./start-ngrok.sh`)
   - Start websocket server (`cd websocket-server && npm run dev`)
   - Start webapp (`cd webapp && npm run dev`)

### Ngrok Configuration
This project uses a paid ngrok account with a fixed domain. This is critical for maintaining stable WebSocket connections.

1. Fixed Domain: Always use `mereka.ngrok.io`
   - Do not use random ngrok domains
   - Do not use other domains or tunneling services

2. Starting Ngrok:
   ```bash
   # Use the provided script
   ./start-ngrok.sh

   # Or manually with the fixed domain
   ngrok http --domain=mereka.ngrok.io 8081
   ```

3. Important Notes:
   - Only one ngrok connection is possible at a time
   - Always kill existing ngrok processes before starting a new one
   - The domain must match in both `webapp/.env` and `websocket-server/.env`
   - Verify the tunnel is working at `http://localhost:4040`

4. Environment Variables:
   ```bash
   # webapp/.env
   NEXT_PUBLIC_BACKEND_URL=https://mereka.ngrok.io

   # websocket-server/.env
   PUBLIC_URL=https://mereka.ngrok.io
   ```

### Common Issues and Solutions
1. If you see CORS errors:
   - Verify environment variables are set correctly
   - Check that ngrok is running
   - Ensure websocket server started after ngrok

2. If WebSocket connections fail:
   - Verify ngrok is running with correct domain
   - Check both .env files have matching URLs
   - Restart services in correct order

3. If "Check ngrok" button fails:
   - Verify `/public-url` endpoint is working
   - Test with: `curl https://your-ngrok-domain.ngrok.io/public-url`

## Running the Application

### Quick Start
The easiest way to start all services is to use the provided startup script:

```bash
./start.sh
```

This script will:
1. Check for required environment files
2. Clean up any existing processes
3. Start all services in the correct order
4. Verify each service is running properly
5. Show you the URLs to access the application

To stop all services, either:
- Press Ctrl+C in the terminal running start.sh
- Run `./cleanup.sh` in another terminal

### Manual Setup
If you prefer to run components manually, you'll need to run three components:

1. Start the webapp (Frontend):
```bash
cd webapp
npm run dev
```

2. Start the websocket server:
```bash
cd websocket-server
npm run dev
```

3. Start ngrok:
```bash
ngrok http --domain=your-permanent-domain.ngrok.io 8081
```

4. Set up Twilio Dev Phone:
```bash
# Login to Twilio (you'll need your Account SID and Auth Token)
twilio login

# Start the Dev Phone
twilio dev-phone

# The Dev Phone will be available at:
# http://localhost:3001
```

## Environment Variables

The environment variables are already configured in the repository. If you need to modify them:

### Webapp (.env)
- OPENAI_API_KEY
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_PHONE_NUMBER
- NEXT_PUBLIC_BACKEND_URL

### Websocket Server (.env)
- PUBLIC_URL
- OPENAI_API_KEY
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN

## Ports

The application uses several fixed ports:
- Frontend (webapp): 3000
- WebSocket Server: 8081
- Ngrok Interface: 4040
- Twilio Dev Phone: 3001

### Handling Port Conflicts

Before starting the application, ensure no other processes are using these ports. You can use the provided cleanup script:

```bash
# Clean up any processes using required ports
./cleanup.sh
```

Then start the services in this order:
1. Frontend (webapp)
2. WebSocket Server
3. Ngrok
4. Twilio Dev Phone

If you still experience port conflicts:
1. Run `lsof -i :PORT_NUMBER` to identify the process using a specific port
2. Use `kill -9 PID` to terminate the process
3. Or use the cleanup script mentioned above

## Development in Codespaces

The development environment is pre-configured with:
- Node.js 20
- TypeScript support
- ESLint and Prettier
- Ngrok
- Twilio CLI and Dev Phone
- All necessary development tools

## Using Twilio Dev Phone

1. After starting the Dev Phone, open http://localhost:3001
2. Log in with your Twilio credentials if prompted
3. You'll see a phone interface where you can:
   - Make outbound calls
   - Receive inbound calls
   - Test your Twilio application locally
   - View call logs and debugging information

## Troubleshooting

If port 8081 is already in use:
1. Find the process: `lsof -i :8081`
2. Kill the process: `kill <PID>`

If Twilio Dev Phone doesn't start:
1. Make sure you're logged in: `twilio login`
2. Try reinstalling the plugin: `twilio plugins:install @twilio/plugin-dev-phone`

For any other issues, please contact the team lead.

## Development Guidelines

1. **URL Management**:
   - Always use environment variables for URLs
   - Never hardcode localhost or domain names
   - Keep webapp and websocket-server URLs in sync

2. **Service Order**:
   - Always start services in the correct order
   - Use cleanup script before starting
   - Verify each service is running before starting the next

3. **Code Changes**:
   - Test all endpoints after making changes
   - Verify CORS configuration if modifying server
   - Check WebSocket connections after URL changes

4. **Environment Variables**:
   - Double-check both .env files after changes
   - Verify ngrok URL matches in both files
   - Test public endpoints after URL changes

<img width="1728" alt="Screenshot 2024-12-18 at 4 59 30 PM" src="https://github.com/user-attachments/assets/d3c8dcce-b339-410c-85ca-864a8e0fc326" />

## Quick Setup

Open three terminal windows:

| Terminal | Purpose                       | Quick Reference (see below for more) |
| -------- | ----------------------------- | ------------------------------------ |
| 1        | To run the `webapp`           | `npm run dev`                        |
| 2        | To run the `websocket-server` | `npm run dev`                        |
| 3        | To run `ngrok`                | `ngrok http 8081`                    |

Make sure all vars in `webapp/.env` and `websocket-server/.env` are set correctly. See [full setup](#full-setup) section for more.

## Overview

This repo implements a phone calling assistant with the Realtime API and Twilio, and had two main parts: the `webapp`, and the `websocket-server`.

1. `webapp`: NextJS app to serve as a frontend for call configuration and transcripts
2. `websocket-server`: Express backend that handles connection from Twilio, connects it to the Realtime API, and forwards messages to the frontend
<img width="1514" alt="Screenshot 2024-12-20 at 10 32 40 AM" src="https://github.com/user-attachments/assets/61d39b88-4861-4b6f-bfe2-796957ab5476" />

Twilio uses TwiML (a form of XML) to specify how to handle a phone call. When a call comes in we tell Twilio to start a bi-directional stream to our backend, where we forward messages between the call and the Realtime API. (`{{WS_URL}}` is replaced with our websocket endpoint.)

```xml
<!-- TwiML to start a bi-directional stream-->

<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connected</Say>
  <Connect>
    <Stream url="{{WS_URL}}" />
  </Connect>
  <Say>Disconnected</Say>
</Response>
```

We use `ngrok` to make our server reachable by Twilio.

### Life of a phone call

Setup

1. We run ngrok to make our server reachable by Twilio
1. We set the Twilio webhook to our ngrok address
1. Frontend connects to the backend (`wss://[your_backend]/logs`), ready for a call

Call

1. Call is placed to Twilio-managed number
1. Twilio queries the webhook (`http://[your_backend]/twiml`) for TwiML instructions
1. Twilio opens a bi-directional stream to the backend (`wss://[your_backend]/call`)
1. The backend connects to the Realtime API, and starts forwarding messages:
   - between Twilio and the Realtime API
   - between the frontend and the Realtime API

### Function Calling

This demo mocks out function calls so you can provide sample responses. In reality you could handle the function call, execute some code, and then supply the response back to the model.

## Full Setup

1. Make sure your [auth & env](#detailed-auth--env) is configured correctly.

2. Run webapp.

```shell
cd webapp
npm install
npm run dev
```

3. Run websocket server.

```shell
cd websocket-server
npm install
npm run dev
```

## Detailed Auth & Env

### OpenAI & Twilio

Set your credentials in `webapp/.env` and `websocket-server` - see `webapp/.env.example` and `websocket-server.env.example` for reference.

### Ngrok

Twilio needs to be able to reach your websocket server. If you're running it locally, your ports are inaccessible by default. [ngrok](https://ngrok.com/) can make them temporarily accessible.

We have set the `websocket-server` to run on port `8081` by default, so that is the port we will be forwarding.

If you have a paid ngrok account with a permanent URL:
```shell
# Use your permanent domain
ngrok http --domain=your-permanent-domain.ngrok.io 8081
```

For free accounts:
```shell
ngrok http 8081
```

Make note of the `Forwarding` URL and update it in `websocket-server/.env` as `PUBLIC_URL`.

### Websocket URL

Your server should now be accessible at the `Forwarding` URL when run, so set the `PUBLIC_URL` in `websocket-server/.env`. See `websocket-server/.env.example` for reference.

# Additional Notes

This repo isn't polished, and the security practices leave some to be desired. Please only use this as reference, and make sure to audit your app with security and engineering before deploying!
