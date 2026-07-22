'use client';

export function KidLocalDraftHint({ hint }: { hint: string | null }) {
  if (!hint) return null;
  return (
    <p className="text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-xl px-3 py-2">
      {hint}
    </p>
  );
}
