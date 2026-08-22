<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Specifications

This project ("Euro Container Market") started as a copy of the NextPress boilerplate. NEXTPRESS_V1_SPEC.md, PRISMA_V7.md and BETTER_AUTH_EMAIL_OPT.md are kept as reference docs for the underlying boilerplate features (auth, e-commerce data model, etc.) — they do not describe this project's own design/brand decisions, which live in the plan file for this rebuild.

# Package manager & installation

Package manager in this project: pnpm
Dont execute package installation automatically
Do not install packages automatically; I will do it myself.
Do not stop when a package is missing; continue and tell me which package needs to be installed.

# Workflow

Before generating any files, tell me what you plan to do and ask for approval before proceeding.

# Design & UI

Tailwind CSS 4.3 for styling (mobile first)
Avoid creating custom classes with Tailwind CSS as much as possible.
For the UI, use shadcn/ui components.
Use tabler/icons packages for all icons in this project
Design system: palette stays industrial/maritime — primary #64748B, accent #EA580C, not NextPress's default blue/Outfit. Typography/shape language (2026-08-22 revision, inspired by the chez-charly project's public UI): body in Source Sans 3; display font is Grifter (`--font-display`, local .otf under `src/app/fonts/`, licensed for this use) for H1/H2 and big key-figures, Lexend (`--font-heading`) stays for admin dashboard and small labels only — never repurpose `--font-heading` for public display text. Public-facing shapes are rounded/pill (`rounded-full` buttons, `rounded-[20–34px]` cards), not sharp/cut-corner. Decorative motifs available in `src/components/public/`: `curve-accent.tsx` (SVG accent lines), `marquee.tsx` (CSS-only scrolling banner), plus `.animate-float-1`/`.animate-float-2` keyframes in globals.css for floating photo collages. No GSAP anywhere in the public site (removed by explicit request) — all public animation is plain CSS.

# Year context

The project is being developed in August 2026.
