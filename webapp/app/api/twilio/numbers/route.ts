import twilioClient from "@/lib/twilio";

export async function GET() {
  try {
    if (!twilioClient) {
      console.error('Twilio client not initialized');
      return Response.json(
        { error: "Twilio client not initialized" },
        { status: 500 }
      );
    }

    const incomingPhoneNumbers = await twilioClient.incomingPhoneNumbers.list({
      limit: 20,
    });
    console.log('Retrieved phone numbers:', incomingPhoneNumbers);
    return Response.json(incomingPhoneNumbers);
  } catch (error) {
    console.error('Error fetching phone numbers:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!twilioClient) {
    return Response.json(
      { error: "Twilio client not initialized" },
      { status: 500 }
    );
  }

  const { phoneNumberSid, voiceUrl } = await req.json();
  const incomingPhoneNumber = await twilioClient
    .incomingPhoneNumbers(phoneNumberSid)
    .update({ voiceUrl });

  return Response.json(incomingPhoneNumber);
}
