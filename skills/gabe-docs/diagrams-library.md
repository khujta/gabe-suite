---
name: gabe-docs-diagrams-library
description: "Rich Mermaid pattern library — 14 advanced diagrams with styling, subgraphs, multi-layer flows. Inspirational reference for /gabe-commit update-docs / upgrade-diagram (and the archived /gabe-teach's diagram prompts). Not direct templates — pull styling ideas and composition patterns, then adapt to project context."
source: Brownbull visual architecture v0.3.0 (khujta_mem/.research/diagrams/DIAGRAMS.md)
---

# Diagram Pattern Library — Inspirational Reference

Use this library when the minimal skeletons in `SKILL.md` aren't enough and a doc genuinely needs **advanced composition** — subgraphs, multi-layer flows, styled nodes, state machines with notes, or sequence diagrams with multiple actors + alt-branches.

**How to use:**

1. Start with `SKILL.md` → per-doc-type matrix + per-well table → pick the right diagram **type**.
2. If the diagram needs ≥3 actors, ≥3 layers, parallel branches, or the reader must see hierarchy → consult this library for a pattern.
3. Copy the **composition idea** (subgraph grouping, color legend, `-.->` for implicit edges, notes on sequence diagrams) — not the domain-specific content.
4. Keep the `5-10 nodes ideal, 15 maximum` rule from `SKILL.md`. Library examples often exceed that ceiling because they document a whole system; your docs should stay scoped.

**Pattern → example index:**

| Need | Example in library |
|---|---|
| Three-layer stack with dotted cross-edges | §0 Three-Layer Configuration |
| Progressive horizontal flow (A → B → C → D) | §0b Progressive Knowledge Disclosure |
| Router with 5+ branches each producing distinct artifact | §1 Command Router |
| Mindmap taxonomy | §2 Five Domains Overview |
| State machine with notes + implicit self-loop | §3 Agent Loop Lifecycle |
| Coordinator + N subagents with role colors | §4 Coordinator-Subagent |
| Decision tree (binary) with outcome branches | §5 Workflow Enforcement Decision |
| Quality pyramid (L3 → L2 → L1) | §6 Tool Design Pyramid |
| Hierarchical config (user → project → dir) with nested subgraphs | §7 Config Hierarchy |
| Pipeline with validation + retry loop | §8 Structured Output Pipeline |
| Generation → independent review → routing | §9 Multi-Pass Review |
| Budget/strategies/escalation three-tier | §10 Context Management |
| Sequence with `alt`-branches for multiple modes | §11 KDBP Session Lifecycle |
| Anti-pattern → fix pairing (parallel lists) | §12 Anti-Pattern → Fix |
| Defense-in-depth with classifier fork | §13 5-Layer Guardrail |
| Sequence with dynamic hook registration + note | §14 Skills ↔ Hooks |

Source content retains Brownbull/Claude-agent domain terms; treat terms as placeholder, keep structure.

---

# Brownbull — Visual Architecture

## 0. Three-Layer Configuration Model (Foundation)

```mermaid
flowchart TB
    subgraph RULES["Layer 1: RULES (Guidance)"]
        direction TB
        R1["CLAUDE.md (6 levels)"]
        R2[".claude/rules/*.md<br/><i>unconditional + conditional (paths: globs)</i>"]
        R3["@import for modular composition"]
        R_EFFECT["Model TRIES to follow"]
    end

    subgraph SKILLS["Layer 2: SKILLS (Workflows)"]
        direction TB
        S1["SKILL.md (7 discovery sources)"]
        S2["Frontmatter: fork, hooks,<br/>allowed-tools, paths, agent"]
        S3["Dynamic context: !`command`<br/>String substitution: $ARGUMENTS"]
        S_EFFECT["Model INVOKES when relevant"]
    end

    subgraph HOOKS["Layer 3: HOOKS (Enforcement)"]
        direction TB
        H1["4 types: command | prompt | agent | http"]
        H2["21 lifecycle events"]
        H3["Matcher: exact | pipe | regex<br/>+ if condition (Zod-parsed)"]
        H_EFFECT["GUARANTEED execution"]
    end

    RULES -->|"tells WHAT to do"| SKILLS
    SKILLS -->|"packages HOW"| HOOKS
    HOOKS -->|"GUARANTEES it was done"| RESULT[Production Agent]

    SKILLS -.->|"skills install<br/>session-scoped hooks"| HOOKS
    RULES -.->|"conditional rules load<br/>when matching files accessed"| SKILLS

    style RULES fill:#e8f5e9
    style SKILLS fill:#e3f2fd
    style HOOKS fill:#ffcdd2
    style RESULT fill:#fff9c4
```

