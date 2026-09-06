import { DEFAULTS } from './defaults.js';
import { createRuntime } from './runtime.js';
import { createSettingsUi } from './settings-ui.js';
import { installEffectStyles } from './effect-styles.js';

export function createLegendaryNotificator() {
    const state = { settings: null, active: false };
    const runtime = {};
    let publicApi = null;

    function refresh(ctx) {
        if (!ctx.enabled) return;
        state.uiDirty = true;
        state.layoutDirty = true;
        state.geometryDirty = true;
        state.cachedTargets = null;
        runtime.setVisualPlaybackPaused(ctx.settings.pauseWhenHidden && document.hidden);
        if (state.active) runtime.rebuildEffects();
    }

    function enable(ctx) {
        Object.assign(runtime, createRuntime(state, ctx));
        installEffectStyles(ctx.styles);
        runtime.bindLayoutEvents();
        runtime.startObservers();
        runtime.setVisualPlaybackPaused(ctx.settings.pauseWhenHidden && document.hidden);
        ctx.events.on('gamePacket', runtime.processGameData);
        const configuration = createSettingsUi(state, ctx, runtime);
        publicApi = {
            version: '6.2.1',
            test: runtime.testLoot,
            clear: runtime.clearEffect,
            sync: () => runtime.requestSync(true),
            open: () => ctx.ui.openSettings(ctx.id),
            close: () => ctx.ui.close(),
            preset: configuration.applyPreset,
            shell: runtime.getUiShellRect,
            topBg: () => runtime.findPositionerBackground('top'),
            bottomBg: () => runtime.findPositionerBackground('bottom'),
            settings: () => ({ ...state.settings, enabled: ctx.enabled }),
            status: () => ({
                version: '6.2.1', active: state.active, hooked: ctx.game.hooked,
                performanceMode: state.settings.performanceMode,
                multiLayer: state.settings.multiLayerEnabled,
                overlays: state.overlays.size, uiTargets: state.uiTargets.length
            })
        };
        ctx.game.page.LegendaryNotificator = publicApi;
    }

    function disable(ctx) {
        ctx.scheduler.destroy();
        runtime.clearEffect();
        runtime.stopObservers();
        runtime.setVisualPlaybackPaused(false);
        if (state.currentAudio) {
            state.currentAudio.pause();
            state.currentAudio.removeAttribute('src');
            state.currentAudio.load();
            state.currentAudio = null;
        }
        ctx.styles.clear();
        if (ctx.game.page.LegendaryNotificator === publicApi) delete ctx.game.page.LegendaryNotificator;
        publicApi = null;
    }

    return {
        id: 'legendary-notificator', name: 'Legendary Notificator',
        description: 'Neonowe powiadomienie po zdobyciu legendarnego łupu.',
        defaultEnabled: true, defaults: DEFAULTS,
        init(ctx) { state.settings = ctx.settings; },
        enable, disable,
        destroy() {
            state.settings = null;
            for (const key of Object.keys(runtime)) delete runtime[key];
        },
        onSettingsChange: refresh,
        renderSettings(ctx) {
            createSettingsUi(state, ctx, runtime).createPanel();
        }
    };
}
