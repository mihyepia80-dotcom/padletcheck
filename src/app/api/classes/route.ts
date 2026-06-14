import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getClasses, createClass, deleteClass, updateClassName } from "@/lib/firebase";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
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
    const { name } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "반 이름이 필요합니다." }, { status: 400 });
    }

    const classGroup = await createClass(name.trim());
    return NextResponse.json({ class: classGroup });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "생성 실패" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { id, name } = await request.json();
    if (!id || !name?.trim()) {
      return NextResponse.json(
        { error: "반 ID와 이름이 필요합니다." },
        { status: 400 }
      );
    }

    const classGroup = await updateClassName(id, name.trim());
    return NextResponse.json({ class: classGroup });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "수정 실패" },
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
      return NextResponse.json({ error: "반 ID가 필요합니다." }, { status: 400 });
    }

    await deleteClass(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "삭제 실패" },
      { status: 500 }
    );
  }
}
