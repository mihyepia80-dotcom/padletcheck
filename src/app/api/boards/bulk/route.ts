import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { addBoard } from "@/lib/firebase";

interface BulkBoardLine {
  name: string;
  padletBoardId: string;
  apiKeyIndex: 1 | 2;
}

function parseBulkBoardLine(line: string): BulkBoardLine | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const parts = trimmed.split(/[|\t,]/).map((p) => p.trim());
  if (parts.length < 2) return null;

  const [name, padletBoardId, accountPart] = parts;
  const apiKeyIndex = accountPart ? (parseInt(accountPart, 10) as 1 | 2) : 1;

  if (!name || !padletBoardId || (apiKeyIndex !== 1 && apiKeyIndex !== 2)) {
    return null;
  }

  return { name, padletBoardId, apiKeyIndex };
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { text } = await request.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "보드 목록 텍스트가 필요합니다." }, { status: 400 });
    }

    const lines = text.split(/\r?\n/);
    const added = [];
    const invalidLines: string[] = [];

    for (const line of lines) {
      const parsed = parseBulkBoardLine(line);
      if (!parsed) {
        if (line.trim() && !line.trim().startsWith("#")) {
          invalidLines.push(line.trim());
        }
        continue;
      }

      const board = await addBoard(parsed);
      added.push(board);
    }

    return NextResponse.json({
      added,
      count: added.length,
      invalidLines,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "일괄 추가 실패" },
      { status: 500 }
    );
  }
}
