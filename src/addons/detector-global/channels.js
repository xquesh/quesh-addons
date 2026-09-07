export const CHANNELS = {
    LOCAL: { label: 'Lokalny', button: 'LOKALNY' },
    GLOBAL: { label: 'Globalny', button: 'GLOBAL' },
    CLAN: { label: 'Klan', button: 'KLAN' },
    GROUP: { label: 'Grupa', button: 'GRUPA' }
};

export const defaults = { channels: ['LOCAL'] };

export function selectedChannels(settings) {
    const values = settings.channels === undefined ? defaults.channels : settings.channels;
    if (!Array.isArray(values)) return [];
    return [...new Set(values.filter(value => typeof value === 'string' && Object.hasOwn(CHANNELS, value)))];
}

export function channelLabel(channels) {
    return channels.map(channel => CHANNELS[channel].label).join(', ');
}

export function buttonLabel(channels) {
    if (!channels.length) return 'WYBIERZ CZAT';
    return channels.length === 1 ? CHANNELS[channels[0]].button : `WYŚLIJ (${channels.length})`;
}
