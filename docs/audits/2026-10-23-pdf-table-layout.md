# PDF table layout correction

The frozen fourth handoff exercise exposed a real export defect: environment-variable names in the eight-column accounts table painted over the next cell. The native PDF had six pages. This was separate from its checker failures; a passing structural grade would not have established usable layout.

The shared Typst template now uses 10-point table text and language-aware hyphenation for ordinary prose. Uppercase names containing underscores and inline code use character boxes separated by zero-width **layout spacing**, scoped to cells. No zero-width Unicode characters are inserted. This permits line breaks without inventing hyphens in identifiers, changing the source Markdown, or changing the Word export. It applies to table cells generally, not to this capture or a particular column count. The implementation uses Typst's [horizontal spacing](https://typst.app/docs/reference/layout/h/) and [raw-text styling](https://typst.app/docs/reference/text/raw/) primitives.

An isolated re-export of the unchanged frozen Markdown produced five pages. All five were rendered with Poppler and independently inspected: the original collisions are gone; no clipping or new overlap was observed. The table remains dense. The raw exercise, original PDF and receipt were not overwritten. This is an exporter review, not a new model run, a delivery, or an accessibility conformance certification.

`tests/ow-tools/pdf-table-layout.test.js` runs the real exporter, reads Poppler word bounding boxes, and checks that both a plain configuration name and inline code stay inside their source cell. It reconstructs the exact identifiers across ordinary PDF line breaks and rejects injected invisible Unicode characters. Together with the existing export and intake suites, 67 tests passed without skips on the local native toolchain (Typst 0.15.1). CI without the native programs reports the native case as skipped; no fallback claims native layout coverage.

Reproduce with `pdftotext`, `pandoc`, and `typst` on `PATH`:

```sh
npx vitest run tests/ow-tools/pdf-table-layout.test.js tests/ow-tools/export.test.js tests/ow-start-acceptance.test.js
```

Independent review also identified that inline code may contain multi-codepoint graphemes. That rule now uses grapheme clusters, keeping decomposed accents together. The native regression includes a decomposed-accent path and passed again with exact normalized text and cell bounds.

The revised exporter is part of the unpublished ow-tools 1.3.1 candidate. Public installation, the immutable mirror pin, and final release verification remain open.
