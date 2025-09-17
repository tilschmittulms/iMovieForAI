import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET() {
  return NextResponse.json({ hasKey: !!process.env.OPENAI_API_KEY });
}
