# Ops UI — Directive

Replicate `ops-mockup-EN.html` (repo root) as the UI for `apps/ops/`.

- Use the CSS custom properties in `:root` as the design system. Port them to Tailwind config or a shared tokens file.
- Match layout, typography, spacing, states, and copy verbatim. The mockup is the spec.
- Keep all four sub-sections: Inbox, Ledgers, Closing, Settings. Keep the sidebar shell with the OnSite brand and Checklist/Operator as disabled placeholders.
- Do not add features that are not in the mockup. If something seems missing, ask before adding.

Backend, schema, and integrations are specified separately in `ops-backend-spec.md`.
