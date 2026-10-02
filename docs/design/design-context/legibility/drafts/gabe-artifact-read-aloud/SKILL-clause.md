# SKILL-clause — the proposed H7 for `skills/gabe-artifact/SKILL.md` (DRAFT, ≤ 15 lines of clause)

**Slot:** a new `### H7` directly after H6 (SKILL.md line 93, the end of "H6 · Titles are iconed…"), before `## The pattern libraries`. The clause is **6 lines** (the heading, a lead-in, four rules); SKILL.md goes 140 → about 149 (cap 200). Companion edits, one line each, listed under the clause.

---

### H7 · A page with sections reads itself aloud
**Founder rulings D-072 → D-077 (2026-10-01):** every artifact with sections opens each one with a spoken summary and carries one player bar that is in view **all the time**. Spec: `references/read-aloud.md` · module: `assets/read-aloud.js` + `.css` (pasted as kit blocks 4 and 5 — an Artifact cannot load sibling files) · gate: `tools/verify-read-aloud.mjs`.
1. **Summary.** 3–6 plain spoken sentences under each `.sec-head` — no ids, paths, code or symbols; every number generated from the page's data, never typed — with "copy to read aloud" on each and "copy every summary" on top. A section made of parts (each decision, each pattern) lists them as **items**, each with its own short summary and one `/gabe-lens plain` sentence.
2. **Bar.** `ReadAloud.mount({ sections: [{ id, title, say, items }], voice })`: play/pause · stop · previous/next · speed · a chip per section — a **dropdown of its items** when it has any — the one being read lit. A skip, a chip or a menu item moves the reading **and** the page. It is sticky in the flow, never fixed (the cog stays the only floating thing), and clears the cog.
3. **Voice.** The saved `gabe:voice:v1` → the project's ruled voice, inlined at build → a British Google voice → an English Natural or Google voice → the browser's own; the page says in words which one reads. Speed is relative to the voice's own rate.
4. **Floors.** No motion, nothing under 12px, reflows at 390px, storage in try/catch. Run `verify-read-aloud.mjs` beside the chrome gate; it fires on a page without the bar.

---

**Companion edits (one line each, same commit):**
- `## The six house rules` → `## The seven house rules`.
- H2, after "…and nothing else floats": append "— the read-aloud bar (H7) is *sticky in the flow*, not floating, and clears the cog."
- Build loop step 3: append "A page with sections also takes the two read-aloud blocks (H7)." · step 5: append "…and `tools/verify-read-aloud.mjs <file>` (44 checks)."
- Anti-patterns: add "A page with sections and no read-aloud bar, a bar that shows only while a voice plays, or a summary with an id, a path or a typed number in it (H7)."
- Frontmatter `metadata.version` 1.3.1 → 1.4.0, and the **same** bump in the CLAUDE.md capability row (the doctor's parity invariant); `description` and `when_to_use` unchanged (dispatch surface untouched).
