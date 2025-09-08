import { NextResponse } from "next/server";
import { readCsvToJson } from "@/lib/csv";

export const dynamic = "force-static";

export async function GET() {
  try {
    const json = await readCsvToJson();
    return NextResponse.json(json, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: "Failed to read CSV" }, { status: 500 });
  }
}
