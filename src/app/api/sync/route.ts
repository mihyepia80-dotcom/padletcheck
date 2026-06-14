import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import {
  getBoards,
  getStudents,
  saveSyncResult,
  getSyncResult,
} from "@/lib/firebase";
import { syncBoard } from "@/lib/padlet";
import { studentKey } from "@/lib/parse";

export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const boardId = body.boardId as string | undefined;
    const syncAll = body.syncAll === true;

    const boards = await getBoards();
    if (boards.length === 0) {
      return NextResponse.json({ error: "등록된 보드가 없습니다." }, { status: 400 });
    }

    const targets = syncAll
      ? boards
      : boards.filter((b) => b.id === boardId);

    if (targets.length === 0) {
      return NextResponse.json({ error: "보드를 찾을 수 없습니다." }, { status: 404 });
    }

    const results = [];
    const errors = [];

    for (const board of targets) {
      try {
        const { submissions, invalidPosts } = await syncBoard(
          board.padletBoardId,
          board.apiKeyIndex
        );
        await saveSyncResult(board.id, submissions);
        results.push({
          boardId: board.id,
          boardName: board.name,
          submissionCount: Object.keys(submissions).length,
          invalidCount: invalidPosts.length,
          invalidPosts,
        });
        await new Promise((r) => setTimeout(r, 300));
      } catch (error) {
        errors.push({
          boardId: board.id,
          boardName: board.name,
          error: error instanceof Error ? error.message : "동기화 실패",
        });
      }
    }

    return NextResponse.json({ results, errors });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "동기화 실패" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const boardId = request.nextUrl.searchParams.get("boardId");
    if (!boardId) {
      return NextResponse.json({ error: "boardId가 필요합니다." }, { status: 400 });
    }

    const [students, syncResult, boards] = await Promise.all([
      getStudents(),
      getSyncResult(boardId),
      getBoards(),
    ]);

    const board = boards.find((b) => b.id === boardId);
    if (!board) {
      return NextResponse.json({ error: "보드를 찾을 수 없습니다." }, { status: 404 });
    }

    const submissions = syncResult?.submissions ?? {};
    const submitted = students.filter((s) => submissions[studentKey(s.number, s.name)]);
    const missing = students.filter((s) => !submissions[studentKey(s.number, s.name)]);

    return NextResponse.json({
      board,
      syncedAt: syncResult?.syncedAt ?? null,
      students,
      submitted: submitted.map((s) => ({
        ...s,
        submission: submissions[studentKey(s.number, s.name)],
      })),
      missing,
      totalStudents: students.length,
      submittedCount: submitted.length,
      missingCount: missing.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "조회 실패" },
      { status: 500 }
    );
  }
}
