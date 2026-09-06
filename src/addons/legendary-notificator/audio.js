
export function createAudio(state, ctx, runtime) {
    /* ==========================================================
       AUDIO
    ========================================================== */

    function playSound() {
        if (state.settings.mute) {
            return;
        }

        const url = String( state.settings.customAudio || '' ).trim();

        if (url) {
            try {
                state.currentAudio?.pause();

                state.currentAudio = new Audio(url);

                state.currentAudio .play() .catch( playBuiltInSound );

                return;
            } catch {}
        }

        playBuiltInSound();
    }

    function playBuiltInSound() {
        if (!ctx.enabled || ctx.scheduler.disposed) return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;

            if (!AudioContextClass) {
                return;
            }

            const context = new AudioContextClass();
            const releaseContext = ctx.scheduler.cleanup(() => { void context.close().catch(() => {}); });

            const gain = context.createGain();

            gain.connect( context.destination );

            gain.gain.setValueAtTime( 0.0001, context.currentTime );

            gain.gain.exponentialRampToValueAtTime( 0.10, context.currentTime + 0.02 );

            gain.gain.exponentialRampToValueAtTime( 0.0001, context.currentTime + 0.82 );

            [ 523.25, 659.25, 783.99 ].forEach( ( frequency, index ) => {
                    const oscillator = context .createOscillator();

                    oscillator.type = 'sine';

                    oscillator.frequency.value = frequency;

                    oscillator.connect( gain );

                    oscillator.start( context.currentTime + index * 0.06 );

                    oscillator.stop( context.currentTime + 0.6 + index * 0.06 );
                }
            );

            ctx.scheduler.timeout( () => {
                    try {
                        releaseContext();
                        void context.close().catch(() => {});
                    } catch {}
                }, 1200
            );
        } catch {}
    }

    return { playSound, playBuiltInSound };
}
