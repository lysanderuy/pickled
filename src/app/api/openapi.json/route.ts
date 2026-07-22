import { NextResponse } from "next/server";
import { openApiDocument } from "@/lib/api/openapi";

export async function GET() {
  return NextResponse.json(openApiDocument);
}
