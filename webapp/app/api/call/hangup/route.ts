import { NextResponse } from 'next/server';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

export async function POST(request: Request) {
  try {
    const { callSid } = await request.json();

    if (!callSid) {
      return NextResponse.json(
        { error: 'Call SID is required' },
        { status: 400 }
      );
    }

    await client.calls(callSid).update({ status: 'completed' });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error hanging up call:', error);
    return NextResponse.json(
      { error: 'Failed to hang up call' },
      { status: 500 }
    );
  }
}
