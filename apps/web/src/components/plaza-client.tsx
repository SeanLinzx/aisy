'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { courseHomePath, growthPath } from '@/lib/public-url';
import { resolveUploadPath } from '@/lib/upload-url';
import { useLanguage } from '@/contexts/language-context';
import type { ServerMeUser } from '@/lib/auth-server';

interface PlazaStudent {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  homepageSlug: string | null;
  homepageTitle: string | null;
  intro: string | null;
  coverUrl: string | null;
  featuredWebProject: { title: string; slug: string } | null;
  courseHomeUrl: string | null;
  growthUrl: string | null;
}

interface PlazaClass {
  classId: string;
  className: string;
  students: PlazaStudent[];
}

interface PlazaData {
  viewerRole: string;
  classes: PlazaClass[];
}

function StudentCard({ student }: { student: PlazaStudent }) {
  const { tx } = useLanguage();
  const coursePath = student.homepageSlug ? courseHomePath(student.homepageSlug) : null;
  const growthP = student.homepageSlug ? growthPath(student.homepageSlug) : null;

  return (
    <article className="kid-card !p-4 flex flex-col h-full hover:-translate-y-0.5 transition">
      <div className="flex items-start gap-3">
        <div className="kid-emoji-bubble shrink-0 bg-gradient-to-br from-sky-200 to-violet-300 text-xl overflow-hidden">
          {student.avatarUrl ? (
            <img src={resolveUploadPath(student.avatarUrl)} alt="" className="w-full h-full object-cover" />
          ) : (
            student.displayName.slice(0, 1)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-extrabold text-lg text-ink truncate">{student.displayName}</div>
          <div className="text-xs text-ink-soft">@{student.username}</div>
          <div className="mt-1 font-semibold text-sm text-brand-dark line-clamp-2">
            {student.homepageTitle || tx('AI 作品主页')}
          </div>
        </div>
      </div>

      {student.coverUrl ? (
        <img
          src={resolveUploadPath(student.coverUrl)}
          alt=""
          className="mt-3 w-full h-32 object-cover rounded-2xl"
        />
      ) : null}

      {student.intro ? (
        <p className="mt-3 text-sm text-ink-soft leading-relaxed whitespace-pre-wrap">{student.intro}</p>
      ) : null}

      {student.featuredWebProject ? (
        <p className="mt-2 text-xs text-emerald-700 font-semibold">
          {tx('首页展示')}：{student.featuredWebProject.title}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 mt-auto pt-4">
        {coursePath ? (
          <a href={coursePath} target="_blank" rel="noopener noreferrer" className="kid-button-primary !py-2 !px-4 text-sm">
            {tx('📚 打开个人主页')}
          </a>
        ) : null}
        {growthP ? (
          <a href={growthP} target="_blank" rel="noopener noreferrer" className="kid-button-ghost !py-2 !px-4 text-sm">
            {tx('📈 成长历程')}
          </a>
        ) : null}
      </div>
    </article>
  );
}

export function PlazaClient({ me }: { me: ServerMeUser | null }) {
  const { tx } = useLanguage();
  const [data, setData] = useState<PlazaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me || (me.role !== 'student' && me.role !== 'teacher')) {
      setLoading(false);
      return;
    }
    let alive = true;
    api
      .get('/homepages/plaza')
      .then((r) => {
        if (alive) setData(r.data as PlazaData);
      })
      .catch((e: Error) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [me]);

  const totalStudents = data?.classes.reduce((n, c) => n + c.students.length, 0) ?? 0;
  const canViewPlaza = me?.role === 'student' || me?.role === 'teacher';

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-dark">{tx('🌟 班级作品广场')}</h1>
            <p className="text-slate-600 text-sm mt-1 max-w-xl">
              {me?.role === 'teacher'
                ? tx('查看你所带班级里，小朋友们设置的个人主页链接。')
                : tx('来看看同班小伙伴设置的个人主页，点链接就能打开他们的作品页。')}
            </p>
          </div>
          <Link href="/" className="kid-button-ghost">
            {tx('返回首页')}
          </Link>
        </div>

        {!me ? (
          <div className="kid-card mt-8 text-center space-y-4 py-10">
            <div className="text-4xl">🔐</div>
            <p className="text-ink-soft font-semibold">{tx('登录后可以查看你所在班级的同学主页')}</p>
            <Link href="/login" className="kid-button-primary inline-block">
              {tx('🚀 小朋友登录')}
            </Link>
          </div>
        ) : !canViewPlaza ? (
          <div className="kid-card mt-8 text-center text-slate-500 py-10">
            {tx('作品广场目前面向学生和老师开放。')}
          </div>
        ) : loading ? (
          <div className="kid-card mt-8 text-center text-slate-500 py-10">{tx('加载中…')}</div>
        ) : error ? (
          <div className="kid-card mt-8 text-center text-rose-600 py-10">{error}</div>
        ) : !data?.classes.length ? (
          <div className="kid-card mt-8 text-center space-y-3 py-10">
            <p className="text-slate-500">{tx('你还没有加入班级，暂时看不到同学主页。')}</p>
            {me.role === 'student' ? (
              <Link href="/student/homepage" className="kid-button-primary inline-block text-sm">
                {tx('🌟 去设置我的主页')}
              </Link>
            ) : null}
          </div>
        ) : totalStudents === 0 ? (
          <div className="kid-card mt-8 text-center space-y-3 py-10">
            <p className="text-slate-500">{tx('班里还没有同学公开个人主页，你可以先设置自己的主页。')}</p>
            {me.role === 'student' ? (
              <Link href="/student/homepage" className="kid-button-primary inline-block text-sm">
                {tx('🌟 去设置我的主页')}
              </Link>
            ) : (
              <Link href="/teacher/students" className="kid-button-primary inline-block text-sm">
                {tx('👩‍🏫 查看学生主页链接')}
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {data.classes.map((klass) =>
              klass.students.length === 0 ? null : (
                <section key={klass.classId}>
                  <h2 className="text-lg font-extrabold text-ink mb-4">
                    {klass.className}
                    <span className="ml-2 text-sm font-semibold text-ink-soft">
                      {klass.students.length} {tx('位同学')}
                    </span>
                  </h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {klass.students.map((student) => (
                      <StudentCard key={student.id} student={student} />
                    ))}
                  </div>
                </section>
              ),
            )}
          </div>
        )}

        {me?.role === 'student' ? (
          <div className="mt-10 text-center">
            <Link href="/student/homepage" className="text-sm font-bold text-brand hover:underline">
              {tx('🌟 设置 / 预览我的主页 →')}
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
