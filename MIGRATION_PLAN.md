# Remix to Next.js Migration Plan

## Overview

This document outlines the migration strategy for converting `postgres.email` from Remix to Next.js (App Router).

**Current Stack:**
- Framework: Remix v1.6.8 (React)
- Database: Supabase/PostgreSQL with pgvector
- Styling: Tailwind CSS 3.1.8
- Hosting: Vercel
- Search: OpenAI embeddings via Supabase Edge Functions

**Target Stack:**
- Framework: Next.js 14+ (App Router)
- Database: Supabase/PostgreSQL (unchanged)
- Styling: Tailwind CSS 3.x (unchanged)
- Hosting: Vercel (unchanged)
- Search: Next.js API Routes or keep Edge Functions

---

## Phase 1: Project Setup

### 1.1 Initialize Next.js Project

```bash
# Create new Next.js project alongside existing code
npx create-next-app@latest postgres-email-next --typescript --tailwind --eslint --app --src-dir
```

### 1.2 Copy & Configure Dependencies

**Keep these dependencies:**
- `@supabase/supabase-js` - Database client
- `react-markdown` - Markdown rendering
- `performant-array-to-tree` - Thread tree conversion
- `clsx` - Class name utility
- `openai` - Embeddings API (if keeping search)

**Remove Remix-specific packages:**
- `@remix-run/*` - All Remix packages
- `@vercel/node` - Not needed with Next.js

**Add Next.js specific (via create-next-app):**
- `next`
- `@types/react`, `@types/node`

### 1.3 Environment Variables

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
OPENAI_API_KEY=your_openai_key
```

---

## Phase 2: Directory Structure Migration

### 2.1 New Directory Structure

```
src/
├── app/
│   ├── layout.tsx                 # Root layout (from root.tsx)
│   ├── page.tsx                   # Home page (redirect to /lists/pgsql-hackers)
│   ├── globals.css                # Tailwind CSS
│   ├── lists/
│   │   ├── layout.tsx             # Lists layout with sidebar
│   │   ├── search/
│   │   │   └── page.tsx           # Search results page
│   │   └── [listId]/
│   │       ├── layout.tsx         # List layout (two-column)
│   │       ├── page.tsx           # Message list view
│   │       └── [threadId]/
│   │           └── page.tsx       # Thread detail view
│   └── api/
│       └── search/
│           └── route.ts           # Search API endpoint
├── components/
│   ├── QuickSearch.tsx            # Search input component
│   ├── ThreadItem.tsx             # Recursive thread display
│   └── Button.tsx                 # Button component
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Browser Supabase client
│   │   ├── server.ts              # Server Supabase client
│   │   └── types.ts               # Database types
│   └── utils.ts                   # Helper functions
└── models/
    ├── list.ts                    # List data queries
    └── thread.ts                  # Thread data queries
