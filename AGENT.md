# Agent Rules

## Meta Rules

- **Update this file**: When a prompt contains a general preference that should always apply (e.g., "use pnpm not npm"), add it to this file. Only add rules that are not specific to the current task.
- **Keep rules clean**: Delete rules that contradict newer ones or have become obsolete. Avoid redundancy. Especially in this file, less is more.

## Code Quality

- **Clean as you go**: When working on any task, remove dead code, unused imports, unused props or variables and unused files encountered along the way—even if unrelated to the current task.
- **Refactor as you go**: Keep files under 400 lines; extract reusable components/functions when logic is duplicated twice or more.

- Wrap private routes with `<AuthGuard>` component to redirect unauthenticated users to `/login`.
- Use `kebab-case` for all file and folder names (e.g., `auth-guard.tsx`, `use-organization.ts`).




## UI Components

- Do NOT use the Card component from `@/components/ui/card` - avoid card-style layouts with boxes/borders around content sections

## UX Best Practices

### Interaction & Flow
- Minimize clicks: prefer single-step actions to multi-step wizards
- Prefer inline to modal: show in-context edits over popups; avoid blocking dialogs
- Direct manipulation: click on text to edit it directly; avoid separate edit buttons
- Context menus for secondary actions: right-click or long-press reveals less common actions
- Hide rare actions: destructive or infrequent actions (delete, archive) go inside edit mode or context menus
- Progressive disclosure: start simple; reveal advanced options on demand
- Default to single page: avoid unnecessary navigation; keep context persistent
- Keep hands on keyboard: primary actions reachable via clear shortcuts

### Navigation & Layout
- Reduce visible buttons: prefer implicit interactions (click-to-edit) over explicit buttons
- Primary action first: place the main CTA top-right or near the working area
- Mobile-first, desktop-optimized: design for mobile first, then enhance for desktop (e.g., two-column layouts, inline actions, Dialog instead of Drawer)
- Mobile actions at bottom: place primary buttons at the bottom for thumb reach on mobile; use fixed bottom bars
- Desktop actions inline: on larger screens, use inline buttons and contextual actions instead of fixed bars
- Prefer clear over dense: fewer controls, larger targets, consistent spacing
- One obvious path: remove competing CTAs; highlight the happy path
- Sticky essentials: keep search, filters, and key actions visible

### Content & Copy
- Less is more: reduce information density; show only essential info by default
- Secondary info on hover: use tooltips for contextual details (slugs, IDs, timestamps)
- Task language: use verbs tied to outcomes ("Export report") not features ("Export")
- Prefer concrete to vague: "Delete 12 files" over "Confirm deletion"
- Show numbers: counts, totals, and progress where it helps decisions
- Explain briefly: one-line rationale when a choice is non-obvious

### Forms & Input
- Inline validation: validate as you type; explain how to fix, not just what's wrong
- Prefer smart defaults: prefill from context; sensible fallbacks; avoid blank states
- Group logically: 5–7 inputs per section; split long forms by meaning, not pages
- Reduce friction: auto-format inputs; remember choices; don't re-ask known data

### Feedback & State
- Instant feedback: show optimistic updates; correct on failure with clear recovery
- Prefer subtle to noisy: toasts for success, inline for errors; avoid banners unless critical
- Show loading skeletons: stable layout; no jumpy shifts
- Make errors actionable: include next step, don't just state the problem

### Accessibility & Inclusivity
- Keyboard-first: logical tab order; visible focus; Esc closes; arrows navigate lists
- Reduced motion: respect user settings; ≤ 200ms animations
- Readable contrast: meet WCAG AA; never rely on color alone
- Clear labels: associate hints/errors; avoid placeholder-only inputs

### Personalization & Memory
- Prefer remembered choices: persist recent filters, sort, and view modes
- Adaptive defaults: propose likely next action based on recent tasks
- Never surprise: announce auto-applied preferences; offer quick reset

### Performance & Responsiveness
- Prefer fast to fancy: prioritize time-to-first-action over visuals
- Don't block: allow interaction while background work proceeds
- Mobile-first touch targets: ≥ 44px; avoid edge-to-edge accidental taps
- Defer heavy tasks: load details on demand; cache recent results

