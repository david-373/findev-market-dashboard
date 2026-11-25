#!/bin/sh
set -eu

if [ "${CF_PAGES:-}" = "1" ] && ! command -v rustup >/dev/null 2>&1; then
    installer="$(mktemp)"
    trap 'rm -f "$installer"' EXIT
    curl --proto '=https' --tlsv1.2 -fsSL https://sh.rustup.rs -o "$installer"
    sh "$installer" -y --profile minimal --no-modify-path
    export PATH="${CARGO_HOME:-$HOME/.cargo}/bin:$PATH"
fi

rustup target add wasm32-unknown-unknown

if command -v wasm-pack >/dev/null 2>&1; then
    exec wasm-pack build wasm/market-generator --target web --release --locked
fi

exec npm exec --yes --allow-scripts=wasm-pack --package=wasm-pack@0.15.1 -- \
    wasm-pack build wasm/market-generator --target web --release --locked
