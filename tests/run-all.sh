#!/bin/sh
# Runs every numerical check against the scikit-learn reference values stored in tests/reference_*.json
cd "$(dirname "$0")/.." && for t in core svm embed; do echo "== $t"; node tests/test-$t.js || exit 1; done
