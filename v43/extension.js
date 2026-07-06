/**
 * RenderOrange Extension
 * Minimal top bar like Regolith/i3
 *
 * Supports GNOME Shell 43 (legacy)
 * For GNOME Shell 45+, use the root extension.js
 */

const Main = imports.ui.main;
const GLib = imports.gi.GLib;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const ExtensionUtils = imports.misc.extensionUtils;

let _settings = null;
let _settingsChangedId = 0;
let _sessionModeId = 0;
let _workspaceIndicatorActor = null;
let _workspaceSignalIds = [];
let _workspaceClickId = 0;
let _timeoutIds = [];
let _stylesheetFile = null;
let _stylesheetPath = null;
let _clockOriginalParent = null;
let _panelOriginalStyle = null;
let _interfaceSettings = null;
let _savedClockFormat = null;
let _savedShowSeconds = null;
let _savedShowDate = null;
let _savedEnableAnimations = null;

const UI_GROUP_CLASSES = [
    'renderorange-no-weather',
    'renderorange-no-world-clocks',
    'renderorange-no-events-button',
];

function _getSettings() {
    if (!_settings)
        _settings = ExtensionUtils.getSettings();
    return _settings;
}

function _getInterfaceSettings() {
    if (!_interfaceSettings)
        _interfaceSettings = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
    return _interfaceSettings;
}

