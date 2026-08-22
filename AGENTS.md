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
Design system (palette, typography): industrial/maritime identity — primary #64748B, accent #EA580C, headings in Lexend, body in Source Sans 3. Not NextPress's default blue/Outfit.

# Year context

The project is being developed in August 2026.
