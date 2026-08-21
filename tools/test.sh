#!/bin/sh
# Runs tools/test.mjs against js/*.js.
#
# The repo deliberately has no package.json, so Node would treat js/*.js as
# CommonJS and refuse to import them. This copies the sources to a temp dir
# alongside a one-line package.json and runs there — nothing is added to the
# repo, and there is still nothing to install.
set -e
root=$(cd "$(dirname "$0")/.." && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

mkdir -p "$tmp/js" "$tmp/tools"
cp "$root"/js/*.js "$tmp/js/"
cp "$root"/tools/test.mjs "$tmp/tools/"
echo '{"type":"module"}' > "$tmp/package.json"

cd "$tmp/tools" && node test.mjs
