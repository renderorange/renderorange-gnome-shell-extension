import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function readJson(path) {
    return JSON.parse(readFileSync(join(root, path), 'utf8'));
}

describe('metadata.json', () => {
    it('root metadata.json is valid JSON', () => {
        const meta = readJson('metadata.json');
        assert.ok(meta);
    });

    it('root metadata.json has required fields', () => {
        const meta = readJson('metadata.json');
        assert.equal(typeof meta.uuid, 'string');
        assert.ok(meta.uuid.length > 0);
        assert.equal(typeof meta.name, 'string');
        assert.ok(meta.name.length > 0);
        assert.equal(typeof meta.description, 'string');
        assert.ok(meta.description.length > 0);
        assert.ok(Array.isArray(meta['shell-version']));
        assert.ok(meta['shell-version'].length > 0);
    });

    it('root metadata.json targets GNOME 45+', () => {
        const meta = readJson('metadata.json');
        const versions = meta['shell-version'].map(Number);
        assert.ok(versions.every(v => v >= 45),
            `Expected all versions >= 45, got: ${meta['shell-version']}`);
    });

    it('root metadata.json has settings-schema', () => {
        const meta = readJson('metadata.json');
        assert.equal(typeof meta['settings-schema'], 'string');
        assert.ok(meta['settings-schema'].length > 0);
    });

    it('v43 metadata.json is valid JSON', () => {
        const meta = readJson('v43/metadata.json');
        assert.ok(meta);
    });

    it('v43 metadata.json targets GNOME 43', () => {
        const meta = readJson('v43/metadata.json');
        assert.deepEqual(meta['shell-version'], ['43']);
    });

    it('v43 and root have same uuid', () => {
        const rootMeta = readJson('metadata.json');
        const v43Meta = readJson('v43/metadata.json');
        assert.equal(rootMeta.uuid, v43Meta.uuid);
    });

    it('v43 and root have same settings-schema', () => {
        const rootMeta = readJson('metadata.json');
        const v43Meta = readJson('v43/metadata.json');
        assert.equal(rootMeta['settings-schema'], v43Meta['settings-schema']);
    });
});

describe('GSettings schema', () => {
    it('schema XML file exists and is readable', () => {
        const xml = readFileSync(join(root, 'schemas/org.gnome.shell.extensions.renderorange.gschema.xml'), 'utf8');
        assert.ok(xml.length > 0);
    });

    it('schema XML contains expected keys', () => {
        const xml = readFileSync(join(root, 'schemas/org.gnome.shell.extensions.renderorange.gschema.xml'), 'utf8');
        const expectedKeys = [
            'clock-format', 'show-seconds', 'show-date', 'show-calendar',
            'show-events', 'show-world-clocks', 'show-weather',
            'workspace-popup', 'animations', 'workspace-indicator',
            'show-app-menu', 'show-activities',
        ];
        for (const key of expectedKeys) {
            assert.ok(xml.includes(key), `Schema missing key: ${key}`);
        }
    });
});
