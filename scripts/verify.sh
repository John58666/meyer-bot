#!/bin/bash
# verify.sh — Verification loop del harness
# Corre automático en pre-commit y pre-push, o manual con: bash scripts/verify.sh
# Si falla, explica exactamente qué arreglar. Sin misterios.

set -e
FAILED=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✅ $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; FAILED=1; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo "═══════════════════════════════════════"
echo "  Harness Verification Loop"
echo "═══════════════════════════════════════"

# 1. Seguridad — archivos prohibidos en staging
echo ""
echo "📁 1. Security check"
STAGED=$(git diff --cached --name-only 2>/dev/null || echo "")
if echo "$STAGED" | grep -qE '^\.env$|^secrets/'; then
  fail ".env o secrets/ están en staged — REMOVER antes de commit"
  echo "   git reset .env secrets/  (si fue accidental)"
else
  pass "No hay secrets en staged"
fi

# 2. Lint — dashboard
echo ""
echo "🔍 2. Lint (dashboard/)"
if [ -f "dashboard/package.json" ]; then
  cd dashboard
  if npm run lint --silent 2>/dev/null; then
    pass "Lint OK"
  else
    fail "Lint falló"
    echo "   Corre: cd dashboard && npm run lint"
  fi
  cd ..
else
  warn "No se encontró dashboard/package.json"
fi

# 3. Archivos huérfanos en raíz
echo ""
echo "📄 3. Orphan files check"
ORPHANS=$(git -c core.hooksPath=/dev/null status --short 2>/dev/null | grep -E '^\?\? ' | grep -E '^[?][?] (FIX_|fix_|temp|test_)' || true)
if [ -n "$ORPHANS" ]; then
  warn "Archivos huérfanos detectados:"
  echo "$ORPHANS" | while read -r line; do echo "   $line"; done
  echo "   Revisar y eliminar antes de commit si es necesario"
else
  pass "Sin archivos huérfanos"
fi

# 4. RULES.md y MEMORY.md existen
echo ""
echo "📋 4. Harness files check"
if [ -f "docs/harness/RULES.md" ]; then
  pass "RULES.md existe"
else
  warn "docs/harness/RULES.md no existe"
fi
if [ -f "docs/harness/MEMORY.md" ]; then
  pass "MEMORY.md existe"
else
  warn "docs/harness/MEMORY.md no existe"
fi

# 5. Git diff summary
echo ""
echo "📦 5. Staged files summary"
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
if [ "$STAGED_FILES" -gt 0 ]; then
  pass "$STAGED_FILES archivos en staged"
  git diff --cached --stat 2>/dev/null | head -20
else
  warn "No hay archivos en staged"
fi

echo ""
echo "═══════════════════════════════════════"
if [ $FAILED -eq 1 ]; then
  echo -e "${RED}❌ Verification FAILED — revisa los errores arriba${NC}"
  exit 1
else
  echo -e "${GREEN}✅ All checks passed${NC}"
  exit 0
fi