```

### 2.2 File Mapping

| Remix File | Next.js File |
|------------|--------------|
| `app/root.tsx` | `src/app/layout.tsx` |
| `app/routes/index.tsx` | `src/app/page.tsx` |
| `app/routes/lists.tsx` | `src/app/lists/layout.tsx` |
| `app/routes/lists/$listId.tsx` | `src/app/lists/[listId]/layout.tsx` |
| `app/routes/lists/$listId/index.tsx` | `src/app/lists/[listId]/page.tsx` |
| `app/routes/lists/$listId/$threadId.tsx` | `src/app/lists/[listId]/[threadId]/page.tsx` |
| `app/routes/lists/search.tsx` | `src/app/lists/search/page.tsx` |
| `app/components/*` | `src/components/*` |
| `app/lib/*` | `src/lib/*` |
| `app/models/*.server.ts` | `src/models/*.ts` |

---

## Phase 3: Core Migrations

### 3.1 Root Layout Migration

**From:** `app/root.tsx`
**To:** `src/app/layout.tsx`

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Postgres.email - PostgreSQL Mailing List Archive',
  description: 'Browse PostgreSQL mailing list archives',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-gray-200">
        {children}
      </body>
    </html>
  )
}
```

### 3.2 Data Fetching Migration

**Remix Pattern (loader):**
```tsx
export const loader: LoaderFunction = async ({ params }) => {
  const data = await getListDetail(params.listId)
  return json(data)
}

export default function List() {
  const { data } = useLoaderData()
  // ...
}
```

**Next.js Pattern (Server Component):**
```tsx
// src/app/lists/[listId]/page.tsx
import { getListDetail } from '@/models/list'

interface Props {
  params: { listId: string }
}

export default async function ListPage({ params }: Props) {
  const data = await getListDetail(params.listId)

  return (
    // Render with data directly
  )
}
```

### 3.3 Supabase Client Migration

**Server Component Usage:**
```tsx
// src/lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from './types'

export function createServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Client Component Usage:**
```tsx
// src/lib/supabase/client.ts
'use client'
import { createClient } from '@supabase/supabase-js'
import { Database } from './types'

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

---

## Phase 4: Route-by-Route Migration

### 4.1 Home Page (Redirect)

```tsx
// src/app/page.tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/lists/pgsql-hackers')
}
```

### 4.2 Lists Layout (Sidebar)

```tsx
// src/app/lists/layout.tsx
import { getLists } from '@/models/list'
import { QuickSearch } from '@/components/QuickSearch'
import Link from 'next/link'

export default async function ListsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const lists = await getLists()

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-gray-800 p-4">
        <QuickSearch />
        <nav className="mt-4 space-y-1">
          {lists.map((list) => (
            <Link
              key={list.id}
              href={`/lists/${list.id}`}
              className="block px-3 py-2 rounded hover:bg-gray-800"
            >
              {list.id}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
```

### 4.3 List Detail Page

```tsx
// src/app/lists/[listId]/page.tsx
import { getListDetail } from '@/models/list'
import Link from 'next/link'

interface Props {
  params: { listId: string }
  searchParams: { page?: string }
}

export default async function ListPage({ params, searchParams }: Props) {
  const page = Number(searchParams.page) || 1
  const { messages, totalCount } = await getListDetail(params.listId, page)

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{params.listId}</h1>

      <ul className="space-y-2">
        {messages.map((message) => (
          <li key={message.id}>
            <Link href={`/lists/${params.listId}/${message.id}`}>
              <div className="p-3 rounded hover:bg-gray-800">
                <p className="font-medium">{message.subject}</p>
                <p className="text-sm text-gray-400">
                  {message.from_email} - {new Date(message.ts).toLocaleDateString()}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Pagination component */}
    </div>
  )
}
```

### 4.4 Thread Detail Page

```tsx
// src/app/lists/[listId]/[threadId]/page.tsx
import { getThread } from '@/models/thread'
import { ThreadItem } from '@/components/ThreadItem'
import { arrayToTree } from 'performant-array-to-tree'

interface Props {
  params: { listId: string; threadId: string }
}

export default async function ThreadPage({ params }: Props) {
  const messages = await getThread(params.threadId)
  const tree = arrayToTree(messages, {
    id: 'id',
    parentId: 'in_reply_to',
    dataField: null,
  })

  return (
    <div className="p-4">
      {tree.map((node) => (
        <ThreadItem key={node.id} tree={node} level={0} />
      ))}
    </div>
  )
}
```

### 4.5 Search Page

```tsx
// src/app/lists/search/page.tsx
interface Props {
  searchParams: { q?: string }
}

export default async function SearchPage({ searchParams }: Props) {
  const query = searchParams.q || ''

  if (!query) {
    return <div className="p-4">Enter a search query</div>
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/search`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ query }),
    }
  )

  const results = await response.json()

  return (
    <div className="p-4">
      <h1>Search Results for "{query}"</h1>
      {/* Render results */}
    </div>
  )
}
```

**Alternative: Use Next.js API Route for search:**
```tsx
// src/app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { query } = await request.json()

  const openai = new OpenAI()
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query,
  })

  const supabase = createServerClient()
  const { data } = await supabase.rpc('search', {
    query_embedding: embedding.data[0].embedding,
    match_threshold: 0.78,
    match_count: 20,
  })

  return NextResponse.json(data)
}
```

---

## Phase 5: Component Migration

### 5.1 QuickSearch Component

```tsx
// src/components/QuickSearch.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function QuickSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/lists/search?q=${encodeURIComponent(query)}`)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700"
      />
    </form>
  )
}
```

### 5.2 ThreadItem Component

The `ThreadItem` component can remain largely unchanged since it's a client component with local state. Add `'use client'` directive at the top.

```tsx
// src/components/ThreadItem.tsx
'use client'

