(() => {
    const script = document.createElement('script');
    script.src =
        'https://xquesh.github.io/quesh-addons/dist/margonem-toolkit.js';
    script.async = false;

    script.onerror = () => {
        console.error('[QADDONS] Nie udało się pobrać runtime.');
    };

    (document.head || document.documentElement)
        .appendChild(script);
})();
