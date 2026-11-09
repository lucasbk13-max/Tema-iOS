// Noir · Agenda — widget para o app Scriptable (médio ou grande).
// Lista os próximos compromissos do Calendário de hoje e amanhã.
const C = { bg: '#0E0E10', text: '#EDEDEF', muted: '#8A8A90', line: '#2A2A2E' };
const MAX = config.widgetFamily === 'large' ? 7 : 3;

const now = new Date();
const end = new Date(now); end.setDate(end.getDate() + 2); end.setHours(0, 0, 0, 0);
const events = (await CalendarEvent.between(now, end))
  .filter((e) => !e.isAllDay)
  .sort((a, b) => a.startDate - b.startDate)
  .slice(0, MAX);

const w = new ListWidget();
w.backgroundColor = new Color(C.bg);
w.setPadding(16, 18, 16, 18);
w.refreshAfterDate = new Date(now.getTime() + 15 * 60 * 1000);

const title = w.addText('AGENDA');
title.font = Font.semiboldSystemFont(10);
title.textColor = new Color(C.muted);
w.addSpacer(10);

const tf = new DateFormatter();
tf.locale = 'pt_BR';
tf.dateFormat = 'HH:mm';

if (events.length === 0) {
  const t = w.addText('Nada pela frente.');
  t.font = Font.lightSystemFont(16);
  t.textColor = new Color(C.text);
}

for (const e of events) {
  const row = w.addStack();
  row.centerAlignContent();
  const dot = row.addStack();
  dot.size = new Size(2, 18);
  dot.backgroundColor = new Color(C.line);
  row.addSpacer(10);
  const isTomorrow = e.startDate.getDate() !== now.getDate();
  const h = row.addText(tf.string(e.startDate) + (isTomorrow ? ' ›' : ''));
  h.font = Font.regularMonospacedSystemFont(12);
  h.textColor = new Color(C.muted);
  row.addSpacer(10);
  const name = row.addText(e.title);
  name.font = Font.regularSystemFont(14);
  name.textColor = new Color(C.text);
  name.lineLimit = 1;
  w.addSpacer(8);
}
w.addSpacer();

if (config.runsInWidget) Script.setWidget(w);
else await w.presentMedium();
Script.complete();
