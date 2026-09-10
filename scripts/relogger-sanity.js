window.runReloggerChecks = async function(manager, assert, wait) {
    const previous = { fetch: window.fetch, cookie: window.getCookie, allInit: Engine.allInit, worldConfig: Engine.worldConfig, hero: Engine.hero, serverStorage: Engine.serverStorage, windowsData: Engine.windowsData };
    const now = Date.now() / 1000;
    const timers = [{ type: 2, heroData: { id: 1 }, name: '<b>Heros A</b>', presp: now - 1 }, { type: 2, heroData: { id: 2 }, name: 'E2 B', presp: now + 300, minResp: now - 1 }];
    const heroes = [{ id: 1, nick: 'Quesh', lvl: 80, prof: 'w', world: 'fobos' }, { id: 2, nick: 'Druga', lvl: 320, prof: 'm', world: 'fobos' }, { id: 3, nick: 'Inny świat', lvl: 200, prof: 'h', world: 'katahha' }];
    for (let index = 0; index < 7; index++) heroes.push({ id: index + 5, nick: `Postać ${index + 3}`, lvl: 30 + index, prof: 'w', world: 'fobos' });
    const anchor = document.querySelector('.bottom-panel-of-bottom-positioner');
    const anchorStyle = anchor.style.cssText;
    anchor.style.cssText = 'position:fixed;bottom:50px;left:0;width:100%;height:48px;';
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
        manager.changeSettings('relogger', { collapsed: true }); // Stare ustawienie nie może ukrywać nowego paska.
        manager.setEnabled('relogger', true); await ready();
        assert(requests === 1 && bar().querySelectorAll('.qr-card').length === 9, 'Jedno pobranie, dziewięć postaci');
        assert(bar().getBoundingClientRect().height === 44 && bar().getBoundingClientRect().width <= 365, 'Większe portrety dopasowane do wysokości belki');
        assert(bar().querySelector('.qr-cards').scrollWidth <= 340, 'Dziewięć portretów mieści się bez przewijania');
        assert(!bar().querySelector('[data-collapse]') && !bar().querySelector('.qr-body').hidden, 'Usunięte zwijanie i ignorowana stara konfiguracja');
        assert(!bar().querySelector('.qr-time') && bar().querySelector('.qr-details').hidden, 'Timery dopiero po najechaniu');
        assert(Math.abs(bar().getBoundingClientRect().bottom - (anchor.getBoundingClientRect().bottom - 2)) < 1, 'Pasek podąża za dolną belką gry');
        assert(bar().querySelector('[data-hero="1"]').dataset.state === 'due', 'Zielony stan po końcu timera');
        assert(bar().querySelector('[data-hero="2"]').dataset.state === 'window', 'Bursztynowy stan okna respawnu');
        assert(getComputedStyle(bar().querySelector('.qr-card')).animationName === 'none', 'Brak migania kart');
        bar().querySelector('[data-hero="1"]').dispatchEvent(new Event('pointerover', { bubbles: true }));
        assert(bar().querySelector('.qr-details').textContent.includes('<b>Heros A</b>') && !bar().querySelector('.qr-details b'), 'Nazwy timerów wyświetlane jako tekst');
        bar().querySelector('[data-hero="1"]').click();
        assert(bar().querySelector('.qr-status').textContent.includes('już zalogowana'), 'Kliknięcie bieżącej postaci nie przelogowuje');
        const worldButton = bar().querySelector('[data-world-toggle]');
        worldButton.click();
        assert(!bar().querySelector('.qr-world-menu').hidden, 'Mały przycisk otwiera wybór świata');
        bar().querySelector('[data-world="katahha"]').click();
        assert(bar().querySelectorAll('.qr-card').length === 1 && requests === 1, 'Zmiana świata bez ponownego pobierania');
        assert(bar().querySelector('.qr-world-menu').hidden, 'Wybór zamyka menu');
        document.querySelector('#mtk-content').append(view);
        close = manager.renderSettings('relogger', view);
        view.querySelector('[data-setting="showWorldButton"]').click();
        assert(bar().querySelector('header').hidden && !bar().querySelector('.qr-body').hidden, 'Ukrywanie tylko przycisku świata');
        view.querySelector('[data-setting="showWorldButton"]').click();
        worldButton.click(); worldButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        assert(bar().querySelector('.qr-world-menu').hidden, 'Escape zamyka wybór świata');
        const horizontal = view.querySelector('[data-setting="horizontal"]');
        horizontal.value = '0'; horizontal.dispatchEvent(new Event('input', { bubbles: true }));
        const left = bar().getBoundingClientRect().left;
        horizontal.value = '100'; horizontal.dispatchEvent(new Event('input', { bubbles: true }));
        assert(bar().getBoundingClientRect().left > left, 'Suwak przesuwa pasek poziomo');
        Engine.serverStorage = { get: () => undefined };
        manager.changeSettings('relogger', { selectedWorld: 'fobos' });
        assert(bar().querySelectorAll('.qr-card').length === 9, 'Brak timerów nie blokuje postaci');
        // Błąd pobrania nie usuwa poprawnie pobranej listy.
        window.fetch = async () => { throw new Error('fixture offline'); };
        bar().querySelector('[data-refresh]').click(); await wait(50);
        assert(bar().querySelector('.qr-status').textContent.includes('Nie udało') && bar().querySelectorAll('.qr-card').length === 9, 'Błąd i zachowana lista po nieudanym odświeżeniu');
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
        anchor.style.cssText = anchorStyle;
        manager.changeSettings('relogger', { horizontal: 100, selectedWorld: '', showWorldButton: true });
        manager.setEnabled('relogger', true);
    }
};
