const CHAT_WRAPPER = '.new-chat-window .chat-message-wrapper, .chat-message-wrapper';

function interval(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(2000, Math.max(100, Math.round(parsed))) : 250;
}

export function startChatAutoscroll(ctx) {
    const page = ctx.game.page;
    let queued = 0;

    function forceBottom(update = false) {
        queued = 0;
        if (!ctx.enabled) return;
        try {
            const chat = page.Engine?.chatController?.getChatMessageWrapper?.();
            if (update) chat?.updateScroll?.();
            chat?.setScrollOnBottom?.();
        } catch {}
        for (const wrapper of document.querySelectorAll(CHAT_WRAPPER)) {
            const pane = wrapper.querySelector(':scope > .scroll-pane') || wrapper.querySelector('.scroll-pane');
            const bottom = pane ? Math.max(0, pane.scrollHeight - pane.clientHeight) : 0;
            if (pane && Math.abs(pane.scrollTop - bottom) > 1) pane.scrollTop = bottom;
        }
    }

    function queue() {
        if (!queued) queued = ctx.scheduler.frame(() => forceBottom(true));
    }

    function loop() {
        forceBottom();
        ctx.scheduler.timeout(loop, interval(ctx.settings.interval));
    }

    ctx.scheduler.observer(MutationObserver, records => {
        if (records.some(record => record.target.closest?.(CHAT_WRAPPER))) queue();
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
    ctx.events.on('chatAutoscrollChanged', () => forceBottom(true));
    ctx.events.on('gameReady', () => forceBottom(true));
    ctx.scheduler.listen(document, 'visibilitychange', () => { if (!document.hidden) forceBottom(true); });
    loop();
}
