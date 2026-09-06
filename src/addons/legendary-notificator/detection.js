
export function createDetection(state, ctx, runtime) {
    /* ==========================================================
       DETECT LEGEND
    ========================================================== */

    function isLegendary(item) {
        if ( !item || typeof item !== 'object' ) {
            return false;
        }

        const rarity = item ?._cachedStats ?.rarity ?? item ?.cachedStats ?.rarity ?? item ?.rarity;

        if ( typeof rarity === 'string' && /legend/i.test( rarity ) ) {
            return true;
        }

        const stat = String( item.stat || '' );

        return ( /(?:^|;)rarity=(?:legendary|legend|l)(?:;|$)/i .test(stat) || /(?:^|;)legbon_/i .test(stat) );
    }

    function getLegendaryLootItems(data) {
        const items = data?.item || data?.items;

        if ( !items || typeof items !== 'object' ) {
            return [];
        }

        return Object .values(items) .filter( item => {
                    const loc = String( item?.loc ?? '' ) .toLowerCase();

                    return ( [ 'l', 'loot', 'k', 'c', 'colossus' ].includes(loc) && isLegendary(item) );
                }
            );
    }

    /* ==========================================================
       GAME DATA
    ========================================================== */

    function processGameData(data) {
        if ( !ctx.enabled || !data ) {
            return;
        }

        if (Array.isArray(data)) {
            data.forEach( processGameData );

            return;
        }

        if ( typeof data !== 'object' || !data.loot ) {
            return;
        }

        if ( data.loot.init !== undefined && !data.loot.init ) {
            return;
        }

        if ( !getLegendaryLootItems( data ).length ) {
            return;
        }

        let duration = state.settings.fallbackDuration;

        const eventTime = Number( ctx.game.page.Engine?.ev ?? ctx.game.page.g?.ev );

        const endTime = Number( data.loot.endTs );

        if ( Number.isFinite( eventTime ) && Number.isFinite( endTime ) && endTime > eventTime ) {
            duration = endTime - eventTime;
        }

        ctx.events.emit('legendaryLoot', { data, items: getLegendaryLootItems(data), duration });

        ctx.scheduler.timeout( () => {
                runtime.activateEffect( duration );

                runtime.playSound();
            }, 20
        );
    }

    return { isLegendary, getLegendaryLootItems, processGameData };
}
