/**
 * RenderOrange Preferences
 */

const ExtensionUtils = imports.misc.extensionUtils;
const Adw = imports.gi.Adw;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;

function init() {
    // No translations yet
}

function getSettings() {
    return ExtensionUtils.getSettings();
}

function createSwitch(settings, key, title) {
    const row = new Adw.ActionRow({ title });
    const sw = new Gtk.Switch({
        valign: Gtk.Align.CENTER,
        active: settings.get_boolean(key),
    });

    sw.connect('notify::active', () => {
        settings.set_boolean(key, sw.active);
    });

    row.add_suffix(sw);
    row.set_activatable_widget(sw);

    return row;
}

function createClockFormatRow(settings) {
    const row = new Adw.ComboRow({ title: 'Time Format' });
    const model = Gtk.StringList.new(['24-hour', '12-hour', 'System']);
    row.set_model(model);

    const current = settings.get_string('clock-format');
    if (current === '12h')
        row.set_selected(1);
    else if (current === 'locale')
        row.set_selected(2);
    else
        row.set_selected(0);

    row.connect('notify::selected', () => {
        const index = row.get_selected();
        if (index === 1)
            settings.set_string('clock-format', '12h');
        else if (index === 2)
            settings.set_string('clock-format', 'locale');
        else
            settings.set_string('clock-format', '24h');
    });

    return row;
}

function createColorRow(settings, key, title) {
    const row = new Adw.ActionRow({ title });
    const button = new Gtk.ColorButton({
        use_alpha: false,
        valign: Gtk.Align.CENTER,
    });

    const value = settings.get_string(key);
    const initial = new Gdk.RGBA();
    if (!initial.parse(value))
        initial.parse('#444444');
    button.set_rgba(initial);

    button.connect('notify::rgba', () => {
        const rgba = button.get_rgba();
        const red = Math.round(rgba.red * 255).toString(16).padStart(2, '0');
        const green = Math.round(rgba.green * 255).toString(16).padStart(2, '0');
        const blue = Math.round(rgba.blue * 255).toString(16).padStart(2, '0');
        settings.set_string(key, `#${red}${green}${blue}`);
    });

    row.add_suffix(button);
    row.set_activatable_widget(button);
    return row;
}

function fillPreferencesWindow(window) {
    const settings = getSettings();
    
    const page = new Adw.PreferencesPage();
    
    // Clock Group
    const clockGroup = new Adw.PreferencesGroup({ title: 'Clock' });
    
    clockGroup.add(createClockFormatRow(settings));
    
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
    behaveGroup.add(createColorRow(settings, 'gtk-popup-accent', 'GTK Popup Accent'));
    
    page.add(behaveGroup);
    
    window.add(page);
}
