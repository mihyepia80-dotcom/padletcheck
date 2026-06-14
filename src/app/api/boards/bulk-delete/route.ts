import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { deleteBoards, deleteAllBoards } from "@/lib/firebase";

export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const deleteAll = body.deleteAll === true;
    const apiKeyIndex = body.apiKeyIndex as 1 | 2 | undefined;
    const ids = body.ids as string[] | undefined;

    if (deleteAll) {
      const count = await deleteAllBoards(apiKeyIndex);
      return NextResponse.json({ success: true, deletedCount: count });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "삭제할 보드 id 목록(ids)이 필요합니다." },
        { status: 400 }
      );
    }

    const count = await deleteBoards(ids);
    return NextResponse.json({ success: true, deletedCount: count });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "삭제 실패" },
      { status: 500 }
    );
  }
}
