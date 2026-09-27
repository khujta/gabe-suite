# Amendment 1 — complete the generation (2026-09-14)

**Status: AUTHORIZED, building (operator "go", 2026-09-14).** The operator's direction: **first finish generating the codebase map. The scripts that generate the content come first. Then review, polish and verify what the map generates. How it is displayed is decided later, by looking at the app, never from text.** The operator's "go" stands in for the per-slice "land it": slices build in order, and each slice ends with its real outputs (goldens, dry-run numbers, byte-identity) for the operator to check. The D-decisions below are generation defaults only — no display decision is taken here.

**What this amendment covers:**
- Every generation item in `path-map-status.md` §4. That is list A (A1–A12) and list B: middleware, dependency, service, task and handler forms, the schema, model, setting and mirror short forms, and the Phase 5 frontend pass.
- The plan's Phase 4 list, including the sixth state `external` (`plan.md:274-286`).
- The shared foundation those items need.

**What it leaves out:**
- Phase 6 surfaces: the universe card, the endpoint-lab panel rows, the command region.
- Every display question: path names, grouping, which rows show, how collapsed sites are drawn.
- WebSocket routes, `@app.middleware("http")` functions and Next.js server idioms. Each is a named floor, counted and not formed.
- The `_a3_tests._credit_ep` over-credit fix and plan D5's `_raise_status` widening. Both move archmap bytes.

**Ground:**
- suite `576ae8f` (`graft-adoption`)
- gustify `05007957`; its committed feeds were built at `3ce6aae0`
- FastAPI 0.136.3
- `GEN/` = `templates/center/generators/`

**Notation:**
- **Sections:** amendment sections are written §A1–§A6. Build items keep their `path-map-status.md` ids: A1–A12, and B for the later-kinds list.
- **Slices:** "Slice N", never "SN", so they don't read as pulse signals.
- **Decisions:** numbered D11 onward, continuing plan §5.
- **Golden marks:**
  - **(V)** re-read in source by the critic or this synthesis
  - **(P)** read-only `ast` prototype output
  - **(R)** a designer's source read, not re-checked
  - **(U)** unverified; re-measure at the dry run

---

## §A1 · The agreed feed interface

### Envelope (Slice 1)

```jsonc
{
 "version": 2,                         // was 1 — F.VERSION; the endpoint pass emits it itself
 "head": "<sha>|null",                 // = amap["head"] of the same build (build_center_a3.py:2026)
 "present": true, "kind": "endpoint", "framework": {…}, "endpoints": {…}, "stats": {…},   // unchanged
 "arms_ignored": ["<name>"],           // only when a selection named something that is not an arm (names are case-insensitive)
 "arms_error": "<Type>: <message>",    // only when the orchestrator itself failed — the endpoint forms are still written
 "arms": {                             // WRITTEN ONLY when ≥1 arm is selected; then every registry arm is listed, frontend included
   "<arm>": {"present": bool,          // true when any part ran
             "reason": "switched off" | "switched off — computed in memory for <arms>" | "needs <unit>" | "not built yet (slice n)" | "absent: <why>"   // §A4 V30 V39: a selected unit that had nothing to read
                     | "partial — <part>: <reason>; …" | "needed by <arms>; written only where <arms> writes inside it" | "error: …" | null,
             "version": int, "options": {…}, "stats": {…, "findings": {"<id>": int}},
             "bytes": int,                                                 // selected arms: serialized size of the keys the arm added
             "parts": {"<part>": {"present": bool, "reason": str|null}}}   // only arms with parts
 }
}
```

**Invariant:** with every arm off, `forms.json` equals `_a3_paths.build(amap)` plus `head`. With every arm on, `archmap.json`, `c4-graph.json/.js` and `levels.json/.js` are byte-identical to the off build.

**Orchestration (as built in Slice 1, after its review — `_a3_forms_build.py`):**
- Stages run in `F.ARM_STAGES`, one arm or some of its parts at a time. A part runs only when its OWN hard needs succeeded, so a sibling's failed need never blocks it (review F1).
- A runner is `runner(forms, ctx) -> {version, options, stats}`; `ctx` carries `amap` (a private deep copy — no arm can move the archmap · c4 · levels built after the forms block, F4) · `repo` · `cfg` · `selected` · `parts` · `ok` (units that already succeeded) · `soft` (selected soft needs that succeeded).
- Each stage snapshots the whole feed. A raise, a non-dict return, or a feed or result that `json.dumps(sort_keys=True)` cannot write restores the snapshot and records `error: …`; nothing from that stage is merged (F2 F5).
- The orchestrator records the key paths each stage ADDED (a diff against its snapshot). A unit that is only needed has its additions deleted before the write, unless a selected arm wrote inside them — then the host stays and the reason says so (F3 F30). The shared `arm_findings` dicts (top level and per endpoint or variant) are created before any stage, so each arm owns only its entry; ones left empty are removed.
- An arm whose parts partly failed reads `present: true` with a `partial — …` reason (F6).

### Arms, switches and dependencies

| arm | parts | slice | writes |
|---|---|---|---|
| `paths` | `returns` · `conditions` · `framework` · `paths` | 3 · 4 · 5 | `returns[]` `branches[]` `collapsed[]` `framework_exits[]` `paths[]` on endpoints; top-level `conditions{}`; U6 |
| `switches` | — | 5 | `switches[]` on endpoints; U8 |
| `effects` | — | 6 | top-level `steps{}`; `paths[i].effects`; `failure{}`; U9 U11 |
| `contract` | — | 7 | `repeat{}` `auth{}` `rate{}` `responses{}`; U12 K2 K3 K4 |
| `kinds` | `middleware` · `dependencies` · `functions` · `tasks` · `handlers` | 3 · 8 | top-level maps of the same names |
| `short` | `schema` · `model` · `migration` · `setting` · `mirror` | 4 · 10 | `schemas{}` `models{}` `settings{}` `mirrors{}`; `cases[]` on 422 rows |
| `tests` | — | 9 | top-level `test_cases{}`; `tests{}` on endpoints; `produced[j].tests`; `paths[i].tests`; U14 |
| `frontend` | `guards` · `hooks` · `client` · `reason` · `controls` · `stores` | 11 | top-level `frontend{}` |

**Selecting arms:**
- `center.config.json#forms_arms: {"paths": true, …}`. Every arm defaults to **false**.
- `GABE_FORMS_ARMS=paths,effects|all|none` replaces the config for one run.
- `forms: false` / `GABE_FORMS=0` still turns the whole feed off.

**Dependencies between arms:**
- **Hard needs** are computed in memory and written only if the needed arm is also selected (`F.ARM_NEEDS`):
  - `paths.paths` ← `kinds.middleware` (the part that walks the stack; `returns` · `conditions` · `framework` read nothing kinds writes — Slice 3 review F31)
  - `effects` ← `paths`
  - `contract` ← `effects`
  - `tests` ← `paths`
  - `kinds.functions` ← `effects`
  - `short.model` ← `effects`
- **A unit no runner builds yet** is listed and says `not built yet (slice n)` before any need, and pulls in nothing (review F32). A needed-only arm that ran stamps `switched off — computed in memory for <arm>` on the parts that ran; a part that did not keeps its own reason (F33).
- **Soft needs** are used only when selected: `paths` uses `switches` and `short.schema`.
- **Ids** (the `id` keys on existing rows) are written whenever any arm is selected (D13).
- **Where an endpoint-scoped finding lives (§A4 V38).** On the endpoint's own `arm_findings.<arm>` when the arm walks endpoints (effects · contract · the kinds arm's dependency findings); feed-wide in the top-level `arm_findings.<arm>` with an `endpoint` key when the arm's subject is a test case or a frontend piece (tests · frontend). A consumer joins the two on `endpoint`; neither place duplicates the other.

### Ids: `<prefix>:<sha1(json.dumps(tuple, separators=(",",":"), ensure_ascii=False))[:10]>`, never a line number

- **The ordinal `n`** tells identical tuples apart: it ranks the row's (site line, at line) among every DISTINCT position that tuple has anywhere in the feed. Ranking one endpoint's rows gave a middleware exit that path prefixes filter per endpoint two ids, and one id two exits (Slice 1 review F10) — `_a3_forms_ids.x_ids(repo, forms)` ranks feed-wide.
- **Function fields** are `file::qual`, found as the innermost def in `P._Mod.defs` (`_a3_paths.py:103-109`, V). Module level is `file::<module>`.
- **`via_sym`** is `via` with ` @ file:line` stripped (`_a3_paths.py:835`).
- **The ids live in a leaf module,** `_a3_forms_ids.py`.