## 0b. Progressive Knowledge Disclosure (4 Temporal Scales)

```mermaid
flowchart LR
    subgraph START["Session Start (~10K tokens)"]
        direction TB
        SS1["System prompt (memoized sections)"]
        SS2["CLAUDE.md hierarchy (6 levels)"]
        SS3["MEMORY.md index (200 lines)"]
        SS4["Unconditional rules"]
        SS5["Skill names (1% budget)"]
        SS6["Deferred tool names only"]
    end

    subgraph TURN["Per Turn (variable, capped)"]
        direction TB
        PT1["Relevant memories<br/>(Sonnet side-query, max 5)"]
        PT2["Delta announcements<br/>(only changes)"]
        PT3["Conditional rules<br/>(on file access)"]
        PT4["Changed files<br/>(mtime check)"]
    end

    subgraph DEMAND["On Demand"]
        direction TB
        OD1["ToolSearch<br/>(schemas by keyword)"]
        OD2["MCP resources<br/>(List → Read)"]
        OD3["Full memory content"]
    end

    subgraph PRESSURE["Under Pressure"]
        direction TB
        UP1["Microcompact<br/>(clear old tool results)"]
        UP2["History snip<br/>(hide old turns)"]
        UP3["Full LLM compact<br/>(9-section summary)"]
        UP4["Post-compact restoration<br/>(top 5 files + deltas)"]
    end

    START --> TURN --> DEMAND --> PRESSURE

    style START fill:#c8e6c9
    style TURN fill:#bbdefb
    style DEMAND fill:#fff9c4
    style PRESSURE fill:#ffcdd2
```

## 1. Command Router

```mermaid
flowchart TD
    INPUT[/"Agent source material"/]
    ROUTER{Command?}

    INPUT --> ROUTER

    ROUTER -->|ANALYZE| A[Read source]
    A --> A1[Score all 5 domains]
    A1 --> A2[Classify gaps]
    A2 --> A3[/"ANALYZE Report<br/>D1-D5 scorecards"/]

    ROUTER -->|TRANSFORM| T[Run ANALYZE first]
    T --> T1[Map intent → SDK primitives]
    T1 --> T2[Design architecture<br/>+ tools + config + prompts]
    T2 --> T3[Generate all artifacts]
    T3 --> T4[/"SDK Agent Project<br/>+ CLAUDE.md + .claude/ + .mcp.json"/]

    ROUTER -->|ENHANCE| E[Read SDK agent]
    E --> E1[Score 5 domains]
    E1 --> E2[Rank improvements]
    E2 --> E3[/"ENHANCE Report<br/>+ Code Patches"/]

    ROUTER -->|SCAFFOLD| S[Profile requirements]
    S --> S1[Select pattern + design all 5 domains]
    S1 --> S2[Generate full project]
    S2 --> S3[/"New SDK Agent Project"/]

    ROUTER -->|AUDIT| AU[Single domain deep dive]
    AU --> AU1[Score every task statement]
    AU1 --> AU2[/"Domain-Specific<br/>Audit Report"/]

    style A3 fill:#e8f5e9
    style T4 fill:#e8f5e9
    style E3 fill:#e8f5e9
    style S3 fill:#e8f5e9
    style AU2 fill:#e8f5e9
```

## 2. Five Domains Overview

