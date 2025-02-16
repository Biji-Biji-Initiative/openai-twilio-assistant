import twilioClient from "@/lib/twilio";

export async function GET() {
  try {
    // Debug log to check environment variables
    console.log("[TwilioAPI] Environment check:", {
      hasSid: !!process.env.TWILIO_ACCOUNT_SID,
      hasToken: !!process.env.TWILIO_AUTH_TOKEN,
      hasClient: !!twilioClient,
      envKeys: Object.keys(process.env).filter(key => key.includes('TWILIO'))
    });

    if (!twilioClient) {
      console.error("[TwilioAPI] Client not initialized");
      return Response.json(
        { error: "Twilio client not initialized" },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }

    console.log("[TwilioAPI] Fetching phone numbers...");
    const incomingPhoneNumbers = await twilioClient.incomingPhoneNumbers.list({
      limit: 20,
    });
    
    console.log("[TwilioAPI] Found", incomingPhoneNumbers.length, "phone numbers");
    return Response.json(incomingPhoneNumbers, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error) {
    console.error("[TwilioAPI] Error fetching phone numbers:", error);
    return Response.json(
      { error: "Failed to fetch phone numbers" },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  }
}

export async function POST(req: Request) {
  try {
    if (!twilioClient) {
      console.error("[TwilioAPI] Client not initialized");
      return Response.json(
        { error: "Twilio client not initialized" },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }

    const { phoneNumberSid, voiceUrl } = await req.json();
    console.log("[TwilioAPI] Updating phone number:", { phoneNumberSid, voiceUrl });
    
    const incomingPhoneNumber = await twilioClient
      .incomingPhoneNumbers(phoneNumberSid)
      .update({ voiceUrl });

    console.log("[TwilioAPI] Successfully updated phone number");
    return Response.json(incomingPhoneNumber, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error) {
    console.error("[TwilioAPI] Error updating phone number:", error);
    return Response.json(
      { error: "Failed to update phone number" },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
