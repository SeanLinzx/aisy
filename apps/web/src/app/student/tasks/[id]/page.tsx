'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/language-context';

export default function TaskDetailPage() {
  const { tx } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [pickedProj, setPickedProj] = useState<string>('');
  const [comment, setComment] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api.get(`/tasks/${id}`).then(r => setTask(r.data));
    api.get('/assets').then(r => setAssets(r.data || []));
    api.get('/web-projects').then(r => setProjects(r.data || []));
  }, [id]);

  async function submit() {
    setMsg(null);
    try {
      await api.post('/submissions', { taskId: id, assetIds: picked, webProjectId: pickedProj || undefined, comment });
      setMsg(tx('✅ 已提交！老师会尽快查看。'));
    } catch (e: any) { setMsg('❌ ' + e.message); }
  }

  if (!task) return <div className="text-slate-500">{tx('加载中…')}</div>;

  return (
    <div className="space-y-5 page-container--narrow">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">📋 {task.title}</h1>
        <p className="text-slate-600 mt-2 whitespace-pre-wrap">{task.description}</p>
      </div>
      <div className="kid-card space-y-4">
        <h3 className="font-semibold">{tx('提交作品')}</h3>
        <div>
          <div className="text-sm font-semibold mb-2">{tx('选择素材（可多选）')}</div>
          <div className="grid grid-cols-3 gap-2 max-h-60 overflow-auto">
            {assets.map((a) => (
              <label key={a.id} className={`cursor-pointer block rounded-xl border p-2 text-xs ${picked.includes(a.id) ? 'border-brand bg-orange-50' : 'border-orange-100 bg-white'}`}>
                <input type="checkbox" className="mr-1" checked={picked.includes(a.id)} onChange={(e) => setPicked((p) => e.target.checked ? [...p, a.id] : p.filter(x => x !== a.id))} />
                {a.title}
              </label>
            ))}
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold mb-2">{tx('选择网页项目（可选）')}</div>
          <select className="kid-input" value={pickedProj} onChange={(e) => setPickedProj(e.target.value)}>
            <option value="">{tx('不附带网页')}</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        <div>
          <div className="text-sm font-semibold mb-2">{tx('备注（可选）')}</div>
          <textarea className="kid-textarea" value={comment} onChange={(e) => setComment(e.target.value)} placeholder={tx('想对老师说的话...')} />
        </div>
        <button onClick={submit} className="kid-button-primary">{tx('提交作品')}</button>
        {msg && <div className="text-sm">{msg}</div>}
      </div>
    </div>
  );
}
