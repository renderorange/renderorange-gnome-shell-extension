import {describe, it} from 'node:test';
import assert from 'node:assert/strict';

import {normalizeHexColor, hexToRgba} from '../lib.js';

describe('normalizeHexColor', () => {
    it('returns default for non-string input', () => {
        assert.equal(normalizeHexColor(null), '#444444');
        assert.equal(normalizeHexColor(undefined), '#444444');
        assert.equal(normalizeHexColor(42), '#444444');
        assert.equal(normalizeHexColor({}), '#444444');
        assert.equal(normalizeHexColor([]), '#444444');
    });

    it('returns default for empty string', () => {
        assert.equal(normalizeHexColor(''), '#444444');
    });

    it('returns default for invalid hex colors', () => {
        assert.equal(normalizeHexColor('red'), '#444444');
        assert.equal(normalizeHexColor('#fff'), '#444444');
        assert.equal(normalizeHexColor('000000'), '#444444');
        assert.equal(normalizeHexColor('#gggggg'), '#444444');
        assert.equal(normalizeHexColor('#12345'), '#444444');
        assert.equal(normalizeHexColor('#1234567'), '#444444');
    });

    it('accepts valid 6-digit hex colors', () => {
        assert.equal(normalizeHexColor('#ffffff'), '#ffffff');
        assert.equal(normalizeHexColor('#000000'), '#000000');
    });

    it('normalizes valid hex colors to lowercase', () => {
        assert.equal(normalizeHexColor('#ABCDEF'), '#abcdef');
        assert.equal(normalizeHexColor('#AbCdEf'), '#abcdef');
        assert.equal(normalizeHexColor('#112233'), '#112233');
    });

    it('trims whitespace', () => {
        assert.equal(normalizeHexColor('  #ABCDEF  '), '#abcdef');
        assert.equal(normalizeHexColor('\t#112233\n'), '#112233');
    });

    it('handles common color values', () => {
        assert.equal(normalizeHexColor('#000000'), '#000000');
        assert.equal(normalizeHexColor('#ffffff'), '#ffffff');
        assert.equal(normalizeHexColor('#3584e4'), '#3584e4');
    });
});

describe('hexToRgba', () => {
    it('converts hex to rgba with full opacity', () => {
        assert.equal(hexToRgba('#000000', 1.0), 'rgba(0, 0, 0, 1)');
        assert.equal(hexToRgba('#ffffff', 1.0), 'rgba(255, 255, 255, 1)');
    });

    it('converts hex to rgba with zero opacity', () => {
        assert.equal(hexToRgba('#000000', 0), 'rgba(0, 0, 0, 0)');
        assert.equal(hexToRgba('#ffffff', 0), 'rgba(255, 255, 255, 0)');
    });

    it('converts hex to rgba with partial opacity', () => {
        assert.equal(hexToRgba('#3584e4', 0.5), 'rgba(53, 132, 228, 0.5)');
        assert.equal(hexToRgba('#ff0000', 0.25), 'rgba(255, 0, 0, 0.25)');
    });

    it('handles mixed case input', () => {
        assert.equal(hexToRgba('#AbCdEf', 1.0), 'rgba(171, 205, 239, 1)');
    });

    it('falls back to default for invalid input', () => {
        assert.equal(hexToRgba('invalid', 0.5), 'rgba(68, 68, 68, 0.5)');
        assert.equal(hexToRgba(null, 0.5), 'rgba(68, 68, 68, 0.5)');
    });

    it('handles specific GNOME accent colors', () => {
        assert.equal(hexToRgba('#3584e4', 0.5), 'rgba(53, 132, 228, 0.5)');
        assert.equal(hexToRgba('#444444', 0.5), 'rgba(68, 68, 68, 0.5)');
    });

    it('clamps alpha to valid range', () => {
        assert.equal(hexToRgba('#000000', -0.5), 'rgba(0, 0, 0, 0)');
        assert.equal(hexToRgba('#000000', 1.5), 'rgba(0, 0, 0, 1)');
        assert.equal(hexToRgba('#000000', 999), 'rgba(0, 0, 0, 1)');
        assert.equal(hexToRgba('#000000', -999), 'rgba(0, 0, 0, 0)');
    });
});
