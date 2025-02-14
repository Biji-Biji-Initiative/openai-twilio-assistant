/**
 * outbound-call.ts
 * 
 * This script dials a phone number using your Twilio credentials,
 * then uses inline TwiML to connect a Stream to your local bridging server.
 */

import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config(); // Load environment vars from .env

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID as string;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN as string;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER as string;
const PUBLIC_URL = process.env.PUBLIC_URL as string;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER || !PUBLIC_URL) {
  console.error("Missing one or more environment variables. Check .env!");
  process.exit(1);
}

// The phone number we want to call
const TO_NUMBER = "+60122916662";

// This is the TwiML that Twilio will execute when the callee picks up.
// The <Stream> url must point to your local bridging route
const outboundTwiML = `
<Response>
  <Connect>
    <Stream url="${PUBLIC_URL}/incoming-call" />
  </Connect>
</Response>
`;

// Initialize Twilio
const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

async function makeOutboundCall() {
  try {
    console.log(`Dialing ${TO_NUMBER} from ${TWILIO_PHONE_NUMBER}...`);
    const call = await client.calls.create({
      from: TWILIO_PHONE_NUMBER,
      to: TO_NUMBER,
      twiml: outboundTwiML,
    });
    console.log(`Call initiated! SID: ${call.sid}`);
    console.log("Waiting for the user to pick up...");
  } catch (err) {
    console.error("Error creating outbound call:", err);
  }
}

makeOutboundCall(); 