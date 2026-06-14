import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getStudents, saveStudents } from "@/lib/firebase";
import { parseStudentList } from "@/lib/parse";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const students = await getStudents();
    return NextResponse.json({ students });
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
    const { text } = await request.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "명단 텍스트가 필요합니다." }, { status: 400 });
    }

    const { students, invalidLines } = parseStudentList(text);
    await saveStudents(students);

    return NextResponse.json({
      students,
      invalidLines,
      count: students.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "저장 실패" },
      { status: 500 }
    );
  }
}
