export interface ParsedStudent {
  number: number;
  name: string;
  raw: string;
}

export function parseStudentLine(line: string): ParsedStudent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d+)번\s+(.+)$/);
  if (!match) return null;

  return {
    number: parseInt(match[1], 10),
    name: match[2].trim(),
    raw: trimmed,
  };
}

export function parseStudentList(text: string): {
  students: ParsedStudent[];
  invalidLines: string[];
} {
  const lines = text.split(/\r?\n/);
  const students: ParsedStudent[] = [];
  const invalidLines: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parsed = parseStudentLine(trimmed);
    if (!parsed) {
      invalidLines.push(trimmed);
      continue;
    }

    const key = `${parsed.number}-${parsed.name}`;
    if (!seen.has(key)) {
      seen.add(key);
      students.push(parsed);
    }
  }

  students.sort((a, b) => a.number - b.number);
  return { students, invalidLines };
}

export function studentKey(number: number, name: string): string {
  return `${number}번 ${name}`;
}