```mermaid
mindmap
  root((Brownbull<br/>Claude Architect))
    D1 Agentic Architecture 27%
      Agent loop lifecycle
      Coordinator-subagent patterns
      Subagent context passing
      Workflow enforcement via hooks
      Task decomposition strategies
      Session state management
    D2 Tool Design & MCP 18%
      Tool descriptions & boundaries
      Structured error responses
      Tool distribution & tool_choice
      MCP server configuration
      Built-in tool selection
    D3 Claude Code Config 20%
      Three-layer model rules/skills/hooks
      CLAUDE.md hierarchy 6 levels
      SKILL.md 13 frontmatter fields
      4 hook types, 21 lifecycle events
      Path-specific rules conditional loading
      Plan mode + CI/CD integration
    D4 Prompt Engineering 20%
      Explicit criteria
      Few-shot prompting
      tool_use + JSON schemas
      Validation & retry loops
      Batch processing
      Multi-pass review
    D5 Context & Reliability 15%
      14 progressive disclosure patterns
      4-scale context loading
      Compaction + intent preservation
      Escalation + reliability patterns
```

## 3. Agent Loop Lifecycle (D1)

```mermaid
stateDiagram-v2
    [*] --> Prompt: User sends prompt
    Prompt --> Evaluate: Claude evaluates context
    Evaluate --> ToolUse: stop_reason = "tool_use"
    Evaluate --> Done: stop_reason = "end_turn"
    ToolUse --> ExecuteTools: Execute requested tools
    ExecuteTools --> AppendResults: Add results to conversation
    AppendResults --> Evaluate: Next iteration

    Done --> [*]: Return final result

    note right of ToolUse
        Model decides which tools
        Not pre-configured sequences
    end note

    note right of AppendResults
        Context accumulates
        No reset between turns
    end note
```

## 4. Coordinator-Subagent Architecture (D1)

```mermaid
flowchart TB
    subgraph COORD["Coordinator (Orchestrator)"]
        direction TB
        DECOMPOSE[Task Decomposition]
        DELEGATE[Dynamic Routing]
        AGGREGATE[Result Aggregation]
        EVALUATE[Quality Evaluation]
        DECOMPOSE --> DELEGATE
        AGGREGATE --> EVALUATE
        EVALUATE -->|Gaps found| DELEGATE
    end

    subgraph SUBS["Subagents (Isolated Context)"]
        direction LR
        R["Researcher<br/>Read, Glob, Grep<br/>WebSearch, WebFetch<br/><i>model: sonnet</i>"]
        I["Implementer<br/>Read, Edit, Write<br/>Bash<br/><i>model: opus</i>"]
        RV["Reviewer<br/>Read, Glob, Grep<br/><i>read-only</i>"]
    end

    DELEGATE -->|"Structured prompt<br/>+ complete findings"| R
    DELEGATE -->|"Structured prompt<br/>+ research results"| I
    DELEGATE -->|"Structured prompt<br/>+ code to review"| RV
    R -->|"Results + metadata"| AGGREGATE
    I -->|"Changes + summary"| AGGREGATE
    RV -->|"Findings + confidence"| AGGREGATE

    style COORD fill:#e3f2fd
    style R fill:#e8f5e9
    style I fill:#fff3e0
    style RV fill:#f3e5f5
```

## 5. Workflow Enforcement Decision (D1)

```mermaid
flowchart TD
    Q1{Does this rule<br/>require guaranteed<br/>compliance?}

    Q1 -->|"Yes (financial, legal,<br/>identity verification)"| HOOK[Use PreToolUse Hook<br/>Deterministic guarantee]
    Q1 -->|"No (heuristic,<br/>judgment-based)"| PROMPT[Use Prompt Instructions<br/>Probabilistic guidance]

    HOOK --> H1["Block tool call<br/>until prerequisite met"]
    HOOK --> H2["Redirect to<br/>alternative workflow"]
    HOOK --> H3["Normalize data<br/>before processing"]

    PROMPT --> P1["Suggest ordering<br/>in system prompt"]
    PROMPT --> P2["Include criteria<br/>and examples"]

    style HOOK fill:#ffcdd2
    style PROMPT fill:#c8e6c9
```

