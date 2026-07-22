'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api, apiDownloadHref } from '@/lib/api';
import { parseStudentImportCsv } from '@/lib/parse-student-import-csv';
import { QrImage } from '@/components/qr-image';

interface StudentLink {
  id: string;
  username: string;
  displayName: string;
  homepageSlug: string | null;
  courseHomeUrl: string | null;
  growthUrl: string | null;
  featuredWebProject?: { title: string; slug: string } | null;
}

interface BatchImportResult {
  summary: string;
  created: Array<{ id: string; username: string; displayName: string }>;
  failed: Array<{ row: number; username: string; displayName: string; reason: string }>;
}

export default function StudentsPage() {
  const [items, setItems] = useState<StudentLink[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState('');
  const [form, setForm] = useState({ username: '', displayName: '', password: '123456' });
  const [msg, setMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState<BatchImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const [links, cls] = await Promise.all([
      api.get('/homepages/teacher/student-links', { params: { classId: classId || undefined } }).then((r) => r.data),
      api.get('/classes').then((r) => r.data).catch(() => []),
    ]);
    setItems(links || []);
    setClasses(cls || []);
    setSelected((prev) => {
      const next: Record<string, boolean> = {};
      for (const s of links || []) {
        if (prev[s.id]) next[s.id] = true;
      }
      return next;
    });
  }

  useEffect(() => {
    load();
  }, [classId]);

  const selectedIds = useMemo(() => items.filter((s) => selected[s.id]).map((s) => s.id), [items, selected]);
  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const someSelected = selectedIds.length > 0;

  async function add() {
    setMsg(null);
    if (!form.username || !form.displayName) return;
    try {
      await api.post('/users', { ...form, role: 'student', classId: classId || undefined });
      setForm({ username: '', displayName: '', password: '123456' });
      load();
      setMsg('✅ 学生账号已创建（已自动生成课程主页与成长历程链接）');
    } catch (e: any) {
      setMsg('❌ ' + e.message);
    }
  }

  function toggleAll() {
    if (allSelected) setSelected({});
    else setSelected(Object.fromEntries(items.map((s) => [s.id, true])));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  }

  function downloadTable(kind: 'course' | 'growth' | 'both', onlySelected = false) {
    const q = new URLSearchParams({ kind });
    if (classId && !onlySelected) q.set('classId', classId);
    if (onlySelected && selectedIds.length > 0) q.set('ids', selectedIds.join(','));
    window.location.href = apiDownloadHref(`/exports/student-qrcodes.xlsx?${q.toString()}`);
  }

  function downloadTemplate() {
    window.location.href = apiDownloadHref('/exports/students-import-template.csv');
  }

  async function importCsv(file: File) {
    setImportBusy(true);
    setMsg(null);
    setImportResult(null);
    try {
      const text = await file.text();
      const students = parseStudentImportCsv(text);
      if (students.length === 0) {
        setMsg('❌ 表格里没有有效数据，请检查是否填写了昵称和登录用户名');
        return;
      }
      const result = await api.post<BatchImportResult>('/users/batch', {
        students,
        classId: classId || undefined,
      });
      setImportResult(result.data);
      setMsg(`✅ ${result.data.summary}`);
      load();
    } catch (e: any) {
      setMsg('❌ ' + e.message);
    } finally {
      setImportBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">🧒 学生账号与分享链接</h1>
          <p className="text-slate-600 mt-1 text-sm">
            支持单个创建、表格批量导入；勾选学生后可导出对应二维码。表格只需三列：昵称、登录用户名、初始密码（可留空，默认 123456）。
          </p>
        </div>
      </header>

      {/* 批量导入 */}
      <div className="kid-card-sky space-y-3">
        <div className="font-bold text-ink">📥 批量创建学生账号</div>
        <p className="text-xs text-ink-soft leading-relaxed">
          1. 下载模板 → 2. 用 Excel / WPS 填写（每行一个学生）→ 3. 导入。登录用户名不能重复；初始密码留空则使用 123456。
          {classId && ' 当前已选班级，导入的学生会自动加入该班级。'}
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <button type="button" onClick={downloadTemplate} className="kid-button-ghost text-sm">
            ⬇ 下载导入模板
          </button>
          <label className="kid-button-primary text-sm cursor-pointer">
            {importBusy ? '导入中…' : '📂 选择表格并导入'}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={importBusy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importCsv(f);
              }}
            />
          </label>
        </div>
        {importResult && importResult.failed.length > 0 && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs space-y-1 max-h-40 overflow-y-auto">
            <div className="font-bold text-amber-900">部分行导入失败：</div>
            {importResult.failed.map((f) => (
              <div key={`${f.row}-${f.username}`} className="text-amber-800">
                第 {f.row} 行 · {f.displayName || '（无昵称）'} / @{f.username || '—'}：{f.reason}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 单个创建 */}
      <div className="kid-card grid sm:grid-cols-4 gap-2">
        <input
          className="kid-input"
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          placeholder="昵称"
        />
        <input
          className="kid-input"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          placeholder="登录用户名"
        />
        <input
          className="kid-input"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="初始密码"
        />
        <button onClick={add} className="kid-button-primary">
          + 创建单个学生
        </button>
      </div>

      {classes.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-ink-soft">筛选班级：</span>
          <button
            type="button"
            onClick={() => setClassId('')}
            className={`kid-button-sm ${!classId ? 'bg-brand text-white border-brand' : ''}`}
          >
            全部
          </button>
          {classes.map((c: any) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setClassId(c.id)}
              className={`kid-button-sm ${classId === c.id ? 'bg-brand text-white border-brand' : ''}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* 选择与导出 */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={toggleAll} className="kid-button-sm">
          {allSelected ? '取消全选' : '全选当前列表'}
        </button>
        <span className="text-xs font-bold text-ink-soft">
          已选 {selectedIds.length} / {items.length} 人
        </span>
        <span className="text-ink-soft">|</span>
        <button
          type="button"
          disabled={!someSelected}
          onClick={() => downloadTable('course', true)}
          className="kid-button-ghost text-sm disabled:opacity-40"
        >
          ⬇ 导出已选·课程主页表格
        </button>
        <button
          type="button"
          disabled={!someSelected}
          onClick={() => downloadTable('growth', true)}
          className="kid-button-ghost text-sm disabled:opacity-40"
        >
          ⬇ 导出已选·成长历程表格
        </button>
        <button
          type="button"
          disabled={!someSelected}
          onClick={() => downloadTable('both', true)}
          className="kid-button-primary text-sm disabled:opacity-40"
        >
          ⬇ 导出已选·全部二维码表格
        </button>
        {!someSelected && (
          <>
            <span className="text-ink-soft hidden sm:inline">或导出全班/全部：</span>
            <button type="button" onClick={() => downloadTable('both')} className="kid-button-ghost text-sm">
              ⬇ 导出当前筛选全部（Excel 表格）
            </button>
          </>
        )}
      </div>

      {msg && <div className="text-sm">{msg}</div>}

      <div className="space-y-3">
        {items.map((s) => (
          <div key={s.id} className={`kid-card !p-4 ${selected[s.id] ? 'ring-2 ring-brand/40' : ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-3 cursor-pointer min-w-0 flex-1">
                <input
                  type="checkbox"
                  checked={!!selected[s.id]}
                  onChange={() => toggleOne(s.id)}
                  className="w-5 h-5 rounded border-2 border-orange-200 accent-brand shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-bold text-lg">{s.displayName}</div>
                  <div className="text-xs text-slate-500">@{s.username}</div>
                  {s.featuredWebProject && (
                    <div className="text-xs text-emerald-600 mt-1">首页网页：{s.featuredWebProject.title}</div>
                  )}
                </div>
              </label>
              <button
                type="button"
                onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                className="kid-button-sm"
              >
                {expanded === s.id ? '收起二维码' : '📱 查看链接与二维码'}
              </button>
            </div>

            {expanded === s.id && s.homepageSlug && (
              <div className="mt-4 grid md:grid-cols-2 gap-4 pt-4 border-t border-orange-100">
                <ShareBlock title="📚 课程主页" url={s.courseHomeUrl!} />
                <ShareBlock title="📈 成长历程" url={s.growthUrl!} />
              </div>
            )}

            {expanded === s.id && !s.homepageSlug && (
              <p className="text-sm text-rose-500 mt-3">该学生尚未生成主页 slug，请重新登录或联系管理员。</p>
            )}
          </div>
        ))}
        {items.length === 0 && <div className="kid-card text-center text-slate-500">暂无学生</div>}
      </div>
    </div>
  );
}

function ShareBlock({ title, url }: { title: string; url: string }) {
  return (
    <div className="rounded-2xl bg-orange-50/80 border-2 border-orange-100 p-4 flex gap-4 items-start">
      <QrImage url={url} size={100} />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="font-bold text-sm">{title}</div>
        <p className="text-xs text-slate-600 break-all">{url}</p>
        <div className="flex flex-wrap gap-2">
          <a href={url} target="_blank" rel="noreferrer" className="text-xs font-bold text-brand">
            打开预览 ↗
          </a>
          <button
            type="button"
            className="text-xs font-bold text-slate-500"
            onClick={() => navigator.clipboard.writeText(url)}
          >
            复制链接
          </button>
        </div>
      </div>
    </div>
  );
}
