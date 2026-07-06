#!/usr/bin/env bash
set -euo pipefail

UUID="renderorange@renderorange"
SOURCE="$(cd "$(dirname "$0")" && pwd)"
TARGET="${HOME}/.local/share/gnome-shell/extensions/${UUID}"

# Detect GNOME Shell major version
SHELL_VERSION=""
if command -v gnome-shell &>/dev/null; then
    SHELL_VERSION="$(gnome-shell --version 2>/dev/null | grep -oE '[0-9]+' | head -1)"
fi

if [ -z "$SHELL_VERSION" ]; then
    echo "WARNING: Could not detect GNOME Shell version. Installing GNOME 45+ version." >&2
    SHELL_VERSION=48
fi

echo "Detected GNOME Shell version: ${SHELL_VERSION}"

# Choose source directory based on version
if [ "$SHELL_VERSION" -le 44 ] 2>/dev/null; then
    INSTALL_SOURCE="${SOURCE}/v43"
    echo "Using legacy (GNOME 43) version"
else
    INSTALL_SOURCE="${SOURCE}"
    echo "Using modern (GNOME 45+) version"
fi

if [ -e "$TARGET" ] && [ ! -L "$TARGET" ]; then
    echo "ERROR: ${TARGET} exists and is not a symlink. Remove it first." >&2
    exit 1
fi

mkdir -p "$(dirname "$TARGET")"
ln -sfn "$INSTALL_SOURCE" "$TARGET"
echo "Installed ${UUID} -> ${INSTALL_SOURCE}"

SCHEMAS="${TARGET}/schemas"
if [ -d "$SCHEMAS" ]; then
    if command -v glib-compile-schemas &>/dev/null; then
        glib-compile-schemas "$SCHEMAS"
        echo "Compiled GSettings schemas in ${SCHEMAS}"
    else
        echo "WARNING: glib-compile-schemas not found. Schemas not compiled." >&2
    fi
fi

if [ -t 0 ]; then
    echo ""
    read -r -p "Enable extension now? (y/N) " REPLY
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        gnome-extensions enable "$UUID" && echo "Enabled ${UUID}"
    fi
else
    echo ""
    echo "Run 'gnome-extensions enable ${UUID}' to enable."
fi
echo ""
echo "Restart the session (log out/in) for changes to take effect."
