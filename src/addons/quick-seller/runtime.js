import { quickSellerStyle } from './style.js';

function editable(target) {
    return target?.closest?.('input,textarea,select,[contenteditable="true"]');
}

export function startQuickSeller(ctx) {
    const page = ctx.game.page;
    const button = document.createElement('button');
    button.id = 'qaddons-quick-seller';
    button.type = 'button';
    button.textContent = 'SPR';
    button.title = 'Sprzedawczyk — przytrzymaj, aby szybko sprzedawać';
    ctx.styles.set('runtime', quickSellerStyle);
    document.body.append(button);
    let running = false;
    let timer = 0;
    let heldHotkey = '';

    function available() {
        const shop = page.Engine?.shop;
        return Boolean(page.Engine?.allInit === true && shop && shop !== false && typeof shop.greatMerchant === 'function' && shop.basket && typeof shop.basket.finalize === 'function');
    }
    function refresh() {
        button.hidden = ctx.settings.showButton === false;
        button.disabled = !available();
        button.dataset.running = String(running);
    }
    function loop() {
        if (!running || !available()) return stop();
        try {
            page.Engine.shop.greatMerchant(1);
            page.Engine.shop.greatMerchant(2);
            page.Engine.shop.greatMerchant(3);
            page.Engine.shop.basket.finalize();
        } catch (error) {
            console.error('[QADDONS: sprzedawczyk]', error);
            return stop();
        }
        timer = ctx.scheduler.timeout(loop, Math.max(100, Math.min(500, Number(ctx.settings.interval) || 150)));
    }
    function start() {
        if (running || !available()) return;
        running = true; refresh(); loop();
    }
    function stop() {
        running = false;
        heldHotkey = '';
        ctx.scheduler.clearTimeout(timer);
        timer = 0; refresh();
    }
    ctx.scheduler.listen(button, 'pointerdown', event => { event.preventDefault(); button.setPointerCapture?.(event.pointerId); start(); });
    ctx.scheduler.listen(button, 'pointerup', stop);
    ctx.scheduler.listen(button, 'pointercancel', stop);
    ctx.scheduler.listen(document, 'keydown', event => {
        if (event.repeat || event.defaultPrevented || editable(event.target) || event.code !== ctx.settings.hotkey) return;
        event.preventDefault(); heldHotkey = event.code; start();
    }, { capture: true });
    ctx.scheduler.listen(document, 'keyup', event => { if (event.code === heldHotkey) stop(); }, { capture: true });
    ctx.scheduler.listen(page, 'blur', stop);
    ctx.events.on('quickSellerChanged', refresh);
    ctx.scheduler.cleanup(() => { stop(); button.remove(); });
    const tick = () => { refresh(); ctx.scheduler.timeout(tick, 600); };
    refresh(); tick();
}
