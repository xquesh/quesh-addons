import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createScheduler } from '../src/core/scheduler.js';
import { compareVersions, createUpdateChecker } from '../src/core/updates.js';
import { VERSION } from '../src/version.js';

assert.equal(compareVersions('1.10.0', '1.9.99'), 1);
assert.equal(compareVersions('1.1.0', '2.0.0'), -1);
assert.equal(compareVersions(VERSION, VERSION), 0);
for (const invalid of [null, '', '1.2', '1.2.3.4', '1.0.0<script>', '999999999999999999.1.0']) {
    assert.throws(() => compareVersions(VERSION, invalid));
}
assert.equal(JSON.parse(await readFile('dist/version.json', 'utf8')).version, VERSION);
assert.equal(JSON.parse(await readFile('package.json', 'utf8')).version, VERSION);

function fixture(fetchImpl) {
    const timers = new Map();
    let timerId = 0;
    const host = {
        setTimeout(callback, delay) { timers.set(++timerId, { callback, delay }); return timerId; },
        clearTimeout(id) { timers.delete(id); }
    };
    const scheduler = createScheduler(host);
    const states = [];
    const checker = createUpdateChecker(scheduler, state => states.push(state), { fetchImpl });
    return { scheduler, states, checker, timers };
}

let nextResult = { ok: true, json: async () => ({ version: VERSION }) };
const sample = fixture(async (url, options) => {
    assert.match(url, /\/dist\/version\.json\?t=\d+$/);
    assert.equal(options.cache, 'no-store');
    assert.equal(options.credentials, 'omit');
    if (nextResult instanceof Error) throw nextResult;
    return nextResult;
});
await sample.checker.check();
assert.equal(sample.states.at(-1).status, 'current');
nextResult = { ok: true, json: async () => ({ version: '99.0.0' }) };
await sample.checker.check();
assert.equal(sample.states.at(-1).status, 'outdated');
for (const failure of [new Error('offline'), { ok: false, status: 404 }, { ok: true, json: async () => ({ version: 'broken' }) }]) {
    nextResult = failure;
    await sample.checker.check();
    assert.equal(sample.states.at(-1).status, 'error');
}
nextResult = { ok: true, json: async () => ({ version: VERSION }) };
assert.equal(sample.timers.size, 1);
const automaticCheck = [...sample.timers.values()][0];
assert.equal(automaticCheck.delay, 300000);
sample.timers.clear();
automaticCheck.callback();
await sample.checker.check();
assert.equal(sample.states.at(-1).status, 'current');
sample.scheduler.destroy();
assert.equal(sample.timers.size, 0);

let finish;
let signal;
const pending = fixture((_url, options) => {
    signal = options.signal;
    return new Promise(resolve => { finish = resolve; });
});
const first = pending.checker.check();
assert.equal(first, pending.checker.check(), 'Równoległe kliknięcia współdzielą żądanie');
await Promise.resolve();
pending.scheduler.destroy();
assert.ok(signal.aborted);
finish({ ok: true, json: async () => ({ version: VERSION }) });
await first;
assert.equal(pending.states.length, 1, 'Brak aktualizacji usuniętego UI');
assert.equal(pending.timers.size, 0);

const timeout = fixture((_url, { signal: abortSignal }) => new Promise((_resolve, reject) => {
    abortSignal.addEventListener('abort', () => reject(new Error('timeout')), { once: true });
}));
const timedCheck = timeout.checker.check();
await Promise.resolve();
const deadline = [...timeout.timers.values()].find(timer => timer.delay === 10000);
deadline.callback();
await timedCheck;
assert.equal(timeout.states.at(-1).status, 'error');
timeout.scheduler.destroy();
console.log('OK: wersje numeryczne, aktualna/nowsza, błędy, retry, kontrola co 5 min, timeout i cleanup żądania');
