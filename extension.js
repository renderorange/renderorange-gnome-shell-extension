/**
 * RenderOrange Extension
 * Minimal top bar like Regolith/i3
 *
 * Supports GNOME Shell 45+ (ESM)
 * For GNOME Shell 43, use v43/extension.js
 */

import GLib from 'gi://GLib';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as WorkspaceSwitcherPopup from 'resource:///org/gnome/shell/ui/workspaceSwitcherPopup.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const UI_GROUP_CLASSES = [
    'renderorange-no-weather',
    'renderorange-no-world-clocks',
    'renderorange-no-events-button',
];

export default class RenderOrangeExtension extends Extension {
    enable() {
        this._settingsChangedId = 0;
        this._sessionModeId = 0;
        this._workspaceIndicatorActor = null;
        this._workspaceSignalIds = [];
        this._workspaceClickId = 0;
        this._timeoutIds = [];
        this._clockOriginalParent = null;
        this._panelOriginalStyle = null;

        this._settings = this.getSettings();
        this._interfaceSettings = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
        this._savedClockFormat = this._interfaceSettings.get_string('clock-format');
        this._savedShowSeconds = this._interfaceSettings.get_boolean('clock-show-seconds');
        this._savedShowDate = this._interfaceSettings.get_boolean('clock-show-date');
        this._savedEnableAnimations = this._interfaceSettings.get_boolean('enable-animations');
        this._savedFontAntialiasing = this._interfaceSettings.get_string('font-antialiasing');
        this._savedFontHinting = this._interfaceSettings.get_string('font-hinting');

        this._settingsChangedId = this._settings.connect('changed', (_schema, key) => {
            if (key === 'clock-format' || key === 'show-seconds' || key === 'show-date')
                this._configureClockFormat();
            if (key.startsWith('show-'))
                this._configureCalendarVisibility();
            if (key === 'workspace-popup')
                this._configureWorkspacePopup();
            if (key === 'animations')
                this._configureAnimations();
            if (key === 'workspace-indicator')
                this._configureWorkspaceIndicator();
            if (key === 'show-app-menu')
                this._configureAppMenu();
            if (key === 'show-activities')
                this._configureActivities();
            if (key === 'font-antialiasing' || key === 'font-hinting')
                this._configureFontRendering();
        });

        this._sessionModeId = Main.sessionMode.connect('updated', () =>
            this._onSessionUpdated());

        if (Main.sessionMode.isLocked && Main.panel)
            Main.panel.hide();

        this._configureActivities();
        this._configureFontRendering();
        this._cleanClock();
        this._minimizePanel();
        this._moveClockToRight();
        this._configureClockFormat();
        this._configureCalendarVisibility();
        this._configureWorkspacePopup();
        this._configureAnimations();
        this._configureWorkspaceIndicator();
        this._configureAppMenu();

        this._timeoutIds.push(GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
            this._configureActivities();
            this._configureFontRendering();
            this._cleanClock();
            this._minimizePanel();
            this._moveClockToRight();
            this._configureClockFormat();
            this._configureCalendarVisibility();
            this._configureWorkspacePopup();
            this._configureAnimations();
            this._configureWorkspaceIndicator();
            this._configureAppMenu();
            return false;
        }));

        this._timeoutIds.push(GLib.timeout_add(GLib.PRIORITY_DEFAULT, 3000, () => {
            this._configureActivities();
            this._configureFontRendering();
            this._cleanClock();
            this._minimizePanel();
            this._moveClockToRight();
            this._configureClockFormat();
            this._configureCalendarVisibility();
            this._configureWorkspacePopup();
            this._configureAnimations();
            this._configureWorkspaceIndicator();
            this._configureAppMenu();
            return false;
        }));
    }

    disable() {
        // Cancel pending timeouts (#1)
        this._timeoutIds.forEach(id => GLib.source_remove(id));
        this._timeoutIds = [];

        if (this._sessionModeId) {
            Main.sessionMode.disconnect(this._sessionModeId);
            this._sessionModeId = 0;
        }

        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = 0;
        }

        // Restore workspace popup prototype (#2)
        if (globalThis._originalDisplay) {
            WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype.display = globalThis._originalDisplay;
            delete globalThis._originalDisplay;
        }

        // Disconnect workspace signals
        if (this._workspaceClickId && this._workspaceIndicatorActor) {
            this._workspaceIndicatorActor.disconnect(this._workspaceClickId);
            this._workspaceClickId = 0;
        }

        if (this._workspaceSignalIds.length > 0) {
            const workspaceManager = global.workspace_manager;
            this._workspaceSignalIds.forEach(id => workspaceManager.disconnect(id));
            this._workspaceSignalIds = [];
        }

        // Destroy workspace indicator (#11 — destroy children)
        if (this._workspaceIndicatorActor) {
            try {
                const parent = this._workspaceIndicatorActor.get_parent();
                if (parent)
                    parent.remove_child(this._workspaceIndicatorActor);
                this._workspaceIndicatorActor.get_children().forEach(c => c.destroy());
                this._workspaceIndicatorActor.destroy();
            } catch (e) {
                console.warn(`[RenderOrange] Error cleaning up workspace indicator: ${e}`);
            }
            this._workspaceIndicatorActor = null;
        }

        // Revert system GSettings to saved values (#5)
        try {
            this._interfaceSettings.set_string('clock-format', this._savedClockFormat);
            this._interfaceSettings.set_boolean('clock-show-seconds', this._savedShowSeconds);
            this._interfaceSettings.set_boolean('clock-show-date', this._savedShowDate);
            this._interfaceSettings.set_boolean('enable-animations', this._savedEnableAnimations);
            this._interfaceSettings.set_string('font-antialiasing', this._savedFontAntialiasing);
            this._interfaceSettings.set_string('font-hinting', this._savedFontHinting);
        } catch (e) {
            console.warn(`[RenderOrange] Error reverting system settings: ${e}`);
        }

        // Clean up CSS classes on uiGroup (#6)
        if (Main.uiGroup) {
            UI_GROUP_CLASSES.forEach(cls => Main.uiGroup.remove_style_class_name(cls));
        }

        // Revert panel styles (#7)
        if (Main.panel)
            Main.panel.set_style('');

        // Revert clock position (#8)
        if (this._clockOriginalParent && Main.panel.statusArea?.dateMenu) {
            const clock = Main.panel.statusArea.dateMenu;
            try {
                const currentParent = clock.get_parent();
                if (currentParent)
                    currentParent.remove_child(clock);
                this._clockOriginalParent.add_child(clock);
            } catch (e) {
                console.warn(`[RenderOrange] Error reverting clock position: ${e}`);
            }
            this._clockOriginalParent = null;
        }
    }

    _configureActivities() {
        const showActivities = this._settings.get_boolean('show-activities');

        if (Main.panel.statusArea) {
            const activities = Main.panel.statusArea.activities;
            if (activities) {
                if (showActivities)
                    activities.show();
                else
                    activities.hide();
            }
        }
    }

    _cleanClock() {
        if (Main.panel.statusArea && Main.panel.statusArea.dateMenu) {
            const clock = Main.panel.statusArea.dateMenu;
            clock.set_style('background: transparent; border: none; box-shadow: none;');

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
            findAndCleanClock(clock);
        }
    }

    _configureClockFormat() {
        try {
            const clockFormat = this._settings.get_string('clock-format');
            const showSeconds = this._settings.get_boolean('show-seconds');
            const showDate = this._settings.get_boolean('show-date');

            this._interfaceSettings.set_string('clock-format', clockFormat);
            this._interfaceSettings.set_boolean('clock-show-seconds', showSeconds);
            this._interfaceSettings.set_boolean('clock-show-date', showDate);
        } catch (e) {
            console.warn(`[RenderOrange] Error setting clock format: ${e}`);
        }
    }

    _moveClockToRight() {
        if (!Main.panel._centerBox || !Main.panel._rightBox)
            return;

        const dateMenu = Main.panel.statusArea?.dateMenu;
        if (!dateMenu)
            return;

        const parent = dateMenu.get_parent();
        if (parent === Main.panel._rightBox)
            return;

        // Save original parent for revert (#8)
        if (!this._clockOriginalParent)
            this._clockOriginalParent = parent;

        if (parent)
            parent.remove_child(dateMenu);

        Main.panel._rightBox.insert_child_at_index(dateMenu, 0);
    }

    _minimizePanel() {
        this._configureAppMenu();

        if (Main.panel && !this._panelOriginalStyle) {
            this._panelOriginalStyle = Main.panel.get_style() || '';
            Main.panel.set_style('box-shadow: none; border: none;');
        }
    }

    _configureAppMenu() {
        const showAppMenu = this._settings.get_boolean('show-app-menu');

        if (Main.panel.statusArea && Main.panel.statusArea.appMenu) {
            const appMenu = Main.panel.statusArea.appMenu;
            if (showAppMenu)
                appMenu.show();
            else
                appMenu.hide();
        }
    }

    _configureCalendarVisibility() {
        const showCalendar = this._settings.get_boolean('show-calendar');
        const showEvents = this._settings.get_boolean('show-events');
        const showWorldClocks = this._settings.get_boolean('show-world-clocks');
        const showWeather = this._settings.get_boolean('show-weather');

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

    _configureWorkspacePopup() {
        const showPopup = this._settings.get_boolean('workspace-popup');

        if (showPopup) {
            if (globalThis._originalDisplay) {
                WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype.display = globalThis._originalDisplay;
                delete globalThis._originalDisplay;
            }
        } else {
            if (!globalThis._originalDisplay) {
                globalThis._originalDisplay = WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype.display;
            }
            WorkspaceSwitcherPopup.WorkspaceSwitcherPopup.prototype.display = () => {
                return false;
            };
        }
    }

    _configureAnimations() {
        const enableAnimations = this._settings.get_boolean('animations');
        this._interfaceSettings.set_boolean('enable-animations', enableAnimations);
    }

    _configureFontRendering() {
        try {
            const antialiasing = this._settings.get_string('font-antialiasing');
            const hinting = this._settings.get_string('font-hinting');
            this._interfaceSettings.set_string('font-antialiasing', antialiasing);
            this._interfaceSettings.set_string('font-hinting', hinting);
        } catch (e) {
            console.warn(`[RenderOrange] Error setting font rendering: ${e}`);
        }
    }

    _createWorkspaceIndicator() {
        if (this._workspaceIndicatorActor) return;

        const container = new St.BoxLayout({
            style_class: 'renderorange-workspace-indicator',
            reactive: true,
            track_hover: true,
        });

        this._workspaceIndicatorActor = container;

        if (Main.panel._leftBox)
            Main.panel._leftBox.insert_child_at_index(container, 0);

        this._workspaceClickId = container.connect('button-release-event', () => {
            if (Main.overview.visible)
                Main.overview.hide();
            else {
                Main.overview.show();
                Main.overview.showApps();
            }
            return Clutter.EVENT_STOP;
        });

        this._updateWorkspaceDots();

        const workspaceManager = global.workspace_manager;
        this._workspaceSignalIds.push(workspaceManager.connect('workspace-added', () => this._updateWorkspaceDots()));
        this._workspaceSignalIds.push(workspaceManager.connect('workspace-removed', () => this._updateWorkspaceDots()));
        this._workspaceSignalIds.push(workspaceManager.connect('active-workspace-changed', () => this._updateWorkspaceDots()));
    }

    _updateWorkspaceDots() {
        if (!this._workspaceIndicatorActor) return;

        if (!this._settings.get_boolean('workspace-indicator')) {
            this._workspaceIndicatorActor.hide();
            return;
        }

        this._workspaceIndicatorActor.show();

        // Destroy old children (#11)
        this._workspaceIndicatorActor.get_children().forEach(c => c.destroy());

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
            label.set_style(`font-size: 14px; font-weight: ${isActive ? 'bold' : 'normal'}; margin-top: 4px;`);

            dot.add_child(label);
            this._workspaceIndicatorActor.add_child(dot);
        }
    }

    _ensureWorkspaceIndicatorInPanel() {
        if (!this._workspaceIndicatorActor || !Main.panel._leftBox)
            return;
        try {
            const parent = this._workspaceIndicatorActor.get_parent();
            if (!parent)
                Main.panel._leftBox.insert_child_at_index(this._workspaceIndicatorActor, 0);
        } catch (e) {
            console.warn(`[RenderOrange] Could not re-parent workspace indicator: ${e}`);
        }
    }

    _configureWorkspaceIndicator() {
        const showIndicator = this._settings.get_boolean('workspace-indicator');

        if (showIndicator) {
            if (!this._workspaceIndicatorActor)
                this._createWorkspaceIndicator();
            else
                this._ensureWorkspaceIndicatorInPanel();
            this._workspaceIndicatorActor.show();
        } else if (this._workspaceIndicatorActor) {
            this._workspaceIndicatorActor.hide();
        }
    }

    _onSessionUpdated() {
        if (Main.sessionMode.isLocked) {
            if (Main.panel)
                Main.panel.hide();
        } else {
            if (Main.panel)
                Main.panel.show();
            this._minimizePanel();
            this._moveClockToRight();
            this._cleanClock();
            this._configureFontRendering();
            this._configureWorkspaceIndicator();
            this._configureAppMenu();
            this._configureActivities();
        }
    }
}
