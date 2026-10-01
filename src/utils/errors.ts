export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export function mapSupabaseError(error: unknown, fallback = 'Something went wrong.'): AppError {
  if (import.meta.env.DEV) {
    console.error(error);
  }

  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error ?? '');

  const lower = message.toLowerCase();

  if (lower.includes('state id is already') || lower.includes('already associated')) {
    return new AppError('That State ID is already associated with another account.');
  }
  if (lower.includes('jwt') || lower.includes('session') || lower.includes('not authenticated')) {
    return new AppError('Your session has expired. Please sign in again.');
  }
  if (
    lower.includes("don't have permission") ||
    lower.includes('permission') ||
    lower.includes('42501') ||
    lower.includes('row-level security') ||
    lower.includes('rls')
  ) {
    return new AppError("You don't have permission to perform this action.");
  }
  if (lower.includes('full name')) {
    return new AppError('Enter a full name between 2 and 80 characters.');
  }
  if (lower.includes('state id must')) {
    return new AppError('State ID must contain digits only.');
  }
  if (message && !lower.includes('postgres') && !lower.includes('pgrst') && message.length < 160) {
    return new AppError(message);
  }

  return new AppError(fallback);
}
