
export function createTestLoot(state, ctx, runtime) {
    /* ==========================================================
       TEST ITEM
    ========================================================== */

    function getGameItems() {
        try {
            const tested = ctx.game.page.Engine ?.items ?.test ?.();

            if (tested?.items) {
                return tested.items;
            }
        } catch {}

        return ( ctx.game.page.Engine ?.items ?.items || ctx.game.page.g ?.item || ctx.game.page.g ?.items || {}
        );
    }

    function findTestItem() {
        const items = Object.values( getGameItems() || {}
            );

        return ( items.find( item => /torba\s+podr[oó]żna/i .test( String( item?.name || '' ) ) ) || items.find( item => /\btorba\b/i .test( String( item?.name || '' ) ) ) || items[0] || null
        );
    }

    function legendaryStat(item) {
        let stat = String( item?.stat || '' ) .split(';') .filter(Boolean) .filter( part => !/^rarity=/i .test(part) ) .join(';');

        if (stat) {
            stat += ';';
        }

        return ( stat + 'rarity=legendary' );
    }

    /* ==========================================================
       TEST
    ========================================================== */

    function testLoot() {
        if (!ctx.enabled) return;
        const item = findTestItem();

        if (!item) {
            alert( 'Legendary Notificator: brak przedmiotu testowego.' );

            return;
        }

        const comm = ctx.game.page.Engine ?.communication;

        if ( !comm || typeof comm.parseJSON !== 'function' ) {
            alert( 'Legendary Notificator: komunikacja gry nie jest jeszcze dostępna.' );

            return;
        }

        const heroId = ctx.game.page.Engine ?.hero ?.d ?.id ?? ctx.game.page.Engine ?.hero ?.id ?? ctx.game.page.g ?.hero ?.id ?? 0;

        const eventValue = Number( ctx.game.page.Engine?.ev ?? ctx.game.page.g?.ev );

        const eventTime = Number.isFinite( eventValue ) && eventValue > 0 ? eventValue : Math.floor( Date.now() / 1000 );

        const fakeLoot = {
            loot: {
                init: 1,

                endTs: Math.floor( eventTime + 15 ),

                source: 'legendary_notificator_v580_test',

                states: {
                    1: 1
                }
            },

            item: {
                1: {
                    id: 1,

                    hid: item.hid ?? item.id ?? 1,

                    tpl: item.tpl ?? 0,

                    name: item.name || 'Torba podróżna',

                    own: heroId,

                    loc: 'l',

                    icon: item.icon ?? '',

                    x: item.x ?? 0,

                    y: item.y ?? 0,

                    cl: item.cl ?? 0,

                    pr: item.pr ?? 0,

                    st: item.st ?? 1,

                    prc: 'zl',

                    stat: legendaryStat( item )
                }
            }
        };

        try {
            comm.parseJSON( fakeLoot );
        } catch (error) {
            console.error( '[Legendary Notificator TEST]', error );

            alert( 'Legendary Notificator: klient gry odrzucił test.' );
        }
    }

    return { getGameItems, findTestItem, legendaryStat, testLoot };
}