// ... rest of component stays the same
```

---

## Phase 6: Configuration & Build

### 6.1 Tailwind Configuration

```js
// tailwind.config.ts
import type { Config } from 'tailwindcss'
import colors from 'tailwindcss/colors'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        '3xl': '1700px',
        '4xl': '1921px',
      },
      borderWidth: {
        10: '10px',
        12: '12px',
        14: '14px',
        16: '16px',
      },
      colors: {
        gray: colors.neutral,
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}

export default config
```

### 6.2 Next.js Configuration

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable if using images from external domains
  images: {
    domains: [],
  },
}

module.exports = nextConfig
```

### 6.3 TypeScript Path Aliases

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## Phase 7: Migration Checklist

### Pre-Migration
- [ ] Back up current codebase
- [ ] Document all environment variables
- [ ] Note current Vercel deployment settings

### Phase 1: Setup
- [ ] Create new Next.js project
- [ ] Configure Tailwind CSS
- [ ] Set up Supabase client
- [ ] Copy utility functions

### Phase 2: Layouts
- [ ] Migrate root layout
- [ ] Migrate lists layout (sidebar)
- [ ] Migrate list detail layout

### Phase 3: Pages
- [ ] Home page (redirect)
- [ ] List index page
- [ ] Thread detail page
- [ ] Search page

### Phase 4: Components
- [ ] QuickSearch component
- [ ] ThreadItem component
- [ ] Button component

### Phase 5: API & Data
- [ ] Model functions (list.ts, thread.ts)
- [ ] Search API route (or keep Edge Function)
- [ ] Verify all database queries work

### Phase 6: Testing
- [ ] Test all routes
- [ ] Test search functionality
- [ ] Test pagination
- [ ] Test thread display
- [ ] Test mobile responsiveness

### Phase 7: Deployment
- [ ] Update Vercel project settings
- [ ] Configure environment variables
- [ ] Deploy to staging
- [ ] Verify production deployment

---

## Key Differences Summary

| Feature | Remix | Next.js (App Router) |
|---------|-------|---------------------|
| Data fetching | `loader` function | Server Component (async) |
| Client hooks | `useLoaderData()` | Props or client fetch |
| Navigation | `useNavigate()` | `useRouter()` |
| Dynamic params | `$paramName` | `[paramName]` |
| Layouts | Nested routes | `layout.tsx` files |
| API routes | `action` functions | `route.ts` files |
| Metadata | `meta` function | `metadata` export |
| Links | `<Link to="">` | `<Link href="">` |

---

## Estimated Effort

| Task | Complexity | Notes |
|------|------------|-------|
| Project setup | Low | Standard Next.js init |
| Layout migration | Low | Similar patterns |
| Route migration | Medium | 7 routes to convert |
| Component migration | Low | Minimal changes needed |
| Data layer | Low | Supabase works the same |
| Search migration | Medium | Decide Edge vs API route |
| Testing | Medium | Verify all functionality |
| Deployment | Low | Vercel supports both |

---

## Optional Enhancements (Post-Migration)

1. **Server Actions** - Use Next.js Server Actions for mutations
2. **Streaming** - Use Suspense for loading states
3. **ISR** - Add Incremental Static Regeneration for popular pages
4. **Edge Runtime** - Deploy API routes to edge for lower latency
5. **Parallel Routes** - Use for sidebar/main content optimization
6. **Image Optimization** - Use Next.js Image component
7. **React 18 Features** - useTransition, Suspense boundaries

---

## Notes

- The current app is relatively simple with 3 components and 7 routes
- No complex state management to migrate
- Supabase integration remains identical
- Tailwind CSS works the same in both frameworks
- Both deploy seamlessly to Vercel

This migration should be straightforward due to the architectural similarities between Remix and Next.js App Router.
