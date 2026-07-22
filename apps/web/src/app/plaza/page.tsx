import { getServerUser } from '@/lib/auth-server';
import { PlazaClient } from '@/components/plaza-client';

export default async function PlazaPage() {
  const me = await getServerUser();
  return <PlazaClient me={me} />;
}
