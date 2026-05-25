import type { Doc } from '@/convex/_generated/dataModel';

type UserProfile = Pick<
  Doc<'users'>,
  'email' | 'imageUrl' | 'name' | 'phoneNumber'
>;

export function getUserInitials(name?: string | null) {
  return (
    name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '?'
  );
}

export function getUserDisplayName(user: UserProfile | null | undefined) {
  return user?.name?.trim() || user?.email || user?.phoneNumber || 'Okänd användare';
}

export function getUserContactLine(user: UserProfile | null | undefined) {
  return user?.email || user?.phoneNumber || '';
}
