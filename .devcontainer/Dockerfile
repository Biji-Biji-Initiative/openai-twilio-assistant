FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye

# Install ngrok
RUN curl -Lo /usr/local/bin/ngrok https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz \
    && chmod +x /usr/local/bin/ngrok

# Install additional development tools
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    git \
    curl \
    wget \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# Install Twilio CLI and Dev Phone
RUN npm install -g twilio-cli \
    && npm install -g @twilio/plugin-dev-phone \
    && twilio plugins:install @twilio/plugin-dev-phone

# Set up workspace directory
WORKDIR /workspace

# Switch back to non-root user
USER node 