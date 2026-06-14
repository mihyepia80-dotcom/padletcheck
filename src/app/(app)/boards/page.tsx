"use client";

import { useEffect, useState } from "react";
import { formatPadletDate } from "@/lib/format-date";

interface Board {
  id: string;
  name: string;
  padletBoardId: string;
  apiKeyIndex: 1 | 2;
  padletCreatedAt?: string | null;
}

interface PadletBoardPreview {
  padletBoardId: string;
  name: string;
  apiKeyIndex: 1 | 2;
  padletCreatedAt?: string | null;
}

interface PadletAccountError {
  apiKeyIndex: number;
  error: string;
}

function formatPadletErrors(errors: PadletAccountError[]): string {
  return errors.map((e) => `계정 ${e.apiKeyIndex}: ${e.error}`).join("\n");
}

function formatKeyStatus(keyStatus?: { account1: boolean; account2: boolean }): string {
  if (!keyStatus) return "";
  return `API 키 설정 — 계정1: ${keyStatus.account1 ? "있음" : "없음"}, 계정2: ${keyStatus.account2 ? "있음" : "없음"}`;
}

export default function BoardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardIds, setSelectedBoardIds] = useState<Set<string>>(new Set());
  const [previewBoards, setPreviewBoards] = useState<PadletBoardPreview[]>([]);
  const [selectedImportKeys, setSelectedImportKeys] = useState<Set<string>>(new Set());
  const [alreadyRegisteredCount, setAlreadyRegisteredCount] = useState(0);

  const [name, setName] = useState("");
  const [padletBoardId, setPadletBoardId] = useState("");
  const [apiKeyIndex, setApiKeyIndex] = useState<1 | 2>(1);
  const [bulkText, setBulkText] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [errorDetails, setErrorDetails] = useState("");

  function importKey(item: PadletBoardPreview) {
    return `${item.apiKeyIndex}:${item.padletBoardId}`;
  }

  async function loadBoards() {
    const res = await fetch("/api/boards");
    const data = await res.json();
    if (res.ok) {
      const sorted = [...data.boards].sort((a: Board, b: Board) => {
        const aTime = a.padletCreatedAt ? new Date(a.padletCreatedAt).getTime() : 0;
        const bTime = b.padletCreatedAt ? new Date(b.padletCreatedAt).getTime() : 0;
        return bTime - aTime;
      });
      setBoards(sorted);
      setSelectedBoardIds(new Set());
    }
  }

  useEffect(() => {
    loadBoards();
  }, []);

  async function handleFetchPreview(importAll: boolean, account?: 1 | 2) {
    setImporting(true);
    setMessage("");
    setErrorDetails("");
    setShowImportPreview(false);

    const params = importAll
      ? "importAll=true"
      : `account=${account}`;
    const res = await fetch(`/api/boards/import?${params}`);
    const data = await res.json();

    if (res.ok) {
      setPreviewBoards(data.available ?? []);
      setAlreadyRegisteredCount(data.alreadyRegisteredCount ?? 0);
      setSelectedImportKeys(
        new Set((data.available ?? []).map((b: PadletBoardPreview) => importKey(b)))
      );
      setShowImportPreview(true);

      const errPart =
        data.errors?.length > 0 ? ` (${data.errors.length}개 계정 오류)` : "";
      const keyPart = data.keyStatus ? ` · ${formatKeyStatus(data.keyStatus)}` : "";
      setMessage(
        `Padlet 보드 ${data.availableCount}개 가져올 수 있음, ${data.alreadyRegisteredCount}개 이미 등록됨${errPart}${keyPart}`
      );
      if (data.errors?.length) {
        setErrorDetails(formatPadletErrors(data.errors));
      }
    } else {
      setMessage(data.error ?? "목록 조회 실패");
    }
    setImporting(false);
  }

  async function handleImportSelected() {
    const selected = previewBoards.filter((b) =>
      selectedImportKeys.has(importKey(b))
    );
    if (selected.length === 0) {
      setMessage("가져올 보드를 선택하세요.");
      return;
    }

    setImporting(true);
    setMessage("");

    const res = await fetch("/api/boards/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boards: selected }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage(`${data.addedCount}개 보드를 가져왔습니다.`);
      setShowImportPreview(false);
      setPreviewBoards([]);
      setSelectedImportKeys(new Set());
      await loadBoards();
    } else {
      setMessage(data.error ?? "가져오기 실패");
    }
    setImporting(false);
  }

  async function handleImportAll(importAll: boolean, account?: 1 | 2) {
    setImporting(true);
    setMessage("");

    const res = await fetch("/api/boards/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(importAll ? { importAll: true } : { importAll: false, account }),
    });

    const data = await res.json();
    if (res.ok) {
      const errPart =
        data.errors?.length > 0 ? ` (${data.errors.length}개 계정 오류)` : "";
      const keyPart = data.keyStatus ? ` · ${formatKeyStatus(data.keyStatus)}` : "";
      setMessage(
        `Padlet에서 ${data.addedCount}개 보드 추가, ${data.skippedCount}개 이미 등록됨${errPart}${keyPart}`
      );
      if (data.errors?.length) {
        setErrorDetails(formatPadletErrors(data.errors));
      }
      setShowImportPreview(false);
      await loadBoards();
    } else {
      setMessage(data.error ?? "가져오기 실패");
    }
    setImporting(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, padletBoardId, apiKeyIndex }),
    });

    const data = await res.json();
    if (res.ok) {
      setName("");
      setPadletBoardId("");
      setMessage(`"${data.board.name}" 보드가 추가되었습니다.`);
      await loadBoards();
    } else {
      setMessage(data.error ?? "추가 실패");
    }
    setLoading(false);
  }

  async function handleBulkAdd() {
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/boards/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: bulkText }),
    });

    const data = await res.json();
    if (res.ok) {
      setBulkText("");
      setShowBulk(false);
      setMessage(`${data.count}개 보드가 추가되었습니다.`);
      await loadBoards();
    } else {
      setMessage(data.error ?? "일괄 추가 실패");
    }
    setLoading(false);
  }

  async function handleDeleteOne(id: string, boardName: string) {
    if (!confirm(`"${boardName}" 보드를 삭제하시겠습니까?`)) return;
    await handleBulkDelete([id], `"${boardName}" 보드가 삭제되었습니다.`);
  }

  async function handleBulkDelete(ids: string[], successMessage?: string) {
    if (ids.length === 0) {
      setMessage("삭제할 보드를 선택하세요.");
      return;
    }

    setDeleting(true);
    setMessage("");

    const res = await fetch("/api/boards/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage(successMessage ?? `${data.deletedCount}개 보드가 삭제되었습니다.`);
      await loadBoards();
    } else {
      setMessage(data.error ?? "삭제 실패");
    }
    setDeleting(false);
  }

  async function handleDeleteAll(apiKeyIndex?: 1 | 2) {
    const targets =
      apiKeyIndex === 1 || apiKeyIndex === 2
        ? boards.filter((b) => b.apiKeyIndex === apiKeyIndex)
        : boards;

    if (targets.length === 0) {
      setMessage("삭제할 보드가 없습니다.");
      return;
    }

    const label =
      apiKeyIndex === 1
        ? "계정 1"
        : apiKeyIndex === 2
          ? "계정 2"
          : "전체";

    if (!confirm(`${label} 보드 ${targets.length}개를 모두 삭제하시겠습니까?`)) return;

    setDeleting(true);
    setMessage("");

    const res = await fetch("/api/boards/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deleteAll: true,
        ...(apiKeyIndex ? { apiKeyIndex } : {}),
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage(`${data.deletedCount}개 보드가 삭제되었습니다.`);
      await loadBoards();
    } else {
      setMessage(data.error ?? "삭제 실패");
    }
    setDeleting(false);
  }

  function toggleBoardSelection(id: string) {
    setSelectedBoardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleImportSelection(key: string) {
    setSelectedImportKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const account1Count = boards.filter((b) => b.apiKeyIndex === 1).length;
  const account2Count = boards.filter((b) => b.apiKeyIndex === 2).length;
  const allBoardsSelected =
    boards.length > 0 && selectedBoardIds.size === boards.length;
  const allImportSelected =
    previewBoards.length > 0 &&
    selectedImportKeys.size === previewBoards.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">보드 관리</h1>
        <p className="mt-1 text-sm text-slate-500">
          Padlet 보드를 가져오거나 삭제하세요. 현재 {boards.length}개 (계정1: {account1Count}, 계정2: {account2Count})
        </p>
      </div>

      {/* 가져오기 */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-4">
        <h2 className="font-semibold text-blue-900">Padlet에서 가져오기</h2>
        <p className="text-sm text-blue-800">
          API 계정의 Padlet 보드 <strong>제목</strong>과 <strong>ID</strong>를 조회해 등록합니다.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleFetchPreview(true)}
            disabled={importing || loading || deleting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {importing ? "조회 중..." : "목록 조회 (계정 1+2)"}
          </button>
          <button
            onClick={() => handleFetchPreview(false, 1)}
            disabled={importing || loading || deleting}
            className="rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            목록 조회 (계정 1)
          </button>
          <button
            onClick={() => handleFetchPreview(false, 2)}
            disabled={importing || loading || deleting}
            className="rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            목록 조회 (계정 2)
          </button>
          <button
            onClick={() => handleImportAll(true)}
            disabled={importing || loading || deleting}
            className="rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            전체 바로 가져오기
          </button>
        </div>

        {showImportPreview && (
          <div className="rounded-lg border border-blue-200 bg-white p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-600">
                새 보드 {previewBoards.length}개
                {alreadyRegisteredCount > 0 && ` · 이미 등록 ${alreadyRegisteredCount}개`}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setSelectedImportKeys(
                      allImportSelected
                        ? new Set()
                        : new Set(previewBoards.map((b) => importKey(b)))
                    )
                  }
                  className="text-xs text-blue-600 hover:underline"
                >
                  {allImportSelected ? "전체 해제" : "전체 선택"}
                </button>
                <button
                  onClick={() => handleImportSelected()}
                  disabled={importing || selectedImportKeys.size === 0}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  선택 {selectedImportKeys.size}개 가져오기
                </button>
              </div>
            </div>

            {previewBoards.length === 0 ? (
              <p className="text-sm text-slate-400">새로 가져올 보드가 없습니다.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto rounded border border-slate-100">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="w-10 px-3 py-2"></th>
                      <th className="px-3 py-2 font-medium">보드 이름</th>
                      <th className="px-3 py-2 font-medium">생성일</th>
                      <th className="px-3 py-2 font-medium">Padlet ID</th>
                      <th className="px-3 py-2 font-medium">계정</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewBoards.map((board) => {
                      const key = importKey(board);
                      return (
                        <tr key={key} className="hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedImportKeys.has(key)}
                              onChange={() => toggleImportSelection(key)}
                            />
                          </td>
                          <td className="px-3 py-2 font-medium">{board.name}</td>
                          <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                            {formatPadletDate(board.padletCreatedAt)}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-500">
                            {board.padletBoardId}
                          </td>
                          <td className="px-3 py-2 text-xs">계정 {board.apiKeyIndex}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 수동 추가 */}
      <form onSubmit={handleAdd} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="font-semibold text-slate-700">보드 수동 추가</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm text-slate-600">보드 이름</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="3월 국어 과제"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Padlet 보드 ID</label>
            <input
              value={padletBoardId}
              onChange={(e) => setPadletBoardId(e.target.value)}
              placeholder="abcd1234efgh5678"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">API 계정</label>
            <select
              value={apiKeyIndex}
              onChange={(e) => setApiKeyIndex(Number(e.target.value) as 1 | 2)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value={1}>계정 1</option>
              <option value={2}>계정 2</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          보드 추가
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <button
          onClick={() => setShowBulk(!showBulk)}
          className="text-sm font-semibold text-slate-600 hover:text-slate-800"
        >
          {showBulk ? "텍스트 일괄 추가 닫기" : "텍스트로 일괄 추가"}
        </button>
        {showBulk && (
          <div className="mt-4 space-y-3">
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={8}
              placeholder={"국어 1차 | abcd1234efgh5678 | 1\n수학 1차 | wxyz9876abcd1234 | 2"}
              className="w-full rounded-lg border border-slate-300 p-3 font-mono text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={handleBulkAdd}
              disabled={loading}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              일괄 추가
            </button>
          </div>
        )}
      </div>

      {message && (
        <p
          className={`text-sm ${
            message.includes("실패") || (errorDetails && message.includes("0개"))
              ? "text-red-600"
              : "text-green-600"
          }`}
        >
          {message}
        </p>
      )}

      {errorDetails && (
        <pre className="whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {errorDetails}
        </pre>
      )}

      {/* 등록된 보드 + 삭제 */}
      {boards.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
            <h2 className="font-semibold text-slate-700">등록된 보드 ({boards.length})</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() =>
                  setSelectedBoardIds(
                    allBoardsSelected ? new Set() : new Set(boards.map((b) => b.id))
                  )
                }
                className="text-xs text-slate-600 hover:underline"
              >
                {allBoardsSelected ? "전체 해제" : "전체 선택"}
              </button>
              <button
                onClick={() => handleBulkDelete([...selectedBoardIds])}
                disabled={deleting || selectedBoardIds.size === 0}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                선택 삭제 ({selectedBoardIds.size})
              </button>
              <button
                onClick={() => handleDeleteAll(1)}
                disabled={deleting || account1Count === 0}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                계정1 전체 삭제
              </button>
              <button
                onClick={() => handleDeleteAll(2)}
                disabled={deleting || account2Count === 0}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                계정2 전체 삭제
              </button>
              <button
                onClick={() => handleDeleteAll()}
                disabled={deleting}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                전체 삭제
              </button>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="w-10 px-4 py-3"></th>
                <th className="px-4 py-3 font-medium">보드 이름</th>
                <th className="px-4 py-3 font-medium">Padlet 생성일</th>
                <th className="px-4 py-3 font-medium">Padlet ID</th>
                <th className="px-4 py-3 font-medium">계정</th>
                <th className="px-4 py-3 font-medium w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {boards.map((board) => (
                <tr key={board.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedBoardIds.has(board.id)}
                      onChange={() => toggleBoardSelection(board.id)}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{board.name}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {formatPadletDate(board.padletCreatedAt)}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500">{board.padletBoardId}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        board.apiKeyIndex === 1
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      계정 {board.apiKeyIndex}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDeleteOne(board.id, board.name)}
                      disabled={deleting}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
