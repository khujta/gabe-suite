# The Feature Lens Card — schema v0 + two pilot drafts (H8 · edge batch)

- **Date:** 2026-07-11 · **Status:** DRAFT for operator review (the pilot's first artifact — CC2a)
- **What this is:** the executive-summary layer for every feature page — "so anyone, from any background, gets quick answers from different angles without reading code." If these two cards pass review, the schema gets implemented suite-side (Wave-2: `/gabe-plan`/`/gabe-commit` emit the draft at phase close-out; gabe-lens owns the format rules).
- **Reused, not invented (E4):** structure = the **Gabe Block** from `skills/gabe-lens` (problem opener · constraint box IS/IS-NOT/DECIDES · one-line handle · analogy hygiene) — the operator's "for whom / flows / not implemented" angles map onto it almost 1:1. Voice = the center's house rule (skin spec §12: analogy subtitle + one worked example). Facts = commit bodies + PLAN/PENDING/DECISIONS + the feature registry (machine side).

## The editorial line (what is authored vs derived)

| Card section | Source | Who writes it |
|---|---|---|
| 1 HANDLE (≤10 words) | translation | authored once at close-out, human-reviewed |
| 2 WHAT & WHY (the problem, 2–3 plain sentences) | translation of the commit body / PLAN | authored once |
| 3 FOR WHOM (who feels it, in their words) | translation | authored once |
| 4 FLOWS IT SERVES | names authored; links resolved by registry | authored + machine-linked |
| 5 BUILT / NOT BUILT / DECIDED (constraint box) | commit body + PENDING + DECISIONS | authored once; D-rows machine-linked |
| 6 PLATFORM FOOTPRINT (areas touched) | commit file paths → area map | **machine only** |
| 7 TESTED FROM WHICH ANGLES (+ pass rate) | registry → junit/journeys/gates | **machine only** |
| 8 WHERE THE PROOF IS (gallery, video, leaves) | manifests/artifacts | **machine only** |

Rule: sections 6–8 may never be hand-written; sections 1–5 may never assert test results. The card lives beside `features[]` in the one overlay (or its own `cards/` file per feature — operator's call at review).

---

## CARD 1 — H8 · Cook photos that survive (the rich case)

**1 HANDLE:** Your cooking photos now survive anything short of deleting the account.

**2 WHAT & WHY:** Until H8, photos taken mid-cooking lived only in the browser's short-term memory — refresh the page or switch device, and they were gone, taking the "chef toque" achievement with them. Now the photo travels to the kitchen's filing cabinet (the database) the moment it's taken, so a cooking session can be dropped and resumed without losing what you shot. *Analogy: a Polaroid pinned to the ticket rail instead of held in the cook's hand.*

**3 FOR WHOM:** The home cook mid-recipe — especially the one who closes the phone between steps. Nobody photographing food for fun should lose shots to a page reload.

**4 FLOWS IT SERVES:** the cooking flow (start → step marks → timer → photos → log/qualification) and cook-history (photos reachable after completion). → journey group `cooking` / spec `web-journey-cook-state` (legs 16, 18).

**5 BUILT / NOT BUILT / DECIDED:**
- **IS:** upload on capture (compressed client-side, EXIF/GPS stripped) · survives reload/resume/completion · dies on cancel · 12-slot cap, size/type limits enforced server-side.
- **IS NOT:** pre-cook photos (taken before a session exists) do NOT persist — deliberately noted, not wired (later picked up by the edge batch) · no object-store yet (Postgres holds the bytes, discriminator ready).
- **DECIDED:** D144 (store in Postgres now, object store later) · D136 (user+household+session scoping).

**6 PLATFORM FOOTPRINT** *(machine)*: api/cooking routes + schemas + migration 0057 · web cooking flow container, capture seams, binary transport. Areas: `cooking`, `platform`.

**7 TESTED FROM WHICH ANGLES** *(machine)*: +14 api tests (upload/replace/stream/delete, caps, 304s) · journey leg photo-persistence (shots 16/18: photo taken → survives reload) · gates green at ship (pytest 1095 · vitest 403 · freeze additive-PASS). Mapped-test pass rate renders live here.

**8 WHERE THE PROOF IS** *(machine)*: proof/cook-state gallery (captioned legs) · capture video `cook-state/latest.mp4` · junit rows · coverage leaves.

---

## CARD 2 — Prod-readiness edge batch (the lean case)

**1 HANDLE:** Five sharp edges filed off before real users arrive.

**2 WHAT & WHY:** A founder-directed sweep of the failure modes that only hurt in production: leaving (account deletion that truly deletes), retrying (payment-style idempotency keys that un-poison themselves), honesty (the active-cook card naming the real recipe; filter chips that respect their own rules), and the photo gap H8 left open (pre-cook shots now reach the server). *Analogy: the closing checklist before the restaurant's first paying night.*

**3 FOR WHOM:** The user who quits (their data actually leaves) · the user on flaky wifi (retries can't wedge) · every user who reads the screen (it stops lying in two places) · the pre-cook photographer.

**4 FLOWS IT SERVES:** settings/account (danger zone) · cooking active-card · recipe browse filters · pre-cook detail. → journey specs `web-journey-settings-auth`, `web-journey-phase64` (facet sync), `web-journey-cook-state`.

**5 BUILT / NOT BUILT / DECIDED:**
- **IS:** DELETE /me with FK-audited full wipe (DB commit BEFORE identity delete — a half-failure can't orphan data behind a dead login) · TYPE-'ELIMINAR' confirmation gate · idempotency re-claim for FAILED/stuck keys · server-side recipe titles · pre-cook photo upload/un-send · TECNICA facet honors filter:false.
- **IS NOT:** no account-data export before deletion · household survives until the last member leaves (by design) · no retro-fix for keys poisoned before this shipped.
- **DECIDED:** founder ruling — deletion UX at the bottom of Ajustes, danger-confirm pattern; batch shipped as one close-out (LEDGER row), not five phases.

**6 PLATFORM FOOTPRINT** *(machine)*: api account service (new), idempotency, cooking, setup, auth verifier · web Ajustes + cooking + filters. Areas: `platform`, `cooking`, `recipes`, `ui`.

**7 TESTED FROM WHICH ANGLES** *(machine)*: 271-line account-deletion pytest suite incl. DB-level CASCADE proof · idempotency poisoned-state test at the HTTP layer · 17 web tests + 2 stories (danger zone) · phase64 journey synced to the facet change · gates green (pytest 1109 · vitest 415). **Known gap (honest):** no journey walks the deletion flow end-to-end in a browser — candidate for "small gap now vs PENDING" triage in CC2a.

**8 WHERE THE PROOF IS** *(machine)*: junit rows (test_account_deletion.py et al.) · phase64 journey artifacts · no gallery/video yet (this is what "lean" looks like — the card says so instead of hiding it).

---

## Review questions for the operator (judge the CARDS, not the idea)

1. Do sections 1–5 give a stranger the context you wanted — or is an angle missing / one too many?
2. Is the analogy line pulling weight or noise? (House voice says one per section; here it's one per card.)
3. Card 2's honest gap line (§7) — is that the right place for "what testing is missing", or should gaps live only in the machine sections?
4. Custody: card text inside `center.config.json` next to `features[]`, or one small `cards/<id>.md` per feature (my lean: separate files — prose in JSON goes ugly fast)?
5. If these pass: suite-side implementation lands Wave-2 (`/gabe-commit`/`/gabe-plan` close-out emits a draft card; gabe-lens spec owns format) — agreed?
