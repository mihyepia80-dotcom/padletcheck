import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getClasses, saveClassStudents } from "@/lib/firebase";
import { parseStudentList } from "@/lib/parse";

export async function GET(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const classId = request.nextUrl.searchParams.get("classId");

    if (classId) {
      const classes = await getClasses();
      const classGroup = classes.find((c) => c.id === classId);
      if (!classGroup) {
        return NextResponse.json({ error: "반을 찾을 수 없습니다." }, { status: 404 });
      }
      return NextResponse.json({
        class: classGroup,
        students: classGroup.students,
      });
    }

    const classes = await getClasses();
    return NextResponse.json({ classes });
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
    const { classId, text } = await request.json();

    if (!classId) {
      return NextResponse.json({ error: "classId가 필요합니다." }, { status: 400 });
    }
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "명단 텍스트가 필요합니다." }, { status: 400 });
    }

    const { students, invalidLines } = parseStudentList(text);
    const classGroup = await saveClassStudents(classId, students);

    return NextResponse.json({
      class: classGroup,
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
