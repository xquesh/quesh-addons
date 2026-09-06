export const PERFORMANCE_PROFILES = Object.freeze({
    eco: Object.freeze({
        maintenanceMs: 1100, uiRefreshMs: 3000, targetRefreshMs: 900, blurScale: 0.68, motionFilterPasses: 1, animatedFramePasses: 1,
        animatedItemPasses: 1, animatedBloomPasses: 2, maxAutoTargets: 8, autoScanBudget: 350
    }),

    balanced: Object.freeze({
        maintenanceMs: 650, uiRefreshMs: 2000, targetRefreshMs: 650, blurScale: 0.86, motionFilterPasses: 2, animatedFramePasses: 2,
        animatedItemPasses: 2, animatedBloomPasses: 2, maxAutoTargets: 16, autoScanBudget: 750
    }),

    quality: Object.freeze({
        maintenanceMs: 350, uiRefreshMs: 1200, targetRefreshMs: 400, blurScale: 1, motionFilterPasses: 3, animatedFramePasses: 3,
        animatedItemPasses: 2, animatedBloomPasses: 3, maxAutoTargets: 26, autoScanBudget: 1400
    })
});
