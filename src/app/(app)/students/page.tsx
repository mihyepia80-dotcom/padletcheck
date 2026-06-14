"use client";

import { useEffect, useState } from "react";

export default function StudentsPage() {
  const [text, setText] = useState("");
  const [savedCount, setSavedCount] = useState(0);
  const [invalidLines, setInvalidLines] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/students")
      .then((r) => r.json())
      .then((data) => {
        if (data.students?.length) {
          const lines = data.students.map(
            (s: { number: number; name: string }) => `${s.number}번 ${s.name}`
          );
          setText(lines.join("\n"));
          setSavedCount(data.students.length);
        }
      });
  }, []);

  async function handleSave() {
    setLoading(true);
    setMessage("");
    setInvalidLines([]);

    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const data = await res.json();
    if (res.ok) {
      setSavedCount(data.count);
      setInvalidLines(data.invalidLines ?? []);
      setMessage(`${data.count}명의 학생 명단이 저장되었습니다.`);
    } else {
      setMessage(data.error ?? "저장에 실패했습니다.");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">학생 명단</h1>
        <p className="mt-1 text-sm text-slate-500">
          한 줄에 한 명씩 입력하세요. 형식: <code className="rounded bg-slate-100 px-1">2번 홍길동</code>
        </p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={16}
        placeholder={"1번 김철수\n2번 홍길동\n3번 이영희"}
        className="w-full rounded-xl border border-slate-300 p-4 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "저장 중..." : "명단 저장"}
        </button>
        {savedCount > 0 && (
          <span className="text-sm text-slate-500">현재 {savedCount}명 등록됨</span>
        )}
      </div>

      {message && (
        <p className={`text-sm ${message.includes("실패") ? "text-red-600" : "text-green-600"}`}>
          {message}
        </p>
      )}

      {invalidLines.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-medium text-amber-800">
            형식이 맞지 않아 무시된 줄 ({invalidLines.length}개)
          </p>
          <ul className="space-y-1 text-sm text-amber-700">
            {invalidLines.map((line, i) => (
              <li key={i} className="font-mono">{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
