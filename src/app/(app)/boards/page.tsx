"use client";

import { useEffect, useState } from "react";

interface Board {
  id: string;
  name: string;
  padletBoardId: string;
  apiKeyIndex: 1 | 2;
}

export default function BoardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [name, setName] = useState("");
  const [padletBoardId, setPadletBoardId] = useState("");
  const [apiKeyIndex, setApiKeyIndex] = useState<1 | 2>(1);
  const [bulkText, setBulkText] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  async function loadBoards() {
    const res = await fetch("/api/boards");
    const data = await res.json();
    if (res.ok) setBoards(data.boards);
  }

  useEffect(() => {
    loadBoards();
  }, []);

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

  async function handleDelete(id: string, boardName: string) {
    if (!confirm(`"${boardName}" 보드를 삭제하시겠습니까?`)) return;

    const res = await fetch("/api/boards", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      setMessage(`"${boardName}" 보드가 삭제되었습니다.`);
      await loadBoards();
    }
  }

  const account1Count = boards.filter((b) => b.apiKeyIndex === 1).length;
  const account2Count = boards.filter((b) => b.apiKeyIndex === 2).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">보드 관리</h1>
        <p className="mt-1 text-sm text-slate-500">
          Padlet 보드 ID와 사용할 API 계정(1 또는 2)을 등록하세요.
          현재 {boards.length}개 보드 (계정1: {account1Count}, 계정2: {account2Count})
        </p>
      </div>

      <form onSubmit={handleAdd} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="font-semibold text-slate-700">보드 개별 추가</h2>
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
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          보드 추가
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <button
          onClick={() => setShowBulk(!showBulk)}
          className="text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          {showBulk ? "일괄 추가 닫기" : "보드 일괄 추가 (수십 개)"}
        </button>

        {showBulk && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-500">
              한 줄에 하나씩: <code className="rounded bg-slate-100 px-1">보드이름 | 보드ID | 계정번호</code>
              <br />
              계정번호 생략 시 1번 계정 사용. <code className="rounded bg-slate-100 px-1">#</code>으로 시작하는 줄은 주석.
            </p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={10}
              placeholder={"# 3월 과제들\n국어 1차 | abcd1234efgh5678 | 1\n수학 1차 | wxyz9876abcd1234 | 2"}
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
        <p className={`text-sm ${message.includes("실패") ? "text-red-600" : "text-green-600"}`}>
          {message}
        </p>
      )}

      {boards.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">보드 이름</th>
                <th className="px-4 py-3 font-medium">Padlet ID</th>
                <th className="px-4 py-3 font-medium">계정</th>
                <th className="px-4 py-3 font-medium w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {boards.map((board) => (
                <tr key={board.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{board.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-500">{board.padletBoardId}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      board.apiKeyIndex === 1
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}>
                      계정 {board.apiKeyIndex}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(board.id, board.name)}
                      className="text-xs text-red-500 hover:text-red-700"
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
