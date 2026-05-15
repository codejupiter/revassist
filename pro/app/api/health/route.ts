import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "revassist-pro",
    mode: process.env.REVASSIST_AI_MODE === "live" ? "live" : "mock"
  });
}
