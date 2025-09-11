# IlmTest Stats

[![wakatime](https://wakatime.com/badge/user/a0b906ce-b8e7-4463-8bce-383238df6d4b/project/1fef3599-9317-4cbf-9885-96470bf9239f.svg)](https://wakatime.com/badge/user/a0b906ce-b8e7-4463-8bce-383238df6d4b/project/1fef3599-9317-4cbf-9885-96470bf9239f)
[![codecov](https://codecov.io/gh/ragaeeb/ilmtest-stats/graph/badge.svg?token=NEUJ7VJ1UR)](https://codecov.io/gh/ragaeeb/ilmtest-stats)
[![Vercel Deploy](https://deploy-badge.vercel.app/vercel/ilmtest-stats)](https://ilmtest-stats.vercel.app)
[![typescript](https://badgen.net/badge/icon/typescript?icon=typescript&label&color=blue)](https://www.typescriptlang.org)
[![Node.js CI](https://github.com/ragaeeb/ilmtest-stats/actions/workflows/build.yml/badge.svg)](https://github.com/ragaeeb/ilmtest-stats/actions/workflows/build.yml)
![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)
![GitHub License](https://img.shields.io/github/license/ragaeeb/ilmtest-stats)

A Next.js analytics dashboard for processing and visualizing CSV data, BlackBerry 10 app statistics, and collection metrics.

## Features

- **CSV Analytics**: Upload and analyze CSV files with automatic statistics computation
- **Data Visualization**: Interactive charts with bar and line chart support
- **BlackBerry 10 Analytics**: Specialized dashboard for BB10 app metrics (quran10, sunnah10, salat10)
- **Collection Stats**: Track progress metrics for content collections
- **Performance Optimized**: Virtualized tables, deferred values, and cached computations
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS

## Tech Stack

- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS 4.x with shadcn/ui
- **Charts**: Recharts
- **Data Processing**: CSV parsing with Papa Parse
- **TypeScript**: Full type safety
- **Build Tool**: Turbopack

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── analytics/route.ts      # Session analytics API
│   │   ├── bb10/[appName]/route.ts # BB10 app statistics
│   │   ├── collections/            # Collection metrics
│   │   └── stats/route.ts          # CSV statistics API
│   ├── analytics/page.tsx          # Analytics dashboard
│   ├── bb10/[appName]/            # BB10 app pages
│   ├── collections/page.tsx        # Collections overview
│   └── page.tsx                    # Main CSV analytics page
├── components/
│   ├── charts/                     # Chart components
│   ├── ui/                         # shadcn/ui components
│   └── virtualized-data-table.tsx  # Performance-optimized table
└── lib/
    ├── analytics.ts                # Analytics data processing
    ├── blackberry.ts               # BB10 data handling
    ├── csv.ts                      # CSV processing utilities
    └── types.ts                    # TypeScript definitions
```

## API Routes

### `/api/stats`
Returns preprocessed CSV data with comprehensive statistics:
- Numeric statistics (mean, median, std dev, percentiles)
- String analysis (frequencies, length stats)
- Date range analysis
- Chart-optimized data structures

### `/api/analytics`
Session analytics with filtering support:
- Event tracking and aggregation
- User session analysis
- Browser/platform statistics
- Date range filtering

### `/api/bb10/[appName]`
BlackBerry 10 app statistics for supported apps:
- `quran10`, `sunnah10`, `salat10`
- Compressed CSV processing
- Reference data denormalization

### `/api/collections`
Collection management and statistics:
- Progress tracking metrics
- Time series data
- Coverage percentages

## Data Processing

### CSV Analytics
- **Automatic Type Detection**: Numbers, dates, strings
- **Statistical Computing**: Full descriptive statistics
- **Performance Optimization**: Preprocessing for chart rendering
- **Virtualization**: Handle large datasets efficiently

### Session Analytics
- **Event Aggregation**: Real-time event processing
- **User Tracking**: Session duration and engagement
- **Browser Detection**: User agent parsing
- **Filtering**: Date ranges and event types

## Development

```bash
# Install dependencies
bun install

# Development server
bun run dev

# Production build
bun run build

# Start production server
bun start

# Linting and formatting
bun run lint
bun run format
```

## Data Files

Place data files in `public/data/`:
- `analytics.json.br` - Compressed analytics data
- `collections.json` - Collection definitions
- `collection_stats.json` - Collection progress data
- BB10 CSV files for app statistics

## Features

### Performance
- **Turbopack**: Fast development builds
- **Virtualized Tables**: Handle 10k+ rows smoothly
- **Deferred Values**: Keep UI responsive during heavy operations
- **Chart Caching**: Pre-computed aggregations

### UI/UX
- **Responsive Design**: Mobile-first approach
- **Interactive Charts**: Hover effects and tooltips
- **Real-time Filtering**: Instant data filtering
- **Loading States**: Smooth loading experiences

### Analytics
- **Multi-format Support**: CSV, JSON, compressed data
- **Comprehensive Stats**: Beyond basic aggregations
- **Time Series**: Date-based trend analysis
- **Cross-references**: Linked data relationships

## License

MIT License - see [LICENSE.md](LICENSE.md) for details.