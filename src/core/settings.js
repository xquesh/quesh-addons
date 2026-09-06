export const STORAGE_KEY = 'margonem_toolkit_settings';
export const SCHEMA_VERSION = 1;
export const SCHEMA_MIGRATIONS = new Map();

export function migrateSchema(data, target = SCHEMA_VERSION, migrations = SCHEMA_MIGRATIONS) {
    let current = structuredClone(data);
    if (!Number.isInteger(current.version) || current.version > target || current.version < 1) {
        throw new Error('Nieobsługiwana wersja ustawień QADDONS');
    }
    while (current.version < target) {
        const migrate = migrations.get(current.version);
        if (!migrate) throw new Error(`Brak migracji schema ${current.version} -> ${current.version + 1}`);
        const next = migrate(structuredClone(current));
        if (next.version !== current.version + 1) throw new Error('Niepoprawny krok migracji');
        current = next;
    }
    return current;
}

export function createSettings(storage, importLegacy = () => null) {
    const raw = storage.getItem(STORAGE_KEY);
    const initial = raw === null
        ? (importLegacy(storage) || { version: 1, core: {}, addons: {} })
        : JSON.parse(raw);
    const data = migrateSchema(initial);
    if (!data.core || typeof data.core !== 'object' || !data.addons || typeof data.addons !== 'object') {
        throw new Error('Niepoprawna struktura ustawień QADDONS');
    }
    data.core = { panelX: 70, panelY: 55, lastView: 'addons', ...data.core };

    function save() {
        try { storage.setItem(STORAGE_KEY, JSON.stringify(data)); }
        catch (error) { console.error('[QADDONS storage]', error); }
    }

    function addon(definition) {
        const stored = data.addons[definition.id];
        const entry = {
            enabled: typeof stored?.enabled === 'boolean' ? stored.enabled : Boolean(definition.defaultEnabled),
            settings: { ...structuredClone(definition.defaults || {}), ...stored?.settings }
        };
        data.addons[definition.id] = entry;
        return entry;
    }

    save();
    return {
        data, save, addon,
        updateCore(patch) { Object.assign(data.core, patch); save(); }
    };
}
