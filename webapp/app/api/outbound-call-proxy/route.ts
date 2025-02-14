import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { to } = await req.json();
    if (!to) {
      return NextResponse.json({ error: "Missing 'to' param." }, { status: 400 });
    }

    // Your Node bridging server runs on port 8081
    const serverUrl = "http://localhost:8081/outbound-call";

    const response = await fetch(serverUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to }),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 