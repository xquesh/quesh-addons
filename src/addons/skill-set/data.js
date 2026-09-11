export const DEFAULTS = Object.freeze({ windowOpen: false });

export function heroData(page) {
    const hero = page.Engine?.hero?.d || page.Engine?.hero || page.g?.hero || {};
    return { level: Number(hero.lvl ?? hero.level) || 0, profession: String(hero.prof ?? hero.profession ?? '') };
}

export function parseSkillList(skillList, skillData = {}) {
    if (Array.isArray(skillList)) {
        const result = [];
        for (let index = 0; index + 9 < skillList.length; index += 10) {
            const level = String(skillList[index + 7] || '0/0').split('/');
            result.push({
                id: Number(skillList[index]), name: String(skillList[index + 1] || `UM ${skillList[index]}`),
                group: Number(skillList[index + 3]) % 8 - 1,
                level: Number(level[0]) || 0, maxLevel: Number(level[1]) || 0
            });
        }
        return { legacy: true, skills: result };
    }
    const result = [];
    for (const [key, value] of Object.entries(skillList || {})) {
        const template = skillData?.[key] || {};
        result.push({
            id: Number(key), name: String(template.name || `UM ${key}`), group: Number(template.pos) % 8 - 1,
            level: Number(value?.lvl ?? value?.level ?? value) || 0, maxLevel: Number(template.maxLvl ?? template.max_level) || 0
        });
    }
    return { legacy: false, skills: result };
}

export function exportSkillSet({ skills, mastery, hero }) {
    const groups = [];
    for (const skill of skills || []) if (skill.level > 0) {
        const group = Number.isFinite(skill.group) && skill.group >= 0 ? skill.group : 0;
        if (!groups[group]) groups[group] = {};
        groups[group][skill.id] = skill.level;
    }
    return {
        level: Math.min(Number(hero?.level) || 0, 300),
        prof: String(hero?.profession || ''), skills: groups,
        mastery: mastery ? { skills: Array.from(mastery.list || mastery.skills || [], Number), repeat: Number(mastery.rpt ?? mastery.repeat) === 1 || mastery.repeat === true } : null
    };
}

export function validateSkillSet(value) {
    if (!value || typeof value !== 'object' || !Array.isArray(value.skills)) return false;
    if (!Number.isFinite(Number(value.level)) || typeof value.prof !== 'string') return false;
    return value.skills.every(group => group == null || typeof group === 'object' && Object.entries(group).every(([id, level]) => Number(id) > 0 && Number(level) >= 0));
}

export function learningQueue(saved, currentSkills) {
    const current = new Map((currentSkills || []).map(skill => [Number(skill.id), Number(skill.level) || 0]));
    const queue = [];
    for (const group of saved?.skills || []) for (const [id, target] of Object.entries(group || {})) {
        if ((current.get(Number(id)) || 0) < Number(target)) queue.push({ id: Number(id), target: Number(target) });
    }
    return queue;
}
