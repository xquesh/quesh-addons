export function createGame(page, events, scheduler, host = window) {
    let communication = null;
    let original = null;
    let wrapper = null;
    let stopped = false;
    let started = false;
    let retry = 0;
    let layoutFrame = 0;

    function publish(packet) {
        events.emit('gamePacket', packet);
        const packets = Array.isArray(packet) ? packet.flat(Infinity) : [packet];
        for (const data of packets) {
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
            const result = parser.apply(this, args);
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
        if (communication?.parseJSON === wrapper) communication.parseJSON = original;
        communication = null;
        scheduler.destroy();
    }

    return { page, start, destroy, get hooked() { return Boolean(communication); } };
}
