import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | undefined;
let db: Firestore | undefined;

function initFirebase(): Firestore {
  if (db) return db;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON 환경변수가 설정되지 않았습니다.");
  }

  let serviceAccount: Record<string, unknown>;
  try {
    const trimmed = serviceAccountJson.trim();
    serviceAccount = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON 형식이 올바르지 않습니다. Firebase 서비스 계정 JSON 파일 내용 전체를 한 줄로 붙여넣으세요. (프로젝트 ID만 넣으면 안 됩니다.)"
    );
  }

  if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON에 project_id, private_key, client_email이 필요합니다."
    );
  }

  if (!getApps().length) {
    app = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    app = getApps()[0];
  }

  db = getFirestore(app);
  return db;
}

export function getDb(): Firestore {
  return initFirebase();
}

export interface Board {
  id: string;
  name: string;
  padletBoardId: string;
  apiKeyIndex: 1 | 2;
  createdAt: string;
  padletCreatedAt?: string | null;
}

export interface Student {
  number: number;
  name: string;
}

export interface SubmissionRecord {
  postId: string;
  subject: string;
  webUrl: string | null;
  createdAt: string;
  attachmentUrl: string | null;
}

const BOARDS_COLLECTION = "boards";
const SETTINGS_DOC = "settings/main";

export async function getBoards(): Promise<Board[]> {
  const snapshot = await getDb().collection(BOARDS_COLLECTION).orderBy("name").get();
  return snapshot.docs.map((doc) => doc.data() as Board);
}

export async function addBoard(board: Omit<Board, "id" | "createdAt">): Promise<Board> {
  const id = crypto.randomUUID();
  const newBoard: Board = {
    ...board,
    id,
    createdAt: new Date().toISOString(),
  };
  await getDb().collection(BOARDS_COLLECTION).doc(id).set(newBoard);
  return newBoard;
}

export async function deleteBoard(id: string): Promise<void> {
  await getDb().collection(BOARDS_COLLECTION).doc(id).delete();
  await getDb().collection(SYNC_COLLECTION).doc(id).delete();
}

export async function deleteBoards(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const batch = getDb().batch();
  for (const id of ids) {
    batch.delete(getDb().collection(BOARDS_COLLECTION).doc(id));
    batch.delete(getDb().collection(SYNC_COLLECTION).doc(id));
  }
  await batch.commit();
  return ids.length;
}

export async function deleteAllBoards(apiKeyIndex?: 1 | 2): Promise<number> {
  const boards = await getBoards();
  const targets =
    apiKeyIndex === 1 || apiKeyIndex === 2
      ? boards.filter((b) => b.apiKeyIndex === apiKeyIndex)
      : boards;
  return deleteBoards(targets.map((b) => b.id));
}

export async function getStudents(): Promise<Student[]> {
  const doc = await getDb().doc(SETTINGS_DOC).get();
  if (!doc.exists) return [];
  return (doc.data()?.students as Student[]) ?? [];
}

export async function saveStudents(students: Student[]): Promise<void> {
  await getDb().doc(SETTINGS_DOC).set({ students }, { merge: true });
}

const SYNC_COLLECTION = "sync_results";

export async function saveSyncResult(
  boardId: string,
  submissions: Record<string, SubmissionRecord>
): Promise<void> {
  await getDb().collection(SYNC_COLLECTION).doc(boardId).set({
    submissions,
    syncedAt: new Date().toISOString(),
  });
}

export async function getSyncResult(
  boardId: string
): Promise<{ submissions: Record<string, SubmissionRecord>; syncedAt: string } | null> {
  const doc = await getDb().collection(SYNC_COLLECTION).doc(boardId).get();
  if (!doc.exists) return null;
  const data = doc.data();
  return {
    submissions: (data?.submissions as Record<string, SubmissionRecord>) ?? {},
    syncedAt: data?.syncedAt as string,
  };
}
