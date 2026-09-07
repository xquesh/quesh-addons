window.runDetectorChecks = async function(manager, assert, wait) {
    const sent = [];
    let channel = 'PRIVATE';
    let receiver = 'Odbiorca';
    let style = 'normal';
    const unavailable = new Set();
    const blocked = new Set();
    let copyMode = 'clipboard';
    let allowGlobal = true;
    const exact = '  Wykryto: Żółw [123] — Mapa (12, 34)\n/link  ';
    const chat = {
        getChannelName: () => channel,
        getPrivateReceiver: () => receiver,
        getStyleMessage: () => style,
        getChatNotificationManager: () => ({ checkBlockadeLeftSeconds: name => blocked.has(name) }),
        setChannel({ name }, recipient = null, format = null) {
            if (name !== 'GLOBAL' || allowGlobal) { channel = name; receiver = recipient; style = format; }
        },
        sendMessageGhostMessageProcedure(message, name) {
            const previous = channel;
            chat.setChannel({ name });
            // Natywny kod używa zamkniętej funkcji, nie publicznej metody wysyłania.
            sent.push({ channel, message });
            chat.setChannel({ name: previous });
        },
        getDataAndSendRequest(message) { sent.push({ channel, message }); return Promise.resolve(true); }
    };
    const nativeSend = chat.getDataAndSendRequest;
    const previousChat = Engine.chatController;
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const execDescriptor = Object.getOwnPropertyDescriptor(document, 'execCommand');
    const originalWrite = () => Promise.resolve(); // Atrapa: bez dostępu do prawdziwego schowka.
    const clipboard = { writeText: originalWrite };
    const detector = document.createElement('section');
    const settingsView = document.createElement('div');
    let closeSettings;
    detector.className = 'heros-detector';
    detector.innerHTML = '<div class="map-label"><div class="copy-btn"></div></div><div class="btns-container"><button class="button">Idź</button></div>';
    const copy = detector.querySelector('.copy-btn');
    const call = document.createElement('button');
    call.className = 'button call';
    call.textContent = 'Zawołaj klan';
    const input = document.createElement('textarea');
    input.value = exact;
    detector.append(input);
    const originalExec = () => { throw new Error('Fixture: nie wywołujemy prawdziwego copy'); };
    function globalButton() { return detector.querySelector('.wykrywacz-global-exact'); }
    async function waitForButton() {
        const deadline = Date.now() + 2000;
        while (!globalButton() && Date.now() < deadline) await wait(20);
        assert(globalButton(), 'GLOBAL dodany do wykrywacza');
    }
    async function send(expected = ['LOCAL']) {
        const before = sent.length;
        globalButton().click();
        const deadline = Date.now() + 2000;
        while (globalButton()?.dataset.busy === '1' && Date.now() < deadline) await wait(10);
        assert(sent.length === before + expected.length, 'Jedna wiadomość na każdy wybrany kanał');
        assert(sent.at(-1).message === exact, 'Treść bez zmiany spacji, znaków i nowych linii');
        assert(JSON.stringify(sent.slice(before).map(item => item.channel)) === JSON.stringify(expected), 'Wyłącznie wybrane kanały');
        assert(sent.slice(before).every(item => item.message === exact), 'Dokładny tekst na wszystkich kanałach');
        assert(channel === 'PRIVATE' && receiver === 'Odbiorca' && style === 'normal', 'Przywrócenie kanału, odbiorcy i stylu');
        assert(clipboard.writeText === originalWrite, 'Przywrócenie Clipboard API');
        assert(document.execCommand === originalExec, 'Przywrócenie execCommand');
        assert(chat.getDataAndSendRequest === nativeSend, 'Przywrócenie metody czatu');
    }
    try {
        Engine.chatController = { getChatInputWrapper: () => chat, getChatChannelsAvailable: () => ({ checkAvailable: name => !unavailable.has(name) }) };
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
        Object.defineProperty(document, 'execCommand', { configurable: true, writable: true, value: originalExec });
        copy.addEventListener('click', () => {
            if (copyMode === 'clipboard') Promise.resolve().then(() => navigator.clipboard.writeText(exact));
            if (copyMode === 'exec') { input.focus(); input.select(); document.execCommand('copy'); }
            if (copyMode === 'event') {
                const event = new Event('copy', { bubbles: true });
                Object.defineProperty(event, 'clipboardData', { value: { getData: () => exact } });
                document.dispatchEvent(event);
            }
        });
        call.addEventListener('click', () => chat.sendMessageGhostMessageProcedure(exact, 'CLAN'));
        document.body.append(detector);
        await waitForButton();
        assert(sent.length === 0, 'Brak automatycznej wysyłki po uruchomieniu');
        assert(globalButton().textContent === 'LOKALNY', 'Domyślnie lokalny do testów');
        settingsView.hidden = true;
        document.body.append(settingsView);
        closeSettings = manager.renderSettings('detector-global', settingsView);
        const checkboxes = settingsView.querySelectorAll('[data-detector-channel]');
        assert(checkboxes.length === 4 && checkboxes[0].checked && !checkboxes[1].checked, 'Konfiguracja czterech kanałów, tylko lokalny zaznaczony');
        checkboxes[1].click();
        assert(globalButton().textContent === 'WYŚLIJ (2)' && sent.length === 0, 'Checkbox zmienia cel bez wysyłki');
        checkboxes[1].click();
        await send();
        assert(settingsView.querySelector('[data-detector-result]').textContent.includes('Lokalny'), 'Wynik próby widoczny w ustawieniach');
        for (const target of ['GLOBAL', 'CLAN', 'GROUP']) {
            manager.changeSettings('detector-global', { channels: [target] });
            await send([target]);
        }
        manager.changeSettings('detector-global', { channels: ['LOCAL', 'GLOBAL'] });
        await send(['LOCAL', 'GLOBAL']);
        unavailable.add('GLOBAL');
        const beforeUnavailable = sent.length;
        globalButton().click();
        await wait(40);
        assert(sent.length === beforeUnavailable, 'Niedostępny kanał zatrzymuje całą próbę');
        unavailable.clear();
        manager.changeSettings('detector-global', { channels: [] });
        assert(globalButton().disabled, 'Brak kanałów wyłącza wysyłanie');
        globalButton().click();
        assert(sent.length === beforeUnavailable, 'Pusty wybór nic nie wysyła');
        manager.changeSettings('detector-global', { channels: ['LOCAL'] });
        blocked.add('LOCAL');
        globalButton().click();
        await wait(40);
        assert(sent.length === beforeUnavailable, 'Blokada czasowa nie wysyła');
        blocked.clear();
        copyMode = 'exec';
        await send();
        copyMode = 'event';
        await send();
        copy.remove();
        detector.querySelector('.btns-container').append(call);
        await send();
        assert(sent.at(-1).channel === 'LOCAL', 'Natywne wołanie nie wysłało na KLAN');
        detector.querySelector('.map-label').append(copy);
        copyMode = 'clipboard';
        const beforeDouble = sent.length;
        globalButton().click();
        globalButton().click();
        await wait(40);
        assert(sent.length === beforeDouble + 1, 'Blokada podwójnego kliknięcia');
        const beforeDisable = sent.length;
        globalButton().click();
        manager.setEnabled('detector-global', false);
        assert(!globalButton(), 'Wyłączenie usuwa przycisk');
        assert(clipboard.writeText === originalWrite, 'Wyłączenie od razu przywraca podmianę');
        await wait(40);
        assert(sent.length === beforeDisable, 'Brak wysłania po wyłączeniu');
        for (let index = 0; index < 3; index++) {
            manager.setEnabled('detector-global', true);
            await waitForButton();
            assert(detector.querySelectorAll('.wykrywacz-global-exact').length === 1, 'Brak duplikatów po enable');
            manager.setEnabled('detector-global', false);
        }
        manager.setEnabled('detector-global', true);
        await waitForButton();
        const beforeError = sent.length;
        const nativeGhost = chat.sendMessageGhostMessageProcedure;
        delete chat.sendMessageGhostMessageProcedure;
        manager.changeSettings('detector-global', { channels: ['GLOBAL'] });
        allowGlobal = false;
        globalButton().click();
        await wait(350);
        assert(sent.length === beforeError && globalButton().textContent === 'BŁĄD', 'Nie wysyła na zły kanał');
        allowGlobal = true;
        await send(['GLOBAL']);
        chat.sendMessageGhostMessageProcedure = nativeGhost;
        manager.changeSettings('detector-global', { channels: ['LOCAL'] });
        const beforeMissing = sent.length;
        copy.remove();
        call.remove();
        globalButton().click();
        await wait(30);
        assert(sent.length === beforeMissing && globalButton().textContent === 'BŁĄD', 'Brak źródła: nie wymyśla komunikatu');
        assert(settingsView.querySelector('[data-detector-result]').textContent.includes('Odczyt komunikatu:'), 'Błąd i etap widoczne w ustawieniach');
    } finally {
        closeSettings?.();
        settingsView.remove();
        detector.remove();
        Engine.chatController = previousChat;
        if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
        else delete navigator.clipboard;
        if (execDescriptor) Object.defineProperty(document, 'execCommand', execDescriptor);
        else delete document.execCommand;
    }
};
