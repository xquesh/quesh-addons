import { VERSION } from '../version.js';

const MANIFEST_URL = 'https://xquesh.github.io/quesh-addons/dist/version.json';
const CHECK_INTERVAL = 5 * 60 * 1000;
const REQUEST_TIMEOUT = 10000;

export function compareVersions(left, right) {
    const parse = value => {
        if (typeof value !== 'string' || !/^\d+\.\d+\.\d+$/.test(value)) {
            throw new Error('Niepoprawny numer wersji');
        }
        const parts = value.split('.').map(Number);
        if (!parts.every(Number.isSafeInteger)) throw new Error('Niepoprawny numer wersji');
        return parts;
    };
    const a = parse(left);
    const b = parse(right);
    for (let index = 0; index < a.length; index++) {
        if (a[index] !== b[index]) return Math.sign(a[index] - b[index]);
    }
    return 0;
}

export function createUpdateChecker(scheduler, onChange, {
    currentVersion = VERSION,
    fetchImpl = (...args) => fetch(...args)
} = {}) {
    let pending = null;
    let nextCheck = null;

    function check() {
        if (scheduler.disposed) return Promise.resolve();
        if (pending) return pending;
        scheduler.clearTimeout(nextCheck);
        const controller = new AbortController();
        const release = scheduler.cleanup(() => controller.abort());
        const timeout = scheduler.timeout(() => controller.abort(), REQUEST_TIMEOUT);
        onChange({ status: 'checking', latestVersion: null });
        pending = Promise.resolve().then(async () => {
            try {
                const response = await fetchImpl(`${MANIFEST_URL}?t=${Date.now()}`, {
                    cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer',
                    signal: controller.signal
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const manifest = await response.json();
                const comparison = compareVersions(currentVersion, manifest?.version);
                if (!scheduler.disposed && !controller.signal.aborted) {
                    onChange({ status: comparison < 0 ? 'outdated' : 'current', latestVersion: manifest.version });
                }
            } catch {
                if (!scheduler.disposed) onChange({ status: 'error', latestVersion: null });
            } finally {
                scheduler.clearTimeout(timeout);
                release();
                pending = null;
                if (!scheduler.disposed) nextCheck = scheduler.timeout(check, CHECK_INTERVAL);
            }
        });
        return pending;
    }

    return { check };
}