### Safety & Reversibility
- Undo over confirm: allow quick undo instead of modal confirmations
- Soft delete first: archive before permanent deletion; clear restore path
- Preview before commit: show impact (diff, counts) for destructive or bulk actions

### Defaults & Consistency
- Prefer consistent patterns: reuse known placements, icons, and behaviors
- One style of feedback per context: don't mix toasts, banners, and inline for the same event
- Stable component order: no reordering without user intent; avoid layout shifts

### AI-Specific Behaviors
- Explain decisions briefly: one sentence "why" for non-trivial choices
- Prefer transparent to magical: show source, confidence, and change history
- Offer sensible alternatives: one-click tweak (e.g., "shorter," "more formal," "include dates")
- Bounded autonomy: auto-complete routine steps; pause for irreversible actions

### Priorities (tie-breakers)
- Outcome over aesthetics: choose clarity and speed
- Discoverability over cleverness: visible controls beat hidden gestures
- Stability over novelty: predictable flows beat experimental interactions

## Zero (Sync Engine)

This project uses [Zero](https://zero.rocicorp.dev/) by Rocicorp for real-time data sync. When working with Zero-related questions, always consult the official documentation:

- **Schema**: https://zero.rocicorp.dev/docs/zero-schema
- **Reading Data (ZQL)**: https://zero.rocicorp.dev/docs/reading-data
- **Writing Data (Mutators)**: https://zero.rocicorp.dev/docs/writing-data
- **Custom Mutators**: https://zero.rocicorp.dev/docs/custom-mutators
- **Authentication**: https://zero.rocicorp.dev/docs/auth
- **Permissions**: https://zero.rocicorp.dev/docs/permissions
- **React Integration**: https://zero.rocicorp.dev/docs/react
- **Debugging Permissions**: https://zero.rocicorp.dev/docs/debug/permissions

Key gotchas:
- Update permissions require BOTH `preMutation` AND `postMutation` rules. If only `preMutation` is defined, `postMutation` defaults to `NOBODY_CAN` and all updates will fail.
- Data returned from ZQL should be considered immutable - clone before modifying.

## Database & Schema Management

This project uses **Drizzle ORM** as the single source of truth for database schema.

### Architecture

1. **Drizzle Schema** (`db/drizzle-schema.ts`) - The source of truth for all tables, columns, and relations
2. **drizzle-zero** generates the Zero schema automatically from Drizzle (`src/zero-schema.gen.ts`)
3. **Zero Permissions** are defined in `src/schema.ts` which imports from the generated file

### Commands

- `pnpm db:generate` - Generate SQL migrations from schema changes
- `pnpm db:migrate` - Apply pending migrations
- `pnpm db:push` - Push schema directly to DB (dev only, skips migrations)
- `pnpm db:studio` - Open Drizzle Studio to browse data
- `pnpm db:seed` - Seed the database with test data
- `pnpm drizzle-zero:generate` - Regenerate Zero schema from Drizzle schema

### Workflow for Schema Changes

1. Edit `db/drizzle-schema.ts` 
2. Run `pnpm drizzle-zero:generate` to regenerate `src/zero-schema.gen.ts`
3. Update permissions in `src/schema.ts` if needed (for new tables)
4. Run `pnpm db:push` (dev) or `pnpm db:generate && pnpm db:migrate` (prod)

### Setup New Database

```bash
# Start PostgreSQL
pnpm dev:db-up

# Push schema to database (creates all tables)
pnpm db:push

# Seed with test data
pnpm db:seed
```

## Command rules

- Use pnpm and pnpx instead of npm and npx

### React Specific

- Use jotai for state management instead of Redux or Context API or Zustand
- Use Tanstack Query for specific data fetching and caching instead of custom solutions, and use tanstack DB for reusable queries.
- Do not use useMemo or useCallback or memo() or forwardRef() since we are using React 19 + Compiler which optimizes re-renders automatically.
- Avoid props drilling: When passing props through 3+ levels, use React Context or Jotai atoms instead; or restructure component hierarchy.