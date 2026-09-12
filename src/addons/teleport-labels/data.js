export const DEFAULTS = Object.freeze({
    labels: true,
    customLabels: {},
    fontSize: 9,
    color: '#ffffff',
    bold: true,
    shadow: 'outline',
    shadowColor: '#000000',
    shadowStrength: 3
});

// Skróty map używane przez teleporty Margonem. Kluczem jest pierwszy parametr statystyki teleport.
export const MAP_LABELS = Object.freeze({
    0x4c8:'KEND', 0x276:'PORT', 0x7c0:'AGIA', 0xbc:'ORLA', 0xbd:'ORLA', 0xce4:'KIC', 0x6d2:'KIC',
    0xeb6:'RENE', 0x1b23:'RENE', 0x1b25:'RENE', 0x1b92:'ARCY', 0x1b93:'ARCY', 0x1b94:'ARCY',
    0x76a:'ZONS', 0x194e:'ZONS', 0x1761:'ŁOWKA', 0x194d:'ŁOWKA', 0x173a:'PRZY', 0x194c:'PRZY',
    0x7e7:'MAGU', 0x7e8:'MAGU', 0x164c:'TEZA', 0x164d:'TEZA', 0xcf0:'BB', 0x935:'TH', 0x933:'TH',
    0xd21:'LAMB', 0xf2b:'REGU', 0xfce:'SOPEL', 0x1cb9:'UMI', 0x1041:'WASZ', 0xfe2:'HYDRA',
    0x1064:'LUKAV', 0x106e:'ARACH', 0x10aa:'REUZ', 0x10ac:'DRAK', 0x424:'MUSH', 0x278:'KOTO',
    0x166a:'SHAE', 0x166c:'SHAE', 0x9e4:'ZORG', 0x2d7:'WŁAD', 0xc4d:'GOBB', 0x103c:'TYRT',
    0x14ad:'TOLL', 0x904:'ALI', 0x7d:'RAZU', 0xb1:'AGAR', 0xb0:'AGAR', 0xaa9:'FOV', 0x330:'FOV',
    0x1513:'OSA', 0x14d:'VARI', 0xd6c:'KOZA', 0x1989:'JOT', 0x19e8:'TOLE', 0x19e1:'LISZ',
    0x19df:'GRAB', 0x4b4:'STOP', 0x19d7:'ZBROJ', 0x19ea:'CHOUK', 0x19ec:'CHOUK', 0x1a74:'NADZ',
    0x52c:'WIDMO', 0x52d:'WIDMO', 0xd8a:'OHYD', 0x47e:'GOPA', 0x1a7c:'GNOM', 0x1a7d:'GNOM',
    0xeb5:'ZYF', 0xe5:'KAMB', 0x1b1a:'JERT', 0x1b19:'JERT', 0x1b20:'MR', 0x1b22:'MM', 0x1b21:'MŁ',
    0x1b99:'P4', 0x1b9a:'P4', 0x1b9d:'OZI', 0x1cbd:'MORS', 0x10af:'KRAB', 0x654:'REM',
    0x1cc8:'BYK', 0x1ccf:'STW', 0x1b91:'IFRYT', 0x5f5:'PIRACI', 0x5f7:'HELGA', 0x5f6:'HENRY',
    0xd51:'JACK', 0x1cb8:'EOL', 0x1b2b:'GRUB', 0x4fc:'WOREK', 0x1cab:'WOJT', 0x1cac:'WOJT',
    0x15f:'TEŚĆ', 0x1caa:'TEŚĆ', 0xcc1:'AMUN', 0x1d11:'FODUG', 0x1d32:'GOONS', 0x52a:'ADA',
    0x16db:'SHEB', 0x16e0:'BUREK', 0x16f0:'DWK', 0x16e5:'SK', 0x16e6:'MATKA', 0x1cb1:'KROL',
    0x17a7:'LESBY', 0x1e0d:'OGR', 0x17a5:'TORKA', 0x1059:'KWIAT', 0x80f:'BREH', 0x1e09:'CERAS',
    0x1e15:'MYSZ', 0x1734:'SADO', 0x1735:'TŚ', 0x1e0e:'SAT', 0x1739:'BERGA', 0x1737:'ZUF',
    0x778:'FURB', 0xace:'MARLL', 0x5c9:'MDKS', 0x476:'P5', 0x5b6:'PANC', 0x5b7:'PANC',
    0xe2b:'SILVA', 0xe2c:'SILVA', 0xe0d:'DENDR', 0xe1a:'DENDR', 0xe1f:'DENDR', 0x1619:'TOLY',
    0x76d:'CIUT', 0x1628:'CIUT', 0xfd8:'SYBA', 0xfd9:'SYBA', 0x163e:'JAJO', 0x163f:'JAJO',
    0x1635:'P9', 0xbdb:'CHOP', 0xbdf:'SET', 0xcff:'TER', 0xd0c:'VERA', 0xd0d:'CHAE', 0xd0b:'PUST',
    0x17b0:'NYMF', 0x17b1:'NYMF', 0x931:'ART', 0x934:'FUR', 0x932:'ZOR'
});