## 6. Tool Design Pyramid (D2)

```mermaid
flowchart TB
    subgraph DESIGN["Tool Design Quality"]
        direction TB
        L1["<b>Level 3: Production</b><br/>Clear descriptions + boundaries<br/>Structured errors (category, retryable)<br/>tool_choice strategy per step<br/>MCP resources for catalogs"]
        L2["<b>Level 2: Functional</b><br/>Tools mapped to built-in or MCP<br/>Basic isError returns<br/>Some tool scoping per agent"]
        L3["<b>Level 1: Minimal</b><br/>Prose descriptions only<br/>Generic error strings<br/>All tools to all agents"]
    end

    L3 --> L2 --> L1

    style L1 fill:#c8e6c9
    style L2 fill:#fff9c4
    style L3 fill:#ffcdd2
```

## 7. Claude Code Configuration Hierarchy (D3)

```mermaid
flowchart TB
    subgraph USER["User-Level (~/.claude/)"]
        U_CLAUDE["CLAUDE.md<br/><i>Personal preferences</i>"]
        U_SKILLS["skills/<br/><i>Personal skill variants</i>"]
        U_COMMANDS["commands/<br/><i>Personal commands</i>"]
        U_JSON["claude.json<br/><i>Personal MCP servers</i>"]
    end

    subgraph PROJECT["Project-Level (repo root)"]
        P_CLAUDE["CLAUDE.md or .claude/CLAUDE.md<br/><i>Team standards</i>"]
        P_MCP[".mcp.json<br/><i>Shared MCP servers<br/>with ${ENV_VAR} expansion</i>"]
        P_SETTINGS[".claude/settings.json<br/><i>Permissions + hooks</i>"]

        subgraph RULES[".claude/rules/"]
            R1["testing.md<br/><i>paths: **/*.test.tsx</i>"]
            R2["api-conventions.md<br/><i>paths: src/api/**</i>"]
        end

        subgraph SKILLS_P[".claude/skills/"]
            SK1["review/SKILL.md<br/><i>context: fork<br/>allowed-tools: Read,Grep</i>"]
        end

        subgraph COMMANDS[".claude/commands/"]
            CMD1["deploy.md<br/><i>Team deploy workflow</i>"]
        end
    end

    subgraph DIR["Directory-Level"]
        D_CLAUDE["packages/api/CLAUDE.md<br/><i>API-specific rules</i>"]
        D_IMPORT["@import ../standards/api.md"]
    end

    USER --> PROJECT --> DIR

    style USER fill:#e8eaf6
    style PROJECT fill:#e8f5e9
    style DIR fill:#fff8e1
```

## 8. Structured Output Pipeline (D4)

```mermaid
flowchart LR
    subgraph INPUT["Source Document"]
        DOC[Unstructured text]
    end

    subgraph EXTRACT["Extraction"]
        TC["tool_choice: forced<br/>'extract_metadata'"]
        SCHEMA["JSON Schema<br/>nullable fields<br/>enum + 'unclear'<br/>+ 'other' + detail"]
    end

    subgraph VALIDATE["Validation"]
        SYN["Syntax errors<br/><b>eliminated by tool_use</b>"]
        SEM["Semantic errors<br/><b>require separate check</b><br/>totals match?<br/>values in right fields?"]
    end

    subgraph RETRY["Retry Strategy"]
        R1{Retryable?}
        R2["Append specific<br/>validation errors<br/>to next prompt"]
        R3["Information absent<br/>from source<br/>→ Don't retry"]
    end

    DOC --> TC --> SCHEMA --> SYN & SEM
    SEM -->|"Error found"| R1
    R1 -->|"Format/structural"| R2
    R1 -->|"Missing data"| R3
    R2 -->|"Retry with feedback"| TC

    style SYN fill:#c8e6c9
    style SEM fill:#fff9c4
    style R3 fill:#ffcdd2
```

## 9. Multi-Pass Review Architecture (D4)

