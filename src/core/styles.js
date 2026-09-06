export function createStyles(document) {
    const namespaces = new Map();

    function scope(namespace) {
        if (namespaces.has(namespace)) return namespaces.get(namespace);
        const entries = new Map();
        const api = {
            set(id, css) {
                let element = entries.get(id);
                if (!element) {
                    element = document.createElement('style');
                    element.dataset.mtkStyle = `${namespace}:${id}`;
                    entries.set(id, element);
                    (document.head || document.documentElement).appendChild(element);
                }
                if (element.textContent !== css) element.textContent = css;
                return element;
            },
            remove(id) {
                entries.get(id)?.remove();
                entries.delete(id);
            },
            clear() {
                entries.forEach(element => element.remove());
                entries.clear();
            }
        };
        namespaces.set(namespace, api);
        return api;
    }

    return {
        scope,
        destroy() {
            namespaces.forEach(namespace => namespace.clear());
            namespaces.clear();
        }
    };
}
