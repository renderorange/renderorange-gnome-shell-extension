/**
 * RenderOrange Preferences
 */

const ExtensionUtils = imports.misc.extensionUtils;
const Adw = imports.gi.Adw;
const Gtk = imports.gi.Gtk;

function init() {
    // No translations yet
}

function getSettings() {
    return ExtensionUtils.getSettings();
}

function createSwitch(settings, key, title) {
    const row = new Adw.ActionRow({ title: title });
    const sw = new Gtk.Switch();
    sw.set_active(settings.get_boolean(key));
    sw.connect('notify::active', () => {
        settings.set_boolean(key, sw.active);
    });
    row.add_suffix(sw);
    row.set_activatable_widget(sw);
    return row;
}

function fillPreferencesWindow(window) {
    const settings = getSettings();
    
    const page = new Adw.PreferencesPage();
    
    // Clock Group
    const clockGroup = new Adw.PreferencesGroup({ title: 'Clock' });
    
    // Time format row - use ActionRow with dropdown
    const formatRow = new Adw.ActionRow({ title: 'Time Format' });
    const formatCombo = new Gtk.ComboBoxText();
    formatCombo.append('24h', '24-hour');
    formatCombo.append('12h', '12-hour');
    formatCombo.append('locale', 'System');
    
    const cur = settings.get_string('clock-format');
    if (cur === '12h') formatCombo.set_active(1);
    else if (cur === 'locale') formatCombo.set_active(2);
    else formatCombo.set_active(0);
    
    formatCombo.connect('changed', () => {
        settings.set_string('clock-format', formatCombo.get_active_id());
    });
    
    formatRow.add_suffix(formatCombo);
    formatRow.set_activatable_widget(formatCombo);
    clockGroup.add(formatRow);
    
    // Add switches
    clockGroup.add(createSwitch(settings, 'show-seconds', 'Show Seconds'));
    clockGroup.add(createSwitch(settings, 'show-date', 'Show Date'));
    
    page.add(clockGroup);
    
    // Calendar Widget Group
    const calGroup = new Adw.PreferencesGroup({ title: 'Calendar Widget' });
    calGroup.add(createSwitch(settings, 'show-calendar', 'Show Calendar'));
    calGroup.add(createSwitch(settings, 'show-events', 'Show Events'));
    calGroup.add(createSwitch(settings, 'show-world-clocks', 'Show World Clocks'));
    calGroup.add(createSwitch(settings, 'show-weather', 'Show Weather'));
    page.add(calGroup);
    
    // Behavior Group
    const behaveGroup = new Adw.PreferencesGroup({ title: 'Behavior' });
    behaveGroup.add(createSwitch(settings, 'workspace-popup', 'Workspace Popup'));
    behaveGroup.add(createSwitch(settings, 'animations', 'Animations'));
    behaveGroup.add(createSwitch(settings, 'workspace-indicator', 'Workspace Indicator'));
    behaveGroup.add(createSwitch(settings, 'show-app-menu', 'App Menu'));
    behaveGroup.add(createSwitch(settings, 'show-activities', 'Activities'));
    
    page.add(behaveGroup);
    
    window.add(page);
}