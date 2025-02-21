import { NextResponse } from 'next/server';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

export async function POST(request: Request) {
  try {
    const { from, to } = await request.json();

    const ngrokDomain = process.env.NGROK_DOMAIN || 'mereka.ngrok.io';
    const baseUrl = `https://${ngrokDomain}`;

    console.log('Creating call:', { from, to });

    const call = await client.calls.create({
      url: `${baseUrl}/api/call/twiml`,
      to: to,
      from: from,
      statusCallback: `${baseUrl}/api/call/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    });

    return NextResponse.json({ success: true, callSid: call.sid });
  } catch (error) {
    console.error('Error making call:', error);
    return NextResponse.json(
      { error: 'Failed to initiate call' },
      { status: 500 }
    );
  }
}
