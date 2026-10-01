export function formatPrice(price: number, currency = '$'): string {
  return `${currency}${price.toLocaleString('en-US')}`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: string, time: string): string {
  const d = new Date(date);
  return `${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · ${time}`;
}

export function formatRelativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

export function padNumber(n: number, length: number): string {
  return String(n).padStart(length, '0');
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/** Combine drop release date + display time (e.g. "8:00 PM") into a local Date. */
export function dropReleaseTarget(releaseDate: string, releaseTime: string): Date {
  const match = releaseTime.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  let hours = 20;
  let minutes = 0;
  if (match) {
    hours = Number(match[1]);
    minutes = Number(match[2]);
    const meridiem = match[3]?.toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
  }
  const [year, month, day] = releaseDate.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, hours, minutes, 0);
}
