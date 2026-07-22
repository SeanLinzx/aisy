'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { GroupScoreboardPanel } from '@/components/course/group-scoreboard-panel';

type Group = {
  id: string;
  name: string;
  points?: number;
  class?: { id: string; name: string };
  members?: Array<{ user: { id: string; displayName: string; username: string } }>;
};

type ClassItem = { id: string; name: string };

function parseNameList(text: string): string[] {
  return [...new Set(text.split(/[\n,，、;；]/).map((s) => s.trim()).filter(Boolean))];
}

function parseBatchGroupLines(text: string): Array<{ name: string; memberNames: string[] }> {
  const items: Array<{ name: string; memberNames: string[] }> = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const sep = trimmed.match(/[:：]/);
    if (sep && sep.index != null) {
      const name = trimmed.slice(0, sep.index).trim();
      const membersPart = trimmed.slice(sep.index + 1).trim();
      items.push({ name, memberNames: parseNameList(membersPart) });
    } else {
      items.push({ name: trimmed, memberNames: [] });
    }
  }
  return items;
}

function groupCardTone(name: string) {
  if (/红/.test(name)) return 'border-rose-200 bg-gradient-to-br from-rose-50 to-white';
  if (/蓝/.test(name)) return 'border-sky-200 bg-gradient-to-br from-sky-50 to-white';
  if (/绿/.test(name)) return 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white';
  if (/黄/.test(name)) return 'border-amber-200 bg-gradient-to-br from-amber-50 to-white';
  return 'border-slate-200 bg-white';
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classStudents, setClassStudents] = useState<Array<{ id: string; displayName: string; username: string }>>([]);
  const [classId, setClassId] = useState('');
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [name, setName] = useState('');
  const [memberText, setMemberText] = useState('');
  const [batchText, setBatchText] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editMemberText, setEditMemberText] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const loadGroups = useCallback(async (cid?: string) => {
    const params = cid ? { classId: cid } : undefined;
    setGroups((await api.get('/groups', { params })).data);
  }, []);

  const loadClasses = useCallback(async () => {
    setClasses((await api.get('/classes')).data);
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    if (classes.length > 0 && !classId) {
      setClassId(classes[0].id);
    }
  }, [classes, classId]);

  useEffect(() => {
    if (classId) loadGroups(classId);
  }, [classId, loadGroups]);

  useEffect(() => {
    if (!classId) {
      setClassStudents([]);
      return;
    }
    api.get(`/classes/${classId}`).then((r) => {
      const students = (r.data?.members || [])
        .filter((m: any) => m.user.role === 'student')
        .map((m: any) => m.user);
      setClassStudents(students);
    }).catch(() => setClassStudents([]));
  }, [classId]);

  const assignedStudentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const g of groups) {
      for (const m of g.members || []) ids.add(m.user.id);
    }
    return ids;
  }, [groups]);

  async function createSingle() {
    if (!classId || !name.trim()) {
      setMsg('请选择班级并填写小组名称');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const memberNames = parseNameList(memberText);
      const r = await api.post('/groups', { classId, name: name.trim(), memberNames });
      const unmatched = r.data?.unmatched as string[] | undefined;
      setName('');
      setMemberText('');
      await loadGroups(classId);
      if (unmatched?.length) {
        setMsg(`✅ 已创建「${name.trim()}」，未匹配成员：${unmatched.join('、')}`);
      } else {
        setMsg(`✅ 已创建「${name.trim()}」${memberNames.length ? `，${memberNames.length} 名成员已加入` : ''}`);
      }
    } catch (e: any) {
      setMsg('❌ ' + (e.response?.data?.message || e.message));
    } finally {
      setBusy(false);
    }
  }

  async function createBatch() {
    if (!classId || !batchText.trim()) {
      setMsg('请选择班级并填写批量内容');
      return;
    }
    const items = parseBatchGroupLines(batchText);
    if (items.length === 0) {
      setMsg('请至少填写一行小组信息');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const r = await api.post('/groups/batch-with-members', { classId, groups: items });
      const failed = (r.data?.results as Array<{ name: string; unmatched: string[] }> || [])
        .flatMap((x) => x.unmatched.map((n) => `${x.name}:${n}`));
      setBatchText('');
      await loadGroups(classId);
      const created = r.data?.created ?? items.length;
      if (failed.length) {
        setMsg(`✅ 已创建 ${created} 个小组，部分成员未匹配：${failed.join('、')}`);
      } else {
        setMsg(`✅ 已批量创建 ${created} 个小组`);
      }
    } catch (e: any) {
      setMsg('❌ ' + (e.response?.data?.message || e.message));
    } finally {
      setBusy(false);
    }
  }

  async function addMembers(groupId: string) {
    const text = editMemberText[groupId] || '';
    const names = parseNameList(text);
    if (names.length === 0) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await api.post(`/groups/${groupId}/members`, { names });
      const unmatched = r.data?.unmatched as string[] | undefined;
      setEditMemberText((prev) => ({ ...prev, [groupId]: '' }));
      await loadGroups(classId);
      if (unmatched?.length) {
        setMsg(`✅ 已添加成员，未匹配：${unmatched.join('、')}`);
      } else {
        setMsg(`✅ 已添加 ${r.data?.added ?? names.length} 名成员`);
      }
    } catch (e: any) {
      setMsg('❌ ' + (e.response?.data?.message || e.message));
    } finally {
      setBusy(false);
    }
  }

  async function addMemberById(groupId: string, userId: string) {
    setBusy(true);
    setMsg(null);
    try {
      await api.post(`/groups/${groupId}/members`, { userId });
      await loadGroups(classId);
      setMsg('✅ 已添加成员');
    } catch (e: any) {
      setMsg('❌ ' + (e.response?.data?.message || e.message));
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(groupId: string, userId: string) {
    setBusy(true);
    setMsg(null);
    try {
      await api.delete(`/groups/${groupId}/members/${userId}`);
      await loadGroups(classId);
      setMsg('✅ 已移除成员');
    } catch (e: any) {
      setMsg('❌ ' + (e.response?.data?.message || e.message));
    } finally {
      setBusy(false);
    }
  }

  async function removeGroup(groupId: string, groupName: string) {
    if (!confirm(`确定删除小组「${groupName}」？`)) return;
    setBusy(true);
    setMsg(null);
    try {
      await api.delete(`/groups/${groupId}`);
      if (expandedId === groupId) setExpandedId(null);
      await loadGroups(classId);
      setMsg('✅ 已删除小组');
    } catch (e: any) {
      setMsg('❌ ' + (e.response?.data?.message || e.message));
    } finally {
      setBusy(false);
    }
  }

  const unassignedStudents = classStudents.filter((s) => !assignedStudentIds.has(s.id));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-brand-dark">👯 小组管理与积分</h1>
        <p className="text-slate-600 mt-1 text-sm">
          在本班创建、编辑小组；下方积分板可为各组加分，小朋友在学生端首页可看到小组排名。
        </p>
      </header>

      <div className="kid-card space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <select className="kid-input min-w-[220px]" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">选择班级</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="flex rounded-xl overflow-hidden border border-slate-200 text-sm">
            <button
              type="button"
              className={`px-4 py-2 ${mode === 'single' ? 'bg-brand text-white' : 'bg-white text-slate-600'}`}
              onClick={() => setMode('single')}
            >
              单个录入
            </button>
            <button
              type="button"
              className={`px-4 py-2 ${mode === 'batch' ? 'bg-brand text-white' : 'bg-white text-slate-600'}`}
              onClick={() => setMode('batch')}
            >
              批量录入
            </button>
          </div>
        </div>

        {mode === 'single' ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <input
                className="kid-input flex-1 min-w-[160px]"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="小组名称，如：红色小组"
              />
              <button type="button" onClick={createSingle} disabled={busy} className="kid-button-primary">
                创建小组
              </button>
            </div>
            <textarea
              className="kid-textarea min-h-[88px]"
              value={memberText}
              onChange={(e) => setMemberText(e.target.value)}
              placeholder="成员姓名（可选），逗号或换行分隔，如：&#10;小爱、小博"
            />
            <p className="text-xs text-slate-500">
              按本班学生姓名或账号匹配；未在本班的学生不会加入。
              {classStudents.length > 0 && ` 本班共 ${classStudents.length} 名学生。`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              className="kid-textarea min-h-[140px] font-mono text-sm"
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder={'每行一个小组，可选附带成员：\n红色小组：小爱、小博\n蓝色小组：小超、小朵\n绿色小组'}
            />
            <button type="button" onClick={createBatch} disabled={busy} className="kid-button-primary">
              批量创建
            </button>
            <p className="text-xs text-slate-500">
              格式：「小组名：成员1、成员2」或仅写小组名；冒号支持中英文。
            </p>
          </div>
        )}

        {msg && <div className="text-sm rounded-xl px-3 py-2 bg-slate-50 border border-slate-100">{msg}</div>}
      </div>

      {unassignedStudents.length > 0 && (
        <div className="kid-card text-sm text-slate-600">
          未分组学生（{unassignedStudents.length}）：{unassignedStudents.map((s) => s.displayName).join('、')}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {groups.map((g) => {
          const expanded = expandedId === g.id;
          const memberIds = new Set((g.members || []).map((m) => m.user.id));
          const pickable = classStudents.filter((s) => !memberIds.has(s.id));
          return (
            <div key={g.id} className={`kid-card border ${groupCardTone(g.name)}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-lg">{g.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">所属班级：{g.class?.name}</div>
                </div>
                <span className="text-lg font-extrabold text-brand shrink-0">{g.points ?? 0} 分</span>
              </div>
              <div className="mt-2 text-sm">
                成员：{(g.members || []).map((m) => m.user.displayName).join('、') || '暂无'}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                  onClick={() => setExpandedId(expanded ? null : g.id)}
                >
                  {expanded ? '收起' : '编辑成员'}
                </button>
                <button
                  type="button"
                  className="text-xs px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 bg-white hover:bg-rose-50"
                  onClick={() => removeGroup(g.id, g.name)}
                  disabled={busy}
                >
                  删除小组
                </button>
              </div>

              {expanded && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                  {(g.members || []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {(g.members || []).map((m) => (
                        <span
                          key={m.user.id}
                          className="inline-flex items-center gap-1 text-xs bg-white border border-slate-200 rounded-full px-2.5 py-1"
                        >
                          {m.user.displayName}
                          <button
                            type="button"
                            className="text-rose-500 hover:text-rose-700"
                            onClick={() => removeMember(g.id, m.user.id)}
                            disabled={busy}
                            aria-label={`移除${m.user.displayName}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-slate-600">手动录入成员姓名</div>
                    <textarea
                      className="kid-textarea min-h-[64px] text-sm"
                      value={editMemberText[g.id] || ''}
                      onChange={(e) => setEditMemberText((prev) => ({ ...prev, [g.id]: e.target.value }))}
                      placeholder="输入姓名，逗号或换行分隔"
                    />
                    <button
                      type="button"
                      className="kid-button-primary text-sm py-1.5 px-4"
                      onClick={() => addMembers(g.id)}
                      disabled={busy}
                    >
                      添加成员
                    </button>
                  </div>

                  {pickable.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-slate-600">从本班选择</div>
                      <div className="flex flex-wrap gap-1.5">
                        {pickable.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            className="text-xs px-2.5 py-1 rounded-full border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100"
                            onClick={() => addMemberById(g.id, s.id)}
                            disabled={busy}
                          >
                            + {s.displayName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {classId && groups.length === 0 && (
        <div className="text-center text-slate-500 py-8">该班级暂无小组，请使用上方表单手动录入</div>
      )}

      <section className="space-y-3 pt-2 border-t border-orange-100">
        <h2 className="font-extrabold text-lg flex items-center gap-2">🏆 小组积分板</h2>
        <p className="text-sm text-ink-soft">选择班级后，为各小组加分或查看排名。</p>
        <GroupScoreboardPanel classId={classId} />
      </section>
    </div>
  );
}