export const SUMMON_LABELS = Object.freeze({
    'Domina Ecclesiae':'DOMI', 'Mietek Żul':'ŻUL', 'Mroczny Patryk':'PAT', 'Karmazynowy Mściciel':'KARM',
    'Złodziej':'ZŁOD', 'Zły Przewodnik':'ZŁY', 'Opętany Paladyn':'OPEK', 'Piekielny Kościej':'KOST',
    'Koziec Mściciel Ścieżek':'KOZIEC', 'Kochanka Nocy':'KOCH', 'Książę Kasim':'KASIM',
    'Święty Braciszek':'BRAT', 'Złoty Roger':'ROG', 'Baca bez Łowiec':'BACA', 'Czarująca Atalia':'ATKA',
    'Obłąkany Łowca Orków':'OBŁO', 'Lichwiarz Grauhaz':'LICH', 'Viviana Nandin':'VIVA', 'Przeraza':'PRZE',
    'Demonis Pan Nicości':'DEM', 'Mulher Ma':'MUHA', 'Vapor Veneno':'VAPO', 'Dęborożec':'DĘBO',
    'Tepeyollotl':'TEP', 'Widmo Triady':'TRIO', 'Negthotep Czarny Kapłan':'NEGH', 'Młody Smok':'SMOK'
});

export const SUMMON_PREFIX = 'Zwój przywołania drużyny na herosa ';

export function parseItemStats(item) {
    const value = typeof item?.stat?.stat === 'string' ? item.stat.stat : item?.stat;
    if (typeof value !== 'string') return item?._cachedStats || value || {};
    return Object.fromEntries(value.split(';').filter(Boolean).map(part => {
        const separator = part.indexOf('=');
        return separator < 0 ? [part, true] : [part.slice(0, separator), part.slice(separator + 1)];
    }));
}

export function teleportTarget(item) {
    const stats = parseItemStats(item);
    const teleport = stats.teleport || stats.custom_teleport;
    const mapId = teleport && teleport !== true && teleport !== 'true' ? String(teleport).split(',')[0] : '';
    const summon = Boolean(stats.townlimit && stats.townlimit !== true && stats.townlimit !== 'true') || String(item?.name || '').startsWith(SUMMON_PREFIX);
    if (summon) return { type: 'summon', key: String(item?.name || '').replace(SUMMON_PREFIX, '').trim() };
    return mapId ? { type: 'map', key: mapId } : null;
}

export function sanitizeLabel(value) {
    return [...String(value || '').trim().replace(/\s+/g, ' ').toLocaleUpperCase('pl-PL')].slice(0, 8).join('').trim();
}

function initials(value) {
    const words = String(value || '').match(/\p{L}+/gu) || [];
    return sanitizeLabel(words.length > 1 ? words.map(word => [...word][0]).join('') : words[0] || 'TP');
}

function plainText(value) {
    return String(value || '')
        .replace(/<\s*(?:br|\/div|\/p)\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, ' ')
        .replaceAll('&nbsp;', ' ').replaceAll('&oacute;', 'ó').replaceAll('&Oacute;', 'Ó')
        .replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>')
        .replace(/[ \t]+/g, ' ');
}

function destinationLabel(value) {
    const words = String(value || '').trim().replace(/[.,:;!?]+$/, '').match(/\p{L}+/gu) || [];
    if (!words.length) return '';
    if (words.length === 1) return sanitizeLabel([...words[0]].slice(0, 3).join(''));
    return sanitizeLabel(words.map(word => [...word][0]).join(''));
}

export function destinationFromItem(item) {
    let tip = '';
    try {
        const data = item?.getTipData?.();
        tip = Array.isArray(data) ? data[0] : data;
    } catch {}
    const sources = [item?.name, item?.description, item?.desc, item?.tip, item?.tooltip, tip];
    const patterns = [
        /teleportuje(?:\s+(?:postać|gracza|cię))?\s+na\s+mapę\s*:?\s*([^\n\r<(]+)/iu,
        /teleportuje(?:\s+(?:postać|gracza|cię))?\s+do(?:\s+mapy)?\s*:?\s*([^\n\r<(]+)/iu,
        /teleportując\p{L}*\s+(?:do|na)\s+([^\n\r<(]+)/iu,
        /teleportacji\s+(?:do|na)\s+([^\n\r<(]+)/iu
    ];
    for (const source of sources) {
        const text = plainText(source);
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match?.[1]) return match[1].trim();
        }
    }
    return '';
}

export function labelForItem(item, customLabels = {}) {
    const target = teleportTarget(item);
    if (!target) return '';
    const customKey = target.type === 'summon' ? `name:${target.key}` : target.key;
    const custom = sanitizeLabel(customLabels?.[customKey]);
    if (custom) return custom;
    if (target.type === 'summon') return sanitizeLabel(SUMMON_LABELS[target.key] || initials(target.key));
    return sanitizeLabel(MAP_LABELS[target.key] || destinationLabel(destinationFromItem(item)) || 'TP');
}

export function parseCustomLabels(value) {
    const result = {};
    for (const line of String(value || '').split(/\r?\n/)) {
        const separator = line.indexOf('=');
        if (separator < 1) continue;
        const key = line.slice(0, separator).trim();
        const label = sanitizeLabel(line.slice(separator + 1));
        if (key && label) result[key] = label;
    }
    return result;
}

export function serializeCustomLabels(value) {
    return Object.entries(value || {}).map(([key, label]) => `${key}=${sanitizeLabel(label)}`).join('\n');
}
