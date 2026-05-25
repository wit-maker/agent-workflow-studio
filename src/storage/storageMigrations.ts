// Storage migration utilities.
// Run migrations in order when the app boots to keep data structures current.

export type MigrationResult = {
  ran: string[]
  skipped: string[]
  errors: Array<{ id: string; error: string }>
}

type Migration = {
  id: string
  run: () => void
}

// Migration record key — stores a JSON array of completed migration IDs.
const MIGRATION_LOG_KEY = 'agent-workflow-studio.migrations.v1'

function getCompletedMigrations(): string[] {
  try {
    const raw = window.localStorage.getItem(MIGRATION_LOG_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

function markMigrationComplete(id: string): void {
  const completed = getCompletedMigrations()
  if (!completed.includes(id)) {
    completed.push(id)
    window.localStorage.setItem(MIGRATION_LOG_KEY, JSON.stringify(completed))
  }
}

// Registered migrations — add new ones here; never remove or reorder existing entries.
const MIGRATIONS: Migration[] = [
  {
    // M17: No data migration needed on initial rollout; placeholder for future schema changes.
    id: 'M17-001-storage-adapter-init',
    run: () => {
      // No-op: marks the baseline migration point.
    },
  },
]

export function runMigrations(): MigrationResult {
  const completed = getCompletedMigrations()
  const result: MigrationResult = { ran: [], skipped: [], errors: [] }

  for (const migration of MIGRATIONS) {
    if (completed.includes(migration.id)) {
      result.skipped.push(migration.id)
      continue
    }
    try {
      migration.run()
      markMigrationComplete(migration.id)
      result.ran.push(migration.id)
    } catch (e) {
      result.errors.push({
        id: migration.id,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return result
}