```mermaid
flowchart TB
    subgraph GEN["Generation (Session A)"]
        G1[Claude generates code]
    end

    subgraph REVIEW["Review (Session B — Independent)"]
        direction TB
        R1["Pass 1: Per-file local analysis<br/><i>Each file individually</i>"]
        R2["Pass 2: Cross-file integration<br/><i>Data flows + contradictions</i>"]
        R3["Pass 3: Confidence scoring<br/><i>Self-reported confidence per finding</i>"]
        R1 --> R2 --> R3
    end

    subgraph ROUTE["Routing"]
        HIGH["High confidence<br/>→ Auto-apply"]
        LOW["Low confidence<br/>→ Human review"]
    end

    GEN -->|"Generated code<br/>(NO shared reasoning context)"| REVIEW
    R3 --> HIGH & LOW

    style GEN fill:#e3f2fd
    style REVIEW fill:#f3e5f5
    style HIGH fill:#c8e6c9
    style LOW fill:#fff9c4
```

## 10. Context Management Strategy (D5)

```mermaid
flowchart TB
    subgraph BUDGET["Context Budget"]
        SYS["System prompt<br/><i>small, cached</i>"]
        CLAUDE_MD["CLAUDE.md<br/><i>loaded once, cached</i>"]
        TOOLS["Tool definitions<br/><i>use ToolSearch for 10+</i>"]
        HISTORY["Conversation history<br/><i>accumulates across turns</i>"]
        OUTPUTS["Tool outputs<br/><i>can be LARGE</i>"]
    end

    subgraph STRATEGIES["Management Strategies"]
        PROG["Progressive disclosure<br/>MAP → Summary → Full"]
        ISOL["Subagent isolation<br/>Verbose exploration → summarized result"]
        LAZY["ToolSearch<br/>On-demand tool loading"]
        COMPACT["PreCompact hook<br/>Preserve critical state"]
    end

    subgraph ESCALATION["When to Escalate"]
        E1["Low confidence +<br/>high consequences"]
        E2["Ambiguous/conflicting<br/>information"]
        E3["Multiple valid approaches<br/>with significant trade-offs"]
    end

    BUDGET --> STRATEGIES
    STRATEGIES --> ESCALATION

    ESCALATION --> ESC_OUT["Structured escalation summary<br/>Customer ID, root cause,<br/>options attempted, recommendation,<br/>specific decision needed"]

    style BUDGET fill:#e3f2fd
    style STRATEGIES fill:#e8f5e9
    style ESCALATION fill:#fff3e0
    style ESC_OUT fill:#ffcdd2
```

## 11. KDBP Session Lifecycle

```mermaid
sequenceDiagram
    participant G as Gabe
    participant B as Brownbull
    participant T as Target Agent
    participant SDK as SDK Docs

    Note over B: [LB] Load Bookend
    B->>B: Load AGENT.md + CONTEXT.md + KDBP.md
    B->>G: Ready confirmation (~17.8K tokens)

    G->>B: {command} + target agent

    alt ANALYZE
        B->>T: Read all source material
        B->>B: Score D1-D5 (10 dims each)
        B->>G: Full scorecard + gap classification
    else TRANSFORM
        B->>T: Read source material
        B->>B: ANALYZE internally
        B->>SDK: Fetch docs if needed
        B->>B: Design all 5 domains
        B->>G: SDK project + config + migration guide
    else ENHANCE
        B->>T: Read SDK agent code
        B->>B: Score D1-D5, rank improvements
        B->>G: Prioritized recommendations + patches
    else SCAFFOLD
        G->>B: Requirements description
        B->>B: Design all 5 domains from scratch
        B->>G: Complete SDK agent project
    else AUDIT
        G->>B: Domain to audit (D1-D5)
        B->>T: Read source material
        B->>B: Score every task statement in domain
        B->>G: Deep audit with per-statement scores
    end

    Note over B: [GL] Gather Ledger
    B->>B: Summarize session
    B->>G: Draft ledger entry
    G->>B: Confirm
    B->>B: Write to LEDGER.md
```

