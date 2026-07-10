'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { GroupScoreboardPanel } from '@/components/course/group-scoreboard-panel';

export default function TeacherScoresPage() {
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [classId, setClassId] = useState('');

  useEffect(() => {
    api.get('/classes').then((r) => {
      const list = r.data || [];
      setClasses(list);
      if (list[0]?.id) setClassId(list[0].id);
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-5 max-w-4xl">
      <header>
        <h1 className="font-display text-2xl font-extrabold flex items-center gap-2">🏆 小组积分板</h1>
        <p className="text-slate-600 mt-1 text-sm">
          结合「小组管理」里的分组，为各小组加分。小朋友在学生端首页可以看到自己小组的积分和排名。
        </p>
      </header>

      <div className="kid-card flex flex-wrap gap-2 items-center">
        <label className="text-sm font-bold">选择班级</label>
        <select className="kid-input max-w-xs" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">请选择</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <Link href="/teacher/groups" className="text-sm font-bold text-brand hover:underline ml-auto">
          去小组管理 →
        </Link>
      </div>

      <GroupScoreboardPanel classId={classId} />
    </div>
  );
}
