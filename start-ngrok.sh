#!/bin/bash

# Kill any existing ngrok processes
pkill -f ngrok

# Start ngrok with the fixed domain
ngrok http --domain=mereka.ngrok.io 8081 