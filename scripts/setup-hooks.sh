#!/bin/bash
# Configura git para usar .githooks/ en lugar de .git/hooks/
# Así los hooks se trackean en el repo y persisten al clonar
git config core.hooksPath .githooks
echo "✅ Hooks configurados. Git usará .githooks/ para los pre-push hooks."
