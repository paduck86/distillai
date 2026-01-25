---
name: supabase-postgres-best-practices
description: Postgres performance optimization and best practices from Supabase. Use this skill when writing, reviewing, or optimizing Postgres queries, schema designs, or database configurations.
license: MIT
metadata:
  author: supabase
  version: "1.0.0"
---

# Supabase Postgres Best Practices

Comprehensive performance optimization guide for Postgres, maintained by Supabase. Contains rules across 8 categories, prioritized by impact to guide automated query optimization and schema design.

## When to Apply

Reference these guidelines when:
- Writing SQL queries or designing schemas
- Implementing indexes or query optimization
- Reviewing database performance issues
- Configuring connection pooling or scaling
- Optimizing for Postgres-specific features
- Working with Row-Level Security (RLS)

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Query Performance | CRITICAL | `query-` |
| 2 | Connection Management | CRITICAL | `conn-` |
| 3 | Security & RLS | CRITICAL | `security-` |
| 4 | Schema Design | HIGH | `schema-` |
| 5 | Concurrency & Locking | MEDIUM-HIGH | `lock-` |
| 6 | Data Access Patterns | MEDIUM | `data-` |
| 7 | Monitoring & Diagnostics | LOW-MEDIUM | `monitor-` |
| 8 | Advanced Features | LOW | `advanced-` |

## Query Performance (CRITICAL)

### Missing Indexes
Always add indexes for frequently queried columns:

```sql
-- Bad: No index on user_id
SELECT * FROM lectures WHERE user_id = $1;

-- Good: Create index
CREATE INDEX idx_lectures_user_id ON lectures(user_id);
```

### Partial Indexes
Use partial indexes for filtered queries:

```sql
-- For queries that always filter by status
CREATE INDEX idx_lectures_active ON lectures(user_id)
WHERE status = 'active';
```

### Composite Indexes
Order matters - put equality conditions first:

```sql
-- For: WHERE user_id = $1 AND created_at > $2
CREATE INDEX idx_lectures_user_created
ON lectures(user_id, created_at DESC);
```

## Connection Management (CRITICAL)

### Use Connection Pooling
Always use Supabase's connection pooler for serverless:

```javascript
// Use pooler URL for serverless/edge
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: false // for serverless
    }
  }
);
```

### Transaction Best Practices
Keep transactions short:

```sql
-- Bad: Long-running transaction
BEGIN;
-- Complex processing...
-- Network calls...
COMMIT;

-- Good: Minimal transaction scope
BEGIN;
UPDATE lectures SET status = 'processing' WHERE id = $1;
COMMIT;
-- Do processing outside transaction
BEGIN;
UPDATE lectures SET status = 'completed', summary = $2 WHERE id = $1;
COMMIT;
```

## Security & RLS (CRITICAL)

### Enable RLS
Always enable RLS on user data tables:

```sql
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;

-- Allow users to see only their own lectures
CREATE POLICY "Users can view own lectures"
ON lectures FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own lectures
CREATE POLICY "Users can insert own lectures"
ON lectures FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own lectures
CREATE POLICY "Users can update own lectures"
ON lectures FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to delete their own lectures
CREATE POLICY "Users can delete own lectures"
ON lectures FOR DELETE
USING (auth.uid() = user_id);
```

### Avoid Security Definer Abuse
Don't bypass RLS unnecessarily:

```sql
-- Bad: Bypasses RLS
CREATE FUNCTION get_all_lectures()
RETURNS SETOF lectures
LANGUAGE sql
SECURITY DEFINER
AS $$ SELECT * FROM lectures; $$;

-- Good: Respects RLS
CREATE FUNCTION get_user_lectures()
RETURNS SETOF lectures
LANGUAGE sql
SECURITY INVOKER
AS $$ SELECT * FROM lectures; $$;
```

## Schema Design (HIGH)

### Use UUIDs for Primary Keys
```sql
CREATE TABLE lectures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  -- not: id serial PRIMARY KEY
);
```

### Proper Foreign Keys
```sql
CREATE TABLE lectures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id uuid REFERENCES folders(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);
```

### Timestamps with Time Zones
```sql
CREATE TABLE lectures (
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lectures_updated_at
  BEFORE UPDATE ON lectures
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

## Data Access Patterns (MEDIUM)

### Pagination
Use cursor-based pagination for large datasets:

```sql
-- Bad: Offset pagination (slow on large tables)
SELECT * FROM lectures ORDER BY created_at DESC LIMIT 20 OFFSET 1000;

-- Good: Cursor-based pagination
SELECT * FROM lectures
WHERE created_at < $1
ORDER BY created_at DESC
LIMIT 20;
```

### Select Only Needed Columns
```sql
-- Bad: Select all
SELECT * FROM lectures;

-- Good: Select specific columns
SELECT id, title, created_at, duration FROM lectures;
```

### Use JSONB for Flexible Data
```sql
-- For metadata that varies
ALTER TABLE lectures ADD COLUMN metadata jsonb DEFAULT '{}';

-- Query JSONB efficiently
CREATE INDEX idx_lectures_metadata ON lectures USING gin(metadata);

-- Query example
SELECT * FROM lectures
WHERE metadata @> '{"source": "youtube"}';
```

## Supabase Storage Integration

### Store File References
```sql
-- Store file path, not URL
ALTER TABLE lectures ADD COLUMN audio_path text;

-- Generate signed URL in application
const { data } = await supabase.storage
  .from('audio')
  .createSignedUrl(lecture.audio_path, 3600);
```

### Storage Policies
```sql
-- Allow users to upload to their own folder
CREATE POLICY "Users can upload own audio"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'audio' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## Performance Monitoring

### Useful Queries
```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check table sizes
SELECT
  relname as table,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Check index usage
SELECT
  indexrelname as index,
  idx_scan as scans,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```
