import { customAlphabet } from 'nanoid';

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
const nano = customAlphabet(alphabet, 8);

export function makeSlug(base?: string): string {
  const clean = (base || '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 24);
  return clean ? `${clean}-${nano()}` : nano();
}
