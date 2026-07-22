'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiAuth } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useLanguage } from '@/contexts/language-context';

const SIDEBAR_COLLAPSED_KEY = 'ai-camp-sidebar-collapsed';

export interface NavItem {
  href: string;
  label: string;
  emoji?: string;
  /** 主题色，可选：pink / sky / mint / yellow / purple / orange */
  color?: 'pink' | 'sky' | 'mint' | 'yellow' | 'purple' | 'orange';
  /** 除 href 外，这些路径前缀也会高亮此项 */
  matchPrefixes?: string[];
  /** 子菜单（老师后台等层级导航） */
  children?: NavItem[];
}

const ROLE_BADGE_KEYS: Record<string, { emoji: string; labelKey: string; labelFallback: string; bg: string }> = {
  student: { emoji: '🧒', labelKey: 'shell.role.student', labelFallback: '学生',   bg: 'bg-gradient-to-br from-amber-200 to-pink-300' },
  teacher: { emoji: '👩‍🏫', labelKey: 'shell.role.teacher', labelFallback: '老师',   bg: 'bg-gradient-to-br from-emerald-200 to-sky-300' },
  parent:  { emoji: '👨‍👧', labelKey: 'shell.role.parent', labelFallback: '家长',   bg: 'bg-gradient-to-br from-yellow-200 to-orange-300' },
  admin:   { emoji: '🛠️', labelKey: 'shell.role.admin', labelFallback: '管理员', bg: 'bg-gradient-to-br from-violet-200 to-fuchsia-300' },
};

const ACTIVE_GRADIENT: Record<NonNullable<NavItem['color']>, string> = {
  pink:   'from-pink-400 to-rose-500',
  sky:    'from-sky-400 to-blue-500',
  mint:   'from-emerald-400 to-teal-500',
  yellow: 'from-amber-400 to-orange-500',
  purple: 'from-violet-500 to-fuchsia-500',
  orange: 'from-orange-400 to-brand',
};

const HOVER_BG: Record<NonNullable<NavItem['color']>, string> = {
  pink:   'hover:bg-pink-50',
  sky:    'hover:bg-sky-50',
  mint:   'hover:bg-emerald-50',
  yellow: 'hover:bg-amber-50',
  purple: 'hover:bg-violet-50',
  orange: 'hover:bg-orange-50',
};