function _normalizeHexColor(value) {
    if (typeof value !== 'string')
        return '#444444';

    const match = value.trim().match(/^#([0-9a-fA-F]{6})$/);
    if (!match)
        return '#444444';

    return `#${match[1].toLowerCase()}`;
}

function _hexToRgba(hex, alpha) {
    const normalized = _normalizeHexColor(hex).slice(1);
    const red = parseInt(normalized.slice(0, 2), 16);
    const green = parseInt(normalized.slice(2, 4), 16);
    const blue = parseInt(normalized.slice(4, 6), 16);
    const a = Math.max(0, Math.min(1, alpha));
    return `rgba(${red}, ${green}, ${blue}, ${a})`;
}

function _createDynamicStylesheet() {
    const [ok, file] = Gio.File.new_tmp('renderorange-dynamic-XXXXXX.css');
    if (!ok)
        throw new Error('Could not create temp file');
    return file;
}

function _applyDynamicStyles() {
    const settings = _getSettings();
    const accent = _normalizeHexColor(settings.get_string('gtk-popup-accent'));
    const tilePreview = _hexToRgba(accent, 0.5);

    const css = `
        .toggle-switch:checked,
        .toggle-switch:active,
        .popover-menu-item.selected,
        .popover-menuitem.selected,
        StButton.popup-menu-item.selected,
        .popup-menu-item.selected,
        .popup-menu-item:selected,
        .calendar-day-selected:focus,
        .calendar-day-selected:hover,
        .calendar-day-selected,
        .quick-menu-toggle:checked,
        .quick-menu-toggle:checked:hover,
        .quick-menu-toggle:checked:focus,
        .quick-menu-toggle:checked:active,
        .quick-toggle:checked,
        .quick-toggle:checked:hover,
        .quick-toggle:checked:focus,
        .quick-toggle:checked:active,
        .quick-toggle-menu .header .icon.active {
            background-color: ${accent} !important;
            background-image: none !important;
            border-color: transparent !important;
        }

        .quick-toggle:checked,
        .quick-toggle:checked:hover,
        .quick-toggle:checked:focus,
        .quick-toggle:checked:active {
            color: #ffffff !important;
        }

        .slider,
        .quick-settings .slider,
        .quick-slider .slider {
            -barlevel-active-background-color: ${accent} !important;
            -barlevel-active-border-color: transparent !important;
        }

        .quick-slider .slider-bin:focus,
        .quick-slider .slider-bin:focus:hover,
        .quick-slider .slider-bin:focus:active {
            box-shadow: inset 0 0 0 2px ${accent} !important;
        }

        StSwitch toggle-switch:checked {
            background-color: ${accent} !important;
        }

        .quick-toggle:checked:focus {
            box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.24) !important;
        }

        .tile-preview {
            background-color: ${tilePreview} !important;
            border: 1px solid ${accent} !important;
        }
    `;

    const theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
    let stylesheet;

    try {
        stylesheet = _createDynamicStylesheet();
        const path = stylesheet.get_path();

        if (!GLib.file_set_contents(path, css))
            throw new Error('Could not write dynamic stylesheet to ' + path);

        theme.load_stylesheet(stylesheet);
    } catch (e) {
        log('[RenderOrange] Failed to apply dynamic styles: ' + e);
        if (stylesheet) {
            try {
                stylesheet.delete(null);
            } catch (_deleteError) {
                // ignore
            }
        }
        return;
    }

    const oldFile = _stylesheetFile;
    const oldPath = _stylesheetPath;

    _stylesheetFile = stylesheet;
    _stylesheetPath = stylesheet.get_path();

    if (oldFile) {
        try {
            theme.unload_stylesheet(oldFile);
        } catch (e) {
            log('[RenderOrange] Could not unload previous stylesheet: ' + e);
        }
    }

    if (oldPath) {
        try {
            Gio.File.new_for_path(oldPath).delete(null);
        } catch (e) {
            log('[RenderOrange] Could not delete old stylesheet: ' + e);
        }
    }
}

function _unloadDynamicStyles() {
    if (_stylesheetFile) {
        try {
            const theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
            theme.unload_stylesheet(_stylesheetFile);
        } catch (e) {
            log('[RenderOrange] Failed to unload dynamic stylesheet: ' + e);
        }
        _stylesheetFile = null;
    }

    if (_stylesheetPath) {
        try {
            Gio.File.new_for_path(_stylesheetPath).delete(null);
        } catch (e) {
            log('[RenderOrange] Failed to delete dynamic stylesheet file: ' + e);
        }
        _stylesheetPath = null;
    }
}

function _configureActivities() {
    const settings = _getSettings();
    const showActivities = settings.get_boolean('show-activities');

    if (Main.panel.statusArea) {
        const activities = Main.panel.statusArea.activities;
        if (activities) {
            if (showActivities)
                activities.actor.show();
            else
                activities.actor.hide();
        }
    }
}

function _cleanClock() {
    if (Main.panel.statusArea && Main.panel.statusArea.dateMenu) {
        const clock = Main.panel.statusArea.dateMenu;
        if (clock.actor) {
            clock.actor.set_style('background: transparent; border: none; box-shadow: none;');
        }

        const findAndCleanClock = container => {
            if (!container) return;
            const classes = container.style_class;
            if (classes && (
                classes.split(/\s+/).includes('clock-display') ||
                classes.split(/\s+/).includes('clock'))) {
                container.set_style('background: transparent !important; border: none !important; box-shadow: none !important; font-weight: 500 !important;');
            }
            if (container.get_children) {
                container.get_children().forEach(child => findAndCleanClock(child));
            }
        };
        findAndCleanClock(clock.actor);
    }
}

function _configureClockFormat() {
    try {
        const settings = _getSettings();
        const iface = _getInterfaceSettings();

        const clockFormat = settings.get_string('clock-format');
        const showSeconds = settings.get_boolean('show-seconds');
        const showDate = settings.get_boolean('show-date');

        iface.set_string('clock-format', clockFormat);
        iface.set_boolean('clock-show-seconds', showSeconds);
        iface.set_boolean('clock-show-date', showDate);
    } catch (e) {
        log('[RenderOrange] Error setting clock format: ' + e);
    }
}

function _moveClockToRight() {
    if (!Main.panel._centerBox || !Main.panel._rightBox)
        return;

    const dateMenu = Main.panel.statusArea?.dateMenu;
    if (!dateMenu || !dateMenu.actor)
        return;

    const parent = dateMenu.actor.get_parent();
    if (parent === Main.panel._rightBox)
        return;

    if (!_clockOriginalParent)
        _clockOriginalParent = parent;

    if (parent)
        parent.remove_actor(dateMenu.actor);

    Main.panel._rightBox.insert_child_at_index(dateMenu.actor, 0);
}

function _minimizePanel() {
    _configureAppMenu();

    if (Main.panel && !_panelOriginalStyle) {
        _panelOriginalStyle = Main.panel.get_style() || '';
        Main.panel.set_style('box-shadow: none; border: none;');
    }
}

function _configureAppMenu() {
    const settings = _getSettings();
    const showAppMenu = settings.get_boolean('show-app-menu');

    if (Main.panel.statusArea && Main.panel.statusArea.appMenu) {
        const appMenu = Main.panel.statusArea.appMenu;
        if (showAppMenu)
            appMenu.actor.show();
        else
            appMenu.actor.hide();
    }
}

function _configureCalendarVisibility() {
    const settings = _getSettings();
    const showCalendar = settings.get_boolean('show-calendar');
    const showEvents = settings.get_boolean('show-events');
    const showWorldClocks = settings.get_boolean('show-world-clocks');
    const showWeather = settings.get_boolean('show-weather');

    const dateMenu = Main.panel.statusArea?.dateMenu;
    if (!dateMenu) return;

    if (dateMenu._calendar) {
        if (showCalendar)
            dateMenu._calendar.show();
        else
            dateMenu._calendar.hide();
    }

    const globalUI = Main.uiGroup;
    if (!globalUI) return;

    if (showWeather)
        globalUI.remove_style_class_name('renderorange-no-weather');
    else
        globalUI.add_style_class_name('renderorange-no-weather');

    if (showWorldClocks)
        globalUI.remove_style_class_name('renderorange-no-world-clocks');
    else
        globalUI.add_style_class_name('renderorange-no-world-clocks');

    if (showEvents)
        globalUI.remove_style_class_name('renderorange-no-events-button');
    else
        globalUI.add_style_class_name('renderorange-no-events-button');
}

function _configureWorkspacePopup() {
    const settings = _getSettings();
    const showPopup = settings.get_boolean('workspace-popup');
    const WorkspaceSwitcherPopup = imports.ui.workspaceSwitcherPopup;

    if (showPopup) {
        if (window._originalDisplay) {
            WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype.display = window._originalDisplay;
            delete window._originalDisplay;
        }
    } else {
        if (!window._originalDisplay) {
            window._originalDisplay = WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype.display;
        }
        WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype.display = () => {
            return false;
        };
    }
}

function _configureAnimations() {
    const settings = _getSettings();
    const enableAnimations = settings.get_boolean('animations');
    _getInterfaceSettings().set_boolean('enable-animations', enableAnimations);
}

function _createWorkspaceIndicator() {
    if (_workspaceIndicatorActor) return;

    const container = new St.BoxLayout({
        style_class: 'renderorange-workspace-indicator',
        reactive: true,
        track_hover: true,
    });

    _workspaceIndicatorActor = container;

    if (Main.panel._leftBox) {
        Main.panel._leftBox.insert_child_at_index(container, 0);
    }

    _workspaceClickId = container.connect('button-release-event', () => {
        if (Main.overview.visible) {
            Main.overview.hide();
        } else {
            Main.overview.show();
            if (Main.overview.viewSelector) {
                Main.overview.viewSelector._showApps();
            }
        }
        return Clutter.EVENT_STOP;
    });

    _updateWorkspaceDots();

    const workspaceManager = global.workspace_manager;
    _workspaceSignalIds.push(workspaceManager.connect('workspace-added', _updateWorkspaceDots));
    _workspaceSignalIds.push(workspaceManager.connect('workspace-removed', _updateWorkspaceDots));
    _workspaceSignalIds.push(workspaceManager.connect('active-workspace-changed', _updateWorkspaceDots));
}

function _updateWorkspaceDots() {
    if (!_workspaceIndicatorActor) return;

    const settings = _getSettings();
    if (!settings.get_boolean('workspace-indicator')) {
        _workspaceIndicatorActor.hide();
        return;
    }

    _workspaceIndicatorActor.show();

    _workspaceIndicatorActor.get_children().forEach(c => c.destroy());

    const workspaceManager = global.workspace_manager;
    const activeWorkspace = workspaceManager.get_active_workspace_index();
    const numWorkspaces = workspaceManager.get_n_workspaces();

    for (let i = 0; i < numWorkspaces; i++) {
        const isActive = i === activeWorkspace;
        const wsNum = i + 1;

        const dot = new St.BoxLayout({
            style_class: isActive ? 'workspace-active' : 'workspace-dot',
            width: 36,
            height: 26,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });

        if (isActive)
            dot.set_style('background: #444444; color: #ffffff; min-width: 36px; min-height: 26px; margin: 0; padding: 0;');
        else
            dot.set_style('background: transparent; color: #888888; min-width: 36px; min-height: 26px; margin: 0; padding: 0;');

        const label = new St.Label({
            text: wsNum.toString(),
            style_class: 'workspace-label',
        });
        label.set_style('font-size: 14px; font-weight: ' + (isActive ? 'bold' : 'normal') + '; margin-top: 4px;');

        dot.add_child(label);
        _workspaceIndicatorActor.add_child(dot);
    }
}

function _ensureWorkspaceIndicatorInPanel() {
    if (!_workspaceIndicatorActor || !Main.panel._leftBox)
        return;
    try {
        const parent = _workspaceIndicatorActor.get_parent();
        if (!parent)
            Main.panel._leftBox.insert_child_at_index(_workspaceIndicatorActor, 0);
    } catch (e) {
        log('[RenderOrange] Could not re-parent workspace indicator: ' + e);
    }
}

function _configureWorkspaceIndicator() {
    const settings = _getSettings();
    const showIndicator = settings.get_boolean('workspace-indicator');

    if (showIndicator) {
        if (!_workspaceIndicatorActor)
            _createWorkspaceIndicator();
        else
            _ensureWorkspaceIndicatorInPanel();
        _workspaceIndicatorActor.show();
    } else if (_workspaceIndicatorActor) {
        _workspaceIndicatorActor.hide();
    }
}

function _onSessionUpdated() {
    if (Main.sessionMode.isLocked) {
        if (Main.panel)
            Main.panel.hide();
    } else {
        if (Main.panel)
            Main.panel.show();
        _minimizePanel();
        _moveClockToRight();
        _cleanClock();
        _configureWorkspaceIndicator();
        _configureAppMenu();
        _configureActivities();
    }
}

function enable() {
    // Save system GSettings (#5)
    const iface = _getInterfaceSettings();
    _savedClockFormat = iface.get_string('clock-format');
    _savedShowSeconds = iface.get_boolean('clock-show-seconds');
    _savedShowDate = iface.get_boolean('clock-show-date');
    _savedEnableAnimations = iface.get_boolean('enable-animations');

    const settings = _getSettings();

    _settingsChangedId = settings.connect('changed', function(_schema, key) {
        if (key === 'clock-format' || key === 'show-seconds' || key === 'show-date')
            _configureClockFormat();
        if (key.startsWith('show-'))
            _configureCalendarVisibility();
        if (key === 'gtk-popup-accent')
            _applyDynamicStyles();
        if (key === 'workspace-popup')
            _configureWorkspacePopup();
        if (key === 'animations')
            _configureAnimations();
        if (key === 'workspace-indicator')
            _configureWorkspaceIndicator();
        if (key === 'show-app-menu')
            _configureAppMenu();
        if (key === 'show-activities')
            _configureActivities();
    });

    _sessionModeId = Main.sessionMode.connect('updated', _onSessionUpdated);

    if (Main.sessionMode.isLocked && Main.panel)
        Main.panel.hide();

    _configureActivities();
    _cleanClock();
    _minimizePanel();
    _moveClockToRight();
    _configureClockFormat();
    _configureCalendarVisibility();
    _configureWorkspacePopup();
    _configureAnimations();
    _configureWorkspaceIndicator();
    _configureAppMenu();
    _applyDynamicStyles();

    _timeoutIds.push(GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, function() {
        _configureActivities();
        _cleanClock();
        _minimizePanel();
        _moveClockToRight();
        _configureClockFormat();
        _configureCalendarVisibility();
        _configureWorkspacePopup();
        _configureAnimations();
        _configureWorkspaceIndicator();
        _configureAppMenu();
        _applyDynamicStyles();
        return false;
    }));

    _timeoutIds.push(GLib.timeout_add(GLib.PRIORITY_DEFAULT, 3000, function() {
        _configureActivities();
        _cleanClock();
        _minimizePanel();
        _moveClockToRight();
        _configureClockFormat();
        _configureCalendarVisibility();
        _configureWorkspacePopup();
        _configureAnimations();
        _configureWorkspaceIndicator();
        _configureAppMenu();
        _applyDynamicStyles();
        return false;
    }));
}

