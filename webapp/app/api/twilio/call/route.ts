import twilioClient from "@/lib/twilio";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!twilioClient) {
    return NextResponse.json(
      { error: "Twilio client not initialized" },
      { status: 500 }
    );
  }

  try {
    const { to, from } = await request.json();

    // Create TwiML for the call
    const twiml = `
<Response>
  <Connect>
    <Stream url="${process.env.PUBLIC_URL}/incoming-call" />
  </Connect>
</Response>`;

    // Initiate the call
    const call = await twilioClient.calls.create({
      to,
      from,
      twiml,
    });

    return NextResponse.json({ success: true, callSid: call.sid });
  } catch (error) {
    console.error("Error making call:", error);
    return NextResponse.json(
      { error: "Failed to initiate call" },
      { status: 500 }
    );
  }
} 