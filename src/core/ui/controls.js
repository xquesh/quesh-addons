export function rangeControl({ label, value, min, max, step = 1, onInput, onChange }, scheduler) {
    const wrapper = document.createElement('label');
    wrapper.className = 'mtk-range';
    const title = document.createElement('span');
    const output = document.createElement('output');
    const input = document.createElement('input');
    title.textContent = label;
    input.type = 'range';
    Object.assign(input, { min, max, step, value });
    output.textContent = `${value} px`;
    scheduler.listen(input, 'input', () => {
        output.textContent = `${input.value} px`;
        onInput?.(Number(input.value));
    });
    scheduler.listen(input, 'change', () => onChange?.(Number(input.value)));
    wrapper.append(title, output, input);
    return wrapper;
}

export function bindDrag(element, handle, scheduler, save, { button = false, click } = {}) {
    let drag = null;
    scheduler.listen(handle, 'pointerdown', event => {
        if (event.button !== 0 || (!button && event.target.closest('button,input,select'))) return;
        const rect = element.getBoundingClientRect();
        drag = { pointer: event.pointerId, startX: event.clientX, startY: event.clientY,
            offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, moved: false };
        handle.setPointerCapture(event.pointerId);
        event.preventDefault();
    });
    scheduler.listen(handle, 'pointermove', event => {
        if (!drag || event.pointerId !== drag.pointer) return;
        if (Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) > 3) drag.moved = true;
        if (!drag.moved) return;
        const rect = element.getBoundingClientRect();
        drag.x = Math.max(0, Math.min(innerWidth - rect.width, event.clientX - drag.offsetX));
        drag.y = Math.max(0, Math.min(innerHeight - 40, event.clientY - drag.offsetY));
        element.style.left = `${drag.x}px`;
        element.style.top = `${drag.y}px`;
        element.style.right = 'auto';
    });
    function end(event) {
        if (!drag || event.pointerId !== drag.pointer) return;
        const finished = drag;
        drag = null;
        if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
        if (finished.moved) save(finished.x, finished.y);
        else if (event.type === 'pointerup') click?.();
    }
    scheduler.listen(handle, 'pointerup', end);
    scheduler.listen(handle, 'pointercancel', end);
    scheduler.listen(handle, 'lostpointercapture', end);
}
 export function rangeHtml( key, label, min, max, step, suffix = '' ) {
    return `<label class="ln-range"> <div class="ln-range-top"> <span class="ln-label"> ${label} </span> <span class="ln-range-value" data-range-value="${key}" ></span> </div> <input type="range" data-key="${key}" min="${min}" max="${max}" step="${step}" data-suffix="${suffix}" > </label>`;
}
