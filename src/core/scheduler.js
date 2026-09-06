export function createScheduler(host = window) {
    let disposed = false;
    const timeouts = new Set();
    const frames = new Set();
    const cleanups = new Set();
    const controller = new AbortController();

    function cleanup(callback) {
        if (disposed) callback();
        else cleanups.add(callback);
        return () => cleanups.delete(callback);
    }

    function timeout(callback, delay = 0) {
        if (disposed) return 0;
        const handle = host.setTimeout(() => {
            timeouts.delete(handle);
            if (!disposed) callback();
        }, delay);
        timeouts.add(handle);
        return handle;
    }

    function clearTimeout(handle) {
        host.clearTimeout(handle);
        timeouts.delete(handle);
    }

    function frame(callback) {
        if (disposed) return 0;
        const handle = host.requestAnimationFrame(time => {
            frames.delete(handle);
            if (!disposed) callback(time);
        });
        frames.add(handle);
        return handle;
    }

    function cancelFrame(handle) {
        host.cancelAnimationFrame(handle);
        frames.delete(handle);
    }

    function listen(target, name, callback, options = {}) {
        if (disposed) return () => {};
        target.addEventListener(name, callback, { ...options, signal: controller.signal });
        return () => target.removeEventListener(name, callback, options);
    }

    function observer(Constructor, callback) {
        const instance = new Constructor((...args) => {
            if (!disposed) callback(...args);
        });
        const disconnect = instance.disconnect.bind(instance);
        const release = cleanup(disconnect);
        instance.disconnect = () => {
            disconnect();
            release();
        };
        return instance;
    }

    function destroy() {
        if (disposed) return;
        disposed = true;
        controller.abort();
        timeouts.forEach(handle => host.clearTimeout(handle));
        frames.forEach(handle => host.cancelAnimationFrame(handle));
        timeouts.clear();
        frames.clear();
        for (const callback of cleanups) {
            try { callback(); } catch (error) { console.error('[QADDONS cleanup]', error); }
        }
        cleanups.clear();
    }

    return {
        timeout, clearTimeout, frame, cancelFrame, listen, observer, cleanup, destroy,
        signal: controller.signal,
        get disposed() { return disposed; }
    };
}
