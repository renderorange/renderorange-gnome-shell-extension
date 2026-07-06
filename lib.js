/**
 * RenderOrange - Pure helper functions
 *
 * These functions have no GNOME Shell dependencies and can be unit tested.
 */

export function normalizeHexColor(value) {
    if (typeof value !== 'string')
        return '#444444';

    const match = value.trim().match(/^#([0-9a-fA-F]{6})$/);
    if (!match)
        return '#444444';

    return `#${match[1].toLowerCase()}`;
}

export function hexToRgba(hex, alpha) {
    const normalized = normalizeHexColor(hex).slice(1);
    const red = parseInt(normalized.slice(0, 2), 16);
    const green = parseInt(normalized.slice(2, 4), 16);
    const blue = parseInt(normalized.slice(4, 6), 16);
    const a = Math.max(0, Math.min(1, alpha));
    return `rgba(${red}, ${green}, ${blue}, ${a})`;
}
