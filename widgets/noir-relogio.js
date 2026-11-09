// Noir · Relógio — widget para o app Scriptable (pequeno ou médio).
// Mostra hora, data e bateria em estilo escuro minimalista.
const C = { bg: '#0E0E10', text: '#EDEDEF', muted: '#8A8A90', line: '#2A2A2E' };

const now = new Date();
const w = new ListWidget();
w.backgroundColor = new Color(C.bg);
w.setPadding(16, 18, 16, 18);
// Atualiza a cada minuto (o iOS decide o momento exato).
w.refreshAfterDate = new Date(now.getTime() + 60 * 1000);

const time = w.addDate(now);
time.applyTimeStyle();
time.font = Font.ultraLightSystemFont(config.widgetFamily === 'small' ? 40 : 54);
time.textColor = new Color(C.text);

w.addSpacer(4);
const df = new DateFormatter();
df.locale = 'pt_BR';
df.dateFormat = "EEEE · d 'de' MMMM";
const date = w.addText(df.string(now).toUpperCase());
date.font = Font.mediumSystemFont(10);
date.textColor = new Color(C.muted);

w.addSpacer();
const pct = Math.round(Device.batteryLevel() * 100);
const bar = w.addStack();
bar.centerAlignContent();
const track = bar.addStack();
track.size = new Size(60, 3);
track.backgroundColor = new Color(C.line);
track.cornerRadius = 2;
const fill = track.addStack();
fill.size = new Size(Math.max(2, 60 * pct / 100), 3);
fill.backgroundColor = new Color(Device.isCharging() ? C.text : C.muted);
track.addSpacer();
bar.addSpacer(8);
const label = bar.addText(`${pct}%`);
label.font = Font.mediumSystemFont(10);
label.textColor = new Color(C.muted);

if (config.runsInWidget) Script.setWidget(w);
else await w.presentMedium();
Script.complete();
