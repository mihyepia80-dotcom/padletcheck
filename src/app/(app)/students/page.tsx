"use client";

import { useEffect, useState } from "react";

interface Student {
  number: number;
  name: string;
}

interface ClassGroup {
  id: string;
  name: string;
  students: Student[];
  createdAt: string;
}

function studentsToText(students: Student[]): string {
  return students
    .sort((a, b) => a.number - b.number)
    .map((s) => `${s.number}번 ${s.name}`)
    .join("\n");
}

export default function StudentsPage() {
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [text, setText] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [invalidLines, setInvalidLines] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  async function loadClasses(selectId?: string) {
    const res = await fetch("/api/classes");
    const data = await res.json();
    if (!res.ok) return;

    const list: ClassGroup[] = data.classes ?? [];
    setClasses(list);

    const nextId =
      selectId && list.some((c) => c.id === selectId)
        ? selectId
        : list[0]?.id ?? "";
    setSelectedClassId(nextId);

    const selected = list.find((c) => c.id === nextId);
    setText(selected ? studentsToText(selected.students) : "");
  }

  useEffect(() => {
    loadClasses();
  }, []);

  function handleSelectClass(id: string) {
    setSelectedClassId(id);
    const classGroup = classes.find((c) => c.id === id);
    setText(classGroup ? studentsToText(classGroup.students) : "");
    setMessage("");
    setInvalidLines([]);
  }

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    if (!newClassName.trim()) return;

    setCreating(true);
    setMessage("");

    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newClassName.trim() }),
    });

    const data = await res.json();
    if (res.ok) {
      setNewClassName("");
      setMessage(`"${data.class.name}" 반이 생성되었습니다.`);
      await loadClasses(data.class.id);
    } else {
      setMessage(data.error ?? "반 생성 실패");
    }
    setCreating(false);
  }

  async function handleDeleteClass() {
    if (!selectedClass) return;
    if (!confirm(`"${selectedClass.name}" 반과 명단을 삭제하시겠습니까?`)) return;

    setLoading(true);
    const res = await fetch("/api/classes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedClass.id }),
    });

    if (res.ok) {
      setMessage(`"${selectedClass.name}" 반이 삭제되었습니다.`);
      await loadClasses();
    } else {
      const data = await res.json();
      setMessage(data.error ?? "삭제 실패");
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!selectedClassId) {
      setMessage("반을 먼저 선택하거나 생성하세요.");
      return;
    }

    setLoading(true);
    setMessage("");
    setInvalidLines([]);

    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: selectedClassId, text }),
    });

    const data = await res.json();
    if (res.ok) {
      setInvalidLines(data.invalidLines ?? []);
      setMessage(`"${selectedClass?.name}"에 ${data.count}명 저장되었습니다.`);
      await loadClasses(selectedClassId);
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
          반을 생성하고 반별로 학생 명단을 관리하세요. 형식:{" "}
          <code className="rounded bg-slate-100 px-1">2번 홍길동</code>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* 반 목록 */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <h2 className="text-sm font-bold text-slate-700">반 목록</h2>

          <form onSubmit={handleCreateClass} className="flex gap-2">
            <input
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="예: 5학년 3반"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={creating || !newClassName.trim()}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
            >
              {creating ? "..." : "+ 반"}
            </button>
          </form>

          {classes.length === 0 ? (
            <p className="text-sm text-slate-400">반을 추가해 주세요.</p>
          ) : (
            <ul className="space-y-1">
              {classes.map((classGroup) => (
                <li key={classGroup.id}>
                  <button
                    onClick={() => handleSelectClass(classGroup.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedClassId === classGroup.id
                        ? "bg-blue-100 font-medium text-blue-800"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{classGroup.name}</span>
                    <span className="ml-2 text-xs text-slate-400">
                      {classGroup.students.length}명
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 명단 편집 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          {selectedClass ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">
                  {selectedClass.name}
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    {selectedClass.students.length}명
                  </span>
                </h2>
                <button
                  onClick={handleDeleteClass}
                  disabled={loading}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  반 삭제
                </button>
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
              </div>
            </>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">
              왼쪽에서 반을 선택하거나 새 반을 만드세요.
            </div>
          )}
        </div>
      </div>

      {message && (
        <p
          className={`text-sm ${
            message.includes("실패") ? "text-red-600" : "text-green-600"
          }`}
        >
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
              <li key={i} className="font-mono">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
