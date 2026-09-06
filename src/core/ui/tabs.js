export function setPanelTab(panel, tabId, persist) {
    const buttons = [...panel.querySelectorAll('.ln-tab-button[data-tab]')];
    if (!buttons.some(button => button.dataset.tab === tabId)) tabId = 'general';
    buttons.forEach(button => button.classList.toggle('active', button.dataset.tab === tabId));
    panel.querySelectorAll('.ln-tab-pane[data-pane]').forEach(pane => {
        pane.classList.toggle('active', pane.dataset.pane === tabId);
    });
    persist?.(tabId);
}

export function panelTabButton(id, label, description) {
    return `<button type="button" class="ln-tab-button" data-tab="${id}">${label}<small>${description}</small></button>`;
}
export function panelTabPane(id, content) {
    return `<div class="ln-tab-pane" data-pane="${id}">${content}</div>`;
}
