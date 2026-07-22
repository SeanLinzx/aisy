export interface StudentImportRow {
  displayName: string;
  username: string;
  password?: string;
}

/** 解析老师上传的 CSV（昵称,登录用户名,初始密码），初始密码可留空 */
export function parseStudentImportCsv(text: string): StudentImportRow[] {
  const raw = text.replace(/^\ufeff/, '').trim();
  if (!raw) return [];

  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const first = splitCsvLine(lines[0]);
  const hasHeader = first.some((cell) => /昵称|用户名|password|display/i.test(cell));
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const rows: StudentImportRow[] = [];
  for (const line of dataLines) {
    const cells = splitCsvLine(line);
    if (cells.every((c) => !c.trim())) continue;

    const displayName = (cells[0] || '').trim();
    const username = (cells[1] || '').trim();
    const password = (cells[2] || '').trim();

    if (!displayName && !username) continue;
    rows.push({
      displayName,
      username,
      password: password || undefined,
    });
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}
