window.runDetectorChecks = async function(manager, assert, wait) {
    const sent = [];
    let channel = 'PRIV';
    let copyMode = 'clipboard';
    let allowGlobal = true;
    const exact = '  Wykryto: Żółw [123] — Mapa (12, 34)\n/link  ';
    const chat = {
        getChannelName: () => channel,
        getPrivateReceiver: () => 'Odbiorca',
        getStyleMessage: () => 'normal',
        setChannel({ name }) { if (name !== 'GLOBAL' || allowGlobal) channel = name; },
        getDataAndSendRequest(message) { sent.push({ channel, message }); return Promise.resolve(true); }
    };
    const nativeSend = chat.getDataAndSendRequest;
    const previousChat = Engine.chatController;
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const execDescriptor = Object.getOwnPropertyDescriptor(document, 'execCommand');
    const originalWrite = () => Promise.resolve(); // Atrapa: bez dostępu do prawdziwego schowka.
    const clipboard = { writeText: originalWrite };
    const detector = document.createElement('section');
    detector.className = 'heros-detector';
    detector.innerHTML = '<div class="btns-container"><button class="button copy"><span class="label">Kopiuj</span></button><button class="button call">Zawołaj klan</button></div>';
    const copy = detector.querySelector('.copy');
    const call = detector.querySelector('.call');
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
    async function send() {
        const before = sent.length;
        globalButton().click();
        const deadline = Date.now() + 2000;
        while (globalButton()?.dataset.busy === '1' && Date.now() < deadline) await wait(10);
        assert(sent.length === before + 1, 'Dokładnie jedna wiadomość');
        assert(sent.at(-1).message === exact, 'Treść bez zmiany spacji, znaków i nowych linii');
        assert(sent.at(-1).channel === 'GLOBAL', 'Wysłanie wyłącznie na GLOBAL');
        assert(channel === 'PRIV', 'Przywrócenie poprzedniego kanału');
        assert(clipboard.writeText === originalWrite, 'Przywrócenie Clipboard API');
        assert(document.execCommand === originalExec, 'Przywrócenie execCommand');
        assert(chat.getDataAndSendRequest === nativeSend, 'Przywrócenie metody czatu');
    }
    try {
        Engine.chatController = { getChatInputWrapper: () => chat };
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
        call.addEventListener('click', () => { chat.setChannel({ name: 'KLAN' }); chat.getDataAndSendRequest(exact); });
        document.body.append(detector);
        await waitForButton();
        assert(sent.length === 0, 'Brak automatycznej wysyłki po uruchomieniu');
        await send();
        copyMode = 'exec';
        await send();
        copyMode = 'event';
        await send();
        copy.remove();
        await send();
        assert(sent.every(item => item.channel === 'GLOBAL'), 'Natywne wołanie nie wysłało na KLAN');
        detector.querySelector('.btns-container').prepend(copy);
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
        allowGlobal = false;
        globalButton().click();
        await wait(350);
        assert(sent.length === beforeError && globalButton().textContent === 'BŁĄD', 'Nie wysyła na zły kanał');
        allowGlobal = true;
        copy.remove();
        call.remove();
        globalButton().click();
        await wait(30);
        assert(sent.length === beforeError && globalButton().textContent === 'BŁĄD', 'Brak źródła: nie wymyśla komunikatu');
    } finally {
        detector.remove();
        Engine.chatController = previousChat;
        if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
        else delete navigator.clipboard;
        if (execDescriptor) Object.defineProperty(document, 'execCommand', execDescriptor);
        else delete document.execCommand;
    }
};
