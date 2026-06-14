"use client";

import { useEffect, useState, useCallback } from "react";

interface Board {
  id: string;
  name: string;
  padletBoardId: string;
  apiKeyIndex: 1 | 2;
}

interface Student {
  number: number;
  name: string;
}

interface Submission {
  postId: string;
  subject: string;
  webUrl: string | null;
  createdAt: string;
  attachmentUrl: string | null;
}

interface CheckResult {
  board: Board;
  syncedAt: string | null;
  submitted: (Student & { submission: Submission })[];
  missing: Student[];
  totalStudents: number;
  submittedCount: number;
  missingCount: number;
}

export default function CheckPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncAll, setSyncAll] = useState(false);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<"all" | "submitted" | "missing">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/boards")
      .then((r) => r.json())
      .then((data) => {
        if (data.boards?.length) {
          setBoards(data.boards);
          setSelectedBoardId(data.boards[0].id);
        }
      });
  }, []);

  const loadResult = useCallback(async (boardId: string) => {
    const res = await fetch(`/api/sync?boardId=${boardId}`);
    const data = await res.json();
    if (res.ok) setResult(data);
  }, []);

  useEffect(() => {
    if (selectedBoardId) loadResult(selectedBoardId);
  }, [selectedBoardId, loadResult]);

  async function handleSync(all = false) {
    setSyncing(true);
    setSyncAll(all);
    setMessage("");

    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(all ? { syncAll: true } : { boardId: selectedBoardId }),
    });

    const data = await res.json();
    if (res.ok) {
      const successCount = data.results?.length ?? 0;
      const errorCount = data.errors?.length ?? 0;
      setMessage(
        `동기화 완료: ${successCount}개 성공` +
        (errorCount > 0 ? `, ${errorCount}개 실패` : "")
      );
      if (!all && selectedBoardId) await loadResult(selectedBoardId);
    } else {
      setMessage(data.error ?? "동기화 실패");
    }
    setSyncing(false);
    setSyncAll(false);
  }

  function copyMissingList() {
    if (!result?.missing.length) return;
    const text = result.missing.map((s) => `${s.number}번 ${s.name}`).join("\n");
    navigator.clipboard.writeText(text);
    setMessage("미제출자 명단이 클립보드에 복사되었습니다.");
  }

  const allStudents = result
    ? [
        ...result.submitted.map((s) => ({ ...s, status: "submitted" as const })),
        ...result.missing.map((s) => ({ ...s, status: "missing" as const })),
      ].sort((a, b) => a.number - b.number)
    : [];

  const filtered = allStudents.filter((s) => {
    if (filter === "submitted" && s.status !== "submitted") return false;
    if (filter === "missing" && s.status !== "missing") return false;
    if (search) {
      const q = search.toLowerCase();
      return `${s.number}번 ${s.name}`.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">과제 확인</h1>
          <p className="mt-1 text-sm text-slate-500">
            보드를 선택하고 Padlet에서 최신 제출 현황을 가져옵니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSync(false)}
            disabled={syncing || !selectedBoardId}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {syncing && !syncAll ? "동기화 중..." : "이 보드 동기화"}
          </button>
          <button
            onClick={() => handleSync(true)}
            disabled={syncing || boards.length === 0}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {syncing && syncAll ? "전체 동기화 중..." : `전체 동기화 (${boards.length}개)`}
          </button>
        </div>
      </div>

      {boards.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          등록된 보드가 없습니다. <a href="/boards" className="underline">보드 관리</a>에서 Padlet 보드를 추가하세요.
        </div>
      ) : (
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={selectedBoardId}
            onChange={(e) => setSelectedBoardId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none min-w-[200px]"
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} (계정{b.apiKeyIndex})
              </option>
            ))}
          </select>

          {result?.syncedAt && (
            <span className="text-xs text-slate-400">
              마지막 동기화: {new Date(result.syncedAt).toLocaleString("ko-KR")}
            </span>
          )}
        </div>
      )}

      {message && (
        <p className={`text-sm ${message.includes("실패") ? "text-red-600" : "text-green-600"}`}>
          {message}
        </p>
      )}

      {result && result.totalStudents === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          학생 명단이 비어 있습니다. <a href="/students" className="underline">학생 명단</a>을 먼저 등록하세요.
        </div>
      )}

      {result && result.totalStudents > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-slate-800">{result.totalStudents}</p>
              <p className="text-xs text-slate-500">전체 학생</p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{result.submittedCount}</p>
              <p className="text-xs text-green-600">제출 완료</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{result.missingCount}</p>
              <p className="text-xs text-red-500">미제출</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border border-slate-200 bg-white p-1">
              {(["all", "submitted", "missing"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-md px-3 py-1 text-sm ${
                    filter === f ? "bg-slate-100 font-medium text-slate-800" : "text-slate-500"
                  }`}
                >
                  {f === "all" ? "전체" : f === "submitted" ? "제출" : "미제출"}
                </button>
              ))}
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름 또는 번호 검색"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            />
            {result.missingCount > 0 && (
              <button
                onClick={copyMissingList}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                미제출자 복사
              </button>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium w-16">번호</th>
                  <th className="px-4 py-3 font-medium">이름</th>
                  <th className="px-4 py-3 font-medium w-24">상태</th>
                  <th className="px-4 py-3 font-medium">패들렛 게시글</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((student) => (
                  <tr key={`${student.number}-${student.name}`} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{student.number}</td>
                    <td className="px-4 py-3 font-medium">{student.name}</td>
                    <td className="px-4 py-3">
                      {student.status === "submitted" ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          제출
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                          미제출
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {student.status === "submitted" && "submission" in student && student.submission?.webUrl ? (
                        <a
                          href={student.submission.webUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          게시글 보기
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-slate-400">검색 결과가 없습니다.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
