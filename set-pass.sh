#!/bin/bash
# Store the archive passphrase locally (outside the repo, never pushed).
# After changing the password you MUST re-encrypt everything: node publish.js --all
set -e
dir="$HOME/.config/good-morning"
mkdir -p "$dir"
read -r -s -p "새 비밀번호: " p1; echo
read -r -s -p "한 번 더:   " p2; echo
[ "$p1" = "$p2" ] || { echo "✗ 불일치"; exit 1; }
[ -n "$p1" ]      || { echo "✗ 빈 비밀번호 불가"; exit 1; }
printf '%s' "$p1" > "$dir/passphrase"
chmod 600 "$dir/passphrase"
echo "✓ 저장됨: $dir/passphrase (권한 600)"
echo "  다음: cd $(dirname "$0") && node publish.js --all"
