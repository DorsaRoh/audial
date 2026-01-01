import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://opencode.ai/zen/v1/models");
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch models" }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}
