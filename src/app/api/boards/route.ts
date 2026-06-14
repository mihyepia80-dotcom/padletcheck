import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getBoards, addBoard, deleteBoard } from "@/lib/firebase";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const boards = await getBoards();
    return NextResponse.json({ boards });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "조회 실패" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { name, padletBoardId, apiKeyIndex } = await request.json();

    if (!name?.trim() || !padletBoardId?.trim()) {
      return NextResponse.json(
        { error: "보드 이름과 Padlet 보드 ID가 필요합니다." },
        { status: 400 }
      );
    }

    if (apiKeyIndex !== 1 && apiKeyIndex !== 2) {
      return NextResponse.json(
        { error: "API 계정은 1 또는 2를 선택하세요." },
        { status: 400 }
      );
    }

    const board = await addBoard({
      name: name.trim(),
      padletBoardId: padletBoardId.trim(),
      apiKeyIndex,
    });

    return NextResponse.json({ board });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "추가 실패" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "보드 ID가 필요합니다." }, { status: 400 });
    }

    await deleteBoard(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "삭제 실패" },
      { status: 500 }
    );
  }
}
