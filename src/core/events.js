export function createEvents() {
    const listeners = new Map();

    function on(name, callback) {
        if (!listeners.has(name)) listeners.set(name, new Set());
        listeners.get(name).add(callback);
        return () => {
            const group = listeners.get(name);
            group?.delete(callback);
            if (!group?.size) listeners.delete(name);
        };
    }

    function emit(name, payload) {
        for (const callback of [...(listeners.get(name) || [])]) {
            if (!listeners.get(name)?.has(callback)) continue;
            try { callback(payload); } catch (error) { console.error(`[QADDONS: ${name}]`, error); }
        }
    }

    function scope(scheduler) {
        return {
            on(name, callback) {
                if (scheduler.disposed) return () => {};
                const unsubscribe = on(name, callback);
                scheduler.cleanup(unsubscribe);
                return unsubscribe;
            },
            emit
        };
    }

    return { on, emit, scope, destroy: () => listeners.clear() };
}
