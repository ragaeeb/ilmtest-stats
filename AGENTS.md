# AGENTS.md

> This file describes the IlmTest Stats repository for AI agents, including its structure, purpose, conventions, and development guidelines.

---

## Project Overview

**IlmTest Stats** is a **Bun + Next.js** application that ingests CSV/JSON exports from the IlmTest ecosystem, normalizes data, and provides interactive analytics dashboards. The project serves as both a production web application and a collection of data pipelines that compress, encrypt, and aggregate analytics data.

### Core Domains

| Domain | Description |
|--------|-------------|
| **Session Analytics** | Web property usage tracking and visualization |
| **Auto-Block Reports** | Spam/abuse detection with address and keyword analysis |
| **BlackBerry 10 Telemetry** | Download and usage stats for legacy BB10 apps (quran10, sunnah10, salat10) |
| **Collection Progress** | Quran memorization and study plan tracking |

### Deployment

- **Hosted on**: [Vercel](https://ilmtest-stats.vercel.app)
- **Repository**: [github.com/ragaeeb/ilmtest-stats](https://github.com/ragaeeb/ilmtest-stats)
- **License**: MIT

---

## Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| **Runtime** | [Bun](https://bun.sh) | ≥1.2.22 |
| **Framework** | Next.js | 15.x |
| **React** | React | 19.x |
| **Styling** | Tailwind CSS | 4.x |
| **UI Components** | shadcn/ui (New York style) | - |
| **Charts** | Recharts | 3.x |
| **Linting/Formatting** | Biome | 2.x |
| **Type Checking** | TypeScript | 5.9+ |
| **Validation** | Zod | 4.x |

---

## Repository Structure

```
ilmtest-stats/
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── layout.tsx          # Root layout with dark mode, footer
│   │   ├── page.tsx            # Main stats dashboard page
│   │   ├── analytics/          # Session analytics dashboard
│   │   ├── autoblock/          # Auto-block spam reports dashboard
│   │   ├── bb10/               # BlackBerry 10 analytics dashboard
│   │   ├── collections/        # Collection progress tracking
│   │   ├── quran10/            # Quran10 app specific dashboard
│   │   └── api/                # API route handlers
│   │       ├── analytics/      # Analytics data endpoints
│   │       ├── autoblock/      # Auto-block data endpoints
│   │       ├── bb10/           # BB10 telemetry endpoints
│   │       ├── collections/    # Collection data endpoints
│   │       ├── quran10/        # Quran10 app endpoints
│   │       └── stats/          # General CSV stats endpoint
│   ├── components/             # React UI components
│   │   ├── charts/             # Recharts wrapper components
│   │   ├── ui/                 # shadcn/ui primitives (Button, Card, Select)
│   │   └── virtualized-data-table.tsx  # Large dataset table component
│   ├── lib/                    # Core data processing and utilities
│   │   ├── analytics.ts        # Session analytics compression/encryption
│   │   ├── autoBlock.ts        # Spam report normalization and encryption
│   │   ├── bb10.ts             # BB10 telemetry processing
│   │   ├── blackberry.ts       # BlackBerry download stats aggregation
│   │   ├── collectionStats.ts  # Collection progress time-series
│   │   ├── compression.ts      # Brotli compression utilities
│   │   ├── csv.ts              # CSV parsing with type inference
│   │   ├── pii.ts              # PII detection (email/phone patterns)
│   │   ├── security.ts         # AES-256-GCM encryption with HKDF
│   │   ├── types.ts            # Shared TypeScript types
│   │   ├── utils.ts            # Date/number helpers, path utilities
│   │   └── *.test.ts           # Co-located unit tests for each module
│   └── styles/
│       └── globals.css         # Tailwind CSS with theme variables
├── public/
│   ├── data/                   # Pre-computed Brotli-compressed artifacts
│   │   ├── analytics.json.br   # Compressed session analytics
│   │   ├── autoblock/          # Address/keyword CSVs and user mappings
│   │   ├── bb10/               # Per-app telemetry CSVs
│   │   ├── blackberry/         # Aggregated download statistics
│   │   └── collections/        # Collection definitions and progress
│   └── assets/                 # Static images and icons
├── .github/workflows/
│   └── build.yml               # CI/CD: test, release, build
├── biome.json                  # Biome linter/formatter configuration
├── components.json             # shadcn/ui configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
├── next.config.ts              # Next.js configuration
├── release.config.mjs          # Semantic release configuration
└── package.json                # Project dependencies and scripts
```

---

## Key Modules & Responsibilities

### Data Processing (`src/lib/`)

| Module | Purpose |
|--------|---------|
| `analytics.ts` | `optimizeAnalytics()` - Compresses raw session JSON and encrypts sensitive payloads. `loadAnalytics()` - Loads and decrypts artifacts. |
| `autoBlock.ts` | `optimizeAddresses()` - Normalizes spam reports with encrypted user identifiers. Produces summary and leaderboard data. |
| `bb10.ts` | `optimizeAnalytics()` - Converts verbose BB10 telemetry to compact CSVs with deduplication and PII redaction. |
| `blackberry.ts` | Aggregates download statistics from BlackBerry World exports. |
| `collectionStats.ts` | Generates time-series metrics for memorization collections with dataset synchronization. |
| `compression.ts` | Brotli helpers: `compressJson()`, `decompressJson()`, `decompressJsonFile()`, `compressCsv()`, CSV utilities with base64url encoding. |
| `csv.ts` | `readCsvToJson()` - Parses CSV files with automatic type inference for columns. |
| `security.ts` | AES-256-GCM encryption via `encrypt()`/`decrypt()`. HKDF key derivation. `initSecrets()` initializes from `ENCRYPTION_SECRET`. |
| `pii.ts` | Regex-based detection of emails and phone numbers for redaction. |
| `utils.ts` | Utility functions: `cn()` (class names), `toDate()`, `formatDate()`, `inferType()`, `isNumeric()`, `tryParseNumber()`, `tryParseDate()`, `invertObject()`, `getDataFolderFilePath()`. |
| `types.ts` | Shared TypeScript interfaces: `Analytics`, `SessionData`, `BB10Stats`, `NormalizedRecord`, etc. |

---

## Development Commands

```bash
# Install dependencies (Bun required)
bun install

# Start development server with Turbopack
bun run dev

# Production build
bun run build

# Serve production bundle
bun run start

# Run tests with coverage
bun test --coverage

# Lint check (Biome)
bun run lint

# Auto-format code (Biome)
bun run format

# Generate LCOV coverage report
bun test --coverage --coverage-reporter=lcov
```

---

## Code Conventions

### TypeScript

- **Strict mode enabled** with `"strict": true`
- **ESNext target** with bundler module resolution
- **Path aliases**: `@/*` maps to `./src/*`
- Types are defined in `src/lib/types.ts` - extend here first
- Use `type` imports when importing types only: `import type { Analytics } from './types'`

### Formatting & Linting (Biome)

- **Indentation**: 4 spaces
- **Line width**: 120 characters
- **Semicolons**: Always
- **Quote style**: Single quotes
- **Trailing commas**: All
- **Arrow parentheses**: Always
- **Block statements**: Required (enforced via `useBlockStatements`)
- **Tailwind class sorting**: Enabled via `useSortedClasses`

### Testing

- **Framework**: Bun's native test runner (`bun:test`)
- **Co-located tests**: Each `*.ts` file has a corresponding `*.test.ts`
- **100% line coverage** maintained across all library modules
- **Test patterns**:
  - Use `describe()` blocks to group related tests
  - Use `beforeEach()` for test setup (e.g., environment variables)
  - Use temporary directories for file I/O tests
  - Clean up resources in `finally` blocks
  - Reset module state between tests (e.g., `resetSecretsForTests()`)

Example test structure:
```typescript
import { beforeEach, describe, expect, it } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

describe('module name', () => {
    beforeEach(() => {
        // Setup
    });

    it('should describe expected behavior', async () => {
        // Arrange, Act, Assert
    });
});
```

### React Components

- **Functional components** with TypeScript
- **Client components** marked with `'use client'` directive
- Use `useMemo()`, `useDeferredValue()` for performance optimization
- shadcn/ui components in `src/components/ui/`
- Custom components extend shadcn primitives

### Styling

- **Tailwind CSS 4** with CSS variables
- **Dark mode**: Default (set via `className="dark"` on `<html>`)
- **Theme colors** defined in `src/styles/globals.css`:
  - `--background`, `--foreground`, `--primary`, `--muted`, `--card`, `--border`, `--input`, `--ring`
- **Layout utility**: `.container-app` for consistent max-width and padding

### API Routes

- Located under `src/app/api/`
- Use `NextResponse.json()` for responses
- Export `dynamic = 'force-static'` for static routes (precomputed data)
- Error handling returns `{ error: string }` with appropriate status codes

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ENCRYPTION_SECRET` | For encryption operations | Hex or base64 encoded 32-byte secret for AES-256-GCM |

Generate a secret:
```bash
bun --print "crypto.randomBytes(32).toString('hex')"
```

The test suite auto-initializes secrets where needed.

---

## Data Pipeline Workflow

All optimizers are async functions executed via `bun --eval` or dedicated scripts:

```bash
# Optimize session analytics
bun --eval "import { optimizeAnalytics } from './src/lib/analytics.ts'; await optimizeAnalytics('source/sessions.json');"

# Optimize auto-block reports
bun --eval "import { optimizeAddresses } from './src/lib/autoBlock.ts'; await optimizeAddresses('source/address.csv', 'source/keywords.csv');"

# Optimize BB10 telemetry
bun --eval "import { optimizeAnalytics } from './src/lib/bb10.ts'; await optimizeAnalytics('source/bb10.csv');"
```

Outputs are written to CWD. Run from project root to place artifacts in `public/data/`.

---

## CI/CD

### GitHub Actions (`.github/workflows/build.yml`)

**On Push to `main`**:
1. Install dependencies with `bun install --frozen-lockfile`
2. Run tests with `bun test`
3. Semantic release (version bump, changelog, GitHub release)
4. Build production bundle

**On Pull Request**:
1. Install dependencies
2. Build project
3. Run tests
4. Upload coverage to Codecov

### Semantic Release

- Follows [Conventional Commits](https://www.conventionalcommits.org/)
- Commit prefixes: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `perf:`
- Breaking changes: `BREAKING CHANGE:` in commit body
- Skip CI: Include `[skip ci]` in commit message

---

## Adding New Features

### New Dashboard Page

1. Create directory under `src/app/[dashboard-name]/`
2. Add `page.tsx` with client component
3. Create corresponding API route under `src/app/api/[dashboard-name]/route.ts`
4. Add data processing to `src/lib/` if needed

### New Data Pipeline

1. Add processing functions to `src/lib/[module].ts`
2. Add comprehensive JSDoc comments
3. Create `src/lib/[module].test.ts` with 100% coverage
4. Export functions for CLI invocation

### New UI Component

1. For shadcn primitives: Use `npx shadcn@latest add [component]`
2. For custom components: Add to `src/components/`
3. Follow existing patterns for props and styling

---

## Common Patterns

### Compression & Encryption

```typescript
import { compressJson, decompressJsonFile } from '@/lib/compression';
import { encrypt, decrypt, initSecrets } from '@/lib/security';

// Compress data
const compressed = compressJson(data);
await writeFile('output.json.br', compressed);

// Encrypt sensitive fields
initSecrets(); // Reads ENCRYPTION_SECRET
const encrypted = encrypt(sensitiveValue);
const decrypted = decrypt(encrypted);

// Load compressed artifact
const data = await decompressJsonFile<MyType>('input.json.br');
```

### Date Handling

```typescript
import { toDate, formatDate, tryParseDate } from '@/lib/utils';

const date = toDate('2024-01-15'); // → Date
const formatted = formatDate(date); // → "Jan 15, 2024"
```

### Type Inference for CSV

```typescript
import { inferType, isNumeric, tryParseNumber } from '@/lib/utils';

const type = inferType(columnValues); // → 'string' | 'number' | 'date'
```

---

## Troubleshooting

### Tests fail with encryption errors
Ensure `ENCRYPTION_SECRET` is set or call `resetSecretsForTests()` in `beforeEach`.

### Missing data artifacts
Run the appropriate optimizer from the project root to generate files in `public/data/`.

### Lint errors on commit
Run `bun run format` before committing to auto-fix formatting issues.

### Type errors with path aliases
Verify `@/*` is resolved correctly by checking `tsconfig.json` paths configuration.

---

## Best Practices for AI Agents

1. **Always run tests** after making changes: `bun test`
2. **Maintain 100% coverage** for `src/lib/` modules
3. **Use existing utilities** from `utils.ts` before creating new helpers
4. **Follow Biome rules** - run `bun run lint` to check compliance
5. **Add JSDoc comments** to all exported functions
6. **Use TypeScript types** from `types.ts` and extend when needed
7. **Co-locate tests** with source files (`*.test.ts` pattern)
8. **Commit message format**: Follow Conventional Commits for semantic release
9. **Data files**: Pre-computed artifacts go in `public/data/` with `.br` extension
10. **Privacy**: Use `pii.ts` utilities for any user-facing data redaction
