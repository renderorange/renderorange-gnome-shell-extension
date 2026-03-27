/**
 * RenderOrange Extension
 * Minimal top bar like Regolith/i3
 */

const Main = imports.ui.main;
const GLib = imports.gi.GLib;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const ExtensionUtils = imports.misc.extensionUtils;

let _activitiesButton = null;
let _settings = null;
let _settingsChangedId = 0;
let _dynamicStylesheetFile = null;
let _dynamicStylesheetPath = null;

function getSettings() {
    if (!_settings) {
        _settings = ExtensionUtils.getSettings();
    }
    return _settings;
}

function _normalizeHexColor(value) {
    if (typeof value !== 'string')
        return '#444444';

    const match = value.trim().match(/^#([0-9a-fA-F]{6})$/);
    if (!match)
        return '#444444';

    return `#${match[1].toLowerCase()}`;
}

function _createDynamicStylesheetPath() {
    const timestamp = GLib.get_real_time();
    return GLib.build_filenamev([
        GLib.get_tmp_dir(),
        `renderorange-dynamic-${timestamp}.css`,
    ]);
}

function _hexToRgba(hex, alpha) {
    const normalized = _normalizeHexColor(hex).slice(1);
    const red = parseInt(normalized.slice(0, 2), 16);
    const green = parseInt(normalized.slice(2, 4), 16);
    const blue = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function applyDynamicStyles() {
    const settings = getSettings();
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

    try {
        const theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
        const path = _createDynamicStylesheetPath();

        if (!GLib.file_set_contents(path, css))
            throw new Error('Could not write dynamic stylesheet to ' + path);

        const stylesheet = Gio.File.new_for_path(path);
        if (_dynamicStylesheetFile) {
            try {
                theme.unload_stylesheet(_dynamicStylesheetFile);
            } catch (e) {
                log('[RenderOrange] Could not unload previous dynamic stylesheet: ' + e);
            }
        }

        theme.load_stylesheet(stylesheet);

        if (_dynamicStylesheetPath) {
            try {
                Gio.File.new_for_path(_dynamicStylesheetPath).delete(null);
            } catch (e) {
                log('[RenderOrange] Could not delete old dynamic stylesheet: ' + e);
            }
        }

        _dynamicStylesheetFile = stylesheet;
        _dynamicStylesheetPath = path;
        log('[RenderOrange] Applied popup accent: ' + accent);
    } catch (e) {
        log('[RenderOrange] Failed to apply dynamic styles: ' + e);
    }
}

function unloadDynamicStyles() {
    if (_dynamicStylesheetFile) {
        try {
            const theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
            theme.unload_stylesheet(_dynamicStylesheetFile);
        } catch (e) {
            log('[RenderOrange] Failed to unload dynamic stylesheet: ' + e);
        }

        _dynamicStylesheetFile = null;
    }

    if (_dynamicStylesheetPath) {
        try {
            Gio.File.new_for_path(_dynamicStylesheetPath).delete(null);
        } catch (e) {
            log('[RenderOrange] Failed to delete dynamic stylesheet file: ' + e);
        }

        _dynamicStylesheetPath = null;
    }
}

/**
 * Find and show/hide the Activities button based on setting
 */
function configureActivities() {
    const settings = getSettings();
    const showActivities = settings.get_boolean('show-activities');
    
    if (Main.panel.statusArea) {
        const activities = Main.panel.statusArea.activities;
        if (activities) {
            if (showActivities) {
                activities.actor.show();
                log('[RenderOrange] Showing Activities');
            } else {
                activities.actor.hide();
                log('[RenderOrange] Hidden Activities');
            }
        }
    }
}

/**
 * Clean up clock styling
 */
function cleanClock() {
    if (Main.panel.statusArea && Main.panel.statusArea.dateMenu) {
        const clock = Main.panel.statusArea.dateMenu;
        if (clock.actor) {
            clock.actor.set_style('background: transparent; border: none; box-shadow: none;');
        }
        
        const findAndCleanClock = (container) => {
            if (!container) return;
            if (container.style_class && 
                (container.style_class.includes('clock-display') || 
                 container.style_class.includes('clock'))) {
                container.set_style('background: transparent !important; border: none !important; box-shadow: none !important; font-weight: 500 !important;');
            }
            if (container.get_children) {
                container.get_children().forEach(child => findAndCleanClock(child));
            }
        };
        findAndCleanClock(clock.actor);
        
        log('[RenderOrange] Cleaned clock styling');
    }
}

/**
 * Configure clock format based on settings
 */
function configureClockFormat() {
    try {
        const settings = getSettings();
        const interfaceSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.interface' });
        
        const clockFormat = settings.get_string('clock-format');
        const showSeconds = settings.get_boolean('show-seconds');
        const showDate = settings.get_boolean('show-date');
        
        interfaceSettings.set_string('clock-format', clockFormat);
        interfaceSettings.set_boolean('clock-show-seconds', showSeconds);
        interfaceSettings.set_boolean('clock-show-date', showDate);
        
        log('[RenderOrange] Clock format applied: ' + clockFormat + ', seconds: ' + showSeconds + ', date: ' + showDate);
    } catch (e) {
        log('[RenderOrange] Error setting clock format: ' + e);
    }
}

/**
 * Move clock to right side
 */
function moveClockToRight() {
    if (!Main.panel._centerBox || !Main.panel._rightBox) {
        log('[RenderOrange] Panel boxes not found');
        return;
    }
    
    const dateMenu = Main.panel.statusArea?.dateMenu;
    if (!dateMenu || !dateMenu.actor) {
        log('[RenderOrange] dateMenu not found');
        return;
    }
    
    const parent = dateMenu.actor.get_parent();
    if (parent === Main.panel._rightBox) {
        log('[RenderOrange] Clock already in right box');
        return;
    }
    
    if (parent) {
        parent.remove_actor(dateMenu.actor);
    }
    
    Main.panel._rightBox.insert_child_at_index(dateMenu.actor, 0);
    
    log('[RenderOrange] Moved clock to right side');
}

/**
 * Remove extra panel elements for minimal look
 */
function minimizePanel() {
    configureAppMenu();
    
    if (Main.panel) {
        Main.panel.set_style('box-shadow: none; border: none;');
    }
}

/**
 * Configure app menu visibility
 */
function configureAppMenu() {
    const settings = getSettings();
    const showAppMenu = settings.get_boolean('show-app-menu');
    
    if (Main.panel.statusArea && Main.panel.statusArea.appMenu) {
        const appMenu = Main.panel.statusArea.appMenu;
        if (showAppMenu) {
            appMenu.actor.show();
            log('[RenderOrange] Showing appMenu');
        } else {
            appMenu.actor.hide();
            log('[RenderOrange] Hidden appMenu');
        }
    }
}

/**
 * Configure calendar widget visibility
 */
function configureCalendarVisibility() {
    const settings = getSettings();
    const showCalendar = settings.get_boolean('show-calendar');
    const showEvents = settings.get_boolean('show-events');
    const showWorldClocks = settings.get_boolean('show-world-clocks');
    const showWeather = settings.get_boolean('show-weather');
    
    const dateMenu = Main.panel.statusArea?.dateMenu;
    if (!dateMenu) return;
    
    // Hide calendar - direct method from Just Perfection
    if (dateMenu._calendar) {
        if (showCalendar) {
            dateMenu._calendar.show();
        } else {
            dateMenu._calendar.hide();
        }
    }
    
    // For weather, world clocks, events - add class to global.uiGroup which wraps everything
    const globalUI = Main.uiGroup;
    if (!globalUI) {
        log('[RenderOrange] Main.uiGroup not found');
    }
    
    const className = 'renderorange-no-weather';
    const className2 = 'renderorange-no-world-clocks';
    const className3 = 'renderorange-no-events-button';
    
    if (globalUI) {
        if (showWeather) {
            globalUI.remove_style_class_name(className);
        } else {
            globalUI.add_style_class_name(className);
        }
        
        if (showWorldClocks) {
            globalUI.remove_style_class_name(className2);
        } else {
            globalUI.add_style_class_name(className2);
        }
        
        if (showEvents) {
            globalUI.remove_style_class_name(className3);
        } else {
            globalUI.add_style_class_name(className3);
        }
        
        log('[RenderOrange] Added classes to uiGroup');
    }
    
    log('[RenderOrange] Calendar visibility set');
}

/**
 * Disable workspace popup
 */
function configureWorkspacePopup() {
    const settings = getSettings();
    const showPopup = settings.get_boolean('workspace-popup');
    
    const WorkspaceSwitcherPopup = imports.ui.workspaceSwitcherPopup;
    
    if (showPopup) {
        // Restore original display method if we saved it
        if (window._originalDisplay) {
            WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype.display = window._originalDisplay;
            delete window._originalDisplay;
        }
    } else {
        // Save original and replace
        if (!window._originalDisplay) {
            window._originalDisplay = WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype.display;
        }
        WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype.display = (index) => {
            return false;
        };
    }
    
    log('[RenderOrange] Workspace popup: ' + showPopup);
}

/**
 * Configure animations
 */
function configureAnimations() {
    const settings = getSettings();
    const enableAnimations = settings.get_boolean('animations');
    
    const interfaceSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.interface' });
    interfaceSettings.set_boolean('enable-animations', enableAnimations);
    
    log('[RenderOrange] Animations: ' + enableAnimations);
}

/**
 * Configure workspace indicator in top bar - create custom indicator
 */
let _workspaceIndicatorActor = null;
let _workspaceSignalId = null;

function createWorkspaceIndicator() {
    if (_workspaceIndicatorActor) return;
    
    const { St, Clutter } = imports.gi;
    
    // Create container for workspace dots
    const container = new St.BoxLayout({
        style_class: 'renderorange-workspace-indicator',
        reactive: false,
        track_hover: false
    });
    
    _workspaceIndicatorActor = container;
    
    // Add to left of panel
    if (Main.panel._leftBox) {
        Main.panel._leftBox.insert_child_at_index(container, 0);
        log('[RenderOrange] Added custom workspace indicator');
    }
    
    // Update dots when workspace changes
    updateWorkspaceDots();
    
    // Listen for workspace changes
    const workspaceManager = global.workspace_manager;
    _workspaceSignalId = workspaceManager.connect('workspace-added', updateWorkspaceDots);
    workspaceManager.connect('workspace-removed', updateWorkspaceDots);
    workspaceManager.connect('active-workspace-changed', updateWorkspaceDots);
}

function updateWorkspaceDots() {
    if (!_workspaceIndicatorActor) {
        log('[RenderOrange] No workspace indicator actor');
        return;
    }
    
    const settings = getSettings();
    if (!settings.get_boolean('workspace-indicator')) {
        _workspaceIndicatorActor.hide();
        log('[RenderOrange] Workspace indicator hidden by setting');
        return;
    }
    
    _workspaceIndicatorActor.show();
    log('[RenderOrange] Showing workspace indicator');
    
    // Clear existing dots
    _workspaceIndicatorActor.remove_all_children();
    
    const workspaceManager = global.workspace_manager;
    const activeWorkspace = workspaceManager.get_active_workspace_index();
    const numWorkspaces = workspaceManager.get_n_workspaces();
    
    log('[RenderOrange] Active: ' + activeWorkspace + ', Total: ' + numWorkspaces);
    
    for (let i = 0; i < numWorkspaces; i++) {
        const isActive = i === activeWorkspace;
        const wsNum = i + 1;
        
        const dot = new St.BoxLayout({
            style_class: isActive ? 'workspace-active' : 'workspace-dot',
            width: 36,
            height: 26,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER
        });
        
        if (isActive) {
            // Selected: #444444
            dot.set_style('background: #444444; color: #ffffff; min-width: 36px; min-height: 26px; margin: 0; padding: 0;');
        } else {
            // Unselected: transparent background (no change), lighter grey text
            dot.set_style('background: transparent; color: #888888; min-width: 36px; min-height: 26px; margin: 0; padding: 0;');
        }
        
        const label = new St.Label({
            text: wsNum.toString(),
            style_class: 'workspace-label'
        });
        label.set_style('font-size: 14px; font-weight: ' + (isActive ? 'bold' : 'normal') + '; margin-top: 4px;');
        
        dot.add_child(label);
        _workspaceIndicatorActor.add_child(dot);
    }
    
    log('[RenderOrange] Added ' + numWorkspaces + ' boxes');
}

function configureWorkspaceIndicator() {
    const settings = getSettings();
    const showIndicator = settings.get_boolean('workspace-indicator');
    
    if (showIndicator) {
        if (!_workspaceIndicatorActor) {
            createWorkspaceIndicator();
        }
        _workspaceIndicatorActor.show();
    } else {
        if (_workspaceIndicatorActor) {
            _workspaceIndicatorActor.hide();
        }
    }
    
    log('[RenderOrange] Workspace indicator configured');
}

/**
 * Enable extension
 */
function enable() {
    log('[RenderOrange] Enabling...');
    
    const settings = getSettings();
    
    // Listen for settings changes
    _settingsChangedId = settings.connect('changed', (schema, key) => {
        log('[RenderOrange] Setting changed: ' + key);
        if (key === 'clock-format' || key === 'show-seconds' || key === 'show-date') {
            configureClockFormat();
        }
        if (key.startsWith('show-')) {
            configureCalendarVisibility();
        }
        if (key === 'gtk-popup-accent') {
            applyDynamicStyles();
        }
        if (key === 'workspace-popup') {
            configureWorkspacePopup();
        }
        if (key === 'animations') {
            configureAnimations();
        }
        if (key === 'workspace-indicator') {
            configureWorkspaceIndicator();
        }
        if (key === 'show-app-menu') {
            configureAppMenu();
        }
        if (key === 'show-activities') {
            configureActivities();
        }
    });
    
    configureActivities();
    cleanClock();
    minimizePanel();
    moveClockToRight();
    configureClockFormat();
    configureCalendarVisibility();
    configureWorkspacePopup();
    configureAnimations();
    configureWorkspaceIndicator();
    configureAppMenu();
    applyDynamicStyles();
    
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
        configureActivities();
        cleanClock();
        minimizePanel();
        moveClockToRight();
        configureClockFormat();
        configureCalendarVisibility();
        configureWorkspacePopup();
        configureAnimations();
        configureWorkspaceIndicator();
        configureAppMenu();
        applyDynamicStyles();
        return false;
    });
    
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 3000, () => {
        configureActivities();
        cleanClock();
        minimizePanel();
        moveClockToRight();
        configureClockFormat();
        configureCalendarVisibility();
        configureWorkspacePopup();
        configureAnimations();
        configureWorkspaceIndicator();
        configureAppMenu();
        applyDynamicStyles();
        return false;
    });
}

/**
 * Disable extension
 */
function disable() {
    log('[RenderOrange] Disabling...');

    const settings = getSettings();
    if (_settingsChangedId) {
        settings.disconnect(_settingsChangedId);
        _settingsChangedId = 0;
    }

    unloadDynamicStyles();
}

/**
 * Initialize extension
 */
function init() {
    log('[RenderOrange] Initialized');
}
