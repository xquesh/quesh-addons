import { typographyCss } from './typography.js';

export const MESSAGE_ROOTS = '.mAlert-layer .big-messages,.mAlert-layer .big-messages-light-mode,.alerts-layer > .big-messages';

// Kolorowane fragmenty BBCode i późniejsze aktualizacje gry mogą mieć własne style inline.
export function keepTextStyle(ctx) {
    const owned = new Map();
    let properties = [];
    let queued = 0;
    const read = (style, key) => [style.getPropertyValue(key), style.getPropertyPriority(key)];
    const equal = (a, b) => a[0] === b[0] && a[1] === b[1];
    const write = (style, key, value) => value[0] ? style.setProperty(key, ...value) : style.removeProperty(key);
    function restore(element, values) {
        for (const [key, value] of values) if (equal(read(element.style, key), value.applied)) write(element.style, key, value.previous);
    }
    function sync() {
        queued = 0;
        const targets = new Set();
        if (properties.length) for (const root of document.querySelectorAll(MESSAGE_ROOTS)) {
            targets.add(root);
            root.querySelectorAll(':scope *').forEach(element => targets.add(element));
        }
        for (const [element, values] of owned) if (!targets.has(element)) { restore(element, values); owned.delete(element); }
        for (const element of targets) {
            if (!element.style) continue;
            let values = owned.get(element);
            if (!values) { values = new Map(); owned.set(element, values); }
            for (const [key, applied] of properties) {
                const current = read(element.style, key);
                const value = values.get(key);
                if (!value || !equal(current, value.applied)) values.set(key, { previous: current, applied });
                if (!equal(current, applied)) write(element.style, key, applied);
            }
        }
    }
    function queue() { if (!queued) queued = ctx.scheduler.frame(sync); }
    function update() {
        owned.forEach((values, element) => restore(element, values)); owned.clear();
        if (!typographyCss(ctx.settings)) { properties = []; return; }
        const style = document.createElement('span').style;
        style.cssText = typographyCss(ctx.settings);
        properties = [...style].map(key => [key, read(style, key)]);
        sync();
    }
    ctx.scheduler.observer(MutationObserver, records => {
        if (records.some(record => record.type === 'childList' || record.target.closest?.(MESSAGE_ROOTS))) queue();
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    ctx.events.on('notificationTextChanged', update);
    ctx.scheduler.cleanup(() => { owned.forEach((values, element) => restore(element, values)); owned.clear(); });
    update();
}
