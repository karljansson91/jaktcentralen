export function formatElapsedHuntTime(startDate: number, now = Date.now()) {
  const elapsedMs = Math.max(0, now - startDate);
  const totalMinutes = Math.floor(elapsedMs / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days >= 100) {
    return `${days} d`;
  }

  if (days > 0) {
    return `${days} d ${hours} h`;
  }

  if (hours > 0) {
    return `${hours} h ${minutes} m`;
  }

  return `${minutes} m`;
}

export function formatParticipantCount(count: number) {
  return count === 1 ? '1 deltagare' : `${count} deltagare`;
}

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