export function RoleShell({
  user,
  navItems,
  title,
  children,
  autoCollapseSidebar = false,
  navLocked = false,
  classroomLabel,
  variant = 'default',
}: {
  user: { displayName: string; role: string; username: string };
  navItems: NavItem[];
  title: string;
  children: React.ReactNode;
  /** 上课跟课时自动收起左侧栏（仍可手动展开） */
  autoCollapseSidebar?: boolean;
  /** 上课锁定：禁用侧栏导航，学生只能跟随老师指定页面 */
  navLocked?: boolean;
  classroomLabel?: string;
  /** 平板专版：底部大按钮导航，隐藏侧边栏 */
  variant?: 'default' | 'pad';
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, tx } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const inClassRef = useRef(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');
    } catch {
      // ignore
    }
  }, []);

  // 上课开始时自动收起；下课后恢复用户之前的偏好
  useEffect(() => {
    if (autoCollapseSidebar && !inClassRef.current) {
      inClassRef.current = true;
      setCollapsed(true);
      return;
    }
    if (!autoCollapseSidebar && inClassRef.current) {
      inClassRef.current = false;
      try {
        setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');
      } catch {
        setCollapsed(false);
      }
    }
  }, [autoCollapseSidebar]);

  function toggleSidebar() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  }

  async function logout() {
    try { await apiAuth.logout(); } catch {}
    router.push('/login');
    router.refresh();
  }

  const badgeKey = ROLE_BADGE_KEYS[user.role] ?? ROLE_BADGE_KEYS.student;
  const badge = { emoji: badgeKey.emoji, label: t(badgeKey.labelKey, badgeKey.labelFallback), bg: badgeKey.bg };
  const isPad = variant === 'pad';

  if (isPad) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b-2 border-orange-100 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl shrink-0">📱</span>
            <div className="min-w-0">
              <div className="font-display font-extrabold text-lg text-rainbow truncate">{t('shell.padTitle', 'AI Camp 平板')}</div>
              <div className="text-[11px] font-bold text-ink-soft truncate">
                {badge.emoji} {user.displayName} · {title}
              </div>
            </div>
          </div>
          {navLocked && (
            <span className="shrink-0 text-xs font-bold bg-violet-100 text-violet-700 rounded-full px-3 py-1.5">
              🔒 {classroomLabel || tx('跟课中')}
            </span>
          )}
          <button
            onClick={logout}
            className="shrink-0 kid-button-sm bg-white border-2 border-orange-200 text-ink-soft min-h-[44px] px-4"
          >
            👋 {t('shell.logout', '退出')}
          </button>
        </header>

        <main className={cn('flex-1 p-4 md:p-6 pad-main-scroll', navLocked && 'pb-28')}>{children}</main>

        {!navLocked && (
          <nav className="pad-dock fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t-2 border-orange-100">
            <div className="flex items-stretch justify-around max-w-3xl mx-auto px-1 pt-1">
              {navItems.slice(0, 5).map((item, i) => {
                const active = isNavActive(pathname, item);
                const color = item.color ?? defaultColorFor(i);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] rounded-2xl mx-0.5 transition',
                      active
                        ? `bg-gradient-to-b ${ACTIVE_GRADIENT[color]} text-white shadow-pop-sm`
                        : 'text-ink-soft active:bg-orange-50',
                    )}
                  >
                    <span className="text-2xl leading-none">{item.emoji}</span>
                    <span className="text-[10px] font-bold truncate max-w-full px-1">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <aside
        className={cn(
          'hidden md:flex shrink-0 flex-col bg-white/85 backdrop-blur-md border-r-2 border-orange-100 sticky top-0 h-screen overflow-y-auto overflow-x-hidden transition-[width,padding] duration-300 ease-out',
          collapsed ? 'w-[4.75rem] p-2' : 'w-64 p-4',
        )}
      >
        <div className={cn('py-2', collapsed ? 'px-0' : 'px-2')}>
          <div className={cn('flex items-center', collapsed ? 'flex-col gap-2' : 'justify-between gap-2')}>
            <Link
              href={navLocked ? '#' : '/'}
              onClick={navLocked ? (e) => e.preventDefault() : undefined}
              className={cn('flex items-center group', collapsed ? 'justify-center' : 'gap-2 min-w-0', navLocked && 'cursor-default')}
              title="AI Camp"
            >
              <span className="text-2xl group-hover:animate-wiggle shrink-0">🌈</span>
              {!collapsed && <span className="font-display text-xl font-extrabold text-rainbow truncate">AI Camp</span>}
            </Link>
            <button
              type="button"
              onClick={toggleSidebar}
              className={cn(
                'shrink-0 rounded-xl border-2 border-orange-200 bg-white text-ink-soft hover:bg-orange-50 transition font-bold',
                collapsed ? 'w-9 h-9 text-sm' : 'w-8 h-8 text-xs',
              )}
              title={collapsed ? t('shell.expandSidebar', '展开侧边栏') : t('shell.collapseSidebar', '收起侧边栏')}
              aria-label={collapsed ? t('shell.expandSidebar', '展开侧边栏') : t('shell.collapseSidebar', '收起侧边栏')}
            >
              {collapsed ? '»' : '«'}
            </button>
          </div>
          {!collapsed && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-[11px] font-bold text-brand-dark">
              <span>{badge.emoji}</span>
              <span>{title}</span>
            </div>
          )}
        </div>

        <nav className={cn('mt-3 space-y-1', collapsed && 'mt-2')}>
          {navLocked ? (
            <div
              className={cn(
                'rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-sky-50 text-violet-800',
                collapsed ? 'px-2 py-3 text-center' : 'px-4 py-4',
              )}
            >
              <div className="text-xl">{collapsed ? '🔒' : `🔒 ${t('shell.classLocked', '上课锁定中')}`}</div>
              {!collapsed && (
                <>
                  <p className="text-xs font-bold mt-2 leading-relaxed">
                    {t('shell.classLockedHint', '请跟随老师屏幕，暂时不能浏览其它页面。')}
                  </p>
                  {classroomLabel && (
                    <p className="text-[11px] font-semibold mt-2 text-violet-600 bg-white/70 rounded-xl px-2 py-1.5">
                      {t('shell.current', '当前：')}{classroomLabel}
                    </p>
                  )}
                </>
              )}
            </div>
          ) : (
            <SidebarNavLinks items={navItems} pathname={pathname} collapsed={collapsed} />
          )}
        </nav>

        <div className={cn('mt-auto pt-4', collapsed && 'pt-2')}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn('w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-pop-sm', badge.bg)}
                title={`${user.displayName} (@${user.username})`}
              >
                {badge.emoji}
              </div>
              <button
                type="button"
                onClick={logout}
                title={t('shell.logoutFull', '退出登录')}
                className="w-10 h-10 rounded-xl bg-white border-2 border-orange-200 text-lg hover:bg-rose-50 transition"
              >
                👋
              </button>
            </div>
          ) : (
            <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-pink-50 border-2 border-orange-100 p-3">
              <div className="flex items-center gap-2.5">
                <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-pop-sm', badge.bg)}>
                  {badge.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-ink truncate">{user.displayName}</div>
                  <div className="text-[11px] text-ink-soft truncate">@{user.username}</div>
                </div>
              </div>
              <button
                onClick={logout}
                className="mt-3 w-full text-xs font-bold py-1.5 rounded-xl bg-white border-2 border-orange-200 text-ink-soft hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition"
              >
                👋 {t('shell.logoutFull', '退出登录')}
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden bg-white/85 backdrop-blur-md border-b-2 border-orange-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌈</span>
            <span className="font-display font-extrabold text-rainbow">AI Camp</span>
            {navLocked && <span className="text-[10px] font-bold bg-violet-100 text-violet-700 rounded-full px-2 py-0.5">🔒 {tx('上课中')}</span>}
          </div>
          <button onClick={logout} className="kid-button-sm bg-white border-2 border-orange-200 text-ink-soft hover:bg-rose-50 hover:text-rose-600">
            👋 {t('shell.logout', '退出')}
          </button>
        </header>

        {/* 移动端：上课中隐藏横向导航，留更多空间给内容；可通过底部「返回课堂」回跟课页 */}
        <nav className={cn(
          'md:hidden bg-white/70 backdrop-blur-md border-b-2 border-orange-100 px-3 py-2 overflow-x-auto',
          (autoCollapseSidebar || navLocked) && 'hidden',
        )}>
          <div className="flex items-center gap-1.5 min-w-max">
            {flattenNavItems(navItems).map((item, i) => {
              const active = isNavActive(pathname, item);
              const color = item.color ?? defaultColorFor(i);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition',
                    active
                      ? `bg-gradient-to-r ${ACTIVE_GRADIENT[color]} text-white shadow-pop-sm`
                      : 'bg-white border border-orange-100 text-ink-soft',
                  )}
                >
                  <span>{item.emoji}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <main className={cn('flex-1 w-full min-w-0 p-5 md:p-8 lg:p-10', (autoCollapseSidebar || navLocked) && 'pb-24')}>{children}</main>
      </div>
    </div>
  );
}

const COLOR_CYCLE: Array<NonNullable<NavItem['color']>> = ['orange', 'pink', 'sky', 'mint', 'yellow', 'purple'];
function defaultColorFor(i: number): NonNullable<NavItem['color']> {
  return COLOR_CYCLE[i % COLOR_CYCLE.length];
}

function isNavActive(pathname: string, item: NavItem): boolean {
  if (pathname === item.href || pathname.startsWith(item.href + '/')) return true;
  return (item.matchPrefixes ?? []).some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function isNavBranchActive(pathname: string, item: NavItem): boolean {
  if (isNavActive(pathname, item)) return true;
  return (item.children ?? []).some((child) => isNavBranchActive(pathname, child));
}

function flattenNavItems(items: NavItem[]): NavItem[] {
  const out: NavItem[] = [];
  function walk(list: NavItem[]) {
    for (const item of list) {
      out.push(item);
      if (item.children?.length) walk(item.children);
    }
  }
  walk(items);
  return out;
}

function SidebarNavLinks({
  items,
  pathname,
  collapsed,
  depth = 0,
}: {
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
  depth?: number;
}) {
  return (
    <>
      {items.map((item, i) => {
        const branchActive = isNavBranchActive(pathname, item);
        const active = isNavActive(pathname, item);
        const color = item.color ?? defaultColorFor(i + depth);
        const hasChildren = Boolean(item.children?.length) && !collapsed;

        return (
          <div key={`${item.href}-${depth}`} className={cn(depth > 0 && !collapsed && 'ml-2 border-l-2 border-orange-100 pl-2')}>
            <Link
              href={item.href}
              title={item.label}
              className={cn(
                'flex items-center rounded-2xl font-bold transition-all duration-150',
                collapsed ? 'justify-center px-2 py-3.5' : cn('gap-3 px-4 py-3 text-[15px]', depth > 0 && 'py-2.5 text-sm'),
                active
                  ? `bg-gradient-to-r ${ACTIVE_GRADIENT[color]} text-white shadow-pop-sm ${collapsed ? '' : '-translate-y-0.5 animate-pop'}`
                  : branchActive && !active
                    ? `text-brand-dark bg-orange-50/80 ${collapsed ? '' : ''}`
                    : `text-ink-soft ${HOVER_BG[color]} ${collapsed ? '' : 'hover:-translate-y-0.5'}`,
              )}
            >
              <span className={cn('text-xl leading-none', active && !collapsed && 'animate-bounceSoft', depth > 0 && 'text-base')}>
                {item.emoji}
              </span>
              {!collapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {active && <span className="ml-auto text-white/90 text-xs">›</span>}
                </>
              )}
            </Link>
            {hasChildren && (
              <div className="mt-1 space-y-1">
                <SidebarNavLinks items={item.children!} pathname={pathname} collapsed={collapsed} depth={depth + 1} />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