| prefix | object | tuple | shared across endpoints |
|---|---|---|---|
| `x:` | produced exit (refusal · uncaught · framework) | `[phase, status, at_fn, site_fn, via_sym, raised_fn, detail, n]`; no `at` → handler | yes, so `middleware{}.exits[].id == endpoints[*].produced[].id` |
| `g:` | precondition | `[pred, status, at_fn, via_sym, depth, n]` (`n` ranks distinct `at` positions, as for `x:`); carries `exit: x:` (`exits[]` + `exit: null` when several rows share its `at`) | yes |
| `r:` | success return | `[fn, kind(return·implicit·catch-return), guards[], after[], n]`; a depth-1 row adds the calling handler `site_fn` before `n`, and `n` ranks (at, site) — one callee called from two sites never shares an id (review F22) | yes |
| `b:` | branch (a deciding callee's arm) | `[fn, guards[], after[], site_fn, n]`, ranked as a depth-1 `r:` | yes |
| `p:` | path | `[endpoint_key, handler, exit_id, [chosen b: ids], split_tag]` | no |
| `sw:` | switch | `["binding", s_fn, port]` · `["value", fn]` · `["flag", sorted ref ids]` | yes |
| `st:` | effect step | `[fn, op, table, cond, n]` | stored once in `steps{}` |
| `c:` | catch | `[fn, sorted types[], n]` | yes |
| ~~`k:` · `w:` · `e:`~~ | claim · rate window · service raise | planned; never minted across four feeds — **struck at §A4 (V33)**; a claim, a limiter and a service raise are addressed by their `at` | — |
| `case:schema:` | a 422 case | `<Cls>/<field path>/<pydantic type>[/<validator>.<n>]` | yes |
| `<l>-<sha10>` | a frontend row (`x e c p r` — exit · effect · control · path · reason site; `b s a q m t` were planned and never minted, struck at §A4 V33) | hashed per piece | scoped per piece |

### Map keys

| map | key | also carries |
|---|---|---|
| `schemas` · `models` | `schema:<Cls>` · `model:<Cls>` | the c4 ids, `_a3_graph.py:672` / `:654` (V) |
| `settings` | `setting:<name>` | `archmap_flag` · `aliases[]` |
| `middleware` | `middleware:<Cls>` | a collision becomes `{"variants": […]}` |
| `dependencies` · `functions` · `handlers` | `file::qual` | `levels_id: "file#qual"`. Archmap `dispatch.dispatches[].t` is `file#qual` and is converted (V) |
| `tasks` | `endpoint:TASK <name>` | `fn`, `levels_id` |
| `frontend.pieces` | `fe:<file>#<Export>`; a store action is addressed by `store` (a `frontend.stores` key) + `action` on its finding — the `#<Store>.<action>` piece key was never minted, struck at §A4 V34 | — |
| `test_cases` | the C-id if it is unique in the feed, else `<tfile>::<def>` | — |

### Kinds forms (as built, Slice 3a — `_a3_forms_mw.py`)

```jsonc
"middleware": {"middleware:<Cls>": {"cls", "kind": "project|third-party|unknown", "registered_at": "file:line",
  "order": {"registered": int, "runs": int, "of": int,         // runs = of-1-registered (Starlette inserts at 0)
            "basis"?: "file-sorted — …",                        // registrations span files: their call order is not read
            "unscanned"?: ["main.py:12 @app.middleware fn", "app.py:9 FastAPI(middleware=…)"]},   // named, never placed
  "outer": "middleware:<Cls>"|null, "inner": "middleware:<Cls>"|null, "file"?, "method"?,
  "pass_through": [{"kind": "exact-paths|prefix|method|flag|expr", "src", "values"?, "negated"?: true, "expr"?, "reason"?, "at"}],
  "exits": [{"id": "x:…", …the endpoint row's fields…, "applies_to": int, "exempt": ["endpoint:…"], "hop"?, "on_endpoints"?: false}]}},
"dependencies": {"file::qual": {"kind": "function|class|instance|security|unknown", "levels_id", "at"?, "calls"?: "file::Cls.__init__|__call__",
  "subdeps": ["file::qual" | {"name", "resolved": false}],   // FastAPI's parameter order, not gate-first; built once, never cut by depth
  "exits": [{"id", …}], "inherited_exits": [{"id", …}], "escapes"?: ["Cls file:line"],
  "effects": [{"op": "commit", "at", "via"?: "callee @ file:line", "when"?: "teardown"}], "teardown": bool, "applies_to": int,
  "class"?/"auto_error"? (security)}}
```
Readings (after the Slice 3 review):
- A guard is rebuilt from its `if` node, never re-parsed from the 160-character text; a `match` case is one `expr` arm with a `reason`. An `elif` / `else` pass-through is decided by its own test when every earlier branch of its chain returns or raises.
- A path arm under an odd number of `not` (or a `not in`) says `negated: true` — it passes every path except its values; a `flag` arm's `expr` keeps the arm's polarity (`not settings.limit_enabled`). Path membership reads the route TEMPLATE: `/orders/{oid}` is unknown against `/orders/ad`, never a match.
- An exit is matched to an endpoint row on its site (on `at` only when it has no site). An exit no endpoint row carries mints its own `x:` id, ranked after every position its tuple holds among the endpoint rows, and says `on_endpoints: false`. A module helper's exit takes its scope, `pred` and `when` from its own guards.
- Exits are filtered by the RESOLVED class in its own file (an alias registration keeps its exits); a class registered twice reads each exit once.
- `Depends(Cls)` is read through `Cls.__init__` (its parameters are the sub-dependencies), `Depends(obj)` / `Depends(Cls(…))` through the class's `__call__` — `_a3_paths._deps` reads them the same way, so the ids agree. A security scheme's exit is the endpoint pass's own row (`_a3_paths._security_row`: status gated by the framework version).
- A commit after the dependency's first `yield` runs at teardown and says `when: teardown`; `dependency-commits` counts only commits before the handler.

Findings (`arm_findings.kinds`): `indistinct-exits {subject, status, at, exits[], sites[]}` · `dependency-commits {subject, commits[], applies_to}`.
Stats: middleware · middleware_exits · middleware_exits_off_endpoints · unscanned_registrations · dependencies · dependency_endpoint_pairs · findings{id: n}.

### Paths forms (as built, Slice 3b — `_a3_forms_paths.py`)

The `returns[]` · `branches[]` · `collapsed[]` shapes are the core shapes below, with these readings:
- `returns[].kind` — `return` · `implicit` (control can fall off the end; found by a walk over a copy with sentinel returns) ·
  `catch-return` (inside an except) · `fall-through` (a branch set's first unguarded return outside a loop). Depth-1 rows belong
  to a deciding callee: `site` is the call, `status: null`, `state: "n/a"`, and `branch` links back to the `b:` id. `implicit` is
  not claimed after an exhaustive `match` (an unguarded `case _`), a `while True` with no `break`, or a loop whose `else` returns.
- `returns[].status` — a returned response is sent AS BUILT: a literal status is `defined`, no status is the class's own default
  (`F.RESPONSE_DEFAULTS`: 307 for `RedirectResponse`, else 200) as `default`, a runtime status is `null` · `unknown`; a response
  held in a local assigned once is read through it; any other value answers `declared.success` as `default`.
- Branch candidates are VALUE returns only (step 3): a void helper's bare and implicit returns never make it deciding.
  `commit-differs` never counts a commit inside the try whose except holds the return.
- `branches[].token` — the rightmost name of the innermost guard (`REPLAY`, `completed`; a `match` case reads its pattern), or
  `fall-through`; `why` — `contributes-rows` · `commit-differs` · `expand_branches: all` (OPTIONS).
- `collapsed[].reason` — `one return` · `generator: runs after the response line` · `swallowed by the caller` ·
  `arms change neither exit nor commit` · `unresolved` · `constructor: builds a value` · `expand_branches: none`.
- `conditions{}` — keyed `"<file>::<Cls>: <when>"` → `{via, when, file, terms[]}` (`_a3_forms_settings.terms`). A middleware row
  gains `applies: true|false` only when path membership proves it (the path subject may be a local assigned once; the route is a
  template, `_a3_forms_settings.path_match`), else `when_for_path` (the residual with each settings term substituted; `evaluate`
  folds `not not X`; a `when` the endpoint pass cut at 160 characters stays as written). An `exempt_rows` other than `annotate`
  refuses (not built).
- Stats: returns · branch_returns · branches · handlers_expanded · collapsed{reason: n} · conditions · applies_false ·
  applies_true · when_for_path.

### Schema forms (as built, Slice 4 — `_a3_forms_schema.py` + `_a3_forms_short.py`)

```jsonc
"schemas": {"schema:<Cls>": {"cls", "file", "at", "extra": "forbid|ignore|allow", "extra_state": "defined|default", "extra_at",
  "fields": [{"name", "at", "annotation", "required", "constraints": {kw: value}, "alias"?}],
  "validators": [{"name", "kind", "fields": [...], "at", "normalises": [...],
                  "rules": [{"type", "at", "msg", "pred"?, "allowed"?: {"values"} | {"state": "unknown", "reason": "runtime: f()"},
                             "range"?: [lo, hi], "bound"?: {kw: value}, "via"?: "helper @ file:line"}]}],
  "consumers": int, "claimed"?: false}},   // claimed:false = a class a handler names that no code.schemas claim covers — formed, so no case dangles
// on a validation row:
"cases": [{"id": "case:schema:<Cls>/<field path>|<path>.__model__/<type>[/<validator>.<n>]" | "case:param:<p>/<type>" | "case:framework:<p>/missing",
           "loc": "body.dietary.allergens", "type": "<pydantic error type>", "at"?, "rule"?, "msg"?, "allowed"?, "range"?, "bound"?,
           "schema"?, "validator"?, "param", "state"?: "default"}],
"schemas": ["schema:<Cls>"], "types": "collapsed", "unread"?: [{"param", "reason": "dependency parameter: rules not read"}],
// on an endpoint that reads a body (paths.framework):
"framework_exits": [{"id": "x:…", "phase": "body-parse", "status": 422|400, "state": "default", "form", "detail", "source"}]
```
A message keeps `{…}` for a value only known at runtime (`{len(cleaned)}`); constants and call-site keywords are filled in.
Finding (`arm_findings.short`): `extra-ignored {subject, file, consumers}`.

Readings (after the Slice 4 review):
- **Identity.** A form belongs to one class — its file and name. Same-named classes in different files are `{"variants": [...]}`, each with its own `consumers` and finding; a case naming such a class carries `schema_file`. A row's `schemas[]` and `consumers` count every model the row reads, rules or none. A case id is `case:schema:<Cls>/<field path>/<type>` (the path from the parameter, `home.street`; `__model__` for the model's own rule), unique per row.
- **Models.** `BaseModel` · `SQLModel` · `RootModel` (its `root` validates at the body itself), through import aliases and module-attribute bases. `extra` from a class keyword, a `ConfigDict` / dict / named constant, or `class Config`; `alias_generator` `to_camel` / `to_pascal`.
- **Fields.** `_private` attributes and `ClassVar` are not fields. Constraints come from `Field`, `constr`-family calls, `Annotated` `Field` / `StringConstraints` / `Query`-family metadata, a module alias (`Name = Annotated[...]`) and a `NewType`; a default inside `Annotated` makes a field optional. One effective alias (validation_alias > alias > first `AliasChoices` > generator) is every loc of the field, validator cases included. v1 `min_items` / `max_items` / `regex` map to their v2 rules; any other keyword that is not metadata reads `type: unknown` (counted in `stats.unknown`); `allow_inf_nan` is a rule only when False; `max_digits` + `decimal_places` adds `decimal_whole_digits`. List items are read at `loc.[]`, dict values at `loc.{}`.
- **Parameters** follow FastAPI's `analyze_param`: a path name → Path (never `missing` — the route would not match), `UploadFile` → a form field, a non-scalar annotation → Body, else Query; an explicit `Query/Path/Header/Cookie/Body/Form/File` in the default or in `Annotated`. Required by the default alone (`Optional[str]` with no default is required; `Query(...)` / `default=...` is). A Header's loc converts underscores to hyphens. The embed rule (more than one body name · `embed=True` · one non-model Form field) sets `embed` on the row. `Annotated[Model, Depends()]` is a dependency, never a body. A dependency's own parameters are read (FastAPI flattens them into the request); a factory's (`Depends(require_permission(P))`) arguments are `unread` with that reason.
- **Validators.** The nearest definition of each method name only. A raise the validator catches, and a guard or an early return the call-site keywords decide, drop their rule (`and` / `or` / `not` fold); constants are read in the module that holds them (a helper's default in the helper's, a call-site keyword in the caller's). `assert` → `assertion_error`; a `ValueError` subclass and a bare `raise ValueError` → `value_error`; `PydanticCustomError(type, template, ctx)` → its type and filled template; `cls.` / `self.` helpers are followed; `*` and `*FIELDS` expand; a class-attribute allow-list resolves; `range` carries `band: accepted|refused`; messages apply format specs and conversions; `defined` names the class that defines the validator; `unread_calls` names a helper's own calls the one hop does not follow.
- **Rows.** `cases_truncated` past `case_cap`, `nest_cut` past `nest_depth`, `cycles` for a self-referencing model; `answered_by` when an app handler takes `RequestValidationError` (S9).
- **Framework exits** carry `body: json|form`. A form body answers starlette's 400 (its detail varies, `detail_state: variable`) and FastAPI's 400 — never `json_invalid`. Below fastapi 0.136.3, or when the version is unreadable, a row reads `status: null`, `state: unknown` with the reason. The exits' ids join the `ids` block (`framework_x`, `collisions`).
- **Stats:** schemas (distinct classes) · schemas_unclaimed · rows · cases · unread · truncated · runtime_allowlist (distinct rules) · unknown {keyword: n} · deferred (S11, the tests arm) · validation_answered_by?.

### Switches (as built, Slice 5a — `_a3_forms_switch.py`)

```jsonc
"switches": [
  {"id": "sw:…", "kind": "binding", "scope": "handler|call|dependency", "fn": "file::qual", "port": "TokenVerifier",
   "site": "file:line",            // the port call in `fn`
   "anchor": "file:line",          // the line in the endpoint's own chain that reaches `fn`
   "factories": ["file::get_verifier"],
   "branches": [{"impl", "t": "file::Impl.method", "pred", "binding": "selected|ambiguous", "escapes": [cls], "refuses"?: [status],
                 "ends": ["InvalidTokenError → translate file:line"], "reason"?}],
   "changes_exit": bool|null, "proves"?: ["x:…"]},                  // proves: the refusal rows the agreeing catches translate
  {"id": "sw:…", "kind": "value", "scope": "call|dependency", "fn", "depth": int, "chain": ["file::qual", …], "anchor", "site",
   "branches": [{"pred", "value", "at", "setting"?}], "settings": {name: {"default", "env"}}, "on": "success"},
  {"id": "sw:…", "kind": "flag", "scope": "middleware", "via", "when", "expr", "settings_class", "settings": {name: {"default", "env"}},
   "refs": ["x:…"]},                                                 // every row this condition gates on the route
  {"id": "sw:…", "kind": "flag", "scope": "handler", "pred", "at", "refs": ["x:…"]}]   // a `kind: flag` precondition
```
Readings: the binding edges are `_a3_stacks_pydi.parse(repo)`'s (D18), grouped by (scope function, port), placed on each endpoint whose scope reaches the function — the handler, its level-1 callees, every dependency function and each dependency's level-1 callees (the first stage reached wins). `changes_exit` compares the branches' escaping classes after the catches at the site and at the anchor (`null` when an implementation is outside the tree). A value switch is found by `_a3_forms_reach.bfs` from the handler and each dependency to `reach_depth`; one found a level further is counted in `switch_depth_capped` and never placed. A flag switch leaves out a row its route proves off (`_a3_forms_paths.row_condition`, the same answer `conditions{}` gives). Switches are per endpoint and share an id across endpoints.
Stats: binding · value · flag (distinct ids) · endpoints · binding_edges · binds_unplaced · changes_exit · switch_depth_capped · bindings_reason?.

### Paths (as built, Slice 5b — `_a3_forms_walk.py`)

`paths[]` per endpoint (and per variant) — the §A1 core shape below, with these readings:
- **One path per exit:** every produced refusal and framework exit whose `applies` is not false; each success return, combined LINEARLY with the arms of the deciding calls before it (1 + Σ(arms − 1) — the base takes every call's fall-through; the rest of the product is `stats.combinations_omitted`); one uncaught 500 per endpoint, `anywhere: true`, `state: partial` with its causes. `exit.kind`: refusal (middleware · security · dependency · handler) · framework (body-parse · the 422 splits) · success · uncaught.
- **Request order.** Middleware in `middleware{}` `runs` order — a class with no row on the route is a `step`, one with rows is its gates (a flag switch before the rows it gates); then the body read (the two body-parse exits are alternatives, never gates of each other); then the dependencies in FastAPI's resolution order, each after its own sub-dependencies — a dependency's parameters (`split: dependency-params`, their `cases`, and `dependency: file::qual` — one path per dependency, its id carrying the dependency) before its body, its binding switch at its anchor, its rows by line; then the endpoint's own parameters (`split: own-params`) after every dependency; then the handler.
- **The handler chain** reads `_a3_paths._walk`'s stacks: an earlier refusal or return is passed (`gate hit: false`) when its guard is negated in the exit's `after`; a call runs when its guards prefix the exit's (`collapsed` with its reason, or `call` + the arms passed and taken inside the deciding callee — `branch hit: false|true`); a translated refusal's gate `at` is where it was raised, followed by the `catch` handlers it passed (`_a3_forms_catch.trail`: a callee's `pass-through`, then the translating handler). A refusal an app exception handler answers (`via: app handler <Cls>`) is placed at its raise — in the handler, through the call that reached the raising callee (a nested call counts: `f(g())`, `g().h()`), or, when the raise sits in a dependency's own function, in that dependency's place in request order with `phase: dependency` (the endpoint pass files every app-handler row under `handler`; the walker re-reads it, so arms-off output is unchanged) — and closes with a `catch` `by: app handler` at that handler's response. A row none of these reach is counted `unplaced`, never guessed. Value and handler-scope binding switches sit at their handler anchor — a value switch on success paths only.
- **Names and state.** `names{detail, token, exception, stage}` (no chosen name, D15); `proven_by` when a binding switch on the path proves the exit; `partial` with `unknown[]` for a dynamic status, an unverified translation no binding proves, an ambiguous binding, `anywhere`. `p:` ids are `[endpoint, handler, exit id, chosen b: ids, split]` — no line numbers. Paths sort in request order (the stack's timeline, then the handler by line and arm). Past `PATH_CAP` 48 an endpoint keeps every non-success path and the success paths in id order, and says `paths_truncated`.
- **Stats:** paths · success · refusal · framework · uncaught · partial · combinations_omitted · paths_truncated · unplaced · endpoints.
- **As built vs the plan.** The walker is its own module (`_a3_forms_walk.py`), not +250 lines in `_a3_forms_paths.py`. The middleware order follows `runs` (the golden table's E string had Idempotency and RateLimit reversed). Not built: a placed 500 per `escape-500` (the `anywhere` path carries the causes), `effects` (Slice 6) and `tests` (Slice 9).

### Core object shapes (per endpoint, and per `variants[]` entry)

```jsonc
"paths": [{"id":"p:…","phase":str,"status":int|null,
  "exit":{"id":"x:…|r:…","kind":"refusal|success|uncaught|framework"},
  "names":{"detail":str|null,"token":str|null,"exception":str|null,"stage":str},   // D15: never a chosen `name`
  "split"?:"dependency-params|own-params|body-parse","cases"?:["case:schema:…"],
  "chain":[{"kind":"step|gate|branch|switch|call|collapsed|catch|exit","ref"?:id,"hit"?:bool,   // `commit` was never minted — struck at §A4 V33; a commit is a `st:` step on the path's effects
            "phase"?:str,"at"?:"file:line","cond"?:str,"call"?:str,"fn"?:"file::qual",
            "op"?:"translate|pass-through|rethrow|swallow","cls"?:str}],
  "switches":["sw:…"],"proven_by"?:"sw:…","state":"defined|partial","unknown"?:[str],"anywhere"?:true,
  "effects"?:{"steps":[{"step":"st:…","via":"file::qual"}],"committed":[…],"maybe_committed":[…],
              "rolled_back":[…],"uncommitted":[…],"dependency":"ran|not-run|unknown","may_follow_commits"?:["st:…"]},
  "tests"?:[TestRef]}],
"returns":[{"id":"r:…","fn","kind","at","depth","status":int|null,"state","value","pred"?,"after"?,"in_loop"?,"site"?,"branch"?}],
"branches":[{"id":"b:…","site","call","fn","pred","after","token","return":"r:…","why":["contributes-rows"|"commit-differs"]}],
"collapsed":[{"site","call","fn","reason":"one return|arms change neither exit nor commit|generator: runs after the response line|swallowed by the caller|unresolved"}],
"framework_exits":[{"id":"x:…","phase":"body-parse","status":422|400,"state":"default","source":"fastapi/routing.py:427|:447"}],
"switches":[{"id":"sw:…","kind":"binding|value|flag","scope":"handler|call|dependency|middleware",…}],
"failure":{"state","catches":[{"id":"c:…","fn","at","depth","types","scope","guards":{"writes","commits"},
           "actions":[{"op","at","fn"?,"suppressed"?,"steps"?}],"outcome":"translate|pass-through|rethrow|swallow","answers"?}]},
"arm_findings":{"<arm>":[{"id","slot",…}]},
"slots":{ /* U3 U7 K1 only — as built. The nine other slots ARE their arm blocks (§A4 V32): U6 paths[] · U8 switches[] · U9 paths[].effects · U11 failure{} · U12 repeat{} · U14 tests{} · K2 auth{} · K3 rate{} · K4 responses{}; F.KINDS names each */ }
```

**Changes to existing rows** (each key appears only when its arm is on):
- `produced[i]` gains:
  - `id`
  - on middleware rows: `when_for_path` and `applies` (paths)
  - on 422 rows: `schemas[]`, `types`, `cases[]` (short.schema)
  - `tests[]` (tests)
- `preconditions[i]` gains `id` and `exit`.

### Shared rules

- **Findings.** A new arm **never** appends to `endpoints[k].findings[]` and never touches `stats.findings`, which is counted inside `P.build` (`_a3_paths.py:935-936`).
  - Per-endpoint findings go in `arm_findings.<arm>`.
  - Feed-wide counts go in `arms.<arm>.stats.findings`.
  - `_a3_forms.FINDINGS` gains an `arm` key.
  - Ids are unique across the feed:
    - `test-detail-unmatched` belongs to tests;
    - `client-detail-unmatched` belongs to frontend;
    - there is exactly one `race-500` (slot U12, arm contract); the model form's M10 refers to it, and `uq-race` is dropped;
    - `untranslated-raise` is a count that points at the endpoint's `escape-500`.
- **Catch vocabulary** is `_climb`'s (`_a3_paths.py:330-345`, V): `translate` · `pass-through` (a bare `raise` or `raise <name>`) · `rethrow` (raises a *different* class) · `swallow`, plus `escape` when no handler matches. `re-raise` is not a word in the feed.
- **Path identity.** There is one walker for paths: one path per exit, plus the arms of deciding callees, combined linearly. The effects walker runs **along** each path; a non-exiting `if` becomes `cond` steps and never forks (`shallow-logic-maps.html:348` collapse rule).
- **422 split tags.** The tags are `dependency-params`, `own-params` and `body-parse`.
  - A validation row keeps its one `x:` id.
  - Each `cases[]` entry carries `param`.
  - Test refs join the `x:` id; `case` is added only when a payload literal is actually evaluated.
- **Registry.** `KINDS.endpoint` += U6 U8 U9 U11 U12 U14 K2 K3 K4.
  - New kinds: middleware · dependency · service · task · handler · schema · model · setting · mirror · guard · hook · component · store_action.
  - Slot ids are scoped per kind.
  - `STATES` gains `external` (D23).
  - Paths order by a new `PATH_PHASES` (middleware · body-parse · security · dependency · validation · handler · uncaught). `PHASES` stays untouched, so `P.build`'s row sort does not move.

---

## §A2 · Slices in dependency order

**Every slice follows this protocol:**
1. Build in order under the operator's "go"; the slice's outputs are shown at its exit.
2. New modules land at column 0 through `_a3_forms_build.py`.
3. Each slice has its own battery directory, hermetic and AST-only, in the house style of `tests/element-forms/run.sh`: `set -u`, `GEN_OVERRIDE`, `mktemp -d` with an EXIT trap, `ok`/`bad`, one summary line printed **last**. Every mutant must flip its check or the battery FAILs.
4. Dry-run with `scripts/forms-dryrun.sh` (Slice 1) on gustify · gastify · tier3 · keypro, serially.
5. The commit message records the numbers.
6. Commit by explicit path; check `git log -1` before and after.

`tests/element-forms` (C0–C13) is never edited.

**Every slice has the same exit criteria:**
- Battery green, every mutant killed.
- The slice's goldens reproduced.
- Arms off: `map-baseline.sh check` BYTE-IDENTICAL on all four targets.
- Arms on: only `forms.json` differs.
- Every new module under 800 lines.
- A `gen/README.md` module-table row.
- Suite-doctor CLEAN.

---

### Slice 0 · Rulings (no files)

This amendment. The operator rules on the §A1 interface, the switch policy (D12) and D11–D28, then says "land it" for Slice 1.

---

### Slice 1 · Foundation — A1, A2 plumbing, envelope, shared leaves

**Generates:** `version 2`, `head`, and the `arms{}` machinery (no real arm yet). The example estate gains `forms.json`, and `LABEP.forms` carries the raw block for the door endpoint. No panel reads it (Phase 6).

**Modules** (import chain: `build_center_a3.py` → `_a3_forms_build` → leaves):

| module | lines (est.) |
|---|---|
| `_a3_forms_build.py` | ~150 |
| `_a3_forms_ids.py` | ~80 |
| `_a3_forms_settings.py` | ~200 |
| `_a3_forms_catch.py` | ~150 |
| `_a3_forms_reach.py` | ~160 |
| `_a3_forms.py` | +~60 (VERSION, ARM_NEEDS, arm keys on FINDINGS, PATH_PHASES, OPTIONS `reach_depth` 4) |
| `build_center_a3.py` | +~15 (2,558 → ~2,573, over budget; state the numbers) |

**Algorithm:**
1. `F.VERSION` goes 1 → 2. `_a3_forms_build.extend_backend(forms, amap, repo)` sets `forms["head"] = amap.get("head")` before any arm runs, so even a failed arm leaves it stamped.
2. **Switches.** Read `CFG.get("forms_arms")` and `GABE_FORMS_ARMS`, then close over the hard needs from `F.ARM_NEEDS`. Selected arms are written; needed-only arms are computed in memory and discarded.
3. **Run each arm** in the fixed order: ids → kinds.middleware/dependencies → short.schema (+ framework exits) → switches → paths → effects → contract → kinds.functions/tasks/handlers → tests → short.model/migration/setting/mirror.
   - Each arm runs in its own `try`, over a deepcopy snapshot of `endpoints`.
   - If an arm raises, the snapshot is restored and `arms.<arm> = {present: false, reason: "error: …"[:200]}`. The later arms still run, minus that arm's hard dependents, which record `reason: "needs <arm>"`.
4. **Write `arms`** only when at least one arm is selected; an unselected arm reads `present: false, reason: "switched off"`.
5. **Wiring:**
   - Hoist `_forms = None` above the forms block (`build_center_a3.py:2199`).
   - After `_a3_paths.build` (`:2201`), inside the existing `try`, call `_forms = _a3_forms_build.extend_backend(…)`. It never raises.
   - Leave `extend_frontend` as a stub call after the fe arm (`:2283`), returning `None`.
   - The write rule (`:2202`, V) is unchanged until Slice 11.
6. **`_a3_forms_ids`:** `ident(prefix, tuple)` · `x_tuple(repo, row, handler)` · `x_ids(repo, forms)` (the feed-wide ordinal) · `fn_at` · `via_sym`.
7. **`_a3_forms_settings`:**
   - `self.<attr>`: follow the `__init__` assignment → the `x or get_settings()` local, typed through `_a3_stacks_pydi._ann_name` (`:66-93`) → a one-return `@property`, inlined once.
   - Read AnnAssign / `Field(default=)` values, `Final` constants, and `SettingsConfigDict(env_prefix=)`.
   - `x in CONST` → `P._Mod.consts` via `P._literal` (`_a3_paths.py:73-81`).
   - `startswith` → `P._path_prefixes` (`:590-610`).
   - Method arms, and a three-valued `not/and/or` simplifier.
   - Floors are `opaque`, verbatim.
8. **`_a3_forms_catch`:**
   - `classify(h, hev)` in `_climb` precedence (`:337-344`).
   - `trail(cls, bases, tries, hev)` returns **every** handler passed, which is why `_climb`'s `break` needs its own trail copy.
   - `actions(h)` lists rollback, calls and `contextlib.suppress`, reusing `P._handler_types` / `P._is_reraise` / `P._http_parts` (`:200-211`, `:319-327`).
9. **`_a3_forms_reach`:**
   - `callee()` = `P._callee` (`:446-462`) plus `self.m()` → `Class.m`, memoised.
   - `bfs(roots, depth=OPTIONS.reach_depth)` in level order, keeping the first-reached entry per `(fn, root)`, tie-broken by `(caller, site)`.
   - `skip(path)` = `_a3_graft._is_center` (`_a3_graft.py:169-176`). Its file list is built from the generator dir at import (`:69-75`, V), so new modules are skipped on twins automatically.
10. **Consumer fixes:**
    - (a) `form_drift.load_forms` adopts the suite state words of `mapquery.forms_block` / `entity_models`: no file → `not_emitted`, `present:false` → `absent` (`mapquery.py:170-182` vs `form_drift.py:54-63`, V; inverted today).
    - (b) Lab plumbing: `regen-example.sh:60` FEEDS gains `forms.json` only (`levels.json` is already listed, V), and `forms.head` joins that script's volatile-stamp normalisation. `gen-endpoint-facts.py` reads `EX/forms.json` when present and emits `LABEP.forms = {state, reason, endpoint}`, raw.
11. **`scripts/forms-dryrun.sh <target…> --arms <list>`** (~90 lines, serial). For each target:
    - run `scripts/map-baseline.sh check` with arms unset (expect BYTE-IDENTICAL);
    - run it again with `GABE_FORMS_ARMS=<list>` (expect only `forms.json` to differ);
    - print one JSON line: forms bytes, `arms.*.stats`, per-arm serialised bytes, wall time.

    `map-baseline.sh` is read-only on targets (`GABE_REPO_ROOT` + `GABE_CENTER_OUT` + `GABE_GRAFT_BUILD=0`, `:9-11`, V). At build, confirm it passes the parent environment through to the build.

**Goldens (gustify):**
- Arms off: `forms.json` = today's bytes, plus `version: 2` and `head` equal to the same build's archmap head. The committed feeds carry `3ce6aae0` (V).
- Settings resolver on `RateLimitMiddleware._enabled` (`middleware/rate_limit.py:97-98`) gives `settings.rate_limit_enabled or settings.is_production` (`config.py:247-254`); `is_production` expands to `settings.environment is Environment.PRODUCTION` (`config.py:278`) (R, two designs agree).
- `EXEMPT_PATHS` resolves to `("/healthz",)` (`rate_limit.py:40`) (P).
- Catch trail for `ConsentRequiredError` from `services/setup.py:374`: `pass-through` at `:403` (bare raise `:407`), then `translate` at `api/setup.py:201` (V).
- Reach: `services/ai_spend.py::record_spend` is reached at depth 3 from `POST /recipe-creation/gustify` via `services/ai_recipes.py:325` (P).

**Battery `tests/forms-core/` (~300 lines):**

| # | kind | proves |
|---|---|---|
| K1 | SILENT | arms unset: `forms == P.build(amap) ∪ {head}`, no `arms` key |
| K2 | honest-empty | a monkeypatched fake arm that raises: `arms.fake.present false` + reason; `endpoints` byte-equal to the snapshot; later arms still run |
| K3 | FIRE/SILENT | ids are equal under 7 prepended blank lines; one detail edit changes exactly that `x:` id; an identical duplicate raise shifts `n` |
| K4 | FIRE/SILENT | settings: property one-hop, `x in CONST` resolved; an attribute set outside `__init__` stays `opaque` |
| K5 | FIRE | catch trail: pass-through → translate; a raise of a different class → `rethrow`, never `pass-through` |
| K6 | FIRE/SILENT | reach: `self.m()` resolved; the depth cap counts `truncated`; a vendored `scripts/_a3_code.py` is skipped |
| K7 | sync | `form_drift.NAG/COUNT` equal the registry's endpoint-arm nag/count lists (mutation: add a nag finding to the registry → FAIL) |
| K8 | guard | every `_a3_paths` private name the arms import exists (mutation: rename one → FAIL) |
| K9 | FIRE | `form_drift.load_forms` and `mapquery.forms_block` return the same state word for no-file and for `present:false` |

`tests/center/run.sh` gains a case beside `:357-388`:
- `GABE_FORMS_ARMS=all` on the fixture → `archmap.json`, `c4-graph.json` and `levels.json` byte-identical to the arms-off build;
- a raising `extend_backend` internal → exit 0 and `forms.json` still written.

**Dry run:** only the forms.json hash moves (version and head) on gustify, gastify and tier3; keypro unchanged (no forms). Record forms bytes before and after.

**Consumers:** form_drift state words plus the `tests/pulse-angles` expectations that name them; pulse patch-version bump; re-bless the forms.json hash in `tests/baselines/*.sha256`; regenerate the example estate.

**Effort:** M.

---

### Slice 2 · Ids — A3

**Generates:** `produced[].id` (`x:`), `preconditions[].id` (`g:`) and `.exit`. Written whenever any arm is on (D13), before the first stage, so no arm owns them. A top-level `ids` block carries `{present, reason, x, g, linked, ambiguous, unlinked, collisions}`; ids that fail read `present: false` and never cost the arms.

**Module:** the ids part of `_a3_forms_build.py` (+~60).

**Algorithm:**
1. Build a per-file line → innermost def map from `P._mod(...).defs`.
2. Compute each row's tuple and ordinal with `_a3_forms_ids.x_ids(repo, forms)` (§A1: `n` ranks distinct positions feed-wide).
3. Set `exit` on each precondition: the `x:` row whose `at` or `raised_at` equals the precondition's `at`.
4. Handle every `variants[]` entry separately.

**Goldens (gustify):**
- `POST /setup/complete`: the two 429 rows share every tuple field except `n`. The sensitive row (site `:117`) has n=0; the global row (site `:121`) has n=1. Both `at` = `rate_limit.py:127` (V, committed forms).
- The global 429 id is equal on every endpoint that carries it (V by construction; counts P: 79 after Slice 3 marks `/healthz` inapplicable).
- Precondition `key is None` (`api/setup.py:193`) → its `exit` = the 400 row's id.
- Hash strings are **recorded at the dry run, not asserted from the design.** The designers' values were computed under a feed-wide ordinal and are provisional.

**Battery `tests/forms-paths/`, first cases:**
- ids on the fixture's middleware 429 are equal across endpoints (FIRE);
- a validation row's id differs per handler (SILENT on sharing);
- line-drift and detail mutants as in K3.

**Dry run:** count ids, count id collisions (expect 0), forms bytes.

**Effort:** S.

---

### Slice 3 · Success exits, conditions, middleware and dependency forms — A4 · A5 · B-mw · B-dep

**Generates:**
- **paths** arm, parts `returns` and `conditions`: `returns[]`, `branches[]`, `collapsed[]`, top-level `conditions{}`, `when_for_path` / `applies` on middleware rows.
- **kinds** arm, parts `middleware` and `dependencies`.

**Modules:**
- `_a3_forms_paths.py` (part 1, ~250)
- `_a3_forms_mw.py` (~260)
- `_a3_forms.py` +~30 (`RESPONSE_CLASSES` reuse + `RESPONSE_DEFAULTS`, `TX_CALLS`, OPTIONS `expand_branches` / `exempt_rows`) — the order is read from `amap.app_middleware`, so no `MIDDLEWARE_ORDER` table exists

**Algorithm:**
1. **Handler exits.** Re-find the handler with `P._find_handler` (`:733-743`) and read `P._events`.
   - Bare returns come from `ast.walk`: `_walk` drops them (`_a3_paths.py:302-305`, V).
   - A trailing non-exit statement gives an `implicit` return.
   - A return in a swallowing except gives `catch-return`.
   - Status is `defined` only for a returned `RESPONSE_CLASSES` call with a literal status below 400; otherwise it is `declared.success` with state `default`.
2. **Candidate calls.** Handler call events resolved by `_a3_forms_reach.callee`.
   - Skip generators (Yield/YieldFrom): they run after the response line.
   - Skip calls whose handler-level catch swallows.
3. **Branch candidates.** Each value return in the callee: guarded → a branch; the first unguarded → the fall-through; `in_loop` is recorded and never multiplied.
4. **Expand only deciding callees:** at least 2 branches **and** either (a) the site contributes a produced row or precondition (join `via_sym == "call <qual>"`, or a `raised_at` inside the callee), or (b) the branches differ in a literal `.commit(` on their guard prefix. Never use archmap `access.commits`, which is true on flush (`_a3_code.py:1678`, V). Everything else goes to `collapsed[]` with a reason.
5. **A5 conditions.** For each middleware row with `when`, resolve its terms with `_a3_forms_settings`.
   - Per endpoint, substitute path membership against `full_path` (`_a3_paths.py:746-757`) and simplify.
   - A provable False gives `applies: false`. The row stays (`exempt_rows: annotate`, D19).
6. **Middleware forms** (`amap.app_middleware` sorted by `order`):
   - **order:** `runs = n-1-registered`, because Starlette does `user_middleware.insert(0, …)` (starlette `applications.py:101`, V);
   - **exits:** `P._middleware_exits` filtered by `via` (`:613-667`), carrying the same `x:` ids;
   - **pass-through arms:** split `BoolOp(Or)` into `exact-paths` / `prefix` / `method` / `flag` / `expr`, inlining a local assigned once;
   - **`applies_to` / `exempt`:** by `full_path`;
   - **helper hop:** a `return helper(...)` that builds a response class, as in `:712-719`.
7. **Dependency forms:**
   - Walk `C._endpoint_middleware` → `P._dep_target` (`:528-541`), depth ≤ `P._DEP_MAX`, with a cycle set.
   - K1 order comes from a new `_dep_params` that reads `args` in order through `C._annotated_depends` (`_a3_code.py:2105-2119`). `_endpoint_middleware` sorts gate-first, which is not FastAPI's order.
   - Own exits from `P._analyse`; inherited exits from `P._deps(repo, m, depnode, None, 0, set(), acc)` (arity V `:544`; `acc` keys `validated · framework · rows · escapes · unknown_causes · swallowed`).
   - Effects: commit-family calls in the dependency and its level-1 callees.
   - `yield` → `teardown: true`.
8. **Findings:** `indistinct-exits` (kinds · middleware K3 · count) and `dependency-commits` (kinds · dependency K3 · count).

**Goldens (gustify):**
- **`POST /setup/complete` returns/branches** (P; lines V against `path-map-status.md:104-106`):
  - handler return `api/setup.py:204`, after `not (key is None)`;
  - branches at site `api/setup.py:196`: REPLAY → `services/setup.py:346`; already → `:362`; fall-through → `:389`;
  - `why` = contributes-rows + commit-differs (commits `:361`, `:388`);
  - `collapsed`: `get_idempotency_key @:191` and `_me_response_from_result @:204` (one return each).
- **Feed-wide expansion** (P, an upper bound under a proxy rule): 16 handlers expand; ≤107 success exits; `GET /catalog/{domain}` → `_query_domain` has 8 branches.
- **A5:** `when_for_path` = `"settings.rate_limit_enabled or settings.is_production"` on `POST /setup/complete`. `GET /healthz` gets `applies: false`; today it wrongly carries the global 429 (V).
- **`middleware:RateLimitMiddleware`:**
  - order `registered 1, runs 1, of 3`, outer `CORSMiddleware`, inner `IdempotencyMiddleware` (`main.py:119-122`, `:127`, V);
  - pass-through arm `request.url.path in EXEMPT_PATHS` → `exact-paths ["/healthz"]`; arm `not self._enabled` → `flag`;
  - the sensitive exit applies to 23 endpoints, the global exit to 79 with `exempt ["endpoint:GET /healthz"]` (P);
  - `indistinct-exits` fires: one `_throttled` for both (`rate_limit.py:125-131`, R).
- **`apps/api/auth/context.py::get_auth_context`:**
  - subdeps in order `bearer_scheme`, `get_session`, `_resolve_verifier` (`:91-93`, R);
  - exit 401 "invalid token" `:99` `unverified`; inherited security 401 `:23`;
  - effect commit `auth/context.py:79` via `build_auth_context @:97`;
  - `applies_to` 78 endpoints (P; equals the 78 committed `dep` rows);
  - `dependency-commits` fires.
- **`db.py::get_session`:** `teardown: true`, no commit (`db.py:51-54`, V).

**Batteries:**
- `tests/forms-paths/`: P1 (a deciding callee → two branches), P2 (a non-deciding callee and a generator callee → collapsed), P6 (swallowed → `catch-return`), P7 (A5 `when_for_path`, `applies false` on the exempt path, row count unchanged).
- `tests/forms-kinds/`: C14 (middleware order + exemption + `applies_to`; mutation: swap the `add_middleware` lines → outer/inner swap; drop the exempt arm → `applies_to` +1), C15 (`indistinct-exits` FIRE/SILENT), C16 (dependency `applies_to`, subdep order, `dependency-commits`; SILENT on a dependency-free endpoint).

**Review (2026-09-14 — five lenses, 52 raw findings, 41 kept after an adversarial verify, 1 refuted): all fixed.** The two that took output down: a pass-through guard past 160 characters or a `match` case raised in the kinds arm and, through the hard need, erased the paths arm; a dependency first reached at depth 4 kept `subdeps: []` for good. The rest are the readings in §A1 "Kinds forms" and "Paths forms" above. New cases: forms-kinds C17–C23 (polarity agreeing with the paths rows, minted ids, a security scheme under an unreadable version, class and instance dependencies, teardown commits, a long and a `match` guard, alias and double registration, unscanned registrations, a deep chain) · forms-paths S3.P3 (`contributes-rows`) and S3.P8–S3.P11 (returns as sent, two sites, a commit an except skips, a void helper, a constructor, local and template paths, `applies: true`, OPTIONS, needed-only part reasons); every fix mutation-proven. Floors kept, each named: a no-argument `Depends()` still names no target (`_a3_code._depends_target`); nested pass-through guards stay one `expr`; the endpoint pass still caps `when` at 160 characters; a 4xx response built by a helper and returned is not a refusal row (a held one reads its real status).

**Dry run — record:**
- returns and branches; collapsed by reason;
- rows with `applies:false` (gustify expects 1);
- middleware forms and exits; exits not on endpoint forms (tier3 captcha middlewares, P: 0 rows today);
- dependency forms and `applies_to` pairs;
- forms bytes; wall time.

**Effort:** M.

---

### Slice 4 · Schema short form, 422 cases, body-parse exits — A6 · critic gap G2

**Generates:**
- **short.schema:** `schemas{}`; `schemas[]`, `types` and `cases[]` on validation rows.
- **paths.framework:** `framework_exits[]`.

**Modules:**
- `_a3_forms_schema.py` (~430)
- `_a3_forms_short.py`: data only, ~130 (`PYDANTIC_ERRORS` with source cite, `TYPE_ERRORS`, `BODY_EMBED_SRC`, later `SQLA_ERRORS` / `ALEMBIC_OPS` / `SETTINGS_BASES` / `ENV_FILES` / `SECRET_NAME_RX`)

**Algorithm:**
1. **Schemas.** Take `amap.entities[*].schemas[]` (`_a3_code.parse_schemas`, `:532-557`) and re-parse with `P._mod`. `parse_schemas` is never changed. Merge repo bases through `P._resolve` / `P._bases` (`:129-154`). Read `model_config` `extra`.
2. **Fields.** Split each annotation (Optional · list · Literal · repo Enum · nested BaseModel · `Annotated` alias followed through a module assign). Read the `Field` / `constr` / `conint` keywords.
   - Constants resolve through a new int/str scalar-and-tuple reader in this module. `P._literal` reads str tuples only and is not widened.
3. **Validators.**
   - `@field_validator` / `@model_validator` bodies are walked with `P._events`.
   - `raise ValueError | AssertionError | PydanticCustomError` becomes a rule `{pred, msg, at}`.
   - strip/lower/upper/casefold becomes normalisation.
   - A repo helper call is followed one level with call-site keyword substitution: a guard falsified by the call's keywords drops its rule.
   - A call-valued allow-list gives `allowed.state unknown`, reason `runtime: <fn>`.
4. **Rule → error type** from `PYDANTIC_ERRORS`, verified against gustify's pydantic 2.13.4 (`uv.lock:1119-1120`, V; `pydantic_core/core_schema.py:4247-4337`, R). Per-annotation type errors collapse to `types: "collapsed"` (option `s_type_cases`).
5. **Loc per endpoint parameter.**
   - `P._find_handler` → `_validated_params` (`:505-525`) → `_param_ann` / `_class_of` (`:429-444`).
   - `Query`/`Path`/`Header`/`Cookie`/`Body`/`Form` give the location.
   - Embedding follows FastAPI's rule (`fastapi/dependencies/utils.py:892-913`, R).
   - A dependency parameter gets `cases: []`, reason `dependency parameter: rules not read`.
6. **Nesting** recurses with a `seen` set, depth ≤ 6. The rule belongs to the defining schema; `loc` carries the full path.
7. **S9–S11.**
   - S9: a `RequestValidationError` app handler via `P._app_handlers` (`:671-730`).
   - S10: consumers.
   - S11: test constructions inside `pytest.raises(ValidationError)`, matched by `match=`, by an extra key, or by the literal evaluator. Route-level tests stay `unknown` until Slice 9.
8. **Framework exits.** An endpoint whose chain reads a body gets two `x:` rows, both before security:
   - 422 JSON decode (`fastapi/routing.py:427`)
   - 400 body parse (`:447`)

   Both happen before `solve_dependencies` (`:457`) (V). Phase `body-parse`, state `default`.

**Goldens (gustify, `POST /setup/complete` 422 row).** 41 defined cases (P, corrected by source read). The body is one non-embed parameter (`api/setup.py:186`), so locs are `body.<field>`.

| group | cases |
|---|---|
| top level | `body` extra_forbidden `schemas/setup.py:24` (V) · `body.household_name` missing · string_too_short `min_length=1` · string_too_long `max_length=120` (R) · value_error "household_name must not be blank": strip `:43`, pred `not name` `:44`, raise `:45` (V) |
| household_format | extra_forbidden · country value_error · units allow-list `["metric","imperial"]` (`constants.py:17`, V) · currency value_error · default_servings allow-list `[1,2,3,4,5,8,10,20]` (`constants.py:16`, V) |
| user_format | extra_forbidden · language value_error |
| dietary | extra_forbidden · allergens: empty tag, at most 5 (`MAX_ALLERGENS`, `constants.py:27`, V), unknown code (allowed `unknown`, runtime `allergen_codes()`) · preferences: empty tag, at most 20. **No** allow-list case for preferences: the guard `if allowed is not None` is false (R). |
| exploration | extra_forbidden · empty / at-most / runtime-unknown for 6 list fields · `skill_complexity_cap` range 1..5 · `preference_temperature` runtime-unknown (R) |
| privacy · notifications | extra_forbidden ×2 |

- Beside the list: one framework `default` case (body missing); type errors collapsed.
- The full 41-row list is pinned in the goldens file (§A4 step 1) **from the dry run**, then compared by hand against the table above.
- **Trap:** test C1052 ("too_many_allergens") sends 4 allergens (`tests/test_setup_routes.py:83-91`, V). That is under 5, so its 422 is the runtime unknown-code rule. Nothing may join C1052 to the at-most-5 case.
- **`PantryItemCreate` on `POST /pantry/items`** (P): 9 cases — ingredient_code missing / too long 80 · display_name missing / too long 200 · kind literal_error `['ingredient','prepared']` · quantity greater_than `gt=0` · unit_code too long 20 · expiry_date too long 10 + pattern. S6 `default` → finding `extra-ignored`. S11 `missing`.
- **Framework exits:** `POST /setup/complete` carries both body-parse exits; `GET /history/dishes` (no body) carries none.

**Battery `tests/forms-short/`, schema part:**
- SF1: an exact case list on a nested body. SILENT: no extra_forbidden without `forbid`, no allow-list case when the guard is falsified, no normalisation row.
- SF2: `Query(ge=1, le=50)` bounds; SILENT on `missing`.
- SF-B: body-parse exits FIRE on a body endpoint, SILENT on a GET.
- SF9: determinism.
- SF11: a raising schema part → `arms.short.parts.schema` reason; endpoints restored.
- Mutation SF10a: drop `extra="forbid"` → the case goes.

**Dry run — record:**
- schemas; cases on rows; unknown by reason; `runtime-allowlist` count; framework exits.
- gustify expectation: 123 schemas (archmap count).

**Effort:** M.

---

**Review (2026-09-14 — five lenses, 72 raw findings, 51 kept after an adversarial verify, none refuted): all fixed.** Two took the whole arm down: a third same-named claimed class raised `KeyError: 'file'`, and a variants entry wrote a field's internal `(_Mod, ClassDef)` handle the feed cannot serialise. The rest are the readings in §A1 "Schema forms" above. New cases in `tests/forms-short`: SF13 identity · SF14 parameters · SF15 schema reading · SF16 validator rules · SF17 framework exits and dependencies, and SF11 now proves the restore on a part that wrote its cases before it raised; every fix mutation-proven. Deferred, named in `stats.deferred`: S11 (a test's construction of a schema) goes to the tests arm, Slice 9. Floors kept: a class attribute set outside the class body; an `alias_generator` that is not `to_camel` / `to_pascal`; an `assert` inside a `try` that catches `AssertionError`.

### Slice 5 · Switches, then paths — A11 · A8

**Generates:**
- **switches:** `switches[]`, U8.
- **paths.paths:** `paths[]`, U6.

**Modules:**
- `_a3_forms_switch.py` (~280)
- `_a3_forms_paths.py` (+~250 → ~500)
- `_a3_forms.py` +~25 (`PATH_CAP` 48, `CHAIN_KINDS`, `PATH_EXPRS`, OPTIONS `combos`)

**Algorithm — detection comes before placement:**
1. **Scope functions:** the handler, its level-1 callees, every dependency function `_deps` walks, and those dependencies' level-1 callees (resolved with `callee`). Each carries `levels_id`, stage and anchor.
2. **Binding switches** from `_a3_stacks_pydi.parse(repo)`, memoised per build. Its `wiring` argument is never read (`:232`); edge `predicate` / `binding` sit at `:354-359` (V). Group by `(s, port)` for `s` in scope.
   - `factory`: the def whose return annotation names the port.
   - `changes_exit`: whether the escaping classes of each branch's `t` method (`P._analyse`) differ against the scope's catches.
   - When they agree, the translated row's paths get `proven_by`.
   - Levels `binds` are a **cross-check count, never a source**.
3. **Value switches**, on success paths only. A reach BFS to `reach_depth` (4) finds a function with at least 2 value returns, at least one guarded, every return a settings attribute or a constant (at least one a setting), and a guard comparing with a constant or an ALL-CAPS enum member. The discovery depth never produces rows (D17).
4. **Flag switches:** joins only, onto A5 conditions and `kind: flag` preconditions.
5. **Exit set:**
   - every `produced[]` and `framework_exits[]` row with `applies` not false;
   - the success combinations;
   - uncaught: one `anywhere` path per endpoint, plus one placed 500 per `escape-500` whose `at` and `pred` are known.
6. **422 split:** a row mixing `dep.param` names with own params becomes two paths — `dependency-params` before that dependency's body, `own-params` after every dependency (`fastapi/dependencies/utils.py:628-663` then `:685-712`; the raise at `routing.py:723`, V). Each path's `cases` holds that split's case ids from Slice 4.
7. **Chain, built backwards from the exit's stage:**
   - `step` rows for non-refusing middleware in `middleware.order`;
   - `gate hit:false` for every earlier-stage row;
   - the handler spine: anchors sorted by line (depth-0 raises, contributing call sites, exits). An anchor joins exit E when `A.line ≤ E.line` and A's guards prefix E's guards, or A's extra guard terms appear negated in E's `after`, read from the `_walk` stacks (`_a3_paths.py:264-307`);
   - inside an expanded call, each `after` term is classified by matching its return (`branch hit:false`) or its raise (`gate hit:false`);
   - `collapsed` chain entries for collapsed sites on the path;
   - `catch` steps from `_a3_forms_catch.trail`, using the §A1 vocabulary;
   - `switch` steps placed at (stage rank, anchor) on every later path — a switch never forks.
8. **Linear combination:** paths = 1 + Σ(branches − 1) per exit. `combinations_omitted` = product − linear. Past `PATH_CAP` 48, keep every refusal path plus success paths in id order, and set `paths_truncated`.
9. **Names and state:**
   - `names{}` holds every candidate (detail · token by the guard-token rules · exception · stage); no `name` key (D15).
   - A path is `partial` when a step is unknown: dynamic status, an `unverified` row no binding proves, an ambiguous binding, `anywhere`.
   - Order by (`PATH_PHASES` rank, anchor line, callee line, status, id).

**Goldens (gustify, `POST /setup/complete`).**

The switches:
- **Binding switch** (V against committed levels `binds`, 2 of 2 placed):
  - scope `dependency`, fn `auth/context.py::build_auth_context`, site `:77`, anchor `:97`, port `TokenVerifier`;
  - branches `FirebaseTokenVerifier` (pred `settings.auth_provider is ProviderMode.REAL`) and `MockTokenVerifier` (its negation);
  - both raise `InvalidTokenError` → `changes_exit: false`, so the dependency 401 path is `proven_by` it.
- **Value switch** `services/ai_credits.py::allowance_for`: `tier == 'chef'` → `settings.ai_credits_chef` (`:66-67`), else `settings.ai_credits_free` (`:68`) (P, two designs agree). The call chain from `api/setup.py:204` to `:103` is (U). Measured at Slice 5a: depth **4**, not 3 — `setup_complete` → `_me_response_from_result` `:204` → `_subscription_block` → `credits_summary` → `allowance_for` `:103`; inside `reach_depth` 4.
- **Flag switch** refs the two 429 ids; flag `rate_limit_enabled` default false (`config.py:137`, R).

Paths, in order. E = `step IdempotencyMiddleware · step RateLimit… · gate X3 · switch S1 · gate X4 · gate body-parse · gate 422`; the exact middleware step order is recorded at the dry run.

| # | exit | chain after the stage prefix | state |
|---|---|---|---|
| 1 | 429 sensitive | hit (cond: when ∧ scope ∧ `not self._sensitive.allow(key, now)`) | defined |
| 2 | 429 global | pass #1 · hit | defined |
| 3 | 422/400 body-parse ×2 | after the middleware passes | defined |
| 4 | 401 "Not authenticated" | security hit | defined |
| 5 | 401 "invalid token" | switch S1 · hit · catch translate `except InvalidTokenError` `auth/context.py:98` | defined, proven_by S1 |
| 6 | 422 body | cases = Slice 4's 41 | defined |
| 7 | 400 "Idempotency-Key required" | E · hit `key is None` `api/setup.py:193` | defined |
| 8 | 200 replay | E · pass · call `complete_setup @:196` · branch hit `services/setup.py:346` · switch value | defined |
| 9 | 409 "setup in progress" | E · call · branch pass replay · hit `:348` · catch translate `api/setup.py:199` | defined |
| 10 | 200 already | … · branch hit `:362` | defined |
| 11 | 409 "consent required" | … · branch pass already · hit `:374` · **catch pass-through `except Exception` `services/setup.py:403`** · catch translate `api/setup.py:201` | defined |
| 12 | 200 otherwise | … · pass consent · branch hit `:389` | defined |
| 13 | 500 uncaught | anywhere; `unknown_causes ["pass-through raise apps/api/services/setup.py:407"]` | partial |

- Path #11's catch op is **pass-through**. The designer's "rethrow" was wrong (V).
- The drawn map has 10 paths. The generator splits Bad token into 2, Throttled into 2 and Bad body into its body-parse exits plus the schema 422. Display grouping is not chosen here.

Other endpoints:
- **`GET /recipe-creation/gustify/stream`** (V):
  - 57 validation rows feed-wide, exactly 1 mixed: this endpoint.
  - The path `422 dependency-params [get_auth_context_from_query.token]` sits **before** the 401: a missing token answers 422, the plan §6 "needs a person" row, now structural.
  - `stream_gustify_events` collapsed as a generator (`services/ai_recipe_stream.py:129`, R).
- **`GET /healthz`:** no 429 path.

**Battery `tests/forms-paths/`:**
- P3: ids under line drift across paths.
- P4: chain kinds, in order, for a translated 409.
- P5: the linear rule — two deciding callees with 2 branches each → 3 success paths, `combinations_omitted == 1`.
- P8: binding preds equal `_a3_stacks_pydi.parse` (asserted in the check); `proven_by`.
- P9: value switch at depth 3 on success paths only. Mutant: depth 5 → gone, `switch_depth_capped ≥ 1`.
- P10: SILENT — a dataclass factory under a non-abstract annotation gives no binding (the tier3 billing shape); a compare on a non-setting gives no value switch.
- P11: mutations — delete `if x.done: return x` → a branch and a path go; drop the `Protocol` base → the binding goes; add the path to EXEMPT → its 429 path goes.
- P12: honest-empty + determinism; strip the new keys → equals `P.build`.
- P13: the 422 split on a query-dependency fixture.

**Dry run — record:**
- paths / success / refusal / uncaught / partial;
- branches, collapsed, `combinations_omitted`, `paths_truncated`;
- switches by kind; `binds_unplaced`; levels cross-check (gustify 2/2);
- forms bytes; wall time.
- gustify upper bound ≈ 685 paths (P); tier3 needs a fresh build (its committed center has no forms.json, V).

**Effort:** M–L.

---

### Slice 6 · Effects along paths and failure handling — A9 · A7

**Generates:** effects arm: `steps{}`, `paths[i].effects`, `failure{}`, U9, U11; race facts on insert steps (`steps[st].race`).

**Module:** `_a3_forms_effects.py` (~520). `_a3_forms.py` +~40 (`EFFECTS` depth · ops · widenings, `DEPENDENCY_ORDER` with cites, `SUPPRESSORS`).

**Algorithm:**
1. **Model → table** from `amap.entities[*].models[]` plus `C.model_census` (`_a3_code.py:859`), mirroring `function_insight` (`:2203-2212`). Unique columns come from `uqs` parsed with `ast` and from `Index(unique=True)`.
2. **`effect_events(fn)`** uses `C._ORM_WRITE_M` / `_WRITE_CORE` / `_READ_CORE` idioms (`_a3_code.py:1674-1677`) but emits one line-carrying event per occurrence. `flush`, `commit`, `rollback` and `savepoint` stay separate: the archmap lumps commit with flush (`_ORM_COMMIT = {commit, flush}` `:1678`, V).
   - Four named widenings: W1 tuple-unpack by return annotation · W2 select-bound · W3 select-anywhere · W4 `add_all`.
   - `C._orm_access` (`:1703`) is never changed; its output has no lines (`:1762-1764`).
3. **Collapse below the spine.**
   - `cond` is true under if/else bodies, loops, except bodies, and after a sibling exiting `if` (`_a3_paths.py:276-277`).
   - Recursion to depth 4 with memoisation and a cycle guard.
   - Depth 5 counts into `floor`.
   - Protocol-typed calls go to `unresolved`.
4. **Along each Slice 5 path,** walk the path's anchors in order and splice in each anchor's collapsed steps.
   - A non-exiting `if` gives `cond` steps.
   - `with suppress(...)` marks steps `suppressed`.
   - `begin_nested()` adds a `savepoint` step and tags the inner steps.
   - A raise inside a try walks the matching handler body with the state at the raise (via `_a3_forms_catch`), so rollback and discard land on that path.
5. **Rollup per path:**
   - write/delete → pending;
   - an unconditional commit → committed;
   - a conditional commit → maybe_committed;
   - rollback → rolled_back;
   - flush → no change;
   - still pending at the end → uncommitted (`get_session` never commits: `db.py:51-54`, V).
   - The uncaught path gets `may_follow_commits` = every commit step on any path.
6. **Dependency attachment** from `F.DEPENDENCY_ORDER`, gated on FastAPI ≥ 0.136.3:
   - `not-run` for middleware exits, body-parse exits, security 401 and a dependency whose own params fail (`routing.py:427-457`; `dependencies/utils.py:628-663`, V);
   - `ran` for endpoint-param 422 (`utils.py:685-712`, raise `routing.py:723`, V), handler refusals, success and uncaught;
   - `unknown` for a refusal raised inside the dependency whose raise site is `unverified`;
   - below the minimum version, every field is `unknown`.
7. **U11 catches:** per `try` on a path or dependency — types, the guarded region's writes and commits, `actions[]`, outcome, answers, and the path ids through it.
8. **Race facts.** For an `add(<bound instance>)` on a table with a unique constraint, key on the first flush or commit after it on the path (possibly in another function):
   - an enclosing `except IntegrityError` that returns or translates → `handled`;
   - a broad catch that re-raises does not count;
   - otherwise → `uncaught`.
   - The finding is emitted in Slice 7.
9. **Findings** (effects arm): `refusal-writes` (U9, count), `safe-method-commits` (U9, count).

**Goldens (gustify):**
- **The auth commit** `auth/context.py:79` (V) attaches to 400, 409, endpoint-param 422, success and 500. It does not attach to 429, security 401 or body-parse exits. It is `unknown` on the dependency 401. This answers `shallow-logic-maps.html:250` and corrects the drawing's "writes none" on refusal paths.
- **Claim** `services/idempotency.py`: `begin_nested :138`, add `:139`, flush `:140`, `except IntegrityError :141`, `raise :144`, return `_outcome_for :145` → race `handled` (V).
- **First setup:** commits `auth/context.py:79` and `services/setup.py:388` (V); writes `households` via W1 at `services/setup.py:377` (R).
- **Consent path:**
  - `rolled_back` at `:404`;
  - `_discard_claim` at `:406` suppressed by `:405`: delete `idempotency_keys :333` conditional, commit `:334` conditional (R). This disagrees with the drawn "commits 0".
- **Replay:** reads only after auth (R). The designer's table count (11) is **(U)**; record it.
- **`ai_spend_log`** read at `services/ai_credits.py:83` via W3 (V).
- **`POST /pantry/reset/apply`:** insert flushed at `services/pantry_reset.py:72`; the only catch is `except ResetConflictError` (`api/pantry.py:531`); commit `:533` → race `uncaught` (V; unique `models/pantry.py:115`).
- **`POST /cooking/sessions`:** add+flush `services/cooking.py:165-166`, unique `models/cooking.py:39-40`, catches at `api/cooking.py:155-166` are non-Integrity → race `uncaught` (V). At build, confirm `start_session` has no IntegrityError catch (U).
- **`GET /recipe-creation/gustify/stream`:** commit `ai_recipe_stream.py:302` inside `except IntegrityError :303` → `handled` (R).

**Battery `tests/forms-effects/` (~380 lines):**

| # | kind | proves |
|---|---|---|
| E1 | FIRE | ordered steps and rollup on the fixture's place path |
| E2 | FIRE + SILENT | dependency `ran` / `not-run` mapping; `refusal-writes` present on place, absent on pure |
| E3 | FIRE | consent-shape rollback, suppressed discard, pass-through outcome |
| E4 | FIRE | each widening tagged |
| E5 | parity | with widenings off, `{(model, rw)}` and commit-flag parity equal `C._orm_access`; archmap identical |
| E11 | floors | depth-5 floor, unresolved port call, cap |
| E12 | honest-empty + determinism | step ids stable under line drift |
| E13 | mutation | (a) delete the handler commit → committed empties; (b) wrap the flush in `except IntegrityError` → race `handled`; (c) delete the rollback → `rolled_back` empties |

**Dry run — record:**
- steps; commit sites; floor; unresolved calls; findings;
- forms bytes; the effects arm's serialised bytes on tier3 (the D20 trigger); wall time.

**Effort:** M–L.

**Effects (as built, Slice 6).** `_a3_forms_effects.py` plus `EFFECTS` · `SUPPRESSORS` · `DEPENDENCY_ORDER` · `OPTIONS.effects_widenings` in `_a3_forms.py`; battery `tests/forms-effects` (E1 · E1b · E2 · E3 · E4 · E5 · E11 · E12 · E13).
- **`cond` is read against the path, not the function.** The first draft marked every step under an `if`, a loop, an `except` or after an exiting `if` as `cond`, which put 63 of first setup's writes in `maybe_committed` and spliced the replay arm's commit `:361` into the consent and first-setup paths. As built, the effects walk keeps a frame stack — `branch` (the `if`/`match` line and arm) · `loop` · `except` (the handler line) · `after` (a sibling `if` that leaves) — each with how that block leaves the function (`raise` · `return` · none). A function the path leaves at a raise, a return or a call is read against that point: an event in the arm beside the one the path took, or in a block that leaves the function before the point, never ran and is left out; an event under a loop, a non-exiting branch or a swallowing `except` is `cond`. A function the path only passes through is read to its normal completion: a raising block did not run, a returning one might have.
- **Which function is read to which point.** The handler to the exit's raise or return, or to the call that reached it; that callee to its raise; a deciding callee to the arm the path took (`branches[]` hit on the chain). The handler bodies the exception passed are the chain's `catch` entries (app handlers aside), each read to its own end — not a recomputed trail.
- **Buckets are disjoint.** Each write occurrence keeps its last state: an unconditional commit commits pending and maybe-committed writes; a conditional or `suppressed` commit makes pending writes `maybe_committed`; an unconditional rollback rolls back pending writes (a maybe-committed one stays); a conditional rollback leaves them pending-maybe, and a later commit can only make those `maybe_committed`. A step met twice on one path keeps its strongest reading (committed · maybe_committed · rolled_back · uncommitted): gastify's `POST /statements/{statement_id}/reconcile` retries `reconcile` inside a swallowing `except`, so its add `statement_reconciliation.py:113` is committed by `:165` and then met again behind a conditional commit — it stays `committed`.
- **Findings count the endpoint's own writes.** On gustify every refusal of an authenticated endpoint commits the first-login user through `get_auth_context` (the golden's attachment). Counted as `refusal-writes` that was 65 findings for one dependency, which the kinds arm already names as `dependency-commits`. As built, `refusal-writes` fires only when a refusal leaves a write the endpoint's own code made committed or maybe-committed, and `safe-method-commits` only on the endpoint's own commits; the rest are counted in `stats.refusal_writes_inherited` / `safe_method_commits_inherited`.
- **Receivers.** A transaction verb, or a write whose object binds no model, counts only on a receiver named like a session (`EFFECTS.session_names`) or a parameter annotated `…Session` — `seen.add(x)` and `cache.delete(k)` are not database writes. `unresolved` is a method on a parameter annotated with a class the project defines that no definition answers, or a resolved method of a `Protocol`/`ABC` class (gustify 301 → 7 once library classes stopped counting).
- **W2** also binds `x = await session.get(Model, …)` — `_a3_code._orm_access` binds only a plain call, so an awaited get is a widening, and E5's parity with widenings off stays exact.
- **Dependencies.** A verified raise inside a dependency reads `ran`: the dependencies before it ran, it ran to its raise. Steps after a dependency's first `yield` are `when: teardown` and sit after the handler's.
- **Step ids** carry the function, op, table, the op's rank on that table within the function, `cond` and `suppressed` — no line (E12). One event can mint a `cond` and an unconditional step on different paths; `stats.races` counts add sites.
- **Goldens on gustify:** the auth commit `auth/context.py:79` attaches exactly as specified (unknown on the dependency 401); first setup commits `:79` and `services/setup.py:388`, writing 13 tables (the designer's 11 was U), households via W1 at `:377`; consent rolls back at `:404` and its suppressed `_discard_claim` leaves delete `:333` `maybe_committed` behind a conditional commit `:334`; `ai_spend_log` read at `ai_credits.py:83` via W3; claim race handled at `idempotency.py:140`, stream handled at `ai_recipe_stream.py:302`, pantry reset and cooking uncaught. **Replay** differs from the spec's reading (R): the claim is read to its completion, not to the value `complete_setup` branches on, so the replay path carries the claim's attempted writes — all `uncommitted`, none persisted.
- **Floors kept:** a callee is read to its completion, never to the value its caller branches on; a rollback rolls back every pending write (a savepoint's own rollback is not told apart); a dependency whose parameters fail is `not-run` as the spec says, although FastAPI still calls the dependencies that did not fail.

---

### Slice 7 · Contract — A12 (U12 · K2 · K3 · K4)

**Generates:** contract arm: `repeat{}`, `auth{}`, `rate{}`, `responses{}`; the finding `race-500` (U12, **nag**).

**Module:** `_a3_forms_contract.py` (~340). It reads `steps{}` and race facts from the in-memory feed and imports no arm. `_a3_forms.py` +~20 (`KEY_NAME_RX`, `GUARD_IDIOMS`, `RATE_IDIOMS`, `BODIES` with cites).

**Algorithm:**
1. **U12 key.** A handler local from a helper that reads `request.headers.get(X)` or `request.state.<attr>`. The `state` hop follows into the repo middleware `dispatch` that sets it (the `_middleware_exits` walk). The name must match `KEY_NAME_RX`. `required` = the existing `key is None` precondition.
2. **Claims.** Follow the key argument by position or keyword (depth ≤ 2) to `Model(col=<key>)` with `col` in a unique constraint.
   - `race` comes from Slice 6.
   - `race: uncaught` fires `race-500`.
   - `arms` = the consecutive exiting ifs on the claim result.
   - `idioms` covers `on_conflict_do_*`, `with_for_update` and get-or-create.
3. **K2:**
   - schemes from security rows (with carrier);
   - gates from archmap `middleware[]` with `gate: true`;
   - requires from preconditions whose `via` names a method of the gate's return class;
   - provisions from dependency commit steps that write.
4. **K3.** Take the 429 row's `pred` attr → the `__init__` assignment `Limiter(s.a, s.b)` → name the arguments from the limiter's `__init__` parameters → values from the settings leaf (`state: default`, since the environment can override).
   - `switch` and `exempt` come from the Slice 3 conditions.
   - Third-party limiters come from `RATE_IDIOMS`.
5. **K4 per exit:**
   - success → `response_model` fields, one level (`P._declared` `:760-783`);
   - HTTPException → `{detail}` plus headers (`fastapi/exception_handlers.py:11-17`);
   - 422 → `{detail: list}`;
   - security 401 → `WWW-Authenticate: Bearer` (`fastapi/security/http.py:84-92`);
   - a response literal → its keys;
   - 500 → `text/plain`;
   - stream → `n/a`.

**Goldens (gustify):**
- **`POST /setup/complete` U12:** key `Idempotency-Key` (`middleware/idempotency.py:14`, R) via `api/setup.py:191`; required 400 `:193` (V); claim `IdempotencyKey`, unique `uq_idempotency_key_op_owner` (`models/idempotency.py:23`, R); race `handled` → `race-500` **SILENT**.
- **`POST /pantry/reset/apply`:** `race-500` **FIRE** (V). `POST /cooking/sessions`: FIRE (V, pending the `start_session` check). The stream endpoint is SILENT (R). gustify total = 2.
- **K3 on `POST /setup/complete`:**
  - `_sensitive` 20 per 60.0 (`config.py:139`, `:140`), key `f"{ip}:sensitive"`;
  - `_global` 120 per 60.0 (`:138`);
  - switch → `rate_limit_enabled or is_production`; exempt `["/healthz"]` (R + Slice 1 resolver).
- **K2:** HTTPBearer header (`auth/context.py:23`) · gate `get_auth_context` · provisions `users`, conditional, committed at `:79`.
- **K4:** 200 `MeResponse` fields (`schemas/responses.py:157-163`, R) · 401 security with `WWW-Authenticate` · 429 `{detail}` + `Retry-After` (`rate_limit.py:127-131`, R) · 500 text/plain.
- **`GET /history/dishes`:** U12 `n/a`; K3 global only (the path is not in `SENSITIVE_PREFIXES`, `rate_limit.py:27-37`).

**Battery `tests/forms-contract/` (~250 lines):**
- E6: `race-500` FIRE on place; SILENT on the handled claim and on the commit-in-another-function shape (the prototype's misfire shape).
- E7: U12 states `n/a` / `missing`.
- E8: K3 values.
- E9: K4 shapes.
- Mutations: (b) wrap the flush → `race-500` goes; (d) `hot_per_minute` 5 → 7 → K3 value 7; (e) `auto_error=False` → the scheme and its `not-run` mapping go.

**Dry run — record:**
- U12 / K2 / K3 / K4 state counts; `race-500`; idioms.
- tier3 (R): 0 Idempotency-Key header reads (grep), so U12 key is null everywhere; K3 expected `missing` / `unknown`.

**Effort:** M.

**Contract (as built, Slice 7).** `_a3_forms_contract.py` plus `CONTRACT` and the finding `race-500` in `_a3_forms.py`; battery `tests/forms-contract` (E6–E12).
- **U12 `repeat{}`.** `state` is `defined` when the handler holds a key, `missing` on a mutating endpoint that holds none, `n/a` otherwise. A key is a handler local assigned from a read — `request.headers.get(X)` / `request.headers[X]` directly or inside a helper the handler calls — or from `request.state.<attr>` / `getattr(request.state, "attr", …)`, followed to the app middleware that writes that attribute and the header its value came from (`key: {name, carrier, through, set_at, read_at}`). The header or attribute must match `CONTRACT.key_name`. `required` is the precondition `<local> is None` / `not <local>` with its exit.
- **Claims.** The key argument is followed by position or keyword into callees (`follow_depth` 2) to a `Model(col=<key>)` constructor whose column sits in a unique key (the archmap `uqs` read with `ast`, `Index(name, …, unique=True)`, `unique=True` columns — the constraint's name kept). `race` is the Slice 6 race fact on an add of that model in the same function, else `unknown`; `arms` are the consecutive exiting `if`s on the result of the call whose callee constructs; `idioms` are `begin_nested` · `on_conflict_do_*` · `with_for_update` · `get-or-create` (a select of the model before its constructor). An uncaught race is `race-500` in `arm_findings.contract`.
- **K2 `auth{}`.** Schemes are the security rows with their carrier (`CONTRACT.carriers`); gates are the archmap endpoint `middleware[]` entries with `gate: true` — that flag is `_a3_code._is_mw_gate`'s name rule, so a gate named outside it is not a gate — with the gate's function resolved from the handler module when the archmap entry has no `fn`; `requires` are the produced rows reached through `call <Cls>.<method>` on the gate's return class; `provisions` are the writes the dependencies' commits keep on the first `ran` success path (Slice 6's effects step entries now carry `dependency: true` for this).
- **K3 `rate{}`.** Each 429 middleware row whose `pred` is `not self.<limiter>.<m>(…)`: the limiter's `__init__` assignment, its class's `__init__` parameters named, each argument resolved — a settings field to its default, env name and declaring line (`state: default`), a literal as `defined`, anything else `unknown`; `key` is the first argument's once-assigned local in `dispatch`. `switch` and `exempt` come from the Slice 3 conditions. A route decorator `@<x>.limit("n/unit")` (`CONTRACT.rate_idioms`) is a limit too. `state`: `defined` · `unknown` (every limit unresolved) · `missing`.
- **K4 `responses{}`** keyed by exit id — every produced row, framework exit and handler return: a literal `…Response(content={…}, headers={…})` at the row gives its media type, body keys and header keys; otherwise the registry shape with its cite (`HTTPException` `{detail}` · 422 `{detail: list}` · security 401 plus `WWW-Authenticate: Bearer` for `HTTPBearer` · 500 `text/plain`); a success reads its literal response, else the `response_model`'s fields one level down (own class and project bases), a streaming endpoint `n/a`.
- **Goldens on gustify — all reproduced:** `POST /setup/complete` key `Idempotency-Key` through `request.state.idempotency_key` (set at `middleware/idempotency.py:25`), read at `api/setup.py:191`, required 400 `:193`; claim `IdempotencyKey` (constructor `services/idempotency.py:131`, constraint `uq_idempotency_key_op_owner`), race `handled` at `:140`, arms REPLAY return `services/setup.py:345` · IN_PROGRESS raise `:347`, idiom `begin_nested` → `race-500` silent. `race-500` fires on `POST /pantry/reset/apply` (`pantry_reset.py:62`, flush `:72`) and `POST /cooking/sessions` (`cooking.py:157`, flush `:166`) — gustify total 2, both `get-or-create`; the stream endpoint is silent. K3: `_sensitive` 20 per 60.0 (`config.py:139` · `:140`), key `f'{ip}:sensitive'`; `_global` 120 per 60.0 (`:138`); switch `settings.rate_limit_enabled or settings.is_production`; exempt `["/healthz"]`; `GET /history/dishes` global only. K2: `HTTPBearer` header `Authorization` (`auth/context.py:23`), gate `get_auth_context`, provisions `users` conditional, committed at `:79`; `requires` names `AuthContext.require_household` on 50 endpoints. K4: 200 `MeResponse` fields · 401 `WWW-Authenticate: Bearer` · 429 `{detail}` + `Retry-After` · 500 `text/plain`.
- **Floors kept:** `missing` counts every mutating endpoint that reads no key (gustify 45 — a state, not a finding); `WWW-Authenticate` is read for `HTTPBearer` only; a claim's race is read from any add of its model in the constructing function.

---

### Slice 8 · Function, task and handler forms — B-fn · B-task · B-evt (service K2 folded in)

**Generates:** kinds parts `functions`, `tasks`, `handlers`. There is no `services{}` map: service K2 lives as `functions[].raises[].translated_by` / `untranslated_at`.

**Modules:** `_a3_forms_fn.py` (~260), `_a3_forms_task.py` (~250). `_a3_forms.py` +~25 (`TASK_KW`, `RETRY_CALLS`, `LOCK_CALLS`, OPTIONS `function_scope`, `k2_climb`).

**Algorithm:**
1. **Roots:**
   - endpoint handlers;
   - task roots from `amap.task_roots` (`build_center_a3.py:2106`), keyed `endpoint:TASK <name>`;
   - event handlers from `amap.dispatch.dispatches[].t`, converted from `file#qual`;
   - task dispatch edges from `C.task_map(repo)` (cached `_TASKS`, `_a3_code.py:2722-2724`). Never from levels.
2. **Reach:** `_a3_forms_reach.bfs` seeded with handlers, dependency defs at their `applies_to` depth, dispatch and task edges (`rel: dispatches`), and task/handler roots. Each entry is `{root, depth, rel, caller, site, root_site}`; `reached_by[].paths` = the paths whose chain has `{kind: call, at: root_site}` — since D-060 for EVERY root site that reaches the function (`_a3_forms_reach.routes`, one route per line of the root, each re-proved hop by hop by `_a3_forms_fn._proved`): `paths` is the union, and an entry with two or more routes lists them as `routes: [{root_site, depth, via, site, paths}]` in request order; the entry's own fields stay the walk's route.
3. **Function forms** for reached functions that carry a fact:
   - `commits` are refs to Slice 6 `st:` ids (a hard need);
   - `raises` come from `P._analyse` escapes, with `through` from the catch trail;
   - `translated_by` is joined from produced rows with `raised_at == at` and `source: verified`;
   - `untranslated_at` comes from `escape-500` / uncaught `causes`;
   - `refusals` carry `surfaces_on`;
   - with `k2_climb: one-level` (default) a deeper function gets `translation: "beyond one level"`.
4. **Task forms:**
   - decorator keywords filtered to `TASK_KW` (literal or `{expr, state: unknown}`);
   - retry sites (`retry` calls with `P._where`);
   - the last-failure `If` comparing `retries` with `max_retries`, with its guard read from the `If` itself, because `P._exits` ignores `break` (`_a3_paths.py:254-255`);
   - trigger from dispatch sites plus beat dicts joined through `C._name_arg` (`_a3_code.py:2670-2678`);
   - concurrency from keywords and locks.
5. **Handler forms:**
   - resolve the publisher's `bus.publish`;
   - the registration order;
   - classify the publish loop's catch;
   - `begin_nested` → `isolation: savepoint`;
   - `retries: 0`, `sequential` unless gather/create_task;
   - the publisher's commits before and after the publish site.
6. **Findings** (kinds): `swallows-broad` (count), `untranslated-raise` (count → endpoint `escape-500`), `retry-unbounded` (**nag**), `handler-dropped` (count).

**Goldens:**
- **`apps/api/services/setup.py::complete_setup`** (P, joined from committed forms):
  - `SetupInProgressError` `:348` → translated `POST /setup/complete` 409 (`api/setup.py:200`) and `POST /_e2e/seed` 409 (`api/e2e_seed.py:88`);
  - `ConsentRequiredError` `:374` → through `:403` pass-through → translated `api/setup.py:202`; `untranslated_at` `POST /_e2e/seed` 500, matching that endpoint's committed `escape-500` (V);
  - `reached_by` d1 at `api/setup.py:196` and `api/e2e_seed.py:84`.
- **`services/ai_spend.py::record_spend`:** savepoint `:97`; catch `:102` swallow → `swallows-broad`; `reached_by` d3 / d4 (P). `root_site` is (U) until built.
- **`services/skills.py::on_cooked_meal_created`:** savepoint `events/bus.py:77`; swallow `:79`; counter `:81`; `register_once :106-107` (V); publisher `api/cooking.py:417` with commits before `:410` and after `:425` (P).
- **tier3 `endpoint:TASK document_by_cc_pair_cleanup_task`:** decorator `shared/tasks.py:104-110`; retry `:345`; last failure `:312` → `break` (R).

**Battery `tests/forms-kinds/`, continued:**
- C17: translators and `untranslated_at`; SILENT depth floor.
- C18: `swallows-broad` FIRE/SILENT.
- C19: task decorator, retry, beat join, unresolved dispatch, `retry-unbounded`.
- C20: handler trigger, isolation, retries.
- C21: mutations — delete `except Busy` → the translator moves to `untranslated_at`; remove `max_retries` → `retry-unbounded`; delete `register_once` → the handler form goes.
- C22: honest-empty / determinism / non-interference.

**Dry run — record:**
- forms per part; `reached_by` pairs; truncated; beat joined / unjoined; unresolved dispatch.
- tier3 prototype numbers to re-measure: reach 1,641 functions / 6,040 pairs at depth 4; 46 task roots; beat 25/31 joined (P). Timings (U).
- The `functions` bytes feed D20.
- Named floor: `@app.middleware("http")` functions counted in `arms.kinds.stats`.

**Effort:** M–L.

**Functions, tasks, handlers (as built, Slice 8).** `_a3_forms_fn.py` (functions) and `_a3_forms_task.py` (tasks · handlers), run by the kinds runner (`_a3_forms_mw.run`, `PARTS` now five); `TASK_KW` · `TASK_CONCURRENCY_KW` · `RETRY_CALLS` · `LOCK_CALLS` · `BUS_PUBLISH` · `BUS_REGISTER` · `CONCURRENT_CALLS`, `OPTIONS.function_scope` · `k2_climb` and the four findings in `_a3_forms.py`; battery `tests/forms-kinds` C24–C29 (the spec's C17–C22 ids were already Slice 3's), on a fixture copy of its own so the Slice 3 cases keep their exact counts.
- **Roots** are the endpoint handlers, the kinds `dependencies` forms' functions, `amap.task_roots` and the `amap.dispatch` handlers; a root's own form carries `reached_by: {root, depth: 0}`. The two modules import no arm, so the kinds runner imports them without a cycle.
- **Raises** read `_a3_paths._analyse` escapes, `through` their pass-through handlers (`_a3_forms_catch.trail`), and `translation` is one of `translated` · `untranslated` · `mixed` · `beyond one level` (every endpoint root deeper than one call) · `not joined` · `not reached by an endpoint`. A broad catch that calls a retry method is not a swallow — Celery's `retry` raises.
- **Tasks** come from `_a3_code.task_map` (its records, dispatch edges and unresolved names); a keyword is a literal, a module constant through `_a3_forms_settings.resolve_const`, a `Class.ATTR` string constant, or `{expr, state: unknown}`. `retry-unbounded` needs a retry site, no resolved `max_retries` and no last-failure branch.
- **Handlers** come from the archmap `dispatch` edges. The publish call's bus method is resolved through the reach callee or, failing that, through a module-level instance (`bus = EventBus()`); the registration is a `register*` call whose handler name resolves through a function-local or module import; an edge no registration wires gets no form. `kinds.handlers` hard-needs `effects` (the publisher's commits are Slice 6 steps).
- **The orchestrator** now sums an arm's `stats.findings` across its stages — kinds runs in two, and the second stage's findings replaced the first's counts.
- **Goldens on gustify — all reproduced:** `services/setup.py::complete_setup` — `SetupInProgressError :348` translated 409 by `POST /setup/complete` (`api/setup.py:200`) and `POST /_e2e/seed` (`api/e2e_seed.py:88`); `ConsentRequiredError :374` through the `:403` pass-through, translated at `api/setup.py:202`, `untranslated_at` `POST /_e2e/seed` 500 (`mixed`); `reached_by` depth 1 at `api/setup.py:196` and `api/e2e_seed.py:84`. `services/ai_spend.py::record_spend` — savepoint `:97`, swallow `:102`, depth 3 and 4 (root sites `api/recipe_creation.py:248` · `:286` · `api/recipe_stream.py:141`). The two `CookedMealCreated` handlers — savepoint `events/bus.py:77`, swallow `:79`, counter `:81`, `register_once` `:106` (skills, order 0) · `:107` (progression), publisher `api/cooking.py:417` with commits before `:410` and after `:425`; both `dropped`.
- **tier3 — reproduced:** `endpoint:TASK document_by_cc_pair_cleanup_task` decorator `shared/tasks.py:104` (`max_retries` 3, `bind`, `soft_time_limit` 105, `time_limit` unknown), retry `:345` in the loop, last failure `:312` → `break`, triggered from the delete and prune generators. Re-measured: 46 tasks, beat 25 of 33 entries joined (the prototype read 31), reach 2,625 functions and 7,406 pairs at depth 4 (the prototype read 1,641 / 6,040 before dependencies and task roots were roots).
- **Not built:** the `@app.middleware("http")` count the spec names as a floor.

---

### Slice 9 · Tests per exit and per path — A10

**Generates:** tests arm: `test_cases{}`, `produced[j].tests`, `tests{}` on endpoints (`act`, `arranged_by`, `helper_arranged`, `unjoined`), `paths[i].tests`, U14; findings `test-detail-unmatched`, `asserted-unproduced`, `untested-exit` in `arm_findings.tests`.

**Modules:**
- `_a3_test_asserts.py` (~280): pure extraction plus the role classifier, with no forms knowledge, so Slice 10's S11 and F8 reuse it.
- `_a3_forms_tests.py` (~240).

**Algorithm:**
1. **Corpus:** `D.load_junit` (`_results_ingest.py:49-89`) per Python corpus; root via `_a3_tests._probe_root` (`:82-99`). No Python junit → `present: false` + reason.
2. **Per test def,** a statement walk:
   - HTTP calls (`_VERBS :74`, `_fstr_segs :134-144`, the `full_path` template first, else `_ep_match :113-131` → `route_match: suffix`);
   - the header set sent;
   - helper/fixture calls (one hop, role `arrange`);
   - service calls under `pytest.raises`;
   - aliases;
   - asserts: `status`, `status_in`, detail, code keys, `is_success`, attrs.
3. **Roles,** first match wins:
   - R1: inside a helper → arrange;
   - R2: never asserted → arrange;
   - R3: status-only 2xx followed by an asserted call → arrange-checked;
   - R4: otherwise → act.
4. **Join** act calls to candidate exits by `x:` / `r:` id:
   1. by status;
   2. narrowed by detail/code;
   3. narrowed by header shape (security row vs dependency row), skipped when `sends` is null or `dependency_overrides` exists;
   4. service raises via `pytest.raises(X)` → rows whose `raised_at` file equals the target's;
   5. service returns via attr literal vs a return keyword literal.

   One candidate left → its conf; several → `ambiguous of n`; zero → `asserted-unproduced`.
   - A bare 422 assertion joins the row's `x:`, never a case.
5. **`paths[i].tests`** = the refs on `paths[i].exit.id`.

**Goldens (gustify; test lines V):**
- **Over-credit today:** `test_insight.by_endpoint[setup_complete].api` holds 26 cases (V). The act vs arrange split (designer: 12 / 14) is (U); record it.
- **C1048** (`tests/test_setup_routes.py:23`, asserts `:28-29`) → 400 `status+detail`.
- **C1054** (`:107`, `in (401, 403)` `:108`, no `headers=`) → `GET /me` security 401 `status+shape`, `alternatives [403]`.
- **C1057:** calls `:158/:161` → ambiguous of 2 (the 409s) · `:162/:165` → arrange-checked (consent) · `:166/:169` → success.
- **C1051 / C1052** → the 422 row only. C1052 never joins at-most-5 (4 < `MAX_ALLERGENS` 5, V).
- **C605 / C705** (P) are arrange-checked setup calls, so the lab's name-parsed `404` column is wrong for setup.
- **Replay vs Already** cannot be told apart statically (both return `_load_setup_result(…, replayed=True)`) → ambiguous refs only.
- **tier3:** no `tests/results` → `present: false`. gastify has `api-junit.xml`.

**Battery `tests/forms-tests/` (~300 lines):** T1–T11 as designed.
- T5 SILENT: arrange helpers credit nothing.
- T9 honest-empty.
- T10: `_a3_tests.test_insight` output unchanged before and after.
- T11 mutations:
  - (a) delete the status assert → the exit becomes untested;
  - (b) `raises(Busy)` → `raises(ValueError)` → the ref goes;
  - (c) add `headers=AUTH` → the ref moves from the security row to the dependency row;
  - (d) delete the later act → setup becomes act.

**Dry run — record:** cases; calls by role; unmatched; headers unknown; joins by conf; exits tested / total; endpoints tested. gustify prototype frame: 622 calls, 109/577 exits joined (P).

**Effort:** M.

**Tests (as built, Slice 9).** `_a3_test_asserts.py` (the pure extractor) and `_a3_forms_tests.py` (the arm), the findings `test-detail-unmatched` · `asserted-unproduced` · `untested-exit` (U14, count) in `_a3_forms.py`; battery `tests/forms-tests` T1–T11 (T4 arrange-checked + the success path, T5 helper and unasserted calls arrange, T8 `pytest.raises` joined through the service file).
- **Corpus.** The arm reads `<paths.results>/<corpus>-junit.xml` for every `runner: pytest` corpus itself, from the build's config — `_results_ingest.load_junit` reads a results directory fixed when `_center_data` is imported. The test file root comes from `_a3_tests._probe_root`. No junit returns `present: false` with its reason; the orchestrator gained that path (a runner returning `present: false` writes nothing and says why).
- **Extraction** per test function: every `client.<verb>(path, …)` with its method, literal or f-string path, the header keys sent (module and local dict aliases, `**` spreads resolved; `sends: null` when a header dict cannot be read) and whether a JSON body is sent; the response's bound name and `x = resp.json()` aliases; one helper hop; `pytest.raises(X)` with the service call inside and its root name; assertions — `status` (`==` or `in`), `detail` (`detail` · `message` · `error` keys) and `code` literals, `is_success`, and any other read as `attrs`. Roles R1–R4 as designed.
- **Join.** A call matches its endpoint by the mounted `full_path` first (`route_match: full`), else by a path suffix. An `act` call's candidates are the endpoint's produced rows, framework exits and handler returns; narrowed by status (or 2xx for `is_success`), then by each detail or code literal (a literal no candidate says keeps the candidates and raises `test-detail-unmatched`), then by the headers sent when a security and a dependency 401 are both left (skipped when `sends` is null or the module sets `dependency_overrides`), then a bare 422 on a JSON body to the validation row. `conf` is `status` / `success` plus `+detail` · `+code` · `+shape`, or `ambiguous of n`; a single ref names the asserted statuses no exit produces as `alternatives`. `pytest.raises(X)` credits the rows whose `via` names `X` and whose `raised_at` file is the called service's module, resolved through the test module's imports (`conf: service raises`).
- **Not built:** the service-return join (an attribute literal against a return keyword literal).
- **Goldens on gustify — all reproduced:** C1048 → 400 `status+detail`; C1054 → `GET /me` security 401 `status+shape`, `alternatives [403]`; C1057 → 409 `ambiguous of 2` · the consent call `arrange-checked` · 200 `status` on the success return; C1051 and C1052 → the 422 validation row only. `POST /setup/complete` is arranged by 14 cases (the designer's 14) with 15 act calls; C605 and C705 are among its arrange-checked cases.

---

### Slice 10 · Model, migration, setting and mirror short forms, plus `external` — B-model · B-setting · X1

Sub-slices each get their own "land it": **10a** model + migration · **10b** setting + `external` · **10c** mirror.

**Generates:** short parts `model`, `migration`, `setting`, `mirror` → `models{}`, `settings{}`, `mirrors{}`.

**Modules:**
- `_a3_forms_model.py` (~380, imports `_a3_forms_migrate`)
- `_a3_forms_migrate.py` (~300)
- `_a3_forms_setting.py` (~360, uses the settings leaf)
- `_a3_forms_mirror.py` (~280)

**Algorithm:**
1. **Model (M1–M7, M9):**
   - `__table_args__` (Index / UniqueConstraint / CheckConstraint);
   - columns with FK `ondelete`;
   - effective nullability: explicit keyword > primary key > `Mapped[Optional]` under SQLAlchemy ≥ 2.0 (`uv.lock:1437-1438` 2.0.50, V; below or unreadable → `unknown`);
   - default classes;
   - `fk_in`;
   - `guard_use` (a select on exactly a unique column set followed by an exiting `If`);
   - hooks;
   - writers from `function_insight.access.ops` plus `writers_outside_map` (a constructor scan, center machinery skipped).
2. **M10** refers to Slice 6 race facts and Slice 7's `race-500` by id. There is no second detector.
3. **Migration (M8):**
   - find `alembic.ini` files, skipping center dirs via the reach leaf;
   - order revisions breadth-first from `None`, tie-broken by filename; more than one head → `unknown`;
   - replay `upgrade()` ops from `ALEMBIC_OPS`, including batch bodies (`op.execute` counted as `raw_ops`);
   - diff against the model with **normalised** types (`Uuid ≡ Uuid()`, `String(20) ≡ String(length=20)`).
4. **Setting (F1–F8):**
   - Declarations: Settings fields + `Final` constants (option `setting_constants`).
   - Env name from `env_prefix` / alias.
   - Type and allowed values.
   - Validators and startup rules via the `_walk` stacks.
   - Readers only with a **verified** receiver; the rest go to `readers_unverified`.
   - `effective[]` pairs by the `_a3_graph._fold_flag_aliases` evidence rule (`:345-363`), recomputed here.
   - `copies[]`, never readers.
   - F6 fallback exits joined from endpoint forms.
   - F8 test values via `_a3_test_asserts`.
5. **F4 per environment.**
   - Scan a **fixed filename allow-list only**, never `git ls-files` (D24): `.env.example|sample|template|development|test`, `docker-compose*.yml`, `railway.json`, `.github/workflows/*.yml`.
   - Never read `.env` or `.env*.local`; secrets are redacted.
   - A value set only outside the repo → `external` (D23).
6. **Mirrors:**
   - Pairing by `flow+orm` (default) — `Model(col=<schema param>.<f>)`, sibling rebuilds, `_schema_orm`.
   - Rules: length · bound · allowed · default · nullable · pattern · flag-pair · setting-copy.
   - Verdicts `agree` (counted) · `disagree` · `schema-only` (+ `bypass_writers`) · `model-only` · `unknown`.
7. **Findings** (short):

   | finding | class |
   |---|---|
   | `migration-drift` | nag |
   | `mirror-disagree` | nag |
   | `extra-ignored` | count |
   | `runtime-allowlist` | count |
   | `no-refusal-test` | count |
   | `violation-500` | count |
   | `default-overridden` | count |
   | `unbounded-number` | count |
   | `startup-unchecked` | count |
   | `env-unset` | count |
   | `one-value-tested` | count |
   | `schema-only-bound` | count |

   `uq-race` is gone; M10 refers to `race-500`.

**Goldens (gustify):**
- **`model:PantryItem`:**
  - M8 drift 3: `unit_code` server_default model none vs migration `'unit'` (`migrations 0004_pantry_and_history.py:38`, V; model `models/pantry.py:58`, V) · `created_at` / `updated_at` nullable: model NOT NULL by annotation vs migration NULL (`0004:44-45`, V).
  - Migrations live at gustify's root (`alembic.ini:6`, V).
  - M10: `POST /pantry/items` → 500; `POST /pantry/items/batch` → swallowed at `api/pantry.py:257` then 500 at commit `:271` (P).
- **`model:PantryResetOperation`:**
  - unique `(household_id, idempotency_key)` (`models/pantry.py:115`, V) with `guard_use` `services/pantry_reset.py:50-57` (R);
  - `created_at` drift (`0004:76`, R; corrects `element-forms.html:899` "matches");
  - M10 refs `race-500`;
  - `default-overridden` (`status="in_progress"` at `pantry_reset.py:68`, R).
- **`setting:recipe_creation_enabled`:**
  - `config.py:112`, env `GUSTIFY_RECIPE_CREATION_ENABLED`;
  - effective with `RECIPE_CREATION_ENABLED` (`constants.py:68`);
  - verified readers `api/recipe_creation.py:72` (receiver `:66`) and `api/recipe_stream.py:135` (receiver `:119`); readers `:235` and ws `:195` (U) until the receiver check runs;
  - startup rules `config.py:300-303` and `:362-372`;
  - F4 `external` / `env-unset` (R).
- **`setting:ai_credits_chef`:** `config.py:202` int 15, no bound → `unbounded-number`; reader `services/ai_credits.py:67` (R).
- **Mirrors** (P):
  - `quantity` `gt=0` schema-only, bypass writers `services/shopping.py:452`, `services/cooking.py:608`;
  - `unit_code` default `"unit"` (`schemas/pantry.py:20`) vs `"un"` (`:326`) → disagree;
  - `notes` length disagree;
  - `kind` Literal vs `ck_pantry_items_kind` → agree (counted).

**Battery `tests/forms-short/`, continued:**
- SF3: M2 `guard_use`, M4, M6, M8 drift; SILENT: the batch-added check matches.
- SF4: M10 refs; SILENT on the handled claim.
- SF5: setting effective, verified reader, copies not readers, F6 exit, F8 autouse.
- SF6: `unbounded-number` FIRE/SILENT; F4 commented value.
- SF7: mirrors.
- SF-X: `external` state on a deploy-only value; SILENT when a tracked example file sets it.
- SF10 mutations b–f as designed (drift, typed receiver → reader, sibling defaults equal → mirror row gone).

**Dry run — record:**
- models / checks / drift / raw_ops; migration trees / heads;
- settings / readers verified vs unverified;
- mirrors by verdict; findings.
- Frames (P): gustify 57 models · 46 settings · 63 migrations · 1 head; tier3 2 alembic trees, settings `absent` (the only BaseSettings-shaped class is in vendored `scripts/_a3_code.py`, now skipped).

**Effort:** L.

**Model and migration (as built, Slice 10a).** `_a3_forms_migrate.py` (the replay) and `_a3_forms_model.py` (both parts), run by the short runner (`_a3_forms_schema.run`, `PARTS` now `schema` · `model` · `migration`); the findings `migration-drift` (M8, nag) and `default-overridden` (M6, count) in `_a3_forms.py`; battery `tests/forms-short` SF3 (FIRE · SILENT · mutations · a second head and a raising part) and SF4, on a fixture tree of its own so the schema cases keep their exact counts.
- **Replay.** A tree is an `alembic.ini` section's own `script_location` — a key inherited from `DEFAULT` is not a second tree, and two sections naming one versions directory are one. Revisions order breadth-first from `down_revision = None`; more than one head reads `unknown`. `upgrade()` replays the `op.<verb>` calls — table-first verbs and the name-first ones (`create_check_constraint` · `create_unique_constraint` · `create_foreign_key` · `drop_constraint` · `create_index`) — plus the bodies of `with op.batch_alter_table(T) as alias`, `rename_table`, `drop_table` (the dropped table is remembered), a `for` over a literal or module-constant sequence once per element with the loop name bound, and a `*helper()` spread of the columns a module function returns; module constants resolve (`_CK`, `_TABLE`); a named constraint or index created again replaces the first. `execute` · `get_bind` · `bulk_insert` count as `raw_ops`. A table the replay only saw altered — created by raw SQL or a `sa.Table(…)` it cannot read — is `partial`.
- **Normalisation.** A type is the database type: `String(length=20)` ≡ `String(20)`, nested types normalised (`ARRAY(sa.String())` ≡ `ARRAY(String)`), Python-side keywords dropped (`as_uuid` · `asdecimal` · `astext_type` …), `Uuid` ≡ `UUID`, `Enum(…, native_enum=False)` read as `String`, and the arguments dropped when one is unreadable; two types are equal when one side states no arguments. A server default is its value: `text('0')` and `text("'[]'")` → `0` and `[]`, `sa.func.now()` → `now()`, `sa.false()` → `false`, an enum member's `.name` or resolvable `.value`, an explicit `None` → none.
- **Model.** Columns key by the database name (`mapped_column("display_order", …)` keeps `attr: order`); a type goes through the module's import aliases (`UUID as PGUUID`) and the `impl` of a TypeDecorator defined in the module or imported from one by name; a module-constant default reads as its value; nullability is the keyword, else the primary key, else the annotation under SQLAlchemy ≥ 2.0 read from the nearest lock file, else `unknown`. `guard_use` needs the select's compared columns to equal one unique set exactly (a constraint, a unique index or a `unique=True` column) and the next `if` to test the bound name and exit. `writers` are `function_insight` write ops; `writers_outside_map` are constructor sites in files the map does not cover (the first 20), with test files counted apart as `tests_outside_map`.
- **Drift (M8).** A column one side lacks (never on a `partial` table), a type or nullability both sides state differently, a differing server default, a check constraint one side lacks — matched by name, or by SQL when a side's name is unreadable (an f-string) — and a table a migration dropped while its model still maps it (`field: table`).
- **M10** carries the Slice 6 race facts on the model's steps and Slice 7's `race-500` on its table, by reference; there is no second detector.
- **Not built:** `fk_in`; default classes past the literal; unique-constraint and index parity; types the model leaves to the annotation (`types_unread`); a table created only by raw SQL or `sa.Table(…).create()` reads `migration: absent` (tier3 `sso_provider`).
- **Goldens on gustify:** PantryItem drift 3 (`unit_code` server default · `created_at` / `updated_at` nullable by annotation); PantryResetOperation `guard_use` `services/pantry_reset.py:49 → :57`, `default-overridden` `status="in_progress"` at `:68`, `created_at` drift, an `uncaught` race and `race-500` on `POST /pantry/reset/apply`; Recipe's two `before_insert` / `before_update` hooks — all reproduced. PantryItem's M10 reads empty, and correctly: `pantry_items` has no unique key, so Slice 6 mints no race fact on it — the golden's two 500s (P) are not unique races and wait on `violation-500`, which this sub-slice does not build.

**Setting (as built, Slice 10b).** `_a3_forms_setting.py` (the part) and `_a3_test_asserts.setting_writes` (the pure test-value extractor), run by the short runner (`PARTS` now `schema` · `model` · `migration` · `setting`); the findings `unbounded-number` (F2) · `startup-unchecked` (F7) · `env-unset` (F4) · `one-value-tested` (F8), all count, and the option `setting_constants` (`paired`, the only value built) in `_a3_forms.py`; battery `tests/forms-short` SF5 · SF6 · SF-X · SF10, on a fixture tree of its own.
- **Declarations.** Every field of every project `BaseSettings` class (a base another settings class extends is read through that subclass): annotation, default, environment variable (`_a3_forms_settings.fields`), the declaration's line. F2 values: a bool, a `Literal`, an `Enum`'s members; bounds: `Field` or `Annotated` constraints, a constrained type.
- **Startup rules (F7).** A `field_validator` naming the field (its compare-and-raise is a bound) and a `model_validator` reading `self.<field>` directly, through a one-return property, or one `self` method hop.
- **Readers (F5).** `<receiver>.<field>` where the receiver is PROVEN a settings instance: a parameter annotated with the class (through `Annotated`), a local or module name bound to a call that builds or returns one, a `get_settings()` call, `self.<attr>` that `__init__` bound to one. A one-return property read resolves to the fields it reads (`via`). A settings-named receiver the proof cannot reach is `readers_unverified`; an assignment that only copies the value is `copies[]`; reads inside the settings class are startup rules.
- **Pair and fallback (F1 · F6).** A module constant named like the field and read in the same boolean expression is its pair (`op`, sites, the constant's value) — `_a3_graph._fold_flag_aliases`' evidence, recomputed. The fallback is the endpoint exits a reader decides: a produced row at most six lines below the reader whose condition names the field or its constant.
- **Environment (F4 · D23 · D24).** Only the allow-list — `.env.example|sample|template|development|test`, `docker-compose*.yml`, `railway.json`, `.github/workflows/*.yml`; `.env` and `.env*.local` are never read; a secret-shaped name's value is redacted. `defined` when a tracked file sets a value; `external` when none does yet the repo expects one from outside — a required field, a commented-out value that differs from the default, the declaration's own comment naming the variable; else `default` (a commented line equal to the default is documentation).
- **Tests (F8).** The values tests give the field or its constant: `*Settings(...)` keywords (a lambda counts — a `dependency_overrides` factory is the test's own), `setattr` / `patch.object`, `setenv` of its variable, an attribute assignment on a settings-named receiver. The default counts as run unless an autouse fixture sets the value.
- **Findings.** `unbounded-number`: an int or float with no bound. `startup-unchecked`: a number, or a setting that decides an exit, with no startup rule and no bound. `env-unset`: environment `external`. `one-value-tested`: tests set it, every value they set is readable, and one value ever runs.
- **Orchestrator.** A runner may return `absent: {part: reason}`: that part reads `present: false` and the rest of its stage stands — a tree with no settings class reads `no BaseSettings class in the project`.
- **Not built:** `Final` constants as forms of their own (`setting_constants: all`); value coverage per gate (gustify's SSE and WebSocket gates have no flag-off test, yet the setting reads two values); readers through `getattr(settings, name)`; values the deploy platform sets (never visible).
- **Goldens on gustify — reproduced:** `recipe_creation_enabled` at `config.py:112`, env `GUSTIFY_RECIPE_CREATION_ENABLED`, paired (`or`) with `RECIPE_CREATION_ENABLED` at `constants.py:68`; verified readers `api/recipe_creation.py:72` (receiver `:66`) · `:235` (`:223`) · `api/recipe_stream.py:135` (`:119`) · `:195` (`:165`) — the spec's two unverified readers verify; startup rules `config.py:300` and `:367`; fallback the three 403s (the WebSocket gate sends an event, not an exit); F4 `external` by its declaration comment → `env-unset`; tests set both values. `ai_credits_chef` at `config.py:202`: an int with no bound → `unbounded-number` and `startup-unchecked`; reader `services/ai_credits.py:67`. tier3: the part reads absent — its only settings class is in vendored center code.

**Mirror (as built, Slice 10c).** `_a3_forms_mirror.py`, run by the short runner after the setting part it reads (`PARTS` now `schema` · `model` · `migration` · `setting` · `mirror`, no short part left unbuilt); the findings `mirror-disagree` (nag) and `schema-only-bound` (count) and the option `mirror_pairing` (`flow+orm`, the only value built) in `_a3_forms.py`; battery `tests/forms-short` SF7 and the SF10 mirror mutations, on a fixture tree of its own.
- **Pairing.** `flow` — a model constructor keyword fed by a field of a schema-typed receiver: a parameter annotated with the schema, a loop variable over a schema's list field (`for i, row in enumerate(payload.items)`), `**x.model_dump()`. `sibling` — a schema constructor fed the same way by another schema, when the rebuilt schema takes a request or feeds a model (a response built from a request enforces nothing). `orm` — a `from_attributes` response schema (`_a3_code._schema_orm`) and the model its name strips to. `flag-pair` — a setting and the constant read beside it (`settings{}` `effective`). `setting-copy` — a module constant named like a setting and never read beside it.
- **Facts.** Schema fields come from `schemas{}`, with default, nullability and allowed values read from the declaration — through project base classes, a `Literal` alias and an enum member default. Model columns come from `models{}`: `String(n)` length, `default`, nullability, and a check constraint's `IN (…)`, comparison or regex on the column.
- **Rules and verdicts.** `length` · `bound` · `allowed` · `default` · `nullable` · `pattern`, plus `value` for setting pairs. Between two schemas any difference disagrees, but a default only when both state one, and nullability only when the source allows a null the destination refuses. From schema to model, a one-sided rule is `schema-only` or `model-only`, and nullability disagrees when the request may send a null the column refuses (for `orm`, when the column holds a null the response requires). `agree` rows are counted, never listed.
- **Bypass writers.** A model subject with a schema-only rule lists its constructor sites that set the column from something no schema checked (the first 20).
- **Findings.** `mirror-disagree`: every disagreeing row. `schema-only-bound`: a schema bound (`gt` · `ge` · `lt` · `le`) the table lacks while a writer bypasses the schema.
- **Not built:** Zod ↔ Pydantic (the frontend pass, Slice 11); SSE ↔ WebSocket gate parity; attribute assignments as bypass writers; `mirror_pairing` values other than `flow+orm`. `violation-500`, `no-refusal-test` and `runtime-allowlist` stay in the Slice 10 findings table with no sub-slice building them.
- **Goldens on gustify — reproduced:** `quantity` `gt=0` schema-only with bypass writers `services/shopping.py:452` and `services/cooking.py:608` (plus three sandbox-seed writers) → `schema-only-bound`; `unit_code` default `"un"` (`BatchItemInput`) vs `"unit"` (`PantryItemCreate`) → disagree; `notes` length 500 vs none → disagree; `kind` `Literal` vs `ck_pantry_items_kind` → agree (counted). Beyond the spec: `NotificationResponse.payload` is required while the column allows NULL.

---

### Slice 11 · The frontend pass — Phase 5 (sub-slices 11a–11d)

Sub-slices: **11a** extractor flow + guards + router topology · **11b** hooks + keys + client policy + transport · **11c** reason map · **11d** controls + store actions + optimistic.

**Generates:** frontend arm: top-level `frontend{}` (§A1 envelope conventions; row ids `<l>-<sha10>`; endpoint refs are `x:` ids).

**Modules:**

| module | change | lines |
|---|---|---|
| `_a3_fe_extract.mjs` | flow walker, gated by `GABE_FE_FLOW=1` | 288 → ~560 |
| `_a3_fe.py` | `run_extractor(..., env=None)` | 776 → ~779 |
| `_a3_fe_forms.py` | new | ~560 |
| `_a3_fe_reason.py` | new | ~230 |
| `_a3_forms_fe.py` | new, data only: FE rosters, `LIBRARY_DEFAULTS` with sources | ~95 |
| `build_center_a3.py` | real `extend_frontend` call after `_graph` + the write-rule change | — |

**Algorithm:**
1. **The extractor stays the same run it is today.**
   - The structure run (`fe_arm`) is unchanged; c4 `fe` bytes never depend on flow.
   - Flow capture is a **second invocation**, with `GABE_FE_FLOW=1` and its own timeout (D21). A flow failure → `arms.frontend.present false` + reason.
2. **Capture** (raw facts only, no roster in JS, matching `_a3_fe_extract.mjs:95-98`):
   - **Bodies walked:** every local export, module-local functions one level deep, store initializer objects, and function-valued properties passed to calls.
   - **Guard / after / ctx stacks** mirror `_a3_paths`.
   - **Row kinds:** `ret`, `throw`, `call`, `new`, `cmp`, `jsx` (lowercase tags included).
   - **Checker resolution:** constants depth ≤ 3; factory-key arrays; forwarding over `.map` / `for…of`; union literal domains; `handlerProps`.
   - **Route configs.**
   - **Limits:** 600 rows per body.
3. **Origins** (`_a3_fe_reason.origin`): hook member · cache call (`_a3_fe._CACHE_CALLEES`, `:68-73`) · cond union · catch parameter → try body · parameter → call sites · store selector · unknown.
4. **Form classification:**
   - **guard:** a conditional NAV element / `throw redirect` / nav hook, with a trailing outlet or none; **Not built (§A4 V40a): the nav-hook guard** — a component that calls `useNavigate()`/`navigate(…)` inside an effect or handler and renders children otherwise (gastify's `ProtectedRoute`, wrapped around every non-public route at `__root.tsx:19-25`, has no guard row though the c4-graph knows the piece). Build when a target's auth guard is such a hook and the operator wants it drawn; until then the guards part reads the conditional-element and `throw redirect` kinds only;
   - **hook:** a cache callee;
   - **component:** conditional rets or controls;
   - **store action:** a function-valued property of a `_STORE_CALLEES` initializer.
5. **Guards:**
   - exits with QUERY_STATE atom classes;
   - `decided_by` via bridge edge → `declared.response_model` → schema field;
   - effects join an exit when their atoms cover its pred;
   - chain paths = ancestor outlets × innermost exits.
   - **K3 topology:** `loops` · `exclusive` (the two redirect branches contradict on the same hook member) · `unproven` · `safe` · `unknown`, worst across mounts.
6. **Hooks and client:**
   - keys matched as TanStack prefixes;
   - `invalidated_by`;
   - policy from `new QueryClient` (retry functions summarised one level), falling back to hook options, then library defaults from the web lockfile (else `unknown`);
   - transport `.status` branches in the wrapper definition file.
7. **Reason map:**
   - sites are `.status` / `.detail` compares whose origin reaches an endpoint, narrowed to the enclosing `useMutation`'s `mutationFn` fetch (bridge edges keep the first export only, `_a3_web.py:344`);
   - rows route by status into the first branch that covers them;
   - `reason-collapsed` fires only when the branch reads no detail or code **and** the endpoint already carries `shared-status` for that status (reusing `_a3_paths.py:900-910` output);
   - `branch-unproduced` and `client-detail-unmatched` as designed.
8. **Controls and stores:**
   - control states `live` · `maybe-dead` · `dead` · `disabled` · `unknown`;
   - store `set` transitions append · remove · reset · set-literal · set-param · merge · expr;
   - K3 persist;
   - optimistic rollback: `defined`, or `missing` → `no-rollback`.
9. **Write rule** (D21): `forms.json` is written when `present` **or** `arms.frontend.present`. On a TS-only tree (keypro) this creates the file with `present: false, reason` plus `arms` and `frontend`. Next.js server idioms land in `frontend.idioms.unknown` with counts.

**Goldens (gustify `apps/web/src`, source read; reason-map join over committed forms):**
- **`RequireSetup`** (`routes/RequireSetup.tsx:31-63`, V):
  - exits: `isPending` → splash · `isError` → splash, joined by effects `signOut` on 401 and `pushToast` otherwise · `data.setup_required` → redirect `/setup` (`paths.ts:13`, V), `decided_by {endpoint:"endpoint:GET /me", response_model:"MeResponse", field:"setup_required"}` · outlet.
  - K3 `safe` + `exclusive` against `RedirectIfSetupComplete` (router `routes/router.tsx:101`, `:104`, `:131`, V).
  - Chain rows: 7, for the drawn map's 6 paths; the grouping is left to display.
  - The `signOut` landing is `unknown`: an external Firebase event (R).
- **`SetupScreen`** (`:41-51`; 409 branch `:43`; swallow `:94`; `:97-98`, V) → **exactly one** `reason-collapsed` on `POST /setup/complete` 409 (`["consent required", "setup in progress"]`, the committed `shared-status`, V).
- **`GET /me`** has no `shared-status` → `RequireSetup`'s 401 branch stays SILENT (V).
- **Client policy** (`lib/query/client.ts:14-35`, V): retry 0 on 4xx, else 1; `refetchOnReconnect` true; mutations retry 0.
- **`useUiStore.clearToasts`** has no caller (`store/ui.ts:49`, `:83` only, V) → `action-uncalled`.
- **Dead controls** at `PantryStateViews` `:64`, `:65`, `:107` (R).
- **`useRecipeFilterModes`** 409 site endpoint `unknown` (the `ENDPOINT` const not read).

**Guards (as built, Slice 11a).** The flow walker in `_a3_fe_extract.mjs` (gated by `GABE_FE_FLOW=1`), `_a3_forms_fe.py` (the rosters, data only), `_a3_fe_forms.py` (the `guards` part), the real `_a3_forms_build.extend_frontend`, `_a3_fe.run_extractor(…, env=)`, the finding `redirect-loop` (K3, nag) in `_a3_forms.py`, and the build wiring; battery `tests/forms-frontend` F1–F9 · F15 · F16 on a fixture of its own, plus `tests/frontend` (no `flow` key without the flag) and `tests/center` (a raising `extend_frontend`).
- **Capture.** A second extractor run: every module-level function-like declaration, and every function-valued property of an object a declaration's call is given (`createFileRoute(…)({ beforeLoad })`), becomes a body of rows — `ret` · `throw` · `call` · `new` · `cmp` · `jsx` — each with its `guards`, the earlier exits it passed (`after`) and its callback context. Destructured binds ride the call that feeds them. A name, property access or template literal resolves to its literal through the checker (constants three hops deep; an unreadable template span is `*`). A call keeps an object argument's literal properties (`redirect({ to })`). Route-config trees (`path` · `element` · `children` …) are captured whole. 600 rows per body. Without the flag no `flow` key is emitted, so `c4` `fe` bytes never depend on it.
- **Guards.** A body whose own exits — outside every callback — include a `Navigate` returned or a `redirect(…)` thrown. `exits[]` come in order, as `nav` (with `to`) · `outlet` · `render` · `null` · `throw` · `value`. Each exit carries `when` and `passed` atoms, and an atom names the hook member it reads (`isPending` → class `pending` of `useMe`; `data.setup_required` → class `data`, field `setup_required`). An `||`, or a negated conjunction, stays one opaque atom. `decided_by` follows a data atom through the hook's bridge edge to the endpoint's declared response model and the schema field (`defined`, or `unread` when the schema form is absent).
- **Effects.** The calls a `useEffect` makes through a hook binding (the first call on a line; its arguments are not effects), each joined to the exits whose own atoms it covers. `lands` stays `unknown`.
- **Chain.** For each mount in a `createBrowserRouter`-style config: an ancestor guard's non-outlet exits, then this guard's exits through the ancestors' outlets, one row per joined effect. A guard with no mount has no chain.
- **K3.** Per navigation target: `loops` when it lands inside the guard's own subtree; a guard above the target that redirects back into this guard's subtree is a pair — `exclusive` when the two conditions contradict on one hook member, `unproven` otherwise; `unknown` when no route config holds the target (or none was read); else `safe`. The guard reads the worst target. `redirect-loop` fires on `loops`.
- **Orchestration (D21).** `extend_frontend` runs after the c4 graph (it reads the bridge edges), only when `frontend` is selected, and never raises. A flow failure or an absent fe arm reads `present: false` with a reason, and a raising part restores the feed. `guards` reads present; `hooks` · `client` · `reason` · `controls` · `stores` read `not built yet (slice 11)`. The build (re)writes `forms.json` when the endpoint forms or the frontend arm is present; on a tree with no endpoint forms the envelope gains `arms` so the frontend can still be written.
- **Not built:** hooks and keys, client policy, transport (11b); the reason map (11c); controls, store actions, optimistic rollback (11d); file-router topology (a TanStack file tree reads `unknown`); the Next.js server idiom — `redirect("/…")` called, not thrown, in a server component — is no guard, so tier3 and keypro read 0 guards, and `frontend.idioms.unknown` (which would count it) stays empty.
- **Goldens on gustify — reproduced:** `RequireSetup` exits `isPending` → splash · `isError` → splash, joined by the effects `signOut` (on 401) and `pushToast` · `data.setup_required` → `/setup`, `decided_by {endpoint: "endpoint:GET /me", response_model: "MeResponse", field: "setup_required"}` · outlet; chain rows 7; K3 `safe` with `exclusive` against `RedirectIfSetupComplete` on `data.setup_required`; the `signOut` landing `unknown`. `LoginRoute`'s redirect target is a runtime value (`safeReturnTo(…)`), so its K3 reads `unknown`.

**Hooks, client and transport (as built, Slice 11b).** The flow walker now resolves factory keys, forwarded names and option trees; `_a3_fe_forms.py` gains the `hooks` and `client` parts; `_a3_forms_fe.py` gains the cache, client, invalidation and seed rosters and `LIBRARY_DEFAULTS` (TanStack Query, each value with its source line and the version it was read on). `extend_frontend` runs `guards` · `hooks` · `client`, and a hook form joins `frontend.pieces` (a guard that also queries keeps both as `cache`). Battery `tests/forms-frontend` F10 · F11 · F12.
- **Capture.** A call to a function whose body is one array literal resolves to its elements, a parameter as `*` (`queryKeys.recipes.detail(id)` → `["recipes", "detail", "*"]`). A name that is the first parameter of a `.map` / `.forEach` / `.flatMap` callback reads as each element of the resolved receiver (`INVALIDATIONS.setupComplete.map((queryKey) => invalidateQueries({ queryKey }))`). Every call with an object argument keeps its option tree — literals resolved, functions named, nested objects kept. Only a symbol hop spends the three-hop budget; a literal inside what a hop reached never does. A spread inside a key array splices the spread array's elements in place (`list: () => [...groupKeys.all, "list"]` → `["groups", "list"]`). Module-level statements that are not function declarations — a non-function initializer or an expression statement (`export const queryClient = new QueryClient(…)`, `apiClient.use({ onResponse })`) — form a `<module>` body. A callback's context names its host whole when it is a dotted name (`prop:apiClient.use.onResponse`), else the member called (`callback:then`).
- **Hooks.** Every `useQuery`-family and `useMutation` call a body makes outside a callback: the key (or `key_unresolved` naming the reference), the policy options it sets, its literal-path fetches (`queryFn` / `mutationFn` calls whose first argument is a path) with method and wrapper, and the endpoint its piece bridges to. A mutation lists the `invalidates` and `seeds` its `on*` callbacks make. A query lists `invalidated_by`, the mutations whose invalidation key is a TanStack prefix of its key (`*` matches anything).
- **Client policy.** Per `new QueryClient({defaultOptions})` scope (`queries`, `mutations`) and option, one of three states. `defined` when set; a function reference is summarised one level: its returns, the conditions above them, the comparisons on their lines, and the comparisons of a project predicate a condition calls (`means`). `default` otherwise, when the web lock file pins the package at or above the version the default was read on; it carries the value and its source. `unknown` when the version is older or no lock file names the package. `hook_overrides` lists the hooks that set a policy option themselves.
- **Transport.** The files that define the fetch wrappers the hooks call, with every `.status` comparison and every throw in them — callbacks included, a middleware's `onResponse` naming its `ctx` — and the conditions above each.
- **Not built:** retry functions past one level of predicate; a fetch whose path is a variable (the helper that takes `path` is a hook with no fetch); SWR and RTK Query spellings (rosters only); key factories built by string concatenation.
- **Goldens on gustify — reproduced:** the client policy retries 0 on a 4xx (`isClientError(error)` → `false`, meaning `value.status >= 400` · `value.status < 500`), else once (`failureCount < 1`); `refetchOnReconnect` true; mutations retry 0 (`false`); gcTime the library default from `apps/web/package-lock.json` 5.100.6. `useMe` keys `["me"]` → `GET /me`; `useCompleteSetup` posts `/api/v1/setup/complete`, seeds `["me"]` and invalidates the `setupComplete` edges. On gastify — whose key factories spread (`[...groupKeys.all, "list"]`), whose client is built at module level (`lib/queryClient.ts:3`) and whose status branch lives in a middleware callback (`lib/api.ts:26`, 429) — those three readings took `invalidated_by` from 603 to 88 (a spread read as `*` matched every key), found the client (5 options defined, 1 library default from 5.101.0) and the 429 branch.

**Reason map (as built, Slice 11c).** `_a3_fe_reason.py` writes the `reason` part as `frontend.reasons` (`sites[]` · `readers{}`). The extractor now records a body's parameters, the names a call is given (`refs`), alias rows (`let`: `const active = redo ? save : complete`) and a comparison whose right side did not resolve (`rx`). `_a3_forms_fe.py` gains `MUTATE_CALLS` and `REASON_MEMBERS`; `_a3_forms.py` gains the findings `reason-collapsed` (U7, nag) · `branch-unproduced` · `client-detail-unmatched` (U7, count). Battery `tests/forms-frontend` F13 · F14, and F8 proves the findings reach the feed.
- **Sites.** A comparison of `<receiver>.status` with an HTTP status, or of `.detail` / `.code` with a string, in any body outside the transport files the client part reads; a cast receiver (`(error as {…}).status`) reads as its name. A status site's `branch` says how the branch it opens reads the refusal: `reads` a detail or code · `passed` hands the receiver to a call · `none` · `value` (the comparison feeds a value, no branch holds rows) · `unread` (a clipped condition).
- **Origins,** three hops: `hook` — a name a project hook call binds; `cache-call` — a name a query or mutation call binds, or the first parameter of an `on*` callback given to one or to `m.mutate(…)` (which is `m`'s request); `fetch` — a name a call given a literal path binds (`const res = await fetch("/api/v1/me")`, `const { response } = await apiClient.GET("/…")`), its method the `method` option, else an HTTP-verb callee, else GET; an alias, followed to each name it may hold; `catch` — the literal-path fetches and `.mutateAsync` calls in the try block; `param` — each call site's argument, and for a destructured parameter the JSX prop or the object argument's property (`useCookingLoopActions({ startCooking })`); else `unknown` with its reason. A fetch joins its endpoint by method and `_a3_graph._norm_path`; a hook call with no such fetch falls back to its bridge edge.
- **Routing.** Per reader (piece · function · receiver) and endpoint, each produced exit goes to the first site in line order that covers it — a status comparison that holds for its status, a detail or code its text says — else `rest`.
- **Findings.** `reason-collapsed` when a status site's branch is `none` or `value` and the endpoint's `shared-status` names that status. `branch-unproduced` / `client-detail-unmatched` when no exit of the reached endpoints is covered — only against a complete catalogue: every reached endpoint has a form, every exit has a status, a status site names a refusal (≥ 400 — the catalogue lists no success), and no exit's text is computed at runtime (`form: dynamic`). A site that reaches no endpoint fires nothing.
- **Not built:** an error handed through a promise callback (`.catch((e) => …)` — a callback argument's parameters are not captured); a hook's value past its query and mutation calls (`useRecipeStream` streams, it does not fetch); a query client's `retry` predicate, which every query's error reaches (its sites read `unknown`: no call site passes the error).
- **Goldens on gustify — reproduced, with one correction.** `SetupScreen.setupErrorMessage` (`:43`) → `reason-collapsed` on `POST /setup/complete` 409 (`["consent required", "setup in progress"]`): its receiver reaches `useCompleteSetup` and `useRedoSetup` through `activeMutation`, and the `mapSetupSelection` catch reaches no fetch. `RequireSetup`'s 401 branch and `SettingsContainer`'s two 401 values stay silent (no `shared-status`); `useRecipeFilterModes`' 409 reads its `useMutation`, which fetches no endpoint the forms hold. The correction: the "exactly one" above predates the object-argument hop. `describeStartCookingError` (`cookingSessionModel.ts:389`) reaches `POST /cooking/sessions` through `useCookingLoopActions({ startCooking })`, and that 409 is both `require_household`'s "setup required" (`apps/api/auth/context.py:55`) and the concurrent-cook cap (`apps/api/api/cooking.py:166`). The branch shows the cap message for both, though `ApiError.isSetupRequired()` (`apps/web/src/lib/api/errors.ts:56-58`) exists — two `reason-collapsed`, both read in source.
- **The dry runs on gastify and tier3.** The first joined none of gastify's 3 sites or tier3's 45: both read raw responses (`fetch("/…")`, `apiClient.GET("/…")`), which is why a call given a literal path became an origin — gastify's `useTransactionDraft` 404 now joins `GET /transactions/draft`, tier3 joins 11 sites to 19 endpoints and leaves 34 unknown by named reason (a runtime fetch URL, `useCurrentUser`, `Promise.all`, …). The second fired 9 `branch-unproduced` on tier3, all false: onyx raises its 404 · 409 · 429 · 503 as `OnyxError(OnyxErrorCode.X)`, an exit whose status the app handler sets at runtime (198 of 499 endpoints), and one site compared a 204 success — hence the complete-catalogue rule. Resolving `OnyxErrorCode` to its status in the endpoint pass would make those checks real.

**What a reason branch does (Slice 11e — AUTHORIZED 2026-09-20, design-context D-018; the full design is `plans/slice-11e-does.plan.md`).** The reason part keeps the rows it already holds inside a client branch and then drops: every site of `frontend.reasons.sites[]` — status, detail and code alike — gains `does[]` (the call with its literal arguments, the value returned, the element rendered, a navigation, a retry, a cache refresh; each with `at`, in walk order, capped), `does_state`, and its own `ctx` when it has one. No new part, no registry change, no finding, no id letter (rows are addressed by `at` and order — the §A4 V33 precedent).
- **The law.** Arms only add: `branch`, the site `id`, `origins`, `endpoints`, `readers{}` and the three findings keep their bytes; the word is never recomputed from the narrowed rows. The only prior values that move are the arm's own size accounting.
- **Selection.** The word keeps today's textual selection. `does[]` is the STRUCTURAL subset of it: a row whose guard stack is the comparison's own plus the branch condition, whose callback context never diverges, and that does not run only after the comparison was ruled out. *As built (the review, below):* the row also belongs to the NEAREST preceding comparison that reads the same — for every match, not only a match by name — so a comparison that only picks a value never claims the rows of an identical `if` further down, and two identical branches on two lines each keep their own rows. `mixed` is left for the one case line order cannot part: two comparisons that read the same on ONE line share the rows and both say so.
- **Classes** (first match wins): navigate · throw · render · return · retry · refresh · request · message · surface · state · log · other. A class comes from a library binder or a library callee shape in `_a3_forms_fe.py`, never from a local name; `other` is always emitted with its callee, and every call row says where its name came from (`from`).
- **The operator's rulings, as recorded in D-018** (left to the author's pick by D-017, choices inside the framework): a `useNavigate` roster — **yes** (it classes a row and builds NO guard row; §A4 V40a stays struck) · the word for a comparison the caller decides — **`beyond one level`**, the estate's phrase, not the design's `returned` · `toast` as a library idiom — **yes** (the row's `from` says whether the name came from a library or from the project) · `useTranslation` (react-i18next, which no study app installs) — **no**, until a target uses it.
- **State words:** `read` · `mixed` · `empty` · `beyond one level` · `no-rows` · `unread`.
- **Landing:** the fixture and the re-frozen flow first, reconciled on the OLD generator; the unit law proof (new output with the new keys stripped is byte-equal to the old); the battery cases F21+ with source mutants; the dry run on the four targets, old against new; goldens; docs; suite-doctor; twins; then the lab carry in its own commit.

**What a reason branch does (as built, Slice 11e).** `_a3_fe_reason.py` reads the rows inside every comparison's branch (`_inside` → `_own` → `_does_row` → `_does`) and writes `does[]`, `does_state`, `does_more` past the cap of 24, and the site's `ctx`; `_a3_forms_fe.py` gains the class ladder, the state words and the binder rosters (`NAV_BINDERS` · `NAV_ROUTER_BINDERS` · `REFETCH_MEMBERS` · `MESSAGE_BINDERS` · `SURFACE_CALLS` · `STATE_BINDERS` · `LOG_CALLS`); `_a3_forms_build.py` hands the reason part the store piece ids. The extractor did not change. `stats.reason.does` counts rows, narrowed sites, sites per state and rows per class.
- **The law, proven twice.** On the battery's capture: the reading with the new keys stripped is byte-equal to a reading with the pass switched off (F23). On the four targets: every NEW `forms.json` with `does` · `does_state` · `does_more` · `ctx` · `stats.reason.does` and the arm's `bytes` stripped is equal to the OLD-code feed built from a clean worktree of the commit before — gustify `1e2d8c5a` · gastify `0cba5b93` · tier3 `483d7f896b` · keypro `1e27ee4`.
- **Dry run, measured (the second run, after the review's fixes).** gustify 12 sites — 6 read · 3 beyond one level · 3 no-rows, 9 rows (other 5 · return 3 · render 1). gastify 3 sites — 1 · 1 · 1, 1 row (return). tier3 45 sites — 32 read · 7 no-rows · 6 beyond one level, 59 rows (other 25 · return 13 · throw 12 · message 6 · navigate 2 · surface 1). keypro 1 site, beyond one level, no row. Over the four: 61 sites, 39 read; 69 rows, 30 of them `other`. The first run read tier3 as 33 · 11 · 1 with 63 rows; the difference is the review's.
- **Read against D29's BREAKS IF.** `no-rows` and `beyond one level` do not dominate (22 of 61, eleven each), and every `no-rows` site read in source is a comparison that picks a value (a ternary, a `&&`), which is the state's meaning. On gustify alone they are half. `other` is the largest class and it is a long tail, not a missing roster: project helpers that carry their own `from` (`fe:…#logout`, `#authErrorRedirect`), body reads on a fetch response (`res.json`), and gustify's own i18n hook `useT` — by the ruling a project name is never a roster entry, so its rows say `from: bind:useT` and class `other`.
- **Found while landing.** `navigate("/login")` first read as a GET request: a literal path alone is not a request — the callee is fetch-shaped, or carries a method option, or the path joins a known endpoint. `set({ token: e.status === 401 ? … })` first read as handed back to the caller: `_handed_back` wants the comparison at depth 0 of the returned text and no ternary. Two source mutants survived the first battery — a negated guard at the site's own depth counted, and the word recomputed from the narrowed rows — and each now turns a named case red (F22's else-arm re-test, F23's dead twin after a return).
- **The review, before the commit** (four lenses over the diff and the four real feeds — precision on real rows · the class ladder · the law · can the battery fail — each finding tried by a skeptic; 18 verdicts stood, eleven distinct). On tier3, `const sessionEnded = … && userError?.status === 403 && …` claimed the `logout()` of an identical `if` inside an effect 38 lines down: the nearest-comparison rule above. Five predicates (`return ( … && (e.status === 401 || …) )`) read `no-rows` because a grouping parenthesis counted as a call: `_handed_back` now tells the two apart. `return new Response("")` was two rows; `NextResponse.redirect(new URL("/auth/create-account", …))` said `to: null` while the wrapped `new URL` sat beside it as noise (the design's own rule, unbuilt); a chain wrapped across lines (`res .json`) lost its `from`; `navigate("/me")` handed in as a prop read as a request — and as a retry when the site reached `GET /me`; the design's own `const { error, refetch } = useMe()` retry read `other`; a destructured props parameter had no `from`; `clipped` sat on a render row with no text and was missing on a clipped throw. The battery had a seventh survivor (no assert read a row's `when`) and no case for `mixed` · `empty` · `unread` or the cap. All fixed: a second fixture `SetupFailureEdges.tsx` (a real capture, every comparison on a plain parameter so Slice 11c's routing and findings keep their numbers), rows pinned whole, and in-memory cases for the states and the cap. **Eighteen source mutants, eighteen caught.**
- **Not built:** following a `beyond one level` comparison to the callers that decide; an assignment as a row (`detail = body.detail`); a branch ordinal for two comparisons on one line beyond the nearest-comparison rule; react-i18next, react-intl and SWR revalidation rosters (no study target installs them).
- **Goldens on gustify (slice `11e`, five, 67 of 67 match — on the second run's feed too):** `POST /setup/complete`'s 409 returns the text under `auth.setup.error.in_progress` (SetupScreen `:43`, a call handed back, its callee a parameter); `describeStartCookingError`'s 403 returns the literal `cooking.error.start_allergen`; RequireSetup's 401 calls `signOut` from `useAuth` inside the effect and the else arm's `pushToast` is not its row; `isClientError`'s two comparisons are `beyond one level`; the state counts. On the OLD-code feed the five read 4 missing · 1 mismatch.

**Controls, stores and optimistic updates (as built, Slice 11d).** `_a3_fe_controls.py` writes the `controls` part (a `controls[]` list on each component piece) and the `stores` part (`frontend.stores`, plus `optimistic` on each mutation call of the hook forms). The flow walker now captures store action bodies (`<Store>.<key>`, a function-valued property of the object a store initializer's function returns) with the store's `wraps` (the calls it is wrapped in and their literal options), a returned object literal as `obj` (a spread constant's own fields resolved into it), a spread inside an option tree, and `spread` on a JSX element. `_a3_forms_fe.py` gains `CONTROL_TAGS`, `HANDLER_PROPS`, `PERSIST_CALLS`, `STORAGE_WRITES`, `CACHE_WRITE_CALLS` and `CLIENT_HOOKS`; `_a3_forms.py` gains the findings `dead-control` (K2, nag), `action-uncalled` (K1, count) and `no-rollback` (K2, nag). With this slice every frontend part is built, and `arms.frontend.reason` reads null. Battery `tests/forms-frontend` F17 · F18, with F8 and F10 extended.
- **Controls.** A control is a host `button` or `a`, or a project component that hands a host control its props: `*` when it spreads them onto a button that sets no handler of its own, else the parameter keys it passes as a handler (`<button onClick={onDismiss}>` → `onDismiss`). A key whose button renders only when that prop is given is dropped, since omitting it hides the button. A button rendered under another condition keeps that condition. States: `disabled` (literally set) · `unknown` (spread at the site, or a handler parameter no call site renders) · `dead` (no handler) · `maybe-dead` (an empty handler, a handler parameter some call site omits, a `type="submit"` with no form handler in the body, a submitting control in a body that renders a form, or a component whose button renders only under a condition the site does not pass) · `live`. A handler parameter the element is rendered only when given is `live`. A control with no handler of its own is `live` when its nearest JSX parent supplies one — `<CollapsibleTrigger asChild>` (Radix clones its handler onto the child) or a wrapper with a click handler; a form handler is `onSubmit` or `action` (a server action or a posting form). `*` counts only when the spread is the component's own parameter (`{...props}`), not a local object. Story files are skipped.
- **Stores.** An fe `store` piece whose declaration the flow run read as an initializer: its `initial` values and, per action, each `set`'s transitions per field — `reset` (back to the initial literal, or to the constant the store spreads: `set(INITIAL)` · `set({ ...INITIAL })` on `*`) · `set-literal` · `set-param` · `append` · `remove` · `merge` · `expr` (a callback whose returned object is not readable is `expr` on `*`). An action is `called` when anything outside the store names it — searched in the source of every file the flow run captured (a caller's body cut at the row cap still names the call there), and in the store file's own rows outside the store body; `action-uncalled` otherwise (test files are not in the flow). K3 persistence: `persisted` (a `persist` wrapper, with its name) · `partial` (the `writers` actions that write browser storage directly or through a project helper, and `set_by_writers`, the fields those actions set — not a proven persisted set) · `memory`.
- **Optimistic.** A mutation whose `onMutate` writes the query cache (`setQueryData`, or a call handed the `useQueryClient()` value) carries `optimistic`: its `writes`, `rollback` `defined` (by a cache write or by reading the context in `onError`) or `missing` → `no-rollback`, and `reconcile` when `onSettled` invalidates. A callback belongs to the call that precedes it in the body.
- **Fixed in the hooks part (11b).** Every query and mutation call in one body collected every sibling's `mutationFn` fetches and `on*` callbacks; each call now reads only the rows up to the next query or mutation call in the body.
- **Found by the smoke, before the dry run.** gustify first read 201 dead controls. Stories, pass-through props (`FullSurfaceSheet`'s `onClose`, `CookingFlowToast`'s `onDismiss`), a spread onto a button with its own handler (`IconActionBar`'s `action.onClick`), and a button rendered only when its prop is given (`SavedModesRow`'s `onRequestSave`) accounted for 174 of them. gastify's `reset` actions read no transition until a spread constant resolved (`set({ ...INITIAL_STATE })`). A conditional set value (`e.status === 401 ? null : "kept"`) had read as `set-param`.
- **Found by the first dry run.** tier3 read 10 dead controls and keypro 8 `maybe-dead` submits; every one was false, read in source. Seven tier3 buttons are the child of `<CollapsibleTrigger asChild>`; one sits inside a `<span role="button" onClick>`; `AppPopup` spreads a local object onto its link; keypro's submits post through `<form action={…}>` server actions. tier3's `getStreamingStartTime` read uncalled because its only caller sits in a hook body the flow run cut at 600 rows. After the fixes tier3 reads 0 dead and 8 uncalled actions — each with no use outside its store (grep), `abortAllSessions` among them — and keypro keeps 5 dead controls (four `IconButton`s in `chat-screen` and the Mic button of `prompt-composer`, none with a handler).
- **Not built:** controls outside JSX (`onClick` wired by `addEventListener`); a handler forwarded through a props object other than a spread; store selectors as readers of fields; jotai, redux and valtio stores beyond the `PERSIST_CALLS` roster; rollback reached through a helper more than one call deep.
- **Goldens on gustify — reproduced, with a correction.** Dead controls at `PantryStateViews` `:64`, `:65` (`SyncErrorState`'s Retry and use-offline) and `:107` (the else arm of `onAddStaples ?`), 27 dead in all, each read in source: `AuthOnboardingScreen`'s ten unwired buttons, `CookingStateViews` ×3, `PantryInventoryCard` ×3, `PantryItemRow` ×2, `ProfileButton` rendered with no `onClick` ×2, and one each in `RecipeModeSections`, `SettingsRows`, `PantryStartOptions` and `SearchToolbarSpike`. `useUiStore.clearToasts` → `action-uncalled`, and so are `setActiveTab`, `openModal` and `closeModal` — the golden named one, and a grep finds no use of any of the four outside `store/ui.ts`. The store is `memory`. Four optimistic mutations roll back: `useCookingSessions`' step toggle by a cache write, `useRecipeFilterModes`' create · update · delete by `writeModesCache(queryClient, …)`.

**Battery `tests/forms-frontend/`:** its own fixture dir, so `tests/frontend/fixture` counts do not move; F1–F16 as designed, with:
- F15: `build_fe` / `fold_fe` identical with flow on vs off;
- F16 LIVE: `GABE_FE_FLOW=1` re-derives `flow.frozen.json` byte for byte when a typescript resolves, else `SKIP ⚠` by name.

Also `tests/frontend`: the extractor without the flag emits no `flow` key. `tests/center`: a raising `extend_frontend` → exit 0, `frontend forms SKIPPED`, endpoints unchanged.

**Dry run — record:**
- pieces by form; rows; findings; unknown rows by reason; unresolved keys and origins; truncated bodies;
- extractor wall time with flow off vs on (not yet measured);
- keypro: the new-file write rule.
- Grep frames only, not goldens: gustify `useQuery` 18 · `useMutation` 40; gastify `beforeLoad` 3; tier3 `useSWR` 156 · `redirect(` 49.

**Effort:** L.

---

### Slice 12 · In-flight state — what is alive while the request runs (leftovers piece 11)

> **AUTHORIZED 2026-09-21 (design-context D-019): R1 `U15` · R2 the carrier · R3 in · "land it".** Proposed the same day, no code before the ruling. He ruled the piece "do" (design-context D-016) and "after piece 10, name `inflight` kept" (D-018); piece 10 landed `b1a1e2c` · lab carry `61f53ce`, and he has seen its row. The full design — detectors, rosters with their package cites, the fixture, every battery case — is `plans/kinds-inflight.plan.md` (a read-only planning run, 4 readers + 1 designer); this block is the contract it is built against.

**Generates:** the kinds arm's new part `inflight`. Per endpoint `inflight[]` — one row per thing that is alive while this request runs, in REQUEST ORDER (middleware by run order, then dependencies in FastAPI's resolution order, then the handler; a site one call down sorts under the station that called it). Top level `inflight{process, rules}` — `process` holds what is built ONCE for the whole server and met by many endpoints; the row an endpoint carries for it is SHORT — `kind · name · ref · read_at · reads` (and `applies: false` where a pass-through arm exempts this path) — and its scope, its lifetime, its rule and where it is set are said ONCE, on the process row the `ref` names; `rules` holds only the rules some row used, each with its `scope`, `dies`, `says` and package `source`. No finding: an analysis, never a grade. `[]` means the part ran and found nothing; an absent key means the part is off. An `OPTIONS.inflight_scope` the part does not build is REFUSED before a byte is written: `parts.inflight` reads `present: false` with the reason, the rest of the arm stands, and `arms.kinds.options` still says the scope that was ASKED.
- **Eight kinds of row:** `state` (`request.state.<x>` · `app.state.<x>`) · `contextvar` · `dependency-value` (what a dependency hands the handler) · `background` (a task queued to run after the answer) · `lock` · `cache` (`lru_cache` · `cache`) · `built-once` (an object a middleware builds in `__init__`) · `setting-once` (a setting read once in `__init__`).
- **Every row says:** `name` · `scope` (request · process · unknown) · `set_at` + `set_by` + `set_in` (the middleware, the dependency, the handler, or `__init__` — or `unknown`) · `read_at[]` (capped at 8, `reads_more`) · `reads` (found · none in scope — never "never read") · `dies` (**with the answer · with the server process · unknown**, nothing else) · `rule` (an id into `rules`, never free text). A state row whose value came from a header carries `from` — with `cond: true` when the binding that fed the write sits under a condition, and NO `from` on an endpoint whose method provably fails a method test above that binding (`if request.method in <literal methods>`: the header is never read on that request; a test nobody can resolve keeps `cond`); a write one call down carries `set_fn` + `set_via`; a write under a condition `set_cond` (the write's own, or the CALL's when the write sits one call down); the OTHER writes of the same name are `also_set_at`, in REQUEST ORDER like the rows themselves (stations, then positions — never by file name), each site once. A cached function a station calls is met through the module's imports or the station's OWN function-level `from x import y`.
- **Worked example, `POST /setup/complete` (read in source 2026-09-20):** the repeat key is set at `middleware/idempotency.py:25` from the `Idempotency-Key` header, read at `:31` through `api/setup.py:191`, and goes with the answer · `ctx` from `get_auth_context` and `session` from `get_session` (a generator: torn down with the request) go with the answer · `settings` is a cached callee, so it lives with the server process · the sensitive limiter `_sensitive` is built once at `middleware/rate_limit.py:103`, holds `_hits`, counts by `f'{ip}:sensitive'` on SEVEN path prefixes (`rate_limit.py:27-37` — the proposal said four, from the plan's example; the builder read the source) and is met by 23 of 80 endpoints · its cap `rate_limit_sensitive_per_minute` (20, `state: default` — the environment can override) is read once at `:104` and handed to it.

**Modules:** NEW `_a3_forms_inflight.py` (the stations and the rows) over its NEW read leaf `_a3_forms_inflight_read.py` (one function, read once: `_visit` · `_census` · `_cached` · `_closure` · `_mapped` and the repo scan that names unwalked function middleware — imported at column 0, so propagate.sh lands it and forms-core K8 scans it; both under the 800 budget) and NEW leaf `_a3_forms_carrier.py` (~45 — the four shapes of a request carrier, ONE definition for the contract arm and this part; no walker moves, because walk order is what makes `repeat{}`'s bytes). `_a3_forms_contract.py` three edits (525 → ~515) · `_a3_forms_mw.py` +3 · `_a3_forms.py` +~55 (the `INFLIGHT` roster with cites read on this machine: fastapi 0.136.3 · starlette 1.3.1 · uvicorn 0.48.0 · slowapi 0.1.9 · structlog 25.5.0 · CPython 3.12 functools; two OPTIONS; the slot; the part in `ARMS` · `ARM_STAGES` · `ARM_NEEDS`) · `_a3_forms_build.py` +1.

**Algorithm (the plan's detectors D1–D8, condensed):**
1. **Stations, not a grep.** The part looks only where the request really goes: each project middleware's `dispatch`, each dependency FastAPI solves (a called `Depends(factory(...))` walks the nested def the factory RETURNS, never the factory body — that runs at import), then the handler; each read in its own body plus ONE call level. A fact one call down is asked of the ONE falsification leaf (`_a3_forms_falsify`, §A4 fix 3): the call's arguments are bound to the callee's parameters and a fact under a guard that folds to False is no row — `if lock_for_update:` with the flag left at its `False` default takes no lock on this request; an undecided guard keeps the row with `set_cond`; a parameter the callee rebinds, or a call that spreads `*args`/`**kw`, proves nothing. A sub-dependency a factory's closure names through a factory-LOCAL alias (`base = chat_user if allow_anonymous else current_user`, over the factory's own function-level imports) is a station too: the arm the `Depends(factory(...))` call's bindings prove, else every arm as a CONDITIONAL station (its facts say `set_cond`); a factory parameter is the name the call passed, read in the asker's module. A dependency name that still resolves to nothing is COUNTED and NAMED (`deps_unresolved` · `deps_unresolved_at`), and on that endpoint a read with no write says `dep-unresolved` / `cv-dep-unresolved` — a write may sit behind it — never the unqualified `no-write-found` / `cv-get-only`. A test conftest, a startup seed or an unreached helper is never a station.
2. **State** — writes and reads of `<x>.state.<attr>` with RECEIVER PROOF: a parameter typed `Request`/`HTTPConnection`/`WebSocket`, or a dispatch's first parameter, is the request; `app` is the application (process scope); anything else is kept as `receiver: unproven` with scope and dies `unknown`. A read with no write in scope says `set_at: unknown`, rule `no-write-found`.
3. **Contextvar** — only a receiver that RESOLVES to a module-level `ContextVar(...)`; never matched by the method name alone (`dict.get` is not a read). A `reset(token)` in a `finally` of the same function AT OR AFTER the set (a `finally` above the set ran before it and proves nothing — the lock arm's own order guard), or a scoped binder used as `with`, goes with the answer; a set with no reset says `unknown` — nothing in the source says it leaks. A structlog binder is one row per NAME, and its put-back is per name too: `bind_contextvars(job=…, step=…)` with `unbind_contextvars("job")` in the `finally` resets `job` only; a later `clear_contextvars()` resets every name.
4. **Dependency-value** — a handler parameter whose `Depends` resolves: a cached callee or a module-level object is process-scoped; a generator dependency is torn down with the request; else solved per request.
5. **Background** — `tasks.add_task(f, …)`: the task, its arguments, `after_answer: true`, `dies: unknown` (when it ends cannot be read from source). A `BackgroundTasks` parameter with no `add_task` in scope says `queues: none in scope`, or `beyond one level` when it is visibly handed on — as a bare name or anywhere inside an argument expression. One call down the helper's parameter is read through `X | None` · `Optional[X]` · `Union[…]` · `Annotated[X, …]`, and an argument `tasks if FLAG else None` / `tasks or None` maps the ONE caller parameter among its arms, conditionally (`set_cond`).
6. **Lock** — a `with` lock goes with the answer; `with_for_update` and transaction advisory locks say `unknown` + "when its transaction ends"; a pool checkout (`pool.acquire()`) is not a lock; a startup lock is never counted.
7. **Built-once · setting-once** — a middleware's `__init__`: every `self.x = <Call>` that is not a settings read, with the containers its class builds (`holds`) and the path prefixes each read sits under; every settings attribute read there, with its default, env name and declaring line.
8. **Cache** — a function a station meets whose decorator is `lru_cache`/`cache`; deeper reach is COUNTED (`caches_deeper`), never listed.
9. **Framework gate** — a rule citing FastAPI/Starlette opens only at the pinned `FRAMEWORK_MIN` (0.136.1); below it the row says `dies: unknown`, `rule: framework-gate-closed`, `would_be`.

**The three rulings that are the operator's — RULED 2026-09-21: U15 · the carrier · in** (each changes what the card will SAY; the rest below is framework and is the author's by D-017):
- **R1 · the slot's number.** `U15` "In-flight state — what is alive while this request runs: where it is set, where it is read, whether it goes with the answer". U1–U14 are his scorecard; U15 is the next free number. A different number costs one registry line.
- **R2 · what `dies` describes.** PROPOSED: the CARRIER — the `request.state` slot, the solved parameter, the `with` block — not the object behind it; a process object handed in is caught in two shapes (a cached callee · a module-level object) and says so. ALTERNATIVE: `unknown` whenever the object behind the slot is not proven per-request — more cautious, fewer rows that say something. One roster line either way.
- **R3 · dependency-value rows in or out.** PROPOSED: IN — on this endpoint they are three of the five rows of his own after-rows (the login context, the database session, the settings object). They were not in the brief's list of detectors, so they sit behind `OPTIONS.inflight_dep_values` and are the first thing cut if the scope must shrink.

**The author's, stated (D-017 — choices inside the framework):** the part gets its OWN stage so a raise in it never takes `middleware{}`/`dependencies{}` down with it (D32) · rows carry no id letter, they are addressed by their site (D30, the §A4 V33 precedent) · 12b — route-wrapper callables (slowapi `key_func`), `@app.middleware("http")` function stations, module-level and `global`-built objects — is DEFERRED; trigger: gastify's `state:user_id` reads `read_on: 0`, or tier3's `cv-get-only` + `no-write-found` rows outnumber its proven rows at the dry run.

**The law:** arms only add. The one existing value that moves when kinds is on is `arms.kinds.bytes` (the arm's own size accounting, as at Slice 8). `repeat{}` keeps its bytes across the lift — forms-contract E7 pins `repeat.key` by dict equality, and a before/after dry run on gustify must be byte-identical BEFORE any new code lands. Fallback if it is not: drop the lift, keep a private copy of the four shapes.

**Coverage floor, said and never hidden:** v1 does not read gastify's state READ inside a slowapi `key_func`, tier3's ContextVar SETS inside `@app.middleware("http")` closures, module-level and lazy `global` singletons, tier3's hand-rolled TTL cache, instance-dependency state, or anything in a nested def other than a factory's returned closure. Those rows say `none in scope` / `no-write-found` / `unknown`; `stats.inflight.unplaced_middleware`, `factories_unread` and `deps_unresolved` (up to eight NAMED in `deps_unresolved_at`: `<file>:<asker's line> Depends(<expression>)`) count what was not walked — `unplaced_middleware` is every `@<x>.middleware("http")` function in the project's python wherever it is wired from (tier3 registers its own through `add_*_middleware(app)` helpers no stack scan reads; center, vendored and test files never), plus what `_unscanned` names and the unknown classes, with up to eight of them NAMED in `unplaced_middleware_at`: a count and a list, never a station and never a row.

**Goldens (slice `12`, 13 on gustify):** the repeat key's `set_at :25` · its header · its read `:31` via `setup.py:191` · `dies: with the answer` · `ctx` → `get_auth_context` · `session` → `dep-teardown` · `settings` → process · `_sensitive` built at `:103` holding `_hits` · the cap read once with value 20 · and the state-name census. gastify, tier3 and keypro are dry-run NUMBERS in the commit, not goldens.

**Battery:** `tests/forms-kinds` C30–C64 on a third fixture copy (the existing cases keep their counts): one case per kind, each with FIRE · SILENT · an in-test mutation; C38 off · honest-empty · determinism · the whole-feed only-adds proof; C39 isolation (the own stage); C40 request order · C41 the exempt arm (D19) · C42 first write wins · C43 the reset is of the same variable · C44 the coverage floor is said · C45 `from` and its condition · C46 a function-level import · C47 the short ref row · C48 receiver proof (unproven · `app.state`) · C49 a context variable imported inside the function · and one case per region a second mutant sweep found unasserted (20 of 20 survivors): C50 sub-dependencies (a station of their own · before their parent · each once) · C51 a security scheme and a class with no `__init__` as handler parameters · C52 `set_cond` one call down · C53 a met cache's read entry · C54 a context variable `from` a state read · C55 structlog binders, per name · C56 a put-back ABOVE the set proves nothing (both contextvar arms) · C57 a lock's release only in a `finally` and only after the taking · C58 the cache's size words · C59 `as_dependency` + `applies_to` · C60 a setting through a property · C61 the `rules` closure both ways · C62 `stats.names` whole · C63 the refused `inflight_scope` · C64 a dependency value's `read_at` · and one case per defect the precision review of the REAL feeds confirmed (three, all tier3): C65 a fact one call down on a branch the call site decides (every kind; dead · live · undecided · rebound · `**kw` · `*args`) · C66 a factory-local dependency alias (the proven arm · the other arm · both, conditional · a factory parameter · unresolved: counted, named, `dep-unresolved` on that endpoint only) · C67 a `BackgroundTasks` handed down as `tasks if FLAG else None` to a helper typed `BackgroundTasks | None`. C38's determinism has two legs — two builds in one process, and two processes under `PYTHONHASHSEED=1` and `=2` (a set's order never shows inside one process); `also_set_at` is in request order — C42 pins it across three stations whose files sort the other way round, and C38's FIRE leg passes it through a set to prove the two-seed comparison can fail. Generator mutants through `GEN_OVERRIDE`, at least the plan's three (the reset test forced true · the factory walked instead of its closure · the lifted carrier shape lying — which must also turn forms-contract E7 red), plus one per defect a pre-commit review finds.

**Landing order (piece 10's, with its lessons):** the lift alone, proven byte-identical on gustify → registry → the module → battery + mutants → **a review of the REAL feeds before the commit** (precision on real rows · the rule ladder · the law · can the battery fail; each finding tried by a skeptic) → `install.sh` → dry run on the four targets, one at a time, OLD from a clean worktree, every NEW feed saved before the next step → goldens → docs → suite-doctor ALONE → commit by explicit path → twins → the lab carry in its own commit, its feed built at the lab's own head (`05007957`) → a real-click walk to the new rows, with pictures, before any click path is handed over.

**Dry run — record:** per target `stats.inflight` (rows · by_kind · by_dies · by_rule · process · caches_deeper · unplaced_middleware · factories_unread · deps_unresolved · framework_gate) · `arms.kinds.bytes` before and after · `seconds` (the part adds a second reach walk — watch tier3).

**Effort:** L (the plan sizes it at days).

**In-flight state (as built, Slice 12).** `_a3_forms_inflight.py` (652 — the stations and the rows) over its read leaf `_a3_forms_inflight_read.py` (434 — one function, read once: the visitor, the census, the closure, the falsification bind), the `INFLIGHT` roster with its cites in `_a3_forms.py`, and three lines of wiring in `_a3_forms_mw.py`. The part runs in its own stage; `arms.kinds.bytes` is the one prior value that moves.
- **The law, proven on all four targets.** OLD built from a clean worktree of `a2cfa5c`, NEW from this tree, every arm on. With the part's own keys stripped — top-level `inflight`, every endpoint's `inflight`, `arms.kinds.parts.inflight`, `stats.inflight`, the two `inflight_*` options and `arms.kinds.bytes` — NEW equals OLD on gustify `e59e9fea` · gastify `4dfebfff` · tier3 `483d7f896b` · keypro `1e27ee4`.
- **Measured.** gustify 80 endpoints · 706 rows (state 80 · dependency-value 170 · cache 10 · built-once 103 · setting-once 343 · no context variable, no background task, no lock a request reaches — three true zeros) · 15 process rows · **every lifetime known: 238 go with the answer, 468 live with the server, 0 unknown** · feed 3.85 → 4.20 MB. gastify 49 · 243 rows (contextvar 96, all set with no reset · dependency-value 94 · state 47 · background 5 · lock 1) · 102 unknown. tier3 512 · 3,921 rows (contextvar 1,977 · state 971 · dependency-value 943 · lock 22 · background 5 · cache 3) · its lock file pins fastapi 0.133.1, so the gate is CLOSED and 1,919 rows say `framework-gate-closed` with their `would_be`; `unplaced_middleware` 8, named. keypro: absent, "no endpoint forms to build on" — the true answer for a Next.js app.
- **What the REAL-FEED REVIEW caught before the commit** (four lenses over gustify · gastify · tier3, each finding tried by a skeptic; 8 of 14 stood, three distinct defects, ALL on tier3, none of them visible to the battery):
  - **A false claim.** A fact one call down was kept although the CALL SITE decides its branch: `GET /skills/{skill_id}` carried a lock taken under `if lock_for_update:` on a parameter the endpoint never passes — 14 of 30 lock rows. The part now ASKS the suite's own falsification leaf (`_a3_forms_falsify` bind · truth, §A4 fix 3) for every kind one call down. tier3 locks 36 → 22: the two call sites that pass `for_update=True` (`manage/search_settings.py:136` · `:452`) keep their rows, the nine that do not lost theirs.
  - **A wrong reason on 470 rows.** A dependency a factory names through a LOCAL ALIAS (`base_user = current_chat_accessible_user if allow_anonymous else current_user`, a function-level import, in tier3's `require_permission`) failed to resolve and was dropped in silence, so 470 endpoints said `no-write-found` — the wrong reason — for a `token_scopes` their own chain writes. The alias is now resolved through the factory's body and its own imports; what still cannot be resolved is COUNTED and NAMED (`deps_unresolved` · `deps_unresolved_at`, 6 on tier3) and such an endpoint's unwritten read says `dep-unresolved`, never the unqualified text. tier3 `no-write-found` 470 → 0; the chain through `optional_user` adds 466 × 4 true rows (`users.py:2146` · `:2162` · `:2215` · `:2216`), which is the 2,486 → 3,921 growth.
  - **A false "queues nothing".** `POST /user/projects/file/upload` passes `background_tasks=bg_tasks if DISABLE_VECTOR_DB else None` to a callee typed `BackgroundTasks | None` that queues at `db/projects.py:155` — one call down, inside the part's own reach. The annotation reader now unwraps `X | None` · `Optional` · `Union` · `Annotated`, and an argument that is a conditional or a boolean expression maps to its parameter (marked conditional), so the row reads `queues: found` with its task, `set_fn`, `set_via` and `set_cond`; the spec's `beyond one level` + `passed_at` can fire too.
  - Every gustify row the review read agreed with the source, and gustify's rows did not move for any of the three fixes (only the two new stat keys appeared).
- **The battery cannot be taken on faith.** `tests/forms-kinds` C30–C67 (56 cases; the file is 1,715 lines, over the 800 report-never-gate budget). THREE independent mutant sweeps were run, each by an agent that had not written the code: the first found 18 of 20 new mutants surviving, the second 20 of 20 — every time in a region the fixture did not contain (alternate shapes, then sub-dependencies · structlog binders · cache size words · a setting through a property · the rules closure). Each survivor came with a proven kill case. **96 one-line mutants are now tried and 96 are red, none equivalent** (runner and per-mutant output in the session's scratch). A builder's own battery proves the happy shape; only a fresh sweeper finds what it never looked at.
- **Fixed on the way** (each with its own case and mutant): a reset in a `finally` ABOVE its `set` was read as that set's reset, so a row claimed "with the answer" for a lifetime nothing proves; a structlog unbind was matched per call rather than per name; a context variable imported inside a function was invisible; `also_set_at` sorted line 100 before line 99 and now lists the other writes in request order; the determinism leg now builds under two hash seeds and is proven able to fail; a refused `inflight_scope` says the scope that was asked.
- **Goldens (slice `12`, eighteen on gustify, 85 of 85 in the sheet):** the repeat key's set site, its setter, its header with `cond`, a GET claiming no header, its read and the call it came through, its lifetime · `ctx` · `session` as a generator dependency · `settings` as process-scoped · the sensitive limiter's build site, what it holds, its SEVEN path prefixes and the 23 endpoints that meet it · its cap read once at 20 · the state census · the three true zeros. On the old-code feed all eighteen read `missing`.

---

## §A3 · Module map

All paths are in `GEN/`. Every module is stdlib-only at top level and uses column-0 imports.

| module | slice | est. lines | imports | imported by |
|---|---|---|---|---|
| `_a3_forms.py` (registry, data) | 1–10 | 106 → ~330 | — | everything below, `_a3_paths` |
| `_a3_forms_short.py` (data) | 4 | ~130 | — | schema · model · migrate · setting · mirror |
| `_a3_forms_fe.py` (data) | 11 | ~95 | — | `_a3_fe_forms`, `_a3_fe_reason` |
| `_a3_forms_build.py` (orchestrator) | 1 | ~210 with the ids pass | every arm module below, `_a3_forms_ids` | `build_center_a3.py` |
| `_a3_forms_ids.py` | 1 | ~80 | `_a3_forms` | build, arms |
| `_a3_forms_settings.py` | 1 | ~200 | `_a3_paths`, `_a3_code`, `_a3_forms`, `_a3_stacks_pydi` | paths, contract, mw, setting |
| `_a3_forms_catch.py` | 1 | ~150 | `_a3_paths`, `_a3_forms` | paths, effects, fn |
| `_a3_forms_reach.py` | 1 | ~160 | `_a3_paths`, `_a3_code`, `_a3_forms`, `_a3_graft` (`_is_center` only) | paths, switch, effects, fn, task, model, setting |
| `_a3_forms_paths.py` | 3, 4, 5 | ~500 | leaves | build |
| `_a3_forms_mw.py` | 3 | ~260 | leaves | build |
| `_a3_forms_schema.py` | 4 | ~430 | leaves, `_a3_forms_short` | build |
| `_a3_forms_switch.py` | 5 | ~280 | leaves, `_a3_stacks_pydi` | build |
| `_a3_forms_effects.py` | 6 | ~520 | leaves | build |
| `_a3_forms_contract.py` | 7 | ~340 | leaves | build |
| `_a3_forms_fn.py` · `_a3_forms_task.py` | 8 | ~260 · ~250 | leaves | build |
| `_a3_test_asserts.py` · `_a3_forms_tests.py` | 9 | ~280 · ~240 | `_a3_tests`, `_a3_paths`, `_a3_forms`, `_center_data` | build · tests, setting, schema |
| `_a3_forms_model.py` · `_a3_forms_migrate.py` · `_a3_forms_setting.py` · `_a3_forms_mirror.py` | 10 | ~380 · ~300 · ~360 · ~280 | leaves, `_a3_forms_short` (model imports migrate) | build |
| `_a3_fe_forms.py` · `_a3_fe_reason.py` | 11 | ~560 · ~230 | `_a3_forms`, `_a3_forms_fe`, `_a3_fe` (rosters), `_a3_graph._norm_path` | build |
| `_a3_fe_extract.mjs` (existing) | 11 | 288 → ~560 | — | `_a3_fe.run_extractor` |

**Import chain for propagate.**
- `build_center_a3.py` adds only `import _a3_forms_build` at column 0, beside `:52`.
- `_a3_forms_build` imports every arm module at column 0.
- The arms import the leaves at column 0.
- `propagate.sh:41` greps `^(import|from) <mod>\b` over **every** `GEN/*.py` (V), so a module imported by any suite generator lands on the twins, and so does one imported by another new module.
- `\b` keeps `_a3_forms` from matching `_a3_forms_build`: `s_` has no word boundary.
- The extractor extension lands through the update loop, because the file already exists on the twins (`propagate.sh:25-32`). A **new** `.mjs` would only print `NEW (not vendored)` (`:47`), which is why no new `.mjs` is created.

**No cycles:**
- `_a3_paths`, `_a3_code`, `_a3_graft` and `_a3_stacks_pydi` import no forms module.
- No arm imports another arm; cross-arm data flows through the in-memory feed dict.
- The only arm-to-arm import is model → migrate.

**Size budget:**
- Every new module stays under 800 lines.
- `_a3_paths.py` stays at **1,000, untouched** (D26). Its private helpers are imported by the arms. Precedent: `_a3_paths.py:34` imports pydi's `_ann_name`. forms-core K8 pins the imported names.
- `_a3_fe.py`: 776 → ~779.
- `build_center_a3.py`: 2,558 → ~2,580 (over budget, report-never-gate; state the numbers in the commit).
- **Totals:** new generator code ≈ 6.4k lines across 24 modules, plus ≈ 270 in the extractor. New batteries ≈ 2.8k lines across 8 directories: forms-core · forms-paths · forms-kinds · forms-short · forms-effects · forms-contract · forms-tests · forms-frontend.
- **Optional split of `_a3_paths.py`,** triggered only when a later change must edit it: move `_path_prefixes` · `_middleware_exits` · `_app_handlers` (`:590-730`) to `_a3_paths_mw.py`. Keep re-exports in `_a3_paths` so every arm's private import survives. Byte-neutral, proven by `map-baseline.sh check`.

---

## §A4 · Verification and polish pass (after Slices 1–11)

1. **Goldens as data, beside the drawing.**
   - `docs/design/element-forms/goldens/expected.json` holds every (V)/(R) golden in §A2, entered by hand.
   - `docs/design/element-forms/goldens/check-goldens.py` is read-only: `<forms.json>` prints match / mismatch / missing per golden. For `POST /setup/complete` and `RequireSetup` it also prints each generated path as an ordered chain beside `PATHS_API` / `MAP_API` from `shallow-logic-maps.html`.
   - This is a verification tool, not a surface, and not a generator.
   - **As built (2026-09-15).** `expected.json` holds 62 goldens entered by hand from §A2 — each with its mark (V · R · P · U), a `get` path into the feed and one comparison (`eq` · `has` · `len` · `gte` · `exists`); the path steps are a key, an index, `{"where": …}` / `{"where_not": …}`, `{"values": true}`, `{"pluck": k}`, `{"first": true}`. `check-goldens.py` prints MATCH · MISMATCH (what the feed says) · MISSING (where the path stopped), exits non-zero on either, and with `--chains` prints `POST /setup/complete`'s 14 generated paths and `RequireSetup`'s 7 chain rows beside the drawn rows it READS from `shallow-logic-maps.html` (`PATHS_API` · `PATHS_WEB`). On the Slice 11d dry-run feed: **62 match · 0 mismatch · 0 missing**.
   - Two goldens were sharpened by the first run, both on the golden's side, not the generator's: the 422 body row carries 42 `cases` — the 41 defined ones plus FastAPI's own `body/missing` (`state: default`, no `rule`/`schema`), which §A2 already placed "beside the list", so the golden filters it out; and `race-500`'s feed-wide count lives in `arms.contract.stats.findings` with the per-endpoint rows in `endpoints[k].arm_findings.contract` — §A1's own rule — never in a top-level `arm_findings.contract`.
2. **Review workflow** (read-only, ≤6 agents, one verifier over the deduped union).
   - Lenses:
     - (a) goldens mismatches;
     - (b) per arm, 10 gustify endpoints re-read by hand against their feed rows;
     - (c) the tier3 false-positive sweep;
     - (d) gastify as a second FastAPI style;
     - (e) determinism and id stability;
     - (f) feed shape against §A1.
   - Output: a findings list; nothing is written by the agents.
   - **As run (2026-09-15).** Five lenses (backend arms on gustify · the tier3 sweep · gastify as a second FastAPI style · the feed shape against §A1 · the frontend arm) + one verifier over the deduped union: **56 raw findings → 48 merged · 40 CONFIRMED · 8 REFUTED**. The record, with every citation, the precision tables of step 3 and the fix order, is [review-a4.md](review-a4.md). Two of this amendment's own BREAKS IF conditions have fired: **D26** (six confirmed rows change an endpoint row's own content → split `_a3_paths.py` first, in its own commit) and **D28** (gastify pins FastAPI 0.136.1 and tier3 0.133.1, so the version gate erases every dependency effect on both).
   - The verifier's ranking spine: the endpoint pass ships ON by default and every arm OFF, and `form_drift.py` + `mapquery.form_summary` read the endpoint pass today while no consumer reads an arm (D16) — so a wrong endpoint-pass row costs a live false nag, and a wrong arm row costs the operator's acceptance read. Root causes, in size order: an idiom the reader does not know (12) · §A1 not kept in step with the build (9) · a number printed where there is no knowledge (8) · the callee treated as atomic on the path (7) · a literal never crossing the call boundary (4) · a framework rule the endpoint pass does not mirror (4) · a commit assumed to have succeeded (2).
3. **tier3 false-positive sweep.** For every finding id and every `unknown` reason on tier3, sample up to 20 hits and read the source.
   - **As run (2026-09-15).** All 17 finding ids and all 23 reason strings, 231 rows read against source. Below the 80% bar and owed a fix: `declared-unproduced` **0%** · the collapsed reason "generator: runs after the response line" **12%** · `refusal-writes` **50%** · `shared-status` **65%**; at the bar `reason-lost` 80%; above it `escape-500` 85% · `untranslated-raise` 86% and nine ids at 100%. Every `unknown`/absent reason sampled honest. Tables in [review-a4.md](review-a4.md).
   - Record precision per finding.
   - Below 80%: tighten the rule, demote the finding to `count`, or fold it into `unknown` with a reason. Every fix ships with a battery case.
4. **Id stability on real code — PASSED (2026-09-15):** a gustify copy rebuilt with one blank line prepended to every `.py` (3,428 files) kept **4,036 ids · 2,186 distinct · 0 added · 0 dropped**, while all 2,365 `.py` anchors moved by exactly one line. Method: copy gustify's `apps/api` into scratch (check `df -h /mnt/c` and `du -sh /var/log` first), prepend one blank line to every `.py`, and rebuild with all arms on. Every `x g r b p sw st c k w e` id must be equal and every `at` different. Record counts.
5. **Polish loop.** Each fix goes in its own commit with its battery case and dry-run numbers. `_a3_paths.py` stays untouched (D26).
6. **The operator reads each arm's generated goldens and output** (in the lab, via `LABEP.forms`, and in `check-goldens.py`), then accepts per arm. An accepted arm flips its default to on (the D4 precedent, per arm). Display choices are made there, later, not in this plan.
7. **Consumer uptake,** after acceptance and in this order:
   - (a) `form_drift.py`: NAG/COUNT read from `_a3_forms.FINDINGS` by `arm` (the K7 sync stays); S20 counts arm findings (`race-500` · `migration-drift` · `mirror-disagree` · `retry-unbounded` · `reason-collapsed` · `redirect-loop` · `no-rollback` · `dead-control` as nag); pulse-angles cases above the summary line.
   - (b) gabe-map:
     - `mapquery.form_summary` keep list (`mapquery.py:666-673`) gains `id`;
     - `touches` on middleware, function, task, schema, model, setting and fe piece;
     - `trace.from_form` gains paths;
     - `map_census kind=forms` gains an arms section;
     - the TS-only `forms_block` state (`:180-182`) reads `arms.frontend`.
   - (c) review FORM DRIFT: diff arms for a diff-added `race`, `migration-drift`, and a client `error.status === N`.
   - (d) `map-baseline.sh` census: per-arm measures beside `:102-107`.
   - (e) Version bumps: pulse, review, map. Update CLAUDE.md rows in the same commit (doctor parity).
8. **Close:**
   - `gen/README.md` module table and emit order;
   - the CLAUDE.md forms bullet;
   - `templates/center/shell/README.md` feed list;
   - `./install.sh`;
   - `write_facts.py --only <each new battery>`;
   - re-bless the forms.json hash in `tests/baselines/*.sha256` (archmap/c4/levels must show identical);
   - `scripts/suite-doctor.sh` CLEAN (≈5–6 min, alone);
   - `propagate.sh <twin> --check`, then the real run, gustify then gastify; twin commits by explicit path;
   - push/PR is the operator's manual beat.
9. **Size check (D20).** Record `forms.json` bytes per target and per arm. Apply the split trigger if it is crossed.

---

## §A5 · Decisions taken (generation only)

DECISION D11: scope of this amendment
CHOSE: finish generation (lists A and B, Phase 4, Phase 5) first; Phase 6 surfaces and every display choice come later
ASSUMED: the operator judges display by seeing the generated data in the app
BREAKS IF: a slice cannot be judged without a surface. Then that one surface moves forward as its own Phase 6 item.

DECISION D12: switch policy
CHOSE: one switch per arm (`forms_arms`, `GABE_FORMS_ARMS`), all default OFF; only `version: 2` and `head` ride on, at Slice 1
ASSUMED: one forms-only re-bless at Slice 1 is acceptable. No consumer reads `version` (grep of form_drift, mapquery and tools_wave2/3, V).
BREAKS IF: a consumer starts gating on `version == 1`. Then bump it with that consumer's update.

DECISION D13: ids
CHOSE: prefixed sha1 of a canonical tuple with no line numbers, an ordinal scoped to the function, written whenever any arm is on
ASSUMED: text-level change is the right identity change and line drift is not
BREAKS IF: the operator wants an id to survive a detail rewording. Then drop `detail` from the `x:` tuple and accept collisions resolved by `n`.

DECISION D14: one path identity
CHOSE: D1's per-exit paths with deciding-callee expansion, linear combination and PATH_CAP 48; effects walk along paths and never fork
ASSUMED: the drawn collapse rule (`shallow-logic-maps.html:348`) holds on real code
BREAKS IF: an operator-drawn path needs two non-exiting branches combined. Then flip `OPTIONS.combos` to `product` for that endpoint class.

DECISION D15: path names
CHOSE: emit `names{}` candidates only, never a chosen `name`
ASSUMED: naming is a display rail option (`path-map-status.md:289`)
BREAKS IF: a non-display consumer (pulse, review) needs one name. Then pick it in that consumer, not the feed.

DECISION D16: where new findings live
CHOSE: `arm_findings.<arm>` and `arms.<arm>.stats.findings`; `endpoints[k].findings[]` and `stats.findings` stay frozen until §A4 step 7
ASSUMED: S20, `touches.form` and the `forms_nag` census should not move before acceptance
BREAKS IF: the operator wants S20 to see an arm before its acceptance. Then do that arm's consumer uptake early.

DECISION D17: how deep the reading goes
CHOSE: rows stay at plan D6 (handler + one level + dependencies ≤4); discovery (reach, value switches, effects collapse) reads to `reach_depth` 4
ASSUMED: a deeper read that never mints a row cannot inflate refusals
BREAKS IF: tier3 reach time or bytes cross D20. Then lower `reach_depth` per arm.

DECISION D18: bindings source
CHOSE: `_a3_stacks_pydi.parse(repo)` recomputed inside forms; levels `binds` is a cross-check count
ASSUMED: forms must run without graft and before c4/levels (`build_center_a3.py:2199` vs `:2221`)
BREAKS IF: pydi's predicates diverge from levels. The P8 equality assert catches it.

DECISION D19: exempt middleware rows
CHOSE: `annotate` (the row stays, `applies: false`, no path)
ASSUMED: S20 and review bytes should not move before consumer uptake
BREAKS IF: the operator reads `/healthz`'s 429 row as a bug. Then flip `exempt_rows: drop`; S20 moves by one endpoint on gustify.

DECISION D20: one feed file
CHOSE: every arm writes into `forms.json`
ASSUMED: gabe-map's single lazy loader stays fast enough
BREAKS IF: on any target, `forms.json` exceeds that target's `archmap.json` (tier3 archmap 9,956,334 B, V). Then split into `forms.<arm>.json` with a loader ruling.

DECISION D21: frontend flow capture
CHOSE: a second extractor invocation behind `GABE_FE_FLOW=1` with its own timeout; `forms.json` is written when `present` or `arms.frontend.present`
ASSUMED: doubling extractor time is affordable when the arm is on, and a new file on TS-only trees is wanted
BREAKS IF: tier3 extractor time doubles past the operator's budget. Then use a single run with a re-run-without-flow fallback.

DECISION D22: Phase 5 trigger
CHOSE: Slice 11 starts when Slices 1–10 pass their exit criteria on copies, not after a twin refresh cycle
ASSUMED: arms are default off, so nothing depends on twins carrying Phase 4 first; joins use only `x:` ids
BREAKS IF: an endpoint arm's id tuple changes after Slice 11 lands. Then re-bless forms-frontend fixtures in the same commit.

DECISION D23: the sixth state
CHOSE: `external` = a value set only by the deploy platform; rollup precedence `defined > external > default > unknown > missing > n/a`
ASSUMED: an external value is a fact, just not in the repo
BREAKS IF: the operator wants external to count as missing for audits. Then swap its rank with `unknown`.

DECISION D24: environment files
CHOSE: a fixed filename allow-list; never `.env` or `.env*.local`; never `git ls-files`; secrets redacted
ASSUMED: dry-run copies may lack `.git`, and determinism beats coverage
BREAKS IF: a twin keeps its example env under another name. Then add it to `ENV_FILES`.

DECISION D25: arms census registration (plan D3)
CHOSE: still not registered in `_a3_stacks.REGISTER`; coverage is stated in `arms.*` and `frontend.idioms`
ASSUMED: moving archmap bytes on every map is not worth it
BREAKS IF: the operator wants the arms census to show forms coverage on TS-only trees.

DECISION D26: `_a3_paths.py`
CHOSE: untouched (1,000 lines); new work in new modules that import its privates; the split is optional and byte-neutral with re-exports
ASSUMED: endpoint bytes and C0–C13 must not move
BREAKS IF: a slice must change an endpoint row's own content. Then split first, in its own commit.

DECISION D27: the test over-credit source
CHOSE: fixed only for forms readers; `_a3_tests._credit_ep` (`:353-356`) unchanged
ASSUMED: archmap, c4 and levels bytes stay put in this amendment
BREAKS IF: the operator accepts Slice 9's output. That is the trigger for a separate re-bless commit fixing the source.

DECISION D28: framework ordering rules
CHOSE: `DEPENDENCY_ORDER` and body-parse exits as registry literals cited to FastAPI 0.136.3, version-gated; below it, `unknown`
ASSUMED: gustify and gastify stay on ≥0.136.3
BREAKS IF: a twin pins an older FastAPI. Then read that version's `routing.py` and `dependencies/utils.py` and add a gated row.

DECISION D29: what a reason branch does (Slice 11e)
CHOSE: keys inside the reason part · rows addressed by `at` and order, no id letter (V33) · no finding · `branch` and every prior key untouched · the estate's phrase `beyond one level` for a comparison the caller decides · a `useNavigate` roster that classes a row and builds no guard · `toast` as a library idiom with its provenance on the row · no react-i18next entry until a target installs it
ASSUMED: a then-arm row carries the comparison's own guards plus the condition (`_a3_fe_extract.mjs`, the if · ternary · `&&` walkers) · no target needs react-intl, SWR revalidation or an assignment row to be read usefully
BREAKS IF: `no-rows` or `beyond one level` dominate a dry run — then the extractor needs a branch ordinal and assignment rows, which forces a re-freeze; or the operator wants `branch` recomputed from the narrowed rows, which moves `reason-collapsed` counts and gets its own commit

DECISION D30 (Slice 12): in-flight rows carry no id
CHOSE: rows addressed by (kind · carrier · name · set_at) and process rows by their map key, over minting an id letter
ASSUMED: no consumer needs to point at one in-flight row from another block before the lab carry
BREAKS IF: a second block must reference a row — then an `i:` id is minted in the ids leaf, in its own commit

DECISION D31 (RULED by the operator 2026-09-21, Slice 12 — the operator's ruling R2): `dies` is the CARRIER's lifetime, and only a roster rule may say it
CHOSE: the slot that carries the value (request.state · the solved parameter · the with block) over the object behind it; a process object handed in is caught in two shapes and says so
ASSUMED: the brief's ruling for request.state extends to dependency values and with-block locks
BREAKS IF: the operator reads "with the answer" on a row whose object outlives the request and finds it misleading — then the rule says `unknown` there (one roster line)

DECISION D32 (Slice 12): the part runs in its OWN stage of the kinds arm
CHOSE: a stage of its own right after middleware · dependencies, over sharing their stage
ASSUMED: it reads nothing the effects or contract arms write
BREAKS IF: a later part needs in-flight rows inside the first kinds stage — a hard need inside one stage is impossible, so the stages are re-cut then

---

## §A6 · Traps carried forward

**Import and landing rules**
- **A dry run reads the working tree and writes the lab's input.** `forms-dryrun.sh` builds from the generators as they stand at each step, so an edit made while it runs gives a feed no commit produced; and it writes `~/.cache/gabe-map-baselines/.check/<name>/`, where `.check/gustify/` is what the endpoint lab reads. Edit nothing while it runs, take OLD snapshots from a clean `git worktree` (copy the untracked `tests/baselines/targets.conf` in), save every NEW feed before the next step, and restore the lab's input from `lab-input/` afterwards (Slice 11e lost one feed each way).
- **Column-0 import or no twin.** New modules are imported by `_a3_forms_build` at column 0 (`propagate.sh:41`). A new `.mjs` never lands (`:47`).
- **Private-helper coupling.** Arms import `_a3_paths` privates (`_walk`, `_events`, `_climb`, `_callee`, `_deps`, `_analyse`, `_find_handler`, `_middleware_exits`, `_app_handlers`, `_literal`, `_where`, …). A split must re-export them; forms-core K8 fails otherwise.
- **The vendored-center skip list is built at import from the generator dir** (`_a3_graft.py:69-75`). tier3's `scripts/_a3_code.py` carries a BaseSettings class, and any all-`.py` scan must skip it through `_a3_forms_reach`.

**Reading `_a3_paths` and archmap facts**
- **`_climb` breaks on a bare `raise`** (`_a3_paths.py:340-341`): that is **pass-through**. "Rethrow" means a different class.
- **`_walk` drops a bare `return`** (`:302-305`), and **`P._exits` ignores `break`** (`:254-255`).
- **Archmap `access.commits` is true on a flush** (`_a3_code.py:1678`); `services/idempotency.py::complete` only flushes (`:156`, V).
- **`_orm_access` ops carry no line** (`_a3_code.py:1762-1764`). The line-carrying variant lives only in forms.
- **Two function id formats:** `file::qual` and `file#qual`. Archmap dispatch `t` is `file#qual`.
- **`stats.findings` is counted inside `P.build`** (`:935-936`). Appending to `endpoints[k].findings[]` leaves it stale.

**Consumers**
- **`form_drift.py:37-38` hardcodes NAG/COUNT**, and **`mapquery.py:666-673` drops every key not listed.** New findings and keys are invisible to consumers until §A4 step 7.
- **The two state-word vocabularies are inverted** (`mapquery.py:177-182` vs `form_drift.py:54-63`). Slice 1 fixes them to the `entity_models` convention.

**Build and feed**
- **The build writes `forms.json` only when `present`** (`build_center_a3.py:2202`). The TS-only rule change is explicit in Slice 11.
- **`tests/frontend` re-derives `extract.frozen.json` byte for byte.** Flow capture must stay behind its flag and in a second invocation.
- **`_a3_fe.py` is at 776 lines.** Glue goes in `_a3_fe_forms.py`.
- **`regen-example.sh --check` normalises `head` and reverts uncommitted example-page edits.** Add `forms.head` to its normalisation; never run `--check` over unsaved lab edits.
- **A battery line printed after its summary line never counts.**

**FastAPI and Starlette rules**
- **FastAPI order:** body JSON decode 422 (`routing.py:427`) and body parse 400 (`:447`) run before `solve_dependencies` (`:457`). A dependency whose own params fail is skipped (`dependencies/utils.py:660-663`). The endpoint-param raise is `routing.py:723`.
- **Starlette middleware runs last-added first** (`applications.py:101`).
- **`get_session` never commits** (`db.py:51-54`). The request session is shared through the dependency cache, so a handler rollback cannot undo the auth commit at `auth/context.py:79`.

**Gustify golden corrections**
- **`_strip_name`:** strip `schemas/setup.py:43`, pred `:44`, raise **`:45`**.
- **C1052** sends 4 allergens (under `MAX_ALLERGENS` 5): its 422 is the runtime allow-list.

**Process**
- **Design goldens carrying hash strings are provisional.** Ids are pinned structurally in batteries and recorded from the dry run.
- **A concurrent session's `git add -A` has swallowed a commit on this branch.** Commit by explicit path; check `git log -1` before and after.
- **Machine limits:** heavy verification runs one job at a time (tsc, vitest, builds, doctor, `map-baseline.sh`, tier3 builds of several minutes). Check `df -h /mnt/c` and `du -sh /var/log` before copying gustify or tier3 into scratch.

**Carried unverified (re-measure at the dry run, never cite as fact):**
- the credit-tier call-chain lines to `allowance_for`;
- replay's "11 tables";
- the ≈135 helper-arranged test cases and the 12 / 14 act/arrange split;
- the tier3 reach and extractor timings;
- whether `start_session` catches IntegrityError;
- the receivers at `api/recipe_creation.py:235` and `api/recipe_stream.py:195`;
- whether tier3's fastapi-users routers are in the archmap endpoints;
- the `fastapi/security/api_key` `reads` source line;
- the SQLAlchemy 2.0 `Mapped[Optional]` nullability source line.