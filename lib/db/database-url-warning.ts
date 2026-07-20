const DATABASE_URL_ENV_VAR = 'DATABASE_URL';

export function warnIfDatabaseUrlMissing(
    environment: Record<string, string|undefined> = process.env,
    warn: (message: string) => void = console.warn): void {
  if (environment.NODE_ENV === 'test') {
    return;
  }

  const databaseUrl = environment[DATABASE_URL_ENV_VAR];

  if (databaseUrl && databaseUrl.trim().length > 0) {
    return;
  }

  warn(
      'DATABASE_URL is not set. Prisma-backed dashboard data will fall back to zero-state until the variable is configured.');
}
