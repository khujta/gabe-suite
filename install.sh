#!/bin/bash
# Install Gabe Suite to ~/.claude (Claude Code is the only harness).
#
# Usage:
#   ./install.sh              # Install skills + templates + docs + prompts + schemas
#   ./install.sh --dry-run    # Show what would be done
#   ./install.sh --uninstall  # Remove gabe-* skills, templates, prompts, schemas, and installed docs

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRY_RUN=false
UNINSTALL=false

for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=true ;;
        --uninstall) UNINSTALL=true ;;
    esac
done

run() {
    if $DRY_RUN; then
        echo "  [DRY RUN] $*"
    else
        eval "$@"
    fi
}

# Regenerate gabe-help's Full Suite Catalog from skill frontmatter (trim #2 —
# kills the hand-kept-catalog drift class). Warn-not-fail; skipped on dry-run.
if ! $DRY_RUN && command -v python3 >/dev/null 2>&1; then
    python3 "$SCRIPT_DIR/scripts/gen-help-catalog.py" || echo "  WARN: help catalog regeneration failed (continuing)"
fi

# One skill per capability (B2 skills-only migration) — auto-discovered so new
# skill directories ship without list maintenance.
GABE_SKILLS=()
if [ -d "$SCRIPT_DIR/skills" ]; then
    for skill_path in "$SCRIPT_DIR"/skills/gabe-*/; do
        [ -d "$skill_path" ] || continue
        GABE_SKILLS+=("$(basename "$skill_path")")
    done
fi

if $UNINSTALL; then
    echo "=== Uninstall Gabe Suite ==="
    for skill in "${GABE_SKILLS[@]}"; do
        run "rm -rf ~/.claude/skills/$skill"
    done
    # Retired surface — clean up any straggler command mirrors from older installs
    run "rm -f ~/.claude/commands/gabe-*.md"
    run "rm -rf ~/.claude/scripts/hooks/kdbp"
    run "rm -rf ~/.claude/templates/gabe"
    run "rm -rf ~/.claude/prompts/gabe-scope"
    run "rm -rf ~/.claude/schemas/gabe-scope"
    run "rm -rf ~/.claude/docs/gabe-suite"
    echo "Done."
    exit 0
fi

echo "=== Install Gabe Suite ==="
echo "Source: $SCRIPT_DIR"
echo "Target: ~/.claude/"
echo ""

INSTALLED=0
for skill in "${GABE_SKILLS[@]}"; do
    if [ ! -d "$SCRIPT_DIR/skills/$skill" ]; then
        echo "  SKIP: skills/$skill/ not found"
        continue
    fi
    run "mkdir -p ~/.claude/skills/$skill"
    run "cp -r \"$SCRIPT_DIR/skills/$skill/\"* ~/.claude/skills/$skill/"
    echo "  OK: $skill"
    INSTALLED=$((INSTALLED + 1))
done

