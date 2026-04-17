import { NextRequest, NextResponse } from "next/server";
import { suggestPrograms } from "@/lib/data/programs";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const pieceReference = searchParams.get("piece_reference") ?? "";
  const clientRef = searchParams.get("client_ref") ?? undefined;

  if (!pieceReference.trim()) {
    return NextResponse.json([]);
  }

  const suggestions = await suggestPrograms(pieceReference, clientRef);
  return NextResponse.json(suggestions);
}
