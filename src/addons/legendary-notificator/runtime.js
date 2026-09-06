import { createHelpers } from './helpers.js';
import { createNeonEngine } from './neon-engine.js';
import { createAnimations } from './animations.js';
import { createOverlays } from './overlays.js';
import { createTargets } from './targets.js';
import { createHud } from './hud.js';
import { createRenderer } from './renderer.js';
import { createObservers } from './observers.js';
import { createTestLoot } from './test-loot.js';
import { createDetection } from './detection.js';
import { createAudio } from './audio.js';
import { createTargetConfig } from './target-config.js';

export function createRuntime(state, ctx) {
    Object.assign(state, {
        settings: ctx.settings,
        active: false, windowSeen: false, waitForLootUntil: 0,
        syncRaf: 0, pendingForceSync: false, maintenanceTimer: 0, clearTimer: 0,
        resizeObserver: null, domObserver: null, activeLootObserver: null, observedLootRoot: null,
        worldSignature: '', currentAudio: null, uiTargets: [],
        uiDirty: true, layoutDirty: true, geometryDirty: true,
        nextUiRefresh: 0, nextTargetRefresh: 0, cachedTargets: null, nextElementId: 1,
        elementIds: new WeakMap(), overlays: new Map(), localOverlayOwners: new WeakMap(),
        settleTimers: new Set(), observedElements: new Set()
    });
    const runtime = {};
    Object.assign(runtime, createHelpers(state, ctx, runtime));
    Object.assign(runtime, createNeonEngine(state, ctx, runtime));
    Object.assign(runtime, createAnimations(state, ctx, runtime));
    Object.assign(runtime, createOverlays(state, ctx, runtime));
    Object.assign(runtime, createTargets(state, ctx, runtime));
    Object.assign(runtime, createHud(state, ctx, runtime));
    Object.assign(runtime, createRenderer(state, ctx, runtime));
    Object.assign(runtime, createObservers(state, ctx, runtime));
    Object.assign(runtime, createTestLoot(state, ctx, runtime));
    Object.assign(runtime, createDetection(state, ctx, runtime));
    Object.assign(runtime, createAudio(state, ctx, runtime));
    Object.assign(runtime, createTargetConfig(state, ctx, runtime));
    return runtime;
}
