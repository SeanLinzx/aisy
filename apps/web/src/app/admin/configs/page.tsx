'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function ConfigsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [key, setKey] = useState(''); const [value, setValue] = useState('');
  async function load() { setItems((await api.get('/configs')).data); }
  useEffect(() => { load(); }, []);
  async function set() {
    if (!key) return;
    let v: any = value;
    try { v = JSON.parse(value); } catch {}
    await api.patch(`/configs/${key}`, { value: v });
    setKey(''); setValue(''); load();
  }
  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-2xl font-bold text-brand-dark">⚙️ 系统配置</h1>
      <div className="kid-card grid sm:grid-cols-3 gap-2">
        <input className="kid-input" value={key} onChange={(e) => setKey(e.target.value)} placeholder="key" />
        <input className="kid-input sm:col-span-2" value={value} onChange={(e) => setValue(e.target.value)} placeholder='value (支持 JSON，如 true / 123 / "abc")' />
        <button onClick={set} className="kid-button-primary sm:col-span-3">保存</button>
      </div>
      <div className="kid-card">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-500 border-b border-orange-100"><th className="py-2">Key</th><th>Value</th><th>更新时间</th></tr></thead>
          <tbody>
            {items.map(c => (
              <tr key={c.key} className="border-b border-orange-50">
                <td className="py-2 font-mono text-xs">{c.key}</td>
                <td className="font-mono text-xs">{JSON.stringify(c.value)}</td>
                <td className="text-xs text-slate-400">{new Date(c.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
