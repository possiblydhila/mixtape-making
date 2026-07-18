import { NextRequest, NextResponse } from "next/server";
import { createMixtape } from "@/lib/store";
import type { CreateMixtapeInput } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateMixtapeInput;

    if (!body.sideA?.length && !body.sideB?.length) {
      return NextResponse.json(
        { error: "Add at least one song before saving your mixtape." },
        { status: 400 }
      );
    }

    const mixtape = createMixtape({
      title: body.title?.trim() || "Untitled Mixtape",
      fromName: body.fromName?.trim() || "",
      toName: body.toName?.trim() || "",
      note: body.note?.trim() || "",
      cassette: body.cassette,
      sideA: body.sideA ?? [],
      sideB: body.sideB ?? [],
    });

    return NextResponse.json({ mixtape });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
