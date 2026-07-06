# renderorange

GNOME Shell extension for a minimal top bar.

Supports GNOME Shell 43 (Debian 12) and GNOME Shell 45-48.

## Install

```sh
git clone https://github.com/renderorange/renderorange-gnome-shell-extension.git
cd renderorange-gnome-shell-extension
bash install.sh
```

The script detects your GNOME Shell version and links the right files. It compiles the GSettings schema and optionally enables the extension. Log out and back in for changes to take effect.

`install.sh` symlinks the repo into `~/.local/share/gnome-shell/extensions/renderorange@renderorange`. To uninstall, remove that symlink and restart GNOME Shell.

## Configuration

Open the extension preferences with:

```sh
gnome-extensions prefs renderorange@renderorange
```

Or use GNOME Extension Manager / `gnome-extensions-app`.

### Settings

| Setting | Default | Description |
|---|---|---|
| Clock Format | 24h | 24-hour, 12-hour, or system locale |
| Show Seconds | off | Display seconds in the clock |
| Show Date | off | Display date in the clock |
| Show Calendar | on | Calendar widget in the date menu |
| Show Events | on | Events section in the date menu |
| Show World Clocks | on | World clocks in the date menu |
| Show Weather | on | Weather in the date menu |
| Workspace Popup | on | Workspace switcher popup on switch |
| Animations | on | GNOME shell animations |
| Workspace Indicator | on | Workspace number indicator in top bar |
| App Menu | off | Application menu in top bar |
| Activities | off | Activities button in top bar |
| GTK Popup Accent | #444444 | Accent color for popup selections and toggles |

Settings can also be changed with `gsettings`:

```sh
# List all keys
gsettings list-keys org.gnome.shell.extensions.renderorange

# Change a setting
gsettings set org.gnome.shell.extensions.renderorange clock-format '12h'
gsettings set org.gnome.shell.extensions.renderorange show-seconds true
gsettings set org.gnome.shell.extensions.renderorange gtk-popup-accent '#3584e4'
```

## Version support

The repo contains two versions of the extension:

- **Root directory** — GNOME Shell 45+ (ESM modules, class-based)
- **`v43/`** — GNOME Shell 43 (legacy `imports.*` pattern)

The install script picks the right one automatically. If you need to install manually, symlink the correct directory:

```sh
# GNOME 45+
ln -sfn /path/to/repo ~/.local/share/gnome-shell/extensions/renderorange@renderorange

# GNOME 43 (Debian 12)
ln -sfn /path/to/repo/v43 ~/.local/share/gnome-shell/extensions/renderorange@renderorange
```

For extensions.gnome.org, upload separate packages for each shell-version range.

## Development

Requirements: Node.js 21+, npm.

```sh
# Install dev dependencies
npm install

# Run lint + tests
make check

# Just lint
make lint

# Just tests
make test
```

### What's tested

- **ESLint** with GJS rules — catches syntax errors, unused variables, restricted globals, and version-specific issues. Separate configs for ESM and legacy files.
- **Unit tests** (Node.js `node:test`) — `normalizeHexColor`, `hexToRgba`, metadata.json validation, GSettings schema validation.
- **Not tested** — anything that touches GNOME Shell APIs at runtime (`Main.panel`, widget creation, etc.). These require manual testing with a running GNOME Shell session.

### Debugging

View extension logs:

```sh
journalctl -f -o cat | grep RenderOrange
```

For a nested GNOME Shell session (safe testing without restarting):

```sh
# X11
dbus-run-session gnome-shell --nested
```

## Files

```
extension.js        Entry point for GNOME 45+
prefs.js            Preferences window for GNOME 45+
lib.js              Pure helper functions (no GNOME deps)
metadata.json       Extension metadata for GNOME 45+
stylesheet.css      Theme overrides
install.sh          Installer script
Makefile            Dev task runner
eslint.config.mjs   ESLint config (GJS rules)
schemas/            GSettings schema XML
v43/                GNOME 43 version (legacy imports pattern)
tests/              Unit tests
```

## Troubleshooting

**Extension doesn't appear after install:**
- Make sure you logged out and back in (or restarted GNOME Shell on X11 with Alt+F2, `r`)
- Check that the schema compiled: `ls ~/.local/share/gnome-shell/extensions/renderorange@renderorange/schemas/gschemas.compiled`

**"Extension does not support current GNOME Shell version":**
- Run `gnome-shell --version` to check your version
- The install script should handle this automatically; if not, symlink the correct directory manually

**Settings don't take effect:**
- Some settings (clock format, animations) are written to `org.gnome.desktop.interface`. If another extension or tool also manages those settings, they may conflict.

**To completely remove:**
```sh
gnome-extensions disable renderorange@renderorange
rm ~/.local/share/gnome-shell/extensions/renderorange@renderorange
rm -rf ~/.local/share/gnome-shell/extensions/renderorange@renderorange/schemas/gschemas.compiled
```
