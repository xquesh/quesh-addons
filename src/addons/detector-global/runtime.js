// Adaptacja wykrywacz_global_exact_v1.0.0.txt: natywny tekst i konfigurowalne kanały.
import { selectedChannels, channelLabel, buttonLabel } from './channels.js';
const ROOT_SELECTOR = '.heros-detector';
const GLOBAL_CLASS = 'wykrywacz-global-exact';

export function startDetectorGlobal(ctx, report = () => {}) {
    const page = ctx.game.page;
    const { scheduler } = ctx;
    const buttons = new Set();
    let busy = false;
    let syncFrame = 0;

    function ensureActive() {
        if (scheduler.disposed) throw new Error('Dodatek został wyłączony.');
    }

    function wait(ms) {
        ensureActive();
        return new Promise((resolve, reject) => {
            const release = scheduler.cleanup(() => reject(new Error('Dodatek został wyłączony.')));
            scheduler.timeout(() => { release(); resolve(); }, ms);
        });
    }

    // Przywracamy własną podmianę także przy wyłączeniu dodatku w trakcie kliknięcia.
    function patchMethod(target, key, replacement) {
        if (!target || typeof target[key] !== 'function') return null;
        const original = target[key];
        const descriptor = Object.getOwnPropertyDescriptor(target, key);
        let active = true;
        const wrapper = function(...args) {
            return (active ? replacement : original).apply(this, args);
        };
        try {
            Object.defineProperty(target, key, { configurable: true, writable: true, value: wrapper });
        } catch {
            try { target[key] = wrapper; } catch { return null; }
        }
        if (target[key] !== wrapper) return null;
        let restored = false;
        function restore() {
            if (restored) return;
            restored = true;
            active = false;
            if (target[key] !== wrapper) return;
            try {
                if (descriptor) Object.defineProperty(target, key, descriptor);
                else delete target[key];
            } catch {
                try { target[key] = original; } catch {}
            }
        }
        const release = scheduler.cleanup(restore);
        return () => { release(); restore(); };
    }

    function label(element) {
        return String(element.querySelector('.label')?.textContent ?? element.textContent ?? '')
            .replace(/\s+/g, ' ').trim();
    }

    function nativeButtons(detector) {
        return [...detector.querySelectorAll('.btns-container .button, .btns-container button')]
            .filter(button => !button.classList.contains(GLOBAL_CLASS));
    }

    function selectedText() {
        const active = document.activeElement;
        if (typeof active?.value === 'string' && Number.isInteger(active.selectionStart) && Number.isInteger(active.selectionEnd)) {
            const selected = active.value.slice(active.selectionStart, active.selectionEnd);
            if (selected.length) return selected;
        }
        const selected = page.getSelection?.()?.toString?.();
        return typeof selected === 'string' && selected.length ? selected : null;
    }

    async function captureCopy(detector) {
        // Natywny wykrywacz umieszcza pusty div.copy-btn przy nazwie mapy, poza przyciskami.
        const copy = detector.querySelector('.map-label .copy-btn, .copy-btn')
            || nativeButtons(detector).find(button => /\bkopiuj\b/i.test(label(button)));
        if (!copy) return null;
        let captured = null;
        const restores = [];
        const onCopy = event => {
            if (captured !== null) return;
            try {
                const data = event.clipboardData?.getData?.('text/plain');
                if (typeof data === 'string' && data.length) { captured = data; return; }
            } catch {}
            captured = selectedText();
        };
        try {
            restores.push(scheduler.listen(document, 'copy', onCopy));
            restores.push(patchMethod(page.navigator?.clipboard, 'writeText', text => {
                captured = text;
                return Promise.resolve();
            }));
            const originalExec = document.execCommand;
            restores.push(patchMethod(document, 'execCommand', function(command, ...args) {
                if (String(command).toLowerCase() === 'copy') {
                    captured = selectedText();
                    return true;
                }
                return originalExec.call(this, command, ...args);
            }));
            copy.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: page }));
            await wait(0);
        } finally {
            restores.reverse().forEach(restore => restore?.());
        }
        return typeof captured === 'string' && captured.length ? captured : null;
    }

    function getChat() {
        return page.Engine?.chatController?.getChatInputWrapper?.() || null;
    }

    function rememberChannel(chat) {
        return { name: chat.getChannelName?.(), receiver: chat.getPrivateReceiver?.(), style: chat.getStyleMessage?.() };
    }

    function restoreChannel(chat, previous, expectedChannel = null) {
        try {
            const current = chat.getChannelName?.();
            const changed = current !== previous.name || chat.getPrivateReceiver?.() !== previous.receiver || chat.getStyleMessage?.() !== previous.style;
            if (previous.name && current && changed && (!expectedChannel || current === expectedChannel || current === previous.name)) {
                chat.setChannel?.({ name: previous.name }, previous.receiver, previous.style);
            }
        } catch {}
    }

    async function captureCall(detector) {
        const call = nativeButtons(detector).find(button => /\b(klan|zawołaj|zawolaj)\b/i.test(label(button)));
        const chat = getChat();
        if (!call || typeof chat?.getDataAndSendRequest !== 'function') return null;
        const previous = rememberChannel(chat);
        let captured = null;
        const restore = patchMethod(chat, 'getDataAndSendRequest', message => {
            if (captured === null) captured = message;
            return true;
        });
        // Nie klikamy natywnego wołania, jeśli nie możemy zablokować wysłania na klan.
        if (!restore) return null;
        const hasGhost = typeof chat.sendMessageGhostMessageProcedure === 'function';
        const restoreGhost = hasGhost ? patchMethod(chat, 'sendMessageGhostMessageProcedure', message => {
            if (captured === null) captured = message;
        }) : null;
        if (hasGhost && !restoreGhost) { restore(); return null; }
        const restoreChat = () => restoreChannel(chat, previous);
        const release = scheduler.cleanup(restoreChat);
        try {
            call.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: page }));
            for (let attempt = 0; attempt < 6 && captured === null; attempt++) await wait(20);
        } finally {
            restoreGhost?.();
            restore();
            restoreChat();
            release();
        }
        return typeof captured === 'string' && captured.length ? captured : null;
    }

    function checkAvailability(channels) {
        const availability = page.Engine?.chatController?.getChatChannelsAvailable?.();
        const notifications = getChat()?.getChatNotificationManager?.();
        for (const channel of channels) {
            if (typeof availability?.checkAvailable === 'function' && !availability.checkAvailable(channel)) {
                throw new Error(`Kanał ${channelLabel([channel])} jest niedostępny. Zmień wybór w ustawieniach.`);
            }
            if (notifications?.checkBlockadeLeftSeconds?.(channel)) {
                throw new Error(`Kanał ${channelLabel([channel])}: odczekaj przed kolejną wiadomością.`);
            }
        }
    }

    async function sendToChannel(message, channel) {
        ensureActive();
        const chat = getChat();
        if (typeof chat?.setChannel !== 'function' || typeof chat?.getDataAndSendRequest !== 'function') {
            throw new Error('Czat Margonem nie jest jeszcze gotowy.');
        }
        const previous = rememberChannel(chat);
        const restore = () => restoreChannel(chat, previous, channel);
        const release = scheduler.cleanup(restore);
        try {
            checkAvailability([channel]);
            // Ta sama ścieżka co natywne wołanie: zachowuje walidację i blokady czatu gry.
            if (typeof chat.sendMessageGhostMessageProcedure === 'function') {
                await chat.sendMessageGhostMessageProcedure(message, channel);
                return;
            }
            if (previous.name !== channel) {
                chat.setChannel({ name: channel });
                for (let attempt = 0; attempt < 10; attempt++) {
                    if (chat.getChannelName?.() === channel) break;
                    await wait(25);
                }
            }
            ensureActive();
            if (typeof chat.getChannelName === 'function' && chat.getChannelName() !== channel) {
                throw new Error(`Nie udało się przełączyć czatu na ${channelLabel([channel])}.`);
            }
            // Bez trim(), prefiksów, parsowania i dopisków.
            return await chat.getDataAndSendRequest(message);
        } finally {
            restore();
            release();
        }
    }

    async function onGlobalClick(event, detector, button) {
        event.preventDefault();
        event.stopPropagation();
        if (busy || scheduler.disposed) return;
        const channels = selectedChannels(ctx.settings);
        if (!channels.length) return;
        const submitted = [];
        let stage = 'Odczyt komunikatu';
        busy = true;
        button.dataset.busy = '1';
        button.textContent = '...';
        report({ kind: 'busy', text: `Odczyt komunikatu. Cel: ${channelLabel(channels)}.` });
        try {
            let message = await captureCopy(detector);
            ensureActive();
            if (message === null) message = await captureCall(detector);
            ensureActive();
            if (message === null) throw new Error('Nie udało się odczytać dokładnego komunikatu Wykrywacza. Nic nie wysłano.');
            stage = 'Sprawdzenie kanałów';
            checkAvailability(channels);
            for (const channel of channels) {
                stage = `Wysyłanie: ${channelLabel([channel])}`;
                await sendToChannel(message, channel);
                submitted.push(channel);
            }
            if (!scheduler.disposed) {
                button.textContent = 'OK';
                button.title = `Przekazano komunikat do czatu: ${channelLabel(submitted)}.`;
                report({ kind: 'success', text: button.title });
            }
        } catch (error) {
            if (!scheduler.disposed) {
                button.textContent = 'BŁĄD';
                button.title = `${stage}: ${error.message}${submitted.length ? ` Przekazano już do: ${channelLabel(submitted)}.` : ''}`;
                report({ kind: 'error', text: button.title });
                console.warn('[QADDONS Wykrywacz → czat]', button.title, error);
            }
        } finally {
            busy = false;
            button.dataset.busy = '0';
            if (!scheduler.disposed) scheduler.timeout(() => {
                if (button.isConnected) updateButton(button);
            }, 1400);
        }
    }

    function updateButton(button) {
        if (button.dataset.busy === '1') return;
        const channels = selectedChannels(ctx.settings);
        const text = buttonLabel(channels);
        if (button.textContent !== text) button.textContent = text;
        button.disabled = channels.length === 0;
        button.title = channels.length ? `Wyślij dokładny komunikat na: ${channelLabel(channels)}.` : 'Wybierz kanały w ustawieniach dodatku.';
    }

    function sync() {
        syncFrame = 0;
        if (scheduler.disposed) return;
        for (const button of buttons) {
            if (!button.isConnected) buttons.delete(button);
        }
        for (const detector of document.querySelectorAll(ROOT_SELECTOR)) {
            const container = detector.querySelector('.btns-container');
            if (!container || container.querySelector(`.${GLOBAL_CLASS}`)) continue;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = GLOBAL_CLASS;
            updateButton(button);
            buttons.add(button);
            container.append(button);
        }
    }

    function requestSync() {
        if (!scheduler.disposed && !syncFrame) syncFrame = scheduler.frame(sync);
    }

    page.__WYKRYWACZ_GLOBAL_EXACT__?.destroy?.();
    const api = { version: '1.1.0', sync: requestSync, destroy: () => scheduler.destroy() };
    page.__WYKRYWACZ_GLOBAL_EXACT__ = api;
    ctx.styles.set('button', `
        .${GLOBAL_CLASS} { min-height:24px; padding:3px 12px; border:1px solid #555; border-radius:0; background:#080808; color:#eee; font:12px Arial,sans-serif; cursor:pointer; }
        .${GLOBAL_CLASS}:hover { background:#202020; border-color:#aaa; }
        .${GLOBAL_CLASS}[data-busy="1"] { opacity:.6; cursor:wait; }
    `);
    scheduler.listen(document, 'click', event => {
        const button = event.target.closest?.(`.${GLOBAL_CLASS}`);
        if (button && buttons.has(button)) onGlobalClick(event, button.closest(ROOT_SELECTOR), button);
    }, { capture: true });
    scheduler.observer(MutationObserver, requestSync).observe(document.documentElement, { childList: true, subtree: true });
    ctx.events.on('detectorChannelsChanged', () => buttons.forEach(updateButton));
    scheduler.cleanup(() => {
        buttons.forEach(button => button.remove());
        buttons.clear();
        ctx.styles.clear();
        if (page.__WYKRYWACZ_GLOBAL_EXACT__ === api) delete page.__WYKRYWACZ_GLOBAL_EXACT__;
    });
    requestSync();
}