function disable() {
    // Cancel pending timeouts (#1)
    _timeoutIds.forEach(function(id) { GLib.source_remove(id); });
    _timeoutIds = [];

    if (_sessionModeId) {
        Main.sessionMode.disconnect(_sessionModeId);
        _sessionModeId = 0;
    }

    if (_settingsChangedId) {
        _getSettings().disconnect(_settingsChangedId);
        _settingsChangedId = 0;
    }

    // Restore workspace popup prototype (#2)
    if (window._originalDisplay) {
        const WorkspaceSwitcherPopup = imports.ui.workspaceSwitcherPopup;
        WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype.display = window._originalDisplay;
        delete window._originalDisplay;
    }

    if (_workspaceClickId && _workspaceIndicatorActor) {
        _workspaceIndicatorActor.disconnect(_workspaceClickId);
        _workspaceClickId = 0;
    }

    if (_workspaceSignalIds.length > 0) {
        const workspaceManager = global.workspace_manager;
        _workspaceSignalIds.forEach(function(id) { workspaceManager.disconnect(id); });
        _workspaceSignalIds = [];
    }

    // Destroy workspace indicator (#11)
    if (_workspaceIndicatorActor) {
        try {
            const parent = _workspaceIndicatorActor.get_parent();
            if (parent)
                parent.remove_actor(_workspaceIndicatorActor);
            _workspaceIndicatorActor.get_children().forEach(function(c) { c.destroy(); });
            _workspaceIndicatorActor.destroy();
        } catch (e) {
            log('[RenderOrange] Error cleaning up workspace indicator: ' + e);
        }
        _workspaceIndicatorActor = null;
    }

    _unloadDynamicStyles();

    // Revert system GSettings (#5)
    try {
        const iface = _getInterfaceSettings();
        iface.set_string('clock-format', _savedClockFormat);
        iface.set_boolean('clock-show-seconds', _savedShowSeconds);
        iface.set_boolean('clock-show-date', _savedShowDate);
        iface.set_boolean('enable-animations', _savedEnableAnimations);
    } catch (e) {
        log('[RenderOrange] Error reverting system settings: ' + e);
    }

    // Clean up CSS classes on uiGroup (#6)
    if (Main.uiGroup) {
        UI_GROUP_CLASSES.forEach(function(cls) { Main.uiGroup.remove_style_class_name(cls); });
    }

    // Revert panel styles (#7)
    if (Main.panel)
        Main.panel.set_style('');

    // Revert clock position (#8)
    if (_clockOriginalParent && Main.panel.statusArea && Main.panel.statusArea.dateMenu) {
        const clock = Main.panel.statusArea.dateMenu;
        try {
            const currentParent = clock.actor.get_parent();
            if (currentParent)
                currentParent.remove_actor(clock.actor);
            _clockOriginalParent.add_child(clock.actor);
        } catch (e) {
            log('[RenderOrange] Error reverting clock position: ' + e);
        }
        _clockOriginalParent = null;
    }
}

function init() {
    log('[RenderOrange] Initialized');
}
