import assert from 'node:assert/strict';
import './check-item-tools.mjs';
import './check-relogger.mjs';
import './check-auto-abyss.mjs';
import './check-clan-online.mjs';
import './check-pocket-berserk.mjs';
import './check-quick-group.mjs';
import { selectedChannels, buttonLabel } from '../src/addons/detector-global/channels.js';
assert.deepEqual(selectedChannels({}), ['LOCAL']);
assert.deepEqual(selectedChannels({ channels: [] }), []);
assert.deepEqual(selectedChannels({ channels: 'GLOBAL' }), []);
assert.deepEqual(selectedChannels({ channels: ['LOCAL', 'GLOBAL', 'LOCAL', 'PRIVATE', '__proto__', null] }), ['LOCAL', 'GLOBAL']);
assert.equal(buttonLabel(['LOCAL']), 'LOKALNY');
import { readFile, readdir, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { createRuntime } from '../src/addons/legendary-notificator/runtime.js';
import { DEFAULTS } from '../src/addons/legendary-notificator/defaults.js';
import { PRESETS } from '../src/addons/legendary-notificator/presets.js';
import { createSettings, migrateSchema, STORAGE_KEY } from '../src/core/settings.js';
import { importLegacy, LEGACY_STORAGE_KEYS } from '../src/core/legacy-migration.js';
import { createEvents } from '../src/core/events.js';
import { createScheduler } from '../src/core/scheduler.js';
import { createStyles } from '../src/core/styles.js';
import { createGame } from '../src/core/game.js';
import { createAddonManager } from '../src/core/addon-manager.js';
import { createNotificationPosition } from '../src/addons/notification-position/index.js';
import { DEFAULTS as ENHANCER_DEFAULTS, itemEligible } from '../src/addons/enhancer/data.js';
import { createLegendaryNotificator } from '../src/addons/legendary-notificator/index.js';
import { LEGENDARY_DOM_SELECTOR } from '../src/addons/legendary-notificator/constants.js';
import { installEffectStyles } from '../src/addons/legendary-notificator/effect-styles.js';
import './check-updates.mjs';
import { normalize as normalizeTypography, typographyCss } from '../src/addons/notification-position/typography.js';
import { catchingChance, chanceLevel, eligibleMembers, isLegendary, requiredProfessions } from '../src/addons/loot-chances/data.js';
import { fightMembers } from '../src/addons/loot-chances/runtime.js';
import { calendarReminder, expiredItems, freePromotions, resultSignature } from '../src/addons/reminder/data.js';
import { compactPartyCss } from '../src/addons/compact-party/style.js';
import { createMapBrightnessDrawable, normalizeNightSettings } from '../src/addons/night-mode/style.js';

assert.deepEqual(normalizeNightSettings({ strength: 120, color: 'javascript:bad', vignette: false }), {
    strength: 85, color: '#000000', vignette: false
});
const nightCalls = [];
const nightContext = {
    canvas: { width: 10, height: 10 }, save: () => nightCalls.push('save'), restore: () => nightCalls.push('restore'),
    fillRect: (...args) => nightCalls.push(['fillRect', ...args])
};
const nightDrawable = createMapBrightnessDrawable({ Engine: { getCanvasViewSize: () => ({ width: 640, height: 360 }) } },
    () => ({ strength: 35, color: '#102030', vignette: false }));
nightDrawable.draw(nightContext);
assert.equal(nightContext.globalAlpha, 0.35);
assert.equal(nightContext.fillStyle, '#102030');
assert.deepEqual(nightCalls[1], ['fillRect', 0, 0, 640, 360]);
assert.equal(nightDrawable.getOrder(), 1);
nightDrawable.disable();
nightDrawable.draw(nightContext);
assert.equal(nightCalls.length, 3);
console.log('OK: Tryb nocny rysuje półprzezroczystą warstwę bezpośrednio w rendererze mapy');

const compactCss = compactPartyCss({ hideAvatars: true, showHpPoints: false, rowHeight: 2, fontSize: 99 });
assert.match(compactCss, /height:16px!important/);
assert.match(compactCss, /font-size:12px!important/);
assert.match(compactCss, /\.avatar\{display:none!important\}/);
assert.match(compactCss, /\.hp-points\{display:none!important\}/);
assert.match(compactCss, /max-height:170px!important/);
assert.match(compactCss, /grid-template-columns:minmax\(0,1fr\) auto!important/);
assert.match(compactCss, /right:var\(--qaddons-party-actions-width,34px\)!important/);
assert.match(compactPartyCss({ hpPosition: 'center' }), /grid-template-columns:minmax\(0,1fr\) auto minmax\(0,1fr\)!important/);
console.log('OK: kompaktowa grupa ogranicza wymiary i ukrywa tylko wybrane elementy');

const calendar = { start_ts: Date.parse('2026-09-08T10:00:00Z') / 1000, days: [{ isOpened: true }, { isOpened: false }, { isOpened: false }] };
assert.deepEqual(calendarReminder(calendar, new Date('2026-09-09T12:00:00Z')), { dayNo: 2 });
assert.equal(calendarReminder(calendar, new Date('2026-09-08T12:00:00Z')), null);
assert.equal(calendarReminder({ start_ts: 0, days: [] }), null);
assert.deepEqual(freePromotions({ active: [{ id: 1, price: 0, is_used: false }, { id: 2, price: 1 }, { id: 3, price: 0, is_used: true }] }).map(item => item.id), [1]);
assert.deepEqual(expiredItems({ Engine: { items: { testMyItems: () => ({ a: { id: 7, checkExpires: () => true }, b: { id: 8, checkExpires: () => false } }) } } }).map(item => item.id), [7]);
assert.deepEqual(expiredItems({ Engine: { items: { testMyItems: () => { throw new Error('not ready'); } } } }), []);
assert.equal(resultSignature({ calendar: { dayNo: 2 }, promotions: [{ id: 4 }, { id: 3 }], expired: [{ id: 8 }] }), '2|3,4|8');
console.log('OK: Przypominajka wykrywa dzień kalendarza, darmowe oferty i wygasłe przedmioty');

const chanceParty = [
    { id: '1', name: 'Quesh', prof: 'w', isHero: true },
    { id: '2', name: 'Łowca', prof: 'h', isHero: false },
    { id: '3', name: 'Drugi wojownik', prof: 'w', isHero: false }
];
assert.equal(catchingChance({ stat: 'rarity=legendary' }, chanceParty), 33);
assert.equal(catchingChance({ stat: 'rarity=legendary;reqp=w' }, chanceParty), 50);
assert.equal(catchingChance({ stat: 'rarity=legendary;reqp=h' }, chanceParty), 0);
assert.equal(catchingChance({ stat: 'rarity=legendary;reqp=p' }, chanceParty), 33);
assert.deepEqual(requiredProfessions({ stat: 'reqp=wt' }), ['w', 't']);
assert.deepEqual(eligibleMembers({ stat: 'reqp=w' }, chanceParty).map(member => member.id), ['1', '3']);
assert.equal(chanceLevel(0), 'none'); assert.equal(chanceLevel(33), 'low'); assert.equal(chanceLevel(50), 'mid'); assert.equal(chanceLevel(100), 'high');
assert.equal(isLegendary({ stat: 'rarity=legendary;reqp=w' }), true);
assert.equal(isLegendary({ stat: 'rarity=heroic' }), false);
assert.deepEqual(fightMembers({ f: { myteam: 1, w: {
    a: { originalId: 7, team: 1, prof: 'w', name: 'Quesh' }, b: { originalId: 8, team: 1, prof: 'h', name: 'Łowca' },
    summon: { originalId: 9, team: 1, prof: 'm', name: 'Przywołanie', npc: 1 }, enemy: { originalId: 10, team: 2, prof: 'p', name: 'Wróg' }
} } }, { Engine: { hero: { d: { id: 7 } } } }).map(member => [member.name, member.isHero]), [['Quesh', true], ['Łowca', false]]);
console.log('OK: Kto złapie? liczy szanse według drużyny, reqp i profesji bohatera');

async function listFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.map(entry => entry.isDirectory()
        ? listFiles(`${directory}/${entry.name}`) : [`${directory}/${entry.name}`]));
    return nested.flat();
}

function memoryStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

function fakeHost() {
    const timers = new Map();
    const frames = new Map();
    let sequence = 0;
    const host = new EventTarget();
    Object.assign(host, {
        timers, frames, document: new EventTarget(),
        setTimeout(callback) { const handle = ++sequence; timers.set(handle, callback); return handle; },
        clearTimeout: handle => timers.delete(handle),
        requestAnimationFrame(callback) { const handle = ++sequence; frames.set(handle, callback); return handle; },
        cancelAnimationFrame: handle => frames.delete(handle),
        flushTimers() {
            const pending = [...timers.values()];
            timers.clear();
            pending.forEach(callback => callback());
        }
    });
    return host;
}

function fakeDocument() {
    const styles = new Set();
    const root = { classList: { toggle() {} } };
    return {
        styles, documentElement: root, hidden: false,
        head: { appendChild: element => styles.add(element) },
        body: {},
        createElement() {
            const element = { dataset: {}, textContent: '', remove: () => styles.delete(element) };
            return element;
        },
        getElementById: () => null,
        querySelectorAll: () => [],
        querySelector: () => null
    };
}

assert.equal(typographyCss({ bottom: 75 }), '', 'Stare ustawienia zachowują wygląd gry');
const typographyLimits = normalizeTypography({ fontSize: 999, letterSpacing: -99, lineHeight: Infinity, fontFamily: 'bad; color:red', color: '#fff; display:none' });
assert.equal(typographyLimits.fontSize, 40);
assert.equal(typographyLimits.letterSpacing, -1);
assert.equal(typographyLimits.lineHeight, 1.3);
assert.equal(typographyLimits.fontFamily, 'game');
assert.equal(typographyLimits.color, '#ffffff');
assert.doesNotMatch(typographyCss({ customTypography: true, fontFamily: 'bad; display:none', customColor: true, color: '#fff; display:none' }), /display:/);
assert.doesNotMatch(typographyCss({ customTypography: true }), /(?:^|\n)color:/);
console.log('OK: domyślna typografia bez zmian, limity i walidacja CSS');
const enhancerItem = { id: 7, cl: 8, st: 0, _cachedStats: { rarity: 'common', binds: null } };
assert.equal(itemEligible(enhancerItem, structuredClone(ENHANCER_DEFAULTS), new Set()), true);
assert.equal(itemEligible({ ...enhancerItem, st: 1 }, structuredClone(ENHANCER_DEFAULTS), new Set()), false);
assert.equal(itemEligible({ ...enhancerItem, _cachedStats: { rarity: 'heroic', binds: null } }, structuredClone(ENHANCER_DEFAULTS), new Set()), false);
assert.equal(itemEligible(enhancerItem, structuredClone(ENHANCER_DEFAULTS), new Set([7])), false);
console.log('OK: Ulepszarka filtruje wyposażone, związane, wykluczone i niedozwolone rzadkości');
const files = await listFiles('src');
const sourceFiles = files.filter(file => file.endsWith('.js'));
for (const path of [...sourceFiles, ...await listFiles('scripts'), 'dist/installer.user.js', 'dist/margonem-toolkit.js']) {
    if (/\.(?:mjs|js)$/.test(path)) execFileSync(process.execPath, ['--check', path]);
}
const bundle = (await readFile('dist/margonem-toolkit.js', 'utf8')).replace(/\r\n/g, '\n');
const installer = (await readFile('dist/installer.user.js', 'utf8')).replace(/\r\n/g, '\n');
assert.ok(bundle.startsWith('(() => {'));
assert.doesNotMatch(bundle, /==UserScript==|@(?:match|grant|updateURL|downloadURL)/);
assert.ok(installer.startsWith('// ==UserScript==\n// @name         QADDONS'));
assert.match(installer, /@grant\s+none/);
assert.ok(Buffer.byteLength(installer) < 2048, 'Installer powinien pozostać małym loaderem');
assert.ok(installer.trimEnd().split('\n').length <= 50);
assert.doesNotMatch(installer, /createAddonManager|localStorage|__MARGONEM_TOOLKIT__|createPanel|createLegendaryNotificator|createNotificationPosition/);
assert.deepEqual((await listFiles('dist')).sort(), ['dist/installer.user.js', 'dist/margonem-toolkit.js', 'dist/version.json']);
for (const domain of ['pl', 'com']) {
    assert.ok(installer.includes(`// @match        https://*.margonem.${domain}/*`));
    assert.ok(installer.includes(`// @exclude      https://forum.margonem.${domain}/*`));
}
assert.doesNotMatch(bundle, /^\s*(?:import|export)\s|\brequire\s*\(|\bimport\s*\(/m);
assert.doesNotMatch(installer, /@require/);
for (const field of ['updateURL', 'downloadURL']) {
    const value = installer.match(new RegExp(`^// @${field}\\s+(\\S+)$`, 'm'))?.[1];
    assert.equal(value, 'https://xquesh.github.io/quesh-addons/dist/installer.user.js');
}
for (const hasHead of [true, false]) {
    const appended = [];
    const errors = [];
    const parent = { appendChild: element => appended.push(element) };
    vm.runInNewContext(installer, {
        document: {
            head: hasHead ? parent : null,
            documentElement: parent,
            createElement(tag) { assert.equal(tag, 'script'); return {}; }
        },
        console: { error: message => errors.push(message) }
    });
    assert.equal(appended.length, 1);
    assert.match(appended[0].src, /^https:\/\/xquesh\.github\.io\/quesh-addons\/dist\/margonem-toolkit\.js\?v=\d+$/);
    assert.equal(appended[0].async, false);
    assert.equal(errors.length, 0);
    appended[0].onerror();
    assert.deepEqual(errors, ['[QADDONS] Nie udało się pobrać runtime.']);
}
console.log('OK: mały loader, runtime bez nagłówka, wstrzyknięcie do head/root, błąd pobierania');
const source = (await Promise.all(sourceFiles.map(path => readFile(path, 'utf8')))).join('\n');
assert.equal([...source.matchAll(/\.parseJSON\s*=(?!=)/g)].length, 2);
assert.match(await readFile('src/core/game.js', 'utf8'), /communication\.parseJSON = wrapper/);
assert.doesNotMatch(await readFile('src/addons/legendary-notificator/settings-ui.js', 'utf8'), /notificationBottom|POWIADOMIENIA/);
assert.doesNotMatch(await readFile('src/addons/notification-position/index.js', 'utf8'), /console-layer/);
assert.match(await readFile('src/addons/legendary-notificator/test-loot.js', 'utf8'), /comm\.parseJSON\( fakeLoot \)/);
assert.doesNotMatch(source, /querySelectorAll\(\s*['"]\*['"]\s*\)/);
console.log('OK: składnia, header, brak runtime imports, pojedynczy centralny hook, rozdzielenie addonów');

const legacy = (await readFile('legacy/legendary-notificator-v6.2.1.txt', 'utf8')).replace(/\r\n/g, '\n');
const allowedChanges = new Set([
    'playBuiltInSound', 'processGameData', 'bindLayoutEvents', 'createPanel', 'applyPreset',
    'updateStatus', 'saveSettings', 'bindPanel', 'testLoot'
]);
const legacyFunctions = new Map([...legacy.matchAll(/^    function (\w+)\b[\s\S]*?^    \}/gm)]
    .map(match => [match[1], match[0]]));
let preservedFunctions = 0;
for (const path of sourceFiles.filter(path => path.includes('/legendary-notificator/'))) {
    const body = await readFile(path, 'utf8');
    for (const match of body.matchAll(/^    function (\w+)\b[\s\S]*?^    \}/gm)) {
        const original = legacyFunctions.get(match[1]);
        if (!original || allowedChanges.has(match[1])) continue;
        const restored = match[0]
            .replace(/\b(?:state|runtime)\./g, '')
            .replace(/\bownerState\b/g, 'state')
            .replaceAll('ctx.enabled', 'settings.enabled')
            .replaceAll('ctx.game.page', 'GAME')
            .replaceAll('ctx.scheduler.timeout', 'setTimeout')
            .replaceAll('ctx.scheduler.clearTimeout', 'clearTimeout')
            .replaceAll('ctx.scheduler.frame', 'requestAnimationFrame')
            .replaceAll('ctx.scheduler.cancelFrame', 'cancelAnimationFrame')
            .replace(/ctx\.scheduler\.observer\((MutationObserver|ResizeObserver),/g, 'new $1(');
        assert.equal(restored.replace(/\s/g, ''), original.replace(/\s/g, ''), `${path}: ${match[1]} różni się od legacy`);
        preservedFunctions++;
    }
}
let effectCss = '';
installEffectStyles({ set(id, css) { effectCss = css; } });
const oldEffectCss = legacy.slice(legacy.indexOf('.ln-fx {'), legacy.indexOf('/* =========================================================\n   TABBED CONFIG PANEL'))
    .replaceAll('${IDS.world}', 'ln580-world');
assert.equal(effectCss.trim(), oldEffectCss.trim());
console.log(`OK: ${preservedFunctions} funkcji zgodnych źródłowo po podstawieniu zależności; CSS efektów identyczny`);
const referenceNames = [
    'DEFAULTS', 'PRESETS', 'getNeonLayerRuntime', 'getBloomLayerPasses', 'getFrameLayerPasses',
    'getItemLayerPasses', 'buildLayeredNeonShadow', 'buildMotionFilter', 'targetConfig', 'uiConfig',
    'isLegendary', 'getLegendaryLootItems', 'resolveStandardTargets', 'getPerformanceProfile'
];
const legacyContext = vm.createContext({ window: {}, localStorage: memoryStorage(), performance });
const referenceCode = legacy.slice(legacy.indexOf('(function () {'), legacy.lastIndexOf("    if ( document.readyState === 'loading' )"))
    + `globalThis.reference = { ${referenceNames.join(',')}, setSettings(value) { settings = { ...DEFAULTS, ...value }; cachedTargets = null; } }; })();`;
vm.runInContext(referenceCode, legacyContext);
const reference = legacyContext.reference;
const normalized = value => JSON.stringify(value);
const expectedDefaults = JSON.parse(normalized(reference.DEFAULTS));
delete expectedDefaults.enabled;
delete expectedDefaults.notificationBottomEnabled;
delete expectedDefaults.notificationBottomOffset;
assert.deepEqual(DEFAULTS, expectedDefaults);
assert.equal(normalized(PRESETS), normalized(reference.PRESETS));
const state = {};
const host = fakeHost();
const ctx = { settings: { ...DEFAULTS }, enabled: true, game: { page: {} }, scheduler: createScheduler(host), events: createEvents() };
const runtime = createRuntime(state, ctx);
let comparisons = 0;
for (const preset of [{}, ...Object.values(PRESETS)]) {
    for (const performanceMode of ['eco', 'balanced', 'quality']) {
        for (const level of [0, 1, 2, 3, 4, 5]) {
            const settings = {
                ...DEFAULTS, ...preset, performanceMode,
                neonLayer3Strength: level, neonLayer3Opacity: level, neonLayer3Width: level
            };
            Object.assign(state.settings, settings);
            reference.setSettings(settings);
            for (const prefix of ['outer', 'loot', 'card', 'item', 'confirm', 'canvas', 'ui']) {
                const config = prefix === 'ui' ? runtime.uiConfig() : runtime.targetConfig(prefix);
                const oldConfig = prefix === 'ui' ? reference.uiConfig() : reference.targetConfig(prefix);
                assert.equal(normalized(config), normalized(oldConfig), `${prefix}: config`);
                for (const insetEnabled of [false, true]) {
                    for (const insetPower of [0, 0.85, 2]) {
                        const variant = { ...config, insetEnabled, insetPower };
                        assert.equal(runtime.buildLayeredNeonShadow(variant), reference.buildLayeredNeonShadow(variant));
                        assert.equal(runtime.buildMotionFilter(variant), reference.buildMotionFilter(variant));
                        comparisons += 2;
                    }
                }
            }
        }
    }
}
console.log(`OK: ${comparisons} porównań neonów/inward/motion z wykonanym legacy, wszystkie presety i defaults zgodne`);

for (const loc of ['l', 'loot', 'k', 'c', 'colossus', 'L', 'K', 'g', '', 'inventory']) {
    for (const rarity of ['legendary', 'legend', 'l', 'heroic', 'unique', 'normal']) {
        const packet = { loot: { init: 1 }, item: { first: { loc, stat: `rarity=${rarity}` } } };
        assert.equal(normalized(runtime.getLegendaryLootItems(packet)), normalized(reference.getLegendaryLootItems(packet)));
        if (['l', 'k'].includes(loc) && rarity === 'legendary') assert.equal(runtime.getLegendaryLootItems(packet).length, 1);
    }
}
const ordinary = { querySelector: () => null, isConnected: true };
const legendaryItem = { id: 'legend' };
const legendaryCard = { querySelector: () => legendaryItem };
const normalCard = { querySelector: () => null };
const loot = {};
const root = {
    isConnected: true,
    querySelector(selector) {
        if (selector === LEGENDARY_DOM_SELECTOR) return legendaryItem;
        if (selector === '.loot-window') return loot;
        return null;
    },
    querySelectorAll(selector) {
        if (selector === '.loot-item-wrapper') return [normalCard, legendaryCard];
        if (selector === LEGENDARY_DOM_SELECTOR) return [legendaryItem];
        return [];
    }
};
const dom = fakeDocument();
globalThis.document = dom;
runtime.isVisible = () => true;
dom.querySelectorAll = () => [ordinary];
assert.equal(runtime.resolveStandardTargets(true).root, null);
dom.querySelectorAll = () => [ordinary, root];
const targets = runtime.resolveStandardTargets(true);
assert.equal(targets.root, root);
assert.deepEqual(targets.card, [legendaryCard]);
assert.deepEqual(targets.item, [legendaryItem]);
let testPacket = null;
ctx.game.page.Engine = {
    items: { items: { bag: { name: 'Torba podróżna', id: 123, stat: 'rarity=normal' } } },
    communication: { parseJSON(packet) { testPacket = packet; } }
};
runtime.testLoot();
assert.equal(testPacket.loot.init, 1);
assert.equal(testPacket.item[1].loc, 'l');
assert.match(testPacket.item[1].stat, /rarity=legendary/);
console.log('OK: detekcja loc l/k, mieszane rarity, zwykły loot bez overlayów, TESTUJ przekazuje pakiet do parseJSON');

for (const [index, key] of LEGACY_STORAGE_KEYS.entries()) {
    const storage = memoryStorage({ [key]: JSON.stringify({
        enabled: false, notificationBottomEnabled: true, notificationBottomOffset: 94,
        neonLayer1Color: '#123456', shacalGlow1: 4, canvasPadding: 0, neonInside: true
    }) });
    const migrated = createSettings(storage, importLegacy);
    const entry = migrated.data.addons['legendary-notificator'];
    assert.equal(entry.enabled, false);
    assert.equal(entry.settings.neonLayer1Color, '#123456');
    assert.equal(entry.settings.neonLayer1Strength, 4);
    assert.equal(entry.settings.canvasPadding, index ? -8 : 0);
    assert.equal(entry.settings.neonInside, !index);
    assert.equal('notificationBottomOffset' in entry.settings, false);
    assert.deepEqual(migrated.data.addons['notification-position'], { enabled: true, settings: { bottom: 94 } });
    createSettings(storage, () => assert.fail('Powtórna migracja legacy'));
    assert.ok(storage.getItem(key));
}
const brokenLegacy = memoryStorage({ [LEGACY_STORAGE_KEYS[0]]: '{', [LEGACY_STORAGE_KEYS[1]]: '{"mute":true}' });
assert.equal(importLegacy(brokenLegacy).addons['legendary-notificator'].settings.mute, true);
const badNew = memoryStorage({ [STORAGE_KEY]: '{broken' });
assert.throws(() => createSettings(badNew, importLegacy));
assert.equal(badNew.getItem(STORAGE_KEY), '{broken');
assert.equal(migrateSchema({ version: 1, core: {}, addons: {} }, 2,
    new Map([[1, value => ({ ...value, version: 2, added: true })]])).added, true);
assert.throws(() => migrateSchema({ version: 2 }));
console.log('OK: siedem kluczy legacy, jednorazowy import, fallback uszkodzonego legacy, schema 1 -> 2, ochrona nieznanego schematu');

globalThis.window = fakeHost();
globalThis.document = fakeDocument();
let disconnected = 0;
globalThis.MutationObserver = class { observe() {} disconnect() { disconnected++; } };
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() { disconnected++; } };
const eventBus = createEvents();
let parses = 0;
let forwardedPacket = null;
const parser = function (packet) { assert.equal(this, communication); parses++; forwardedPacket = packet; return packet.result; };
const communication = { parseJSON: parser };
const page = { Engine: { communication, allInit: false } };
const game = createGame(page, eventBus, createScheduler(window), window);
game.start();
const hooked = communication.parseJSON;
game.start();
assert.equal(communication.parseJSON, hooked);
let packets = 0;
eventBus.on('gamePacket', () => packets++);
assert.equal(communication.parseJSON({ result: 42 }), 42);
assert.equal(packets, 1);
assert.equal(parses, 1);
let sentCommand = '';
page._g = command => { sentCommand = command; };
await assert.rejects(game.request('audit&action=early', () => false), /gotowa/);
assert.equal(sentCommand, '');
page.Engine.allInit = true;
communication.parseJSON({ settings: { action: 'INIT', list: [{ 34: { v: 1 } }] } });
assert.equal(game.latestSettings.settings.action, 'INIT');
const gameResponse = game.request('artisanship&action=open', packet => Boolean(packet.artisanship), { strip: ['artisanship'] });
assert.equal(sentCommand, 'artisanship&action=open');
communication.parseJSON({ result: 7, artisanship: { open: true } });
assert.deepEqual(await gameResponse, { result: 7, artisanship: { open: true } });
assert.deepEqual(forwardedPacket, { result: 7 });
const requestAborter = new AbortController();
let abortedMatches = 0;
const abortedRequest = game.request('audit&action=wait', packet => { abortedMatches++; return Boolean(packet.audit); }, { signal: requestAborter.signal });
requestAborter.abort();
await assert.rejects(abortedRequest, error => error?.name === 'AbortError');
communication.parseJSON({ audit: true });
assert.equal(abortedMatches, 0, 'Anulowane żądanie nie analizuje kolejnych pakietów');
console.log('OK: centralne zapytanie gry odbiera pełną odpowiedź i ukrywa wskazane okno przed parserem');
const managerSettings = createSettings(memoryStorage());
const styleManager = createStyles(document);
const manager = createAddonManager({ settings: managerSettings, styles: styleManager, events: eventBus, game, ui: {} });
manager.register(createLegendaryNotificator());
manager.register(createNotificationPosition());
assert.throws(() => manager.register(createNotificationPosition()));
manager.start();
assert.equal(manager.list().length, 2);
assert.ok(manager.list().every(addon => addon.enabled));
for (let cycle = 0; cycle < 3; cycle++) {
    communication.parseJSON({ loot: { init: 1 }, item: { legend: { loc: 'k', stat: 'rarity=legendary' } } });
    assert.ok(window.timers.size > 0);
    manager.setEnabled('legendary-notificator', false);
    assert.equal(window.timers.size, 0);
    assert.equal(window.frames.size, 0);
    assert.equal(page.LegendaryNotificator, undefined);
    assert.equal(document.styles.size, 1);
    window.flushTimers();
    manager.setEnabled('notification-position', false);
    assert.equal(document.styles.size, 0);
    manager.setEnabled('notification-position', true);
    manager.setEnabled('legendary-notificator', true);
    assert.equal(communication.parseJSON, hooked);
}
manager.changeSettings('notification-position', { bottom: 999 });
assert.ok([...document.styles].some(style => style.textContent.includes('bottom: 300px')));
manager.setEnabled('notification-position', false);
manager.changeSettings('notification-position', { bottom: 25 });
assert.equal(document.styles.size, 1);
assert.ok(disconnected >= 6);
manager.destroy();
manager.destroy();
assert.equal(document.styles.size, 0);
assert.equal(window.timers.size, 0);
game.destroy();
assert.equal(communication.parseJSON, parser);
assert.equal(window.frames.size, 0);
const otherGame = createGame(page, eventBus, createScheduler(window), window);
otherGame.start();
otherGame.destroy();
assert.equal(communication.parseJSON, parser);
console.log('OK: oba rzeczywiste addony enable/disable x3, cleanup CSS/observerów/timerów, parser this/return, ponowny start/destroy');

const scoped = createScheduler(window);
const target = new EventTarget();
let calls = 0;
scoped.listen(target, 'probe', () => calls++);
eventBus.scope(scoped).on('probe', () => calls++);
scoped.timeout(() => calls++);
scoped.frame(() => calls++);
scoped.destroy();
target.dispatchEvent(new Event('probe'));
eventBus.emit('probe');
window.flushTimers();
assert.equal(calls, 0);
assert.equal(window.frames.size, 0);
ctx.scheduler.destroy();
eventBus.destroy();
styleManager.destroy();
console.log(`OK: scope anuluje listenery, subskrypcje i RAF. Runtime: ${(await stat('dist/margonem-toolkit.js')).size} B`);
