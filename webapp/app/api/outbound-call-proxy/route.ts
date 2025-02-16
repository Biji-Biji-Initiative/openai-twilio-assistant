import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, action } = body;
    
    if (action === "disconnect") {
      const { callSid } = body;
      console.log("[OutboundCallProxy] Received disconnect request for call:", callSid);
      
      if (!callSid) {
        console.error("[OutboundCallProxy] Missing 'callSid' parameter for disconnect");
        return NextResponse.json({ error: "Missing 'callSid' param." }, { status: 400 });
      }

      const serverUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/disconnect-call`;
      console.log("[OutboundCallProxy] Forwarding disconnect to server URL:", serverUrl);

      const response = await fetch(serverUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callSid }),
      });

      const data = await response.json();
      console.log("[OutboundCallProxy] Response from disconnect request:", data);
      return NextResponse.json(data, { status: response.status });
    }

    // Handle regular outbound call
    console.log("[OutboundCallProxy] Received call request for number:", to);

    if (!to) {
      console.error("[OutboundCallProxy] Missing 'to' parameter");
      return NextResponse.json({ error: "Missing 'to' param." }, { status: 400 });
    }

    // Your Node bridging server runs on port 8081
    const serverUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/outbound-call`;
    console.log("[OutboundCallProxy] Forwarding call to server URL:", serverUrl);

    const response = await fetch(serverUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to }),
    });

    const data = await response.json();
    console.log("[OutboundCallProxy] Response from Twilio server:", data);

    return NextResponse.json(data, { status: response.status });
  } catch (err: any) {
    console.error("[OutboundCallProxy] Error in outbound call proxy:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 