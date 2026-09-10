window.runReloggerChecks = async function(manager, assert, wait) {
    const previous = { fetch: window.fetch, cookie: window.getCookie, allInit: Engine.allInit, worldConfig: Engine.worldConfig, hero: Engine.hero, serverStorage: Engine.serverStorage, windowsData: Engine.windowsData };
    const now = Date.now() / 1000;
    const timers = [{ type: 2, heroData: { id: 1 }, name: '<b>Heros A</b>', presp: now - 1 }, { type: 2, heroData: { id: 2 }, name: 'E2 B', presp: now + 300, minResp: now - 1 }];
    const heroes = [{ id: 1, nick: 'Quesh', lvl: 80, prof: 'w', world: 'fobos' }, { id: 2, nick: 'Druga', lvl: 320, prof: 'm', world: 'fobos' }, { id: 3, nick: 'Inny świat', lvl: 200, prof: 'h', world: 'katahha' }];
    let requests = 0;
    let close;
    const view = document.createElement('div');
    const bar = () => document.querySelector('#qaddons-relogger');
    async function ready() {
        const deadline = Date.now() + 2500;
        while (!bar()?.querySelector('.qr-card') && Date.now() < deadline) await wait(20);
        assert(bar()?.querySelector('.qr-card'), 'Lista postaci załadowana');
    }
    try {
        manager.setEnabled('relogger', false);
        Engine.allInit = true; Engine.hero = { d: { id: 1 } };
        Engine.worldConfig = { getApiDomain: () => 'https://www.margonem.pl', getWorldName: () => 'fobos' };
        Engine.windowsData = { name: { addon_17: 'fixtureTimers' } };
        Engine.serverStorage = { get: () => ({ data: timers, settings: { fadeout: 600 } }) };
        window.getCookie = key => ({ user_id: 'fixture-user', hs3: 'fixture-token' })[key];
        window.fetch = async (url, options) => {
            requests++;
            assert(url.includes('/account/charlist?') && options.credentials === 'include', 'Odczyt listy przez API gry z sesją');
            return { ok: true, json: async () => heroes };
        };
        manager.setEnabled('relogger', true); await ready();
        assert(requests === 1 && bar().querySelectorAll('.qr-card').length === 2, 'Jedno pobranie, karty wybranego świata');
        assert(bar().querySelector('[data-hero="1"]').dataset.state === 'due', 'Zielony stan po końcu timera');
        assert(bar().querySelector('[data-hero="2"]').dataset.state === 'window', 'Bursztynowy stan okna respawnu');
        assert(getComputedStyle(bar().querySelector('.qr-card')).animationName === 'none', 'Brak migania kart');
        bar().querySelector('[data-hero="1"]').dispatchEvent(new Event('pointerover', { bubbles: true }));
        assert(bar().querySelector('.qr-details').textContent.includes('<b>Heros A</b>') && !bar().querySelector('.qr-details b'), 'Nazwy timerów wyświetlane jako tekst');
        bar().querySelector('[data-hero="1"]').click();
        assert(bar().querySelector('.qr-status').textContent.includes('już zalogowana'), 'Kliknięcie bieżącej postaci nie przelogowuje');
        const select = bar().querySelector('select'); select.value = 'katahha'; select.dispatchEvent(new Event('change'));
        assert(bar().querySelectorAll('.qr-card').length === 1 && requests === 1, 'Zmiana świata bez ponownego pobierania');
        bar().querySelector('[data-collapse]').click();
        assert(bar().querySelector('.qr-body').hidden, 'Zwijanie belki');
        bar().querySelector('[data-collapse]').click();
        document.querySelector('#mtk-content').append(view);
        close = manager.renderSettings('relogger', view);
        view.querySelector('[data-setting="compact"]').click();
        assert(bar().dataset.compact === 'true', 'Kompaktowa belka z konfiguracji');
        Engine.serverStorage = { get: () => undefined };
        manager.changeSettings('relogger', { selectedWorld: 'fobos' });
        assert(bar().querySelectorAll('.qr-card').length === 2, 'Brak timerów nie blokuje postaci');
        // Błąd pobrania nie usuwa poprawnie pobranej listy.
        window.fetch = async () => { throw new Error('fixture offline'); };
        bar().querySelector('[data-refresh]').click(); await wait(50);
        assert(bar().querySelector('.qr-status').textContent.includes('Nie udało') && bar().querySelectorAll('.qr-card').length === 2, 'Błąd i zachowana lista po nieudanym odświeżeniu');
        manager.setEnabled('relogger', false);
        assert(!bar(), 'Wyłączenie usuwa belkę');
        let aborted = false;
        window.fetch = (url, options) => new Promise((resolve, reject) => options.signal.addEventListener('abort', () => { aborted = true; reject(new DOMException('Aborted', 'AbortError')); }));
        manager.setEnabled('relogger', true);
        manager.setEnabled('relogger', false);
        await wait(30);
        assert(aborted && !bar(), 'Wyłączenie anuluje pobieranie i nie odtwarza belki');
    } finally {
        close?.(); view.remove(); manager.setEnabled('relogger', false);
        window.fetch = previous.fetch; window.getCookie = previous.cookie;
        for (const key of ['allInit', 'worldConfig', 'hero', 'serverStorage', 'windowsData']) Engine[key] = previous[key];
        manager.changeSettings('relogger', { compact: false, selectedWorld: '', collapsed: false });
        manager.setEnabled('relogger', true);
    }
};
