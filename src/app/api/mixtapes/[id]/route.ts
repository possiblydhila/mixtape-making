import { NextRequest, NextResponse } from "next/server";
import { getMixtape } from "@/lib/store";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const mixtape = getMixtape(params.id);
  if (!mixtape) {
    return NextResponse.json({ error: "Mixtape not found" }, { status: 404 });
  }
  return NextResponse.json({ mixtape });
}
