#!/usr/bin/env bash
set -euo pipefail

UUID="renderorange@renderorange"
SOURCE="$(cd "$(dirname "$0")" && pwd)"
TARGET="${HOME}/.local/share/gnome-shell/extensions/${UUID}"

if [ -e "$TARGET" ] && [ ! -L "$TARGET" ]; then
    echo "ERROR: ${TARGET} exists and is not a symlink. Remove it first." >&2
    exit 1
fi

mkdir -p "$(dirname "$TARGET")"
ln -sfn "$SOURCE" "$TARGET"
echo "Installed ${UUID} -> ${SOURCE}"

SCHEMAS="${TARGET}/schemas"
if [ -d "$SCHEMAS" ]; then
    if command -v glib-compile-schemas &>/dev/null; then
        glib-compile-schemas "$SCHEMAS"
        echo "Compiled GSettings schemas in ${SCHEMAS}"
    else
        echo "WARNING: glib-compile-schemas not found. Schemas not compiled." >&2
    fi
fi

echo ""
read -p "Enable extension now? (y/N) " -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    gnome-extensions enable "$UUID" && echo "Enabled ${UUID}"
fi
echo ""
echo "Restart the session (log out/in) for changes to take effect."
