import "server-only";
import twilio from "twilio";

const { TWILIO_ACCOUNT_SID: accountSid, TWILIO_AUTH_TOKEN: authToken } =
  process.env;

let twilioClient: twilio.Twilio | null = null;

try {
  if (!accountSid || !authToken) {
    console.warn("[Twilio] Credentials not set. Twilio client will be disabled.");
  } else {
    twilioClient = twilio(accountSid, authToken);
    console.log("[Twilio] Client initialized successfully");
  }
} catch (error) {
  console.error("[Twilio] Error initializing client:", error);
  twilioClient = null;
}

export default twilioClient;
