export function createGame(page, events, scheduler, host = window) {
    let communication = null;
    let original = null;
    let wrapper = null;
    let stopped = false;
    let started = false;
    let retry = 0;
    let layoutFrame = 0;
    let latestSettings = null;
    const pending = new Set();

    function packets(packet) {
        return Array.isArray(packet) ? packet.flat(Infinity) : [packet];
    }

    function settleRequests(packet) {
        let parsed = packet;
        const stripPacket = (value, keys) => {
            if (Array.isArray(value)) return value.map(entry => stripPacket(entry, keys));
            if (!value || typeof value !== 'object') return value;
            const clone = { ...value };
            keys.forEach(key => delete clone[key]);
            return clone;
        };
        for (const request of [...pending]) {
            const match = packets(packet).find(data => {
                try { return request.match(data); } catch { return false; }
            });
            if (!match) continue;
            pending.delete(request);
            scheduler.clearTimeout(request.timeout);
            request.releaseAbort();
            request.resolve(match);
            if (request.strip.length) parsed = stripPacket(parsed, request.strip);
        }
        return parsed;
    }

    function publish(packet) {
        events.emit('gamePacket', packet);
        for (const data of packets(packet)) {
            if (data?.settings) latestSettings = data;
            if (!data?.loot) continue;
            if (data.loot.init !== undefined) {
                events.emit(data.loot.init ? 'lootOpened' : 'lootClosed', data);
            }
        }
    }

    function hook() {
        if (stopped || communication) return;
        const candidate = page.Engine?.communication;
        if (!candidate || typeof candidate.parseJSON !== 'function') {
            retry = scheduler.timeout(hook, 500);
            return;
        }
        communication = candidate;
        original = candidate.parseJSON;
        const parser = original;
        wrapper = function (...args) {
            const forwarded = settleRequests(args[0]);
            const result = parser.apply(this, [forwarded, ...args.slice(1)]);
            if (!stopped) publish(args[0]);
            return result;
        };
        communication.parseJSON = wrapper;
        events.emit('gameReady', communication);
    }

    function layoutChanged(event) {
        if (layoutFrame) return;
        layoutFrame = scheduler.frame(() => {
            layoutFrame = 0;
            events.emit('layoutChanged', { type: event.type });
        });
    }

    function start() {
        if (started || stopped) return;
        started = true;
        hook();
        scheduler.listen(host, 'resize', layoutChanged, { passive: true });
        scheduler.listen(host.document, 'visibilitychange', () => {
            events.emit('visibilityChanged', host.document.hidden);
        });
        scheduler.listen(host.document, 'scroll', event => {
            if (event.target?.closest?.('.loot-wnd')) events.emit('lootScrolled', event);
        }, { passive: true, capture: true });
    }

    function destroy() {
        stopped = true;
        scheduler.clearTimeout(retry);
        for (const request of pending) {
            scheduler.clearTimeout(request.timeout);
            request.releaseAbort();
            request.reject(new Error('Komunikacja gry została zatrzymana.'));
        }
        pending.clear();
        if (communication?.parseJSON === wrapper) communication.parseJSON = original;
        communication = null;
        scheduler.destroy();
    }

    function request(command, match, options = {}) {
        return new Promise((resolve, reject) => {
            if (stopped || page.Engine?.allInit !== true || typeof page._g !== 'function') return reject(new Error('Gra nie jest jeszcze gotowa.'));
            const signal = options.signal;
            if (signal?.aborted) return reject(new DOMException('Żądanie anulowane.', 'AbortError'));
            const entry = { match, resolve, reject, strip: Array.isArray(options.strip) ? options.strip : [], releaseAbort: () => {} };
            const abort = () => {
                if (!pending.delete(entry)) return;
                scheduler.clearTimeout(entry.timeout);
                entry.releaseAbort();
                reject(new DOMException('Żądanie anulowane.', 'AbortError'));
            };
            if (signal) {
                signal.addEventListener('abort', abort, { once: true });
                entry.releaseAbort = () => signal.removeEventListener('abort', abort);
            }
            entry.timeout = scheduler.timeout(() => {
                pending.delete(entry);
                entry.releaseAbort();
                reject(new Error('Serwer gry nie odpowiedział na czas.'));
            }, options.timeout || 6000);
            pending.add(entry);
            try { page._g(command); }
            catch (error) {
                pending.delete(entry);
                scheduler.clearTimeout(entry.timeout);
                entry.releaseAbort();
                reject(error);
            }
        });
    }

    return {
        page, start, destroy, request,
        get hooked() { return Boolean(communication); },
        get latestSettings() { return latestSettings; }
    };
}
