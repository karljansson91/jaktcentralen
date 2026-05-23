export function getMemberInitials(name?: string | null) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) {
    return '?';
  }

  const first = Array.from(parts[0])[0] ?? '';
  const second =
    parts.length > 1
      ? Array.from(parts[parts.length - 1])[0]
      : Array.from(parts[0])[1];

  return `${first}${second ?? ''}`.toUpperCase();
}
