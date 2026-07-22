'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { LanguageProvider } from '@/contexts/language-context';
import { LanguageToggle } from '@/components/language-toggle';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
  }));
  return (
    <QueryClientProvider client={client}>
      <LanguageProvider>
        <LanguageToggle />
        {children}
      </LanguageProvider>
    </QueryClientProvider>
  );
}