# Templates — bundled source of truth for .kdbp/ files created by /gabe-init and other skills.
if [ -d "$SCRIPT_DIR/templates" ]; then
    run "mkdir -p ~/.claude/templates/gabe"
    run "cp \"$SCRIPT_DIR/templates/\"*.md ~/.claude/templates/gabe/ 2>/dev/null || true"
    run "cp \"$SCRIPT_DIR/templates/\"*.yaml ~/.claude/templates/gabe/ 2>/dev/null || true"
    run "cp \"$SCRIPT_DIR/templates/\"*.json ~/.claude/templates/gabe/ 2>/dev/null || true"
    # Count FILES, not directory entries — the old per-name exclusion list is
    # the exact pattern the comment below condemns, and it drifted the moment
    # templates/center/ landed (reported 20, copied 19).
    TPL_COUNT=$(find "$SCRIPT_DIR/templates" -maxdepth 1 -type f 2>/dev/null | wc -l)
    echo "  OK: $TPL_COUNT templates → ~/.claude/templates/gabe/"

    # ALL template subdirectories, recursively — a new subdir must never need its own stanza
    # (that per-name pattern is how templates/center/ silently failed to install; meta-review P3)
    for sub in "$SCRIPT_DIR"/templates/*/; do
        [ -d "$sub" ] || continue
        subname=$(basename "$sub")
        run "mkdir -p ~/.claude/templates/gabe/$subname"
        run "cp -r \"$sub\"* ~/.claude/templates/gabe/$subname/ 2>/dev/null || true"
        # Local python runs leave __pycache__ beside the generators; stale
        # bytecode must not ship (or count) — it would ride /gabe-adopt's
        # promotion into user projects.
        run "find ~/.claude/templates/gabe/$subname -name __pycache__ -type d -exec rm -rf {} + 2>/dev/null || true"
        SUB_COUNT=$(find "$sub" -type f ! -path '*__pycache__*' ! -name '*.pyc' 2>/dev/null | wc -l)
        echo "  OK: $SUB_COUNT files → ~/.claude/templates/gabe/$subname/"
    done
fi

# Session hooks — kdbp hook scripts referenced by settings.json entries (templates/hooks.json markers).
if [ -d "$SCRIPT_DIR/scripts/hooks/kdbp" ]; then
    run "mkdir -p ~/.claude/scripts/hooks/kdbp"
    run "cp \"$SCRIPT_DIR/scripts/hooks/kdbp/\"*.sh ~/.claude/scripts/hooks/kdbp/"
    # Retired hooks (A2 KDBP-lite): per-tool-call ledger writer + knowledge awareness
    run "rm -f ~/.claude/scripts/hooks/kdbp/post-ledger-writer.sh ~/.claude/scripts/hooks/kdbp/session-knowledge-awareness.sh"
    HOOK_COUNT=$(ls -1 "$SCRIPT_DIR/scripts/hooks/kdbp/"*.sh 2>/dev/null | wc -l)
    echo "  OK: $HOOK_COUNT kdbp hook scripts → ~/.claude/scripts/hooks/kdbp/"
fi

# Curated docs — installed as local reference material.
# docs/archive/ is intentionally excluded; it contains historical design notes, not runtime guidance.
if [ -d "$SCRIPT_DIR/docs" ]; then
    DOCS_ROOT="$HOME/.claude/docs/gabe-suite"
    run "rm -rf \"$DOCS_ROOT\""
    run "mkdir -p \"$DOCS_ROOT/docs/workflows\""
    run "mkdir -p \"$DOCS_ROOT/docs/architecture\""

    run "cp \"$SCRIPT_DIR/README.md\" \"$DOCS_ROOT/README.md\""
    run "cp \"$SCRIPT_DIR/docs/README.md\" \"$DOCS_ROOT/docs/README.md\""
    run "cp \"$SCRIPT_DIR/docs/WORKFLOW.md\" \"$DOCS_ROOT/docs/WORKFLOW.md\""
    run "cp \"$SCRIPT_DIR/docs/GAPS.md\" \"$DOCS_ROOT/docs/GAPS.md\""
    run "cp \"$SCRIPT_DIR/docs/suite-state-audit.md\" \"$DOCS_ROOT/docs/suite-state-audit.md\""
    run "cp \"$SCRIPT_DIR/docs/workflows/\"*.md \"$DOCS_ROOT/docs/workflows/\" 2>/dev/null || true"
    run "cp \"$SCRIPT_DIR/docs/architecture/\"*.md \"$DOCS_ROOT/docs/architecture/\" 2>/dev/null || true"

    DOC_COUNT=5
    WORKFLOW_COUNT=0
    ARCH_COUNT=0
    if [ -d "$SCRIPT_DIR/docs/workflows" ]; then
        WORKFLOW_COUNT=$(find "$SCRIPT_DIR/docs/workflows" -maxdepth 1 -type f -name '*.md' | wc -l | tr -d ' ')
    fi
    if [ -d "$SCRIPT_DIR/docs/architecture" ]; then
        ARCH_COUNT=$(find "$SCRIPT_DIR/docs/architecture" -maxdepth 1 -type f -name '*.md' | wc -l | tr -d ' ')
    fi
    DOC_COUNT=$((DOC_COUNT + WORKFLOW_COUNT + ARCH_COUNT))
    echo "  OK: $DOC_COUNT docs → ~/.claude/docs/gabe-suite/ (archive excluded)"
fi

# Prompts — consumed by the /gabe-scope family at execution time.
if [ -d "$SCRIPT_DIR/prompts" ]; then
    run "mkdir -p ~/.claude/prompts/gabe-scope"
    run "cp \"$SCRIPT_DIR/prompts/\"*.md ~/.claude/prompts/gabe-scope/ 2>/dev/null || true"
    PROMPT_COUNT=$(ls -1 "$SCRIPT_DIR/prompts/"*.md 2>/dev/null | wc -l)
    echo "  OK: $PROMPT_COUNT prompts → ~/.claude/prompts/gabe-scope/"
fi

# Schemas — JSON Schema validators for scope-session.json + scope-references.yaml.
if [ -d "$SCRIPT_DIR/schemas" ]; then
    run "mkdir -p ~/.claude/schemas/gabe-scope"
    run "cp \"$SCRIPT_DIR/schemas/\"*.json ~/.claude/schemas/gabe-scope/ 2>/dev/null || true"
    run "cp \"$SCRIPT_DIR/schemas/\"validate.py ~/.claude/schemas/gabe-scope/ 2>/dev/null || true"
    SCHEMA_COUNT=$(ls -1 "$SCRIPT_DIR/schemas/"*.json 2>/dev/null | wc -l)
    echo "  OK: $SCHEMA_COUNT schemas → ~/.claude/schemas/gabe-scope/"
fi

echo ""
echo "Installed $INSTALLED/${#GABE_SKILLS[@]} skills."
