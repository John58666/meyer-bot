#!/bin/bash
# Configura git para usar .githooks/ en lugar de .git/hooks/
# Así los hooks se trackean en el repo y persisten al clonar
git config core.hooksPath .githooks
echo "✅ Hooks configurados. Git usará .githooks/ para hooks."
echo ""
echo "  pre-commit → lint + security + harness checks"
echo "  pre-push   → lint + security + harness checks + B6 smoke test"
echo ""
echo "  Manual: bash scripts/verify.sh"
