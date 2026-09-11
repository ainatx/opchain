# mobile-demo — frozen design preview

Five mobile direction previews from #140 (`demo(mobile): five mobile-demo
direction previews`). Served statically at `/previews/mobile-demo/`; nothing in
`site/src` imports or links to them.

## `_shared/tokens.css` is a deliberate copy, not drift

These pages carry their own 214-line token file defining `--obsidian`,
`--ember`, `--ember-dim` and friends. It is **not** wired to
`site/src/styles/tokens.css` and should not be.

That is the right call for a snapshot: these previews record what a design
direction looked like at a moment in time, and a preview that silently
re-themes when the palette changes is no longer a record of anything. The copy
is the point.

**The consequence, stated so nobody has to rediscover it:** a site-wide palette
change will not reach these pages. They will keep rendering in the Ember/Obsidian
brand while the rest of the site moves. That is intended. If you ever want them
to follow the live palette, the change is to swap `_shared/tokens.css` for a
link to the real token layer — but then they stop being a snapshot.

Catalogued in `design-previews/color-2.0-tooling/MIGRATION-SURFACE.md` §3, which
found this file precisely because nothing else would have.
