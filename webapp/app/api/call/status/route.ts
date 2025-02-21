import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const callStatus = formData.get('CallStatus');
    const callSid = formData.get('CallSid');

    // Send status update via HTTP POST to WebSocket server
    const ngrokDomain = process.env.NGROK_DOMAIN || 'mereka.ngrok.io';
    const statusUrl = `https://${ngrokDomain}/status`;

    try {
      // Log the status update
      console.log('Call status update:', {
        callSid,
        status: callStatus,
        timestamp: new Date().toISOString()
      });

      // Forward status to WebSocket server via HTTP
      const response = await fetch(statusUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'twilio_event',
          data: {
            event: 'status',
            callSid,
            status: callStatus,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send status update:', error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling status callback:', error);
    return NextResponse.json(
      { error: 'Failed to process status callback' },
      { status: 500 }
    );
  }
}
