import { createScheduler } from './scheduler.js';
import { shortcutFor } from './shortcuts.js';

export function createAddonManager(services) {
    const registry = new Map();
    const views = new Set();
    let destroyed = false;

    function find(id) {
        const record = registry.get(id);
        if (!record) throw new Error(`Nieznany addon: ${id}`);
        return record;
    }

    function context(record, scheduler, styleNamespace) {
        return {
            id: record.definition.id,
            settings: record.entry.settings,
            storage: {
                save: () => services.settings.save(),
                get core() { return services.settings.data.core; },
                updateCore: services.settings.updateCore
            },
            events: services.events.scope(scheduler),
            styles: services.styles.scope(styleNamespace),
            scheduler,
            game: services.game,
            ui: services.ui,
            get enabled() { return record.running && !scheduler.disposed; },
            setEnabled: enabled => setEnabled(record.definition.id, enabled),
            changeSettings: patch => changeSettings(record.definition.id, patch)
        };
    }

    function register(definition) {
        if (destroyed) throw new Error('Addon manager zniszczony');
        if (!/^[a-z][a-z0-9-]*$/.test(definition.id)) throw new Error('Niepoprawne id addonu');
        if (registry.has(definition.id)) throw new Error(`Powtórzone id: ${definition.id}`);
        const entry = services.settings.addon(definition);
        const shortcut = shortcutFor(definition.id);
        if (shortcut && typeof entry.settings.showOnBar !== 'boolean') entry.settings.showOnBar = shortcut.defaultVisible === true;
        const record = {
            definition, entry,
            initialized: false, running: false, runtime: null, lifetime: null
        };
        registry.set(definition.id, record);
        return record;
    }

    function initialize(record) {
        if (record.initialized) return;
        record.lifetime = context(record, createScheduler(), `${record.definition.id}:lifetime`);
        try { record.definition.init?.(record.lifetime); }
        catch (error) {
            record.lifetime.scheduler.destroy();
            record.lifetime.styles.clear();
            record.lifetime = null;
            throw error;
        }
        record.initialized = true;
    }

    function stop(record) {
        if (!record.runtime) return;
        record.running = false;
        try { record.definition.disable?.(record.runtime); }
        finally {
            record.runtime.scheduler.destroy();
            record.runtime.styles.clear();
            record.runtime = null;
        }
    }

    function setEnabled(id, enabled) {
        if (destroyed) return;
        const record = find(id);
        initialize(record);
        enabled = Boolean(enabled);
        if (enabled && !record.running) {
            record.runtime = context(record, createScheduler(), id);
            record.running = true;
            try { record.definition.enable?.(record.runtime); }
            catch (error) {
                stop(record);
                record.entry.enabled = false;
                services.settings.save();
                throw error;
            }
        } else if (!enabled) stop(record);
        record.entry.enabled = enabled;
        services.settings.save();
        services.events.emit('addonChanged', { id, enabled });
    }

    function changeSettings(id, patch) {
        const record = find(id);
        Object.assign(record.entry.settings, patch);
        services.settings.save();
        if (record.running) record.definition.onSettingsChange?.(record.runtime);
        services.events.emit('addonSettingsChanged', { id, patch });
    }

    function renderSettings(id, container) {
        if (destroyed) throw new Error('Addon manager zniszczony');
        const record = find(id);
        initialize(record);
        const scheduler = createScheduler();
        const view = context(record, scheduler, `${id}:settings`);
        view.container = container;
        let close;
        const dispose = () => {
            if (scheduler.disposed) return;
            try { close?.(); }
            finally { scheduler.destroy(); view.styles.clear(); container.replaceChildren(); }
            views.delete(dispose);
        };
        views.add(dispose);
        try {
            close = record.definition.renderSettings?.(view);
            if (shortcutFor(record.definition.id)) {
                const section = document.createElement('section');
                section.className = 'mtk-addon-settings';
                section.innerHTML = '<h2>Belka skrótów</h2><label class="ln-switch"><input type="checkbox" data-show-on-bar>Pokaż ten dodatek na belce skrótów</label>';
                const input = section.querySelector('[data-show-on-bar]');
                input.checked = record.entry.settings.showOnBar === true;
                view.scheduler.listen(input, 'change', () => changeSettings(record.definition.id, { showOnBar: input.checked }));
                container.append(section);
            }
        }
        catch (error) { dispose(); throw error; }
        return dispose;
    }

    function start() {
        for (const record of registry.values()) {
            try { setEnabled(record.definition.id, record.entry.enabled); }
            catch (error) { console.error(`[QADDONS: ${record.definition.id}]`, error); }
        }
    }

    function destroy() {
        if (destroyed) return;
        destroyed = true;
        for (const dispose of views) {
            try { dispose(); }
            catch (error) { console.error('[QADDONS settings cleanup]', error); }
        }
        views.clear();
        for (const record of [...registry.values()].reverse()) {
            try { stop(record); }
            catch (error) { console.error('[QADDONS disable]', error); }
            try { record.definition.destroy?.(record.lifetime); }
            catch (error) { console.error('[QADDONS destroy]', error); }
            record.lifetime?.scheduler.destroy();
            record.lifetime?.styles.clear();
        }
        registry.clear();
    }

    return {
        register, start, setEnabled, changeSettings, renderSettings, destroy,
        list: () => [...registry.values()].map(record => ({
            id: record.definition.id, name: record.definition.name,
            description: record.definition.description, enabled: record.running,
            showOnBar: record.entry.settings.showOnBar === true
        }))
    };
}
