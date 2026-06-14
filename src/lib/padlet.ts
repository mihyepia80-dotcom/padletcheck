import { parseStudentLine, studentKey } from "./parse";
import type { SubmissionRecord } from "./firebase";

const PADLET_API_BASE = "https://api.padlet.dev/v1";

const PADLET_HEADERS = (apiKey: string): HeadersInit => ({
  "X-API-KEY": apiKey,
  Accept: "application/vnd.api+json",
});

interface PadletPost {
  id: string;
  type: string;
  attributes: {
    content: {
      subject: string;
      attachment?: { url?: string } | null;
    };
    webUrl?: { live?: string };
    createdAt: string;
  };
}

export interface PadletBoardSummary {
  id: string;
  title: string;
}

interface PadletBoardItem {
  id: string;
  type: string;
  attributes?: {
    title?: string;
  };
}

interface PadletMeResponse {
  included?: PadletBoardItem[];
}

interface PadletBoardResponse {
  included?: PadletPost[];
}

function getApiKey(index: 1 | 2): string {
  const key =
    index === 1 ? process.env.PADLET_API_KEY_1 : process.env.PADLET_API_KEY_2;
  if (!key) {
    throw new Error(`PADLET_API_KEY_${index} 환경변수가 설정되지 않았습니다.`);
  }
  return key;
}

export async function fetchUserBoards(
  apiKeyIndex: 1 | 2
): Promise<PadletBoardSummary[]> {
  const apiKey = getApiKey(apiKeyIndex);
  const url = `${PADLET_API_BASE}/me?include=boards`;

  const response = await fetch(url, {
    headers: PADLET_HEADERS(apiKey),
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Padlet API 오류 (${response.status}): ${text.slice(0, 200)}`
    );
  }

  const data = (await response.json()) as PadletMeResponse;
  return (data.included ?? [])
    .filter((item) => item.type === "board")
    .map((board) => ({
      id: board.id,
      title: board.attributes?.title?.trim() || "(제목 없음)",
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "ko"));
}

export async function fetchBoardPosts(
  padletBoardId: string,
  apiKeyIndex: 1 | 2
): Promise<PadletPost[]> {
  const apiKey = getApiKey(apiKeyIndex);
  const url = `${PADLET_API_BASE}/boards/${padletBoardId}?include=posts`;

  const response = await fetch(url, {
    headers: PADLET_HEADERS(apiKey),
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Padlet API 오류 (${response.status}): ${text.slice(0, 200)}`
    );
  }

  const data = (await response.json()) as PadletBoardResponse;
  return (data.included ?? []).filter(
    (item) => item.type === "post" || item.id?.startsWith("post_")
  );
}

export function matchSubmissions(
  posts: PadletPost[]
): {
  submissions: Record<string, SubmissionRecord>;
  invalidPosts: { subject: string; postId: string }[];
} {
  const submissions: Record<string, SubmissionRecord> = {};
  const invalidPosts: { subject: string; postId: string }[] = [];

  for (const post of posts) {
    const subject = post.attributes.content.subject?.trim() ?? "";
    if (!subject) {
      invalidPosts.push({ subject: "(제목 없음)", postId: post.id });
      continue;
    }

    const parsed = parseStudentLine(subject);
    if (!parsed) {
      invalidPosts.push({ subject, postId: post.id });
      continue;
    }

    const key = studentKey(parsed.number, parsed.name);
    const existing = submissions[key];
    if (
      !existing ||
      new Date(post.attributes.createdAt) > new Date(existing.createdAt)
    ) {
      submissions[key] = {
        postId: post.id,
        subject,
        webUrl: post.attributes.webUrl?.live ?? null,
        createdAt: post.attributes.createdAt,
        attachmentUrl: post.attributes.content.attachment?.url ?? null,
      };
    }
  }

  return { submissions, invalidPosts };
}

export async function syncBoard(
  padletBoardId: string,
  apiKeyIndex: 1 | 2
) {
  const posts = await fetchBoardPosts(padletBoardId, apiKeyIndex);
  return matchSubmissions(posts);
}
