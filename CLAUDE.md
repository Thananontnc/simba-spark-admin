# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Full project context lives in `../CLAUDE.md` (monorepo root). This file adds what is specific to the `simba-spark-admin` app directory.

## Commands

Run from this directory (`simba-spark-admin/`):

```bash
npm run dev        # dev server at localhost:3000
npm run build      # production build
npx tsc --noEmit   # type check (run before committing)
npm run lint       # eslint
```

Stale process / broken CSS:
```bash
pkill -f "next dev"; rm -rf .next; npm run dev
```

## What this app is

Admin-only portal for Simba Block Course management. Only `/admin/*` routes exist here. Instructor and student portals live in separate apps (handled by other team members).

Route protection is in `src/proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`). Non-admin sessions are redirected to `/login`.

## Architecture that requires multiple files to understand

**Data flow — reads vs. writes:**
- Reads: raw SQL in Server Components (`page.tsx`), no API routes, no ORM
- Writes: Server Actions in `src/app/actions/admin.ts`. All exported actions call `requireAdmin()` first — server actions are public HTTP endpoints, not guarded by `proxy.ts`
- `export const dynamic = 'force-dynamic'` required on every data page or data appears frozen

**Optimistic UI in Block View:**
`src/app/admin/courses/block-view.tsx` uses "silent" server actions (no `revalidatePath`) + client `useState` + `useTransition` so mutations feel instant with no page reload. Silent action variants live at the bottom of `admin.ts` (functions named `*Silent`).

`src/app/admin/courses/courses-page-tabs.tsx` keeps all tab panels mounted via CSS `hidden` class (not conditional rendering). Unmounting `<BlockView>` on tab switch resets its `useState` to stale page-load props, losing any optimistic adds.

**Modal positioning:**
`position: fixed` modals break if any ancestor has an active CSS `transform`. The `.animate-fade-in` class in `globals.css` intentionally omits `animation-fill-mode: forwards` to avoid this.

**DB helper:**
`src/lib/db.ts` — tagged template `sql\`...\`` only. Never call `sql(string)` directly. Neon free tier has cold-start latency ~5–15s; pool `connectionTimeoutMillis` is set to 30s for this reason.

**Auth session shape:**
JWT carries `id` (string) and `role`. In server actions:
```ts
const session = await auth();
const id = parseInt(session!.user.id);
```

**FCFS booking conflict rule:**
`createBookingAdmin` in `admin.ts` checks: same room OR same instructor on overlapping time. Weekends and dates outside the section's timeframe block are rejected.

## Next.js 16 warning

@AGENTS.md
