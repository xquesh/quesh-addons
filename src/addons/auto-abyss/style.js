export const autoAbyssSettingsCss = `
.qaddons-abyss-status{border:1px solid #454545;background:#080808;padding:8px;display:grid;gap:3px}
.qaddons-abyss-status strong{color:#fff}.qaddons-abyss-status small{color:#aaa}
.qaddons-abyss-status[data-tone="error"]{border-color:#8d3030}.qaddons-abyss-status[data-tone="warning"]{border-color:#8a7131}
.qaddons-abyss-builds{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
@media(max-width:620px){.qaddons-abyss-builds{grid-template-columns:1fr}}
`;