## 12. Anti-Pattern → Fix Flow

```mermaid
flowchart LR
    subgraph ANTI["Anti-Patterns"]
        AP1[God agent]
        AP2[Prompt-as-guardrail]
        AP3[Bash-for-everything]
        AP4[No spend cap]
        AP5[Self-review same session]
        AP6[Vague prompt criteria]
        AP7[Generic tool descriptions]
        AP8[Required fields for absent data]
        AP9[Monolithic CLAUDE.md]
        AP10[Retry without error feedback]
    end

    subgraph FIX["Architect Fixes"]
        F1[Orchestrator + workers]
        F2[PreToolUse hooks]
        F3[Built-in tools]
        F4[max_turns + max_budget]
        F5[Independent review instance]
        F6[Explicit criteria + few-shot]
        F7[Differentiated descriptions + boundaries]
        F8[Nullable + unclear/other enums]
        F9["@import + .claude/rules/"]
        F10[Append validation errors on retry]
    end

    AP1 --> F1
    AP2 --> F2
    AP3 --> F3
    AP4 --> F4
    AP5 --> F5
    AP6 --> F6
    AP7 --> F7
    AP8 --> F8
    AP9 --> F9
    AP10 --> F10
```

## 13. 5-Layer Guardrail System (from Source Code)

```mermaid
flowchart TB
    TOOL_USE["Tool Use Request"]

    TOOL_USE --> L1
    subgraph LAYERS["5-Layer Defense in Depth"]
        direction TB
        L1["Layer 1: DENY rules<br/><i>Highest priority. Even bypassPermissions<br/>cannot override</i>"]
        L2["Layer 2: Tool checkPermissions()<br/><i>Each tool gates itself<br/>(Bash checks commands, Edit checks paths)</i>"]
        L3["Layer 3: Content-specific ask rules<br/><i>Pattern matching on arguments<br/>e.g. Bash(npm publish:*)</i>"]
        L4["Layer 4: Permission mode<br/><i>acceptEdits / bypass / default / plan / dontAsk</i>"]
        L5["Layer 5: ALLOW rules + ML classifier<br/><i>Lowest priority</i>"]

        L1 -->|"not denied"| L2
        L2 -->|"not denied"| L3
        L3 -->|"not denied"| L4
        L4 -->|"not denied"| L5
    end

    L1 -->|"DENIED"| BLOCK["Block (hard)"]
    L2 -->|"DENIED"| BLOCK
    L3 -->|"ASK"| ASK{classifierApprovable?}
    ASK -->|"false (hard block)"| BLOCK
    ASK -->|"true (soft block)"| CLASSIFIER["ML Classifier evaluates"]
    L5 --> ALLOW["Allow"]

    CLASSIFIER -->|"approve"| ALLOW
    CLASSIFIER -->|"block"| BLOCK
    CLASSIFIER -->|"3 consecutive denials"| HUMAN["Fall back to human"]

    style L1 fill:#ffcdd2
    style BLOCK fill:#ef5350,color:#fff
    style ALLOW fill:#66bb6a,color:#fff
    style HUMAN fill:#fff9c4
```

## 14. Skills ↔ Hooks Interaction

```mermaid
sequenceDiagram
    participant U as User
    participant S as Skill
    participant H as Hook Engine
    participant T as Tool
    participant M as Model

    U->>S: /deploy-api
    S->>S: Parse SKILL.md frontmatter
    S->>H: registerSkillHooks()<br/>(session-scoped, once:true)

    Note over S: Skill executes (inline or forked)
    S->>M: Inject skill content as messages
    M->>T: Call Bash(npm run build)

    T->>H: PreToolUse event fires
    H->>H: Skill-installed hook evaluates
    H-->>T: Allow (build is safe)

    M->>T: Call Bash(npm run deploy)
    T->>H: PreToolUse event fires
    H->>H: Skill-installed hook evaluates
    H-->>T: Allow + inject deployment URL

    Note over H: once:true → hook auto-deregisters
    H->>H: Cleanup: remove session hook
```
