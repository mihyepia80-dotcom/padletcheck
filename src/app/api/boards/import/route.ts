import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getBoards, addBoard } from "@/lib/firebase";
import { fetchUserBoards, getPadletKeyStatus } from "@/lib/padlet";

function resolveAccounts(importAll: boolean, account?: 1 | 2): (1 | 2)[] {
  if (importAll) return [1, 2];
  if (account === 1 || account === 2) return [account];
  return [];
}

export async function GET(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const importAll = request.nextUrl.searchParams.get("importAll") === "true";
    const accountParam = request.nextUrl.searchParams.get("account");
    const account =
      accountParam === "1" ? 1 : accountParam === "2" ? 2 : undefined;

    const accounts = resolveAccounts(importAll, account);
    if (accounts.length === 0) {
      return NextResponse.json(
        { error: "account(1 또는 2) 또는 importAll=true를 지정하세요." },
        { status: 400 }
      );
    }

    const existing = await getBoards();
    const existingKeys = new Set(
      existing.map((b) => `${b.apiKeyIndex}:${b.padletBoardId}`)
    );

    const available = [];
    const alreadyRegistered = [];
    const errors = [];

    for (const apiKeyIndex of accounts) {
      try {
        const padletBoards = await fetchUserBoards(apiKeyIndex);
        for (const padletBoard of padletBoards) {
          const item = {
            padletBoardId: padletBoard.id,
            name: padletBoard.title,
            apiKeyIndex,
          };
          const key = `${apiKeyIndex}:${padletBoard.id}`;
          if (existingKeys.has(key)) {
            alreadyRegistered.push(item);
          } else {
            available.push(item);
          }
        }
      } catch (error) {
        errors.push({
          apiKeyIndex,
          error: error instanceof Error ? error.message : "조회 실패",
        });
      }
    }

    return NextResponse.json({
      available,
      alreadyRegistered,
      errors,
      keyStatus: getPadletKeyStatus(),
      availableCount: available.length,
      alreadyRegisteredCount: alreadyRegistered.length,
    });
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
    const body = await request.json().catch(() => ({}));

    if (Array.isArray(body.boards) && body.boards.length > 0) {
      const existing = await getBoards();
      const existingKeys = new Set(
        existing.map((b) => `${b.apiKeyIndex}:${b.padletBoardId}`)
      );

      const added = [];
      const skipped = [];

      for (const item of body.boards) {
        const name = item.name?.trim();
        const padletBoardId = item.padletBoardId?.trim();
        const apiKeyIndex = item.apiKeyIndex;

        if (!name || !padletBoardId || (apiKeyIndex !== 1 && apiKeyIndex !== 2)) {
          continue;
        }

        const key = `${apiKeyIndex}:${padletBoardId}`;
        if (existingKeys.has(key)) {
          skipped.push({ name, padletBoardId, apiKeyIndex });
          continue;
        }

        const board = await addBoard({ name, padletBoardId, apiKeyIndex });
        existingKeys.add(key);
        added.push(board);
      }

      return NextResponse.json({
        added,
        skipped,
        addedCount: added.length,
        skippedCount: skipped.length,
      });
    }

    const importAll = body.importAll !== false;
    const account = body.account as 1 | 2 | undefined;
    const accounts = resolveAccounts(importAll, account);

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: "boards 배열, account, 또는 importAll을 지정하세요." },
        { status: 400 }
      );
    }

    const existing = await getBoards();
    const existingKeys = new Set(
      existing.map((b) => `${b.apiKeyIndex}:${b.padletBoardId}`)
    );

    const added = [];
    const skipped = [];
    const errors = [];

    for (const apiKeyIndex of accounts) {
      try {
        const padletBoards = await fetchUserBoards(apiKeyIndex);

        for (const padletBoard of padletBoards) {
          const key = `${apiKeyIndex}:${padletBoard.id}`;
          if (existingKeys.has(key)) {
            skipped.push({
              name: padletBoard.title,
              padletBoardId: padletBoard.id,
              apiKeyIndex,
            });
            continue;
          }

          const board = await addBoard({
            name: padletBoard.title,
            padletBoardId: padletBoard.id,
            apiKeyIndex,
          });
          existingKeys.add(key);
          added.push(board);
        }
      } catch (error) {
        errors.push({
          apiKeyIndex,
          error: error instanceof Error ? error.message : "가져오기 실패",
        });
      }
    }

    return NextResponse.json({
      added,
      skipped,
      errors,
      keyStatus: getPadletKeyStatus(),
      addedCount: added.length,
      skippedCount: skipped.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "가져오기 실패" },
      { status: 500 }
    );
  }
}
