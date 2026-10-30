const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const valid = { model: 'alternating', anchor: '2026-10-08', rest: 1, work: 6, until: '2026-11', confirmed: true };

// Minimal DOM double: exercises the actual app, events and storage without dependencies.
// It does not replace browser checks of HTML parsing, native validity or accessibility.
function boot(saved, { readError = false, calculationError = false, writeError = () => null } = {}) {
  class Element {
    constructor() { this.value = ''; this.checked = false; this.hidden = false; this.disabled = false; this.textContent = ''; this.children = []; this.attributes = {}; this.events = {}; this.dataset = {}; this.classes = new Set(); this.classList = { add: x => this.classes.add(x), toggle: (x, on) => on ? this.classes.add(x) : this.classes.delete(x) }; }
    append(...items) { this.children.push(...items); }
    replaceChildren(...items) { this.children = items; this.textContent = ''; }
    setAttribute(k, v) { this.attributes[k] = String(v); }
    getAttribute(k) { return this.attributes[k]; }
    removeAttribute(k) { delete this.attributes[k]; }
    addEventListener(k, fn) { (this.events[k] ||= []).push(fn); }
    fire(k, details = {}) { for (const fn of this.events[k] || []) fn({ preventDefault() {}, stopPropagation() {}, ...details }); }
    focus() { this.focused = true; }
    contains(target) { return target === this || this.children.some(child => child.contains(target)); }
    setCustomValidity(message) { this.validationMessage = message; }
    checkValidity() { return true; }
    reportValidity() {}
  }
  const elements = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(m => [m[1], new Element()]));
  for (const match of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)) elements.get(match[1]).hidden = /\bhidden\b/.test(match[0]);
  const $ = id => { assert.ok(elements.has(id), `missing DOM element ${id}`); return elements.get(id); };
  for (const [id, value] of Object.entries({ model: 'alternating', rest: '1', work: '6' })) $(id).value = value;
  $('show-holidays').checked = true;
  const radios = ['alternating', '6-1', '6-2', '5-2', '4-2', 'custom'].map(value => Object.assign(new Element(), { value }));
  const nav = ['home', 'editor', 'details'].map(view => Object.assign(new Element(), { dataset: { view } }));
  const exports = [new Element()];
  const writes = [];
  const attempts = [];
  const storage = new Map(saved === undefined ? [] : [['minha-escala', saved]]);
  const context = vm.createContext({ console, document: {
    body: new Element(), getElementById: $, createElement: () => new Element(), addEventListener() {},
    querySelectorAll: selector => selector.includes('model-choice') ? radios : selector.includes('data-view') ? nav : selector === '[data-export]' ? exports : [],
  }, window: { scrollTo() {}, print() {} }, localStorage: {
    getItem(key) { if (readError) throw new Error('storage blocked'); return storage.get(key) ?? null; },
    setItem(key, value) { attempts.push([key, String(value)]); const error = writeError(key); if (error) throw error; writes.push([key, String(value)]); storage.set(key, String(value)); },
    removeItem() { throw new Error('must not remove stored data'); },
  } });
  for (const file of ['schedule.js', 'holidays.js']) vm.runInContext(fs.readFileSync(path.join(root, 'src', file), 'utf8'), context);
  if (calculationError) { const calculate = context.Schedule.calculate; let first = true; context.Schedule.calculate = config => { if (first) { first = false; throw new Error('restoration calculation failed'); } return calculate(config); }; }
  vm.runInContext(fs.readFileSync(path.join(root, 'src/app.js'), 'utf8'), context);
  return { $, writes, attempts, storage, nav, radios };
}
function usable(app) {
  assert.ok(app.$('month-title').textContent, 'calendar must have a visible month');
  assert.ok(app.$('calendar').children.length >= 28, 'calendar must contain days');
  assert.equal(app.$('dashboard-view').hidden, false);
}
function recovered(app) {
  usable(app);
  assert.match(app.$('recovery-warning').textContent, /configur|restaur/i);
  assert.equal(app.$('recovery-warning').hidden, false);
  assert.match(html, /id="recovery-warning"[^>]*role="alert"/);
  assert.equal(app.$('model').value, 'alternating');
  assert.equal(app.$('rest').value, '1');
  assert.equal(app.$('work').value, '6');
  assert.equal(app.writes.length, 0, 'opening must never overwrite storage');
}
test('regression: incomplete confirmed configuration leaves a usable calendar', () => {
  recovered(boot(JSON.stringify({ confirmed: true, anchor: 'impossible' })));
});
test('first opening without stored data', () => {
  const app = boot(); usable(app); assert.equal(app.writes.length, 0);
  assert.equal(app.$('recovery-warning').hidden, true);
  assert.equal(app.$('legend-empty').hidden, false);
});
test('legacy configurations: numeric strings, optional mode and unconfirmed draft', () => {
  for (const config of [valid, { ...valid, rest: '2', work: '5' }, { ...valid, model: '6-2', rest: 2, mode: 'fixed' }, { ...valid, confirmed: false }, { ...valid, confirmed: undefined }]) {
    const app = boot(JSON.stringify(config)); usable(app);
    assert.equal(String(app.$('anchor').value), config.anchor);
    assert.equal(app.$('recovery-warning').hidden, true);
    assert.equal(app.$('legend-empty').hidden, config.confirmed === true);
    assert.equal(app.writes.length, 0);
  }
});
test('all fixed presets and valid custom limits preserve the saved cycle', () => {
  for (const [model, work, rest] of [['6-1',6,1], ['6-2',6,2], ['5-2',5,2], ['4-2',4,2], ['custom',1,1], ['custom',31,31]]) {
    const app = boot(JSON.stringify({ ...valid, model, work, rest })); usable(app);
    assert.equal(String(app.$('work').value), String(work));
    assert.equal(String(app.$('rest').value), String(rest));
    assert.equal(app.$('recovery-warning').hidden, true);
    assert.equal(app.$('legend-empty').hidden, true);
  }
});
const invalid = {
  'broken JSON': '{broken', 'null': 'null', 'array': '[]',
  'incomplete confirmed': JSON.stringify({ confirmed: true }),
  'unknown model': JSON.stringify({ ...valid, model: 'unknown' }),
  'inconsistent preset': JSON.stringify({ ...valid, model: '6-2', rest: 1 }),
  'inconsistent mode': JSON.stringify({ ...valid, mode: 'fixed' }),
  'impossible date': JSON.stringify({ ...valid, anchor: '2026-02-30' }),
  'invalid month': JSON.stringify({ ...valid, until: '2026-13' }),
  'zero work': JSON.stringify({ ...valid, work: 0 }),
  'excess work': JSON.stringify({ ...valid, work: 32 }),
  'decimal': JSON.stringify({ ...valid, work: 1.5 }),
  'boolean count': JSON.stringify({ ...valid, rest: true }),
  'blank count': JSON.stringify({ ...valid, rest: '' }),
  'excess alternating rest': JSON.stringify({ ...valid, rest: 3 }),
  'excess custom rest': JSON.stringify({ ...valid, model: 'custom', rest: 32 }),
  'end before reference': JSON.stringify({ ...valid, until: '2026-09' }),
  'excess horizon': JSON.stringify({ ...valid, until: '2037-11' }),
  'invalid confirmation': JSON.stringify({ ...valid, confirmed: 'true' }),
};
for (const [name, raw] of Object.entries(invalid)) test(`recovery: ${name}`, () => {
  const app = boot(raw); recovered(app); assert.equal(app.storage.get('minha-escala'), raw);
});
test('storage read failure', () => recovered(boot(undefined, { readError: true })));
test('restoration calculation failure', () => recovered(boot(JSON.stringify(valid), { calculationError: true })));
test('navigation, holidays and a new valid configuration after recovery', () => {
  const raw = invalid['incomplete confirmed']; const app = boot(raw); recovered(app);
  const initial = app.$('month-title').textContent;
  app.$('next').fire('click'); assert.notEqual(app.$('month-title').textContent, initial);
  app.$('prev').fire('click'); assert.equal(app.$('month-title').textContent, initial);
  app.nav[2].fire('click'); app.nav[0].fire('click');
  for (const checked of [false, true]) { app.$('show-holidays').checked = checked; app.$('show-holidays').fire('change'); assert.equal(app.$('holiday-legend').hidden, !checked); }
  assert.equal(app.storage.get('minha-escala'), raw);
  app.nav[1].fire('click'); assert.equal(app.$('editor-view').hidden, false);
  for (const [id, value] of Object.entries(valid)) if (!['confirmed'].includes(id)) app.$(id).value = String(value);
  app.$('schedule-form').fire('submit'); usable(app);
  assert.equal(app.$('legend-empty').hidden, true);
  assert.equal(app.$('recovery-warning').hidden, true);
  assert.equal(JSON.parse(app.storage.get('minha-escala')).confirmed, true);
  assert.equal(app.writes.filter(([key]) => key === 'minha-escala').length, 1);
});

function submit(app, patch = {}) {
  app.nav[1].fire('click');
  for (const [id, value] of Object.entries({ ...valid, ...patch })) if (id !== 'confirmed') app.$(id).value = String(value);
  app.$('schedule-form').fire('submit');
}
function warning(app, id, pattern) {
  assert.equal(app.$(id).hidden, false, `${id} must be visible`);
  assert.match(app.$(id).textContent, pattern);
  assert.match(html, new RegExp(`id="${id}"[^>]*role="alert"[^>]*aria-atomic="true"`));
}
for (const name of ['QuotaExceededError', 'SecurityError']) test(`save failure: ${name} keeps the calculated calendar usable`, () => {
  const app = boot(undefined, { writeError: () => Object.assign(new Error('synthetic storage error'), { name }) });
  submit(app); usable(app);
  warning(app, 'save-warning', /calculada.*não foi possível salvar/s);
  assert.equal(app.$('error').textContent, '');
  assert.equal(app.$('legend-empty').hidden, true);
  assert.equal(app.$('hero-action-label').textContent, 'Editar minha escala');
  assert.equal(app.storage.has('minha-escala'), false);
  assert.equal(app.writes.length, 0);
  const month = app.$('month-title').textContent;
  app.$('next').fire('click'); assert.notEqual(app.$('month-title').textContent, month);
  app.$('prev').fire('click'); assert.equal(app.$('month-title').textContent, month);
  app.nav[1].fire('click'); app.nav[0].fire('click');
  assert.equal(app.$('save-warning').hidden, false);
});
test('save failure: a previous saved schedule survives and returns on reopening', () => {
  const raw = JSON.stringify(valid);
  const app = boot(raw, { writeError: () => new Error('blocked') });
  submit(app, { work: 5 });
  assert.match(app.$('overview-model').textContent, /5/);
  assert.equal(app.storage.get('minha-escala'), raw);
  warning(app, 'save-warning', /configuração anterior/);
  const reopened = boot(app.storage.get('minha-escala')); usable(reopened);
  assert.equal(String(reopened.$('work').value), '6');
});
test('save failure: invalid stored data survives until a later successful save', () => {
  let blocked = true; const raw = '{broken';
  const app = boot(raw, { writeError: () => blocked ? new Error('blocked') : null });
  submit(app); usable(app); assert.equal(app.storage.get('minha-escala'), raw);
  assert.equal(app.$('recovery-warning').hidden, true);
  warning(app, 'save-warning', /não foi possível salvar/);
  blocked = false; submit(app);
  assert.equal(app.$('save-warning').hidden, true); assert.equal(app.$('save-warning').textContent, '');
  assert.equal(JSON.parse(app.storage.get('minha-escala')).confirmed, true);
});
test('save failure: holiday preference remains usable and clears only after its save succeeds', () => {
  let blocked = true;
  const app = boot(JSON.stringify(valid), { writeError: key => blocked && key === 'minha-escala-feriados' ? new Error('blocked') : null });
  app.storage.set('minha-escala-feriados', 'true');
  app.$('show-holidays').checked = false; app.$('show-holidays').fire('change');
  assert.equal(app.$('holiday-legend').hidden, true);
  assert.equal(app.$('overview-holidays').textContent, 'Desativados');
  assert.equal(app.storage.get('minha-escala-feriados'), 'true');
  warning(app, 'holiday-save-warning', /não foi possível salvar.*preferência/s);
  submit(app); assert.equal(app.$('holiday-save-warning').hidden, false);
  blocked = false; app.$('show-holidays').fire('change');
  assert.equal(app.storage.get('minha-escala-feriados'), 'false');
  assert.equal(app.$('holiday-save-warning').hidden, true);
  assert.equal(app.$('holiday-save-warning').textContent, '');
});
test('save failure: saving holidays must not clear a schedule warning', () => {
  const app = boot(undefined, { writeError: key => key === 'minha-escala' ? new Error('blocked') : null });
  submit(app); app.$('show-holidays').fire('change');
  warning(app, 'save-warning', /não foi possível salvar/);
  assert.equal(app.$('holiday-save-warning').hidden, true);
});
test('save failure: both warnings coexist independently', () => {
  const app = boot(undefined, { writeError: () => new Error('blocked') });
  submit(app); app.$('show-holidays').fire('change');
  warning(app, 'save-warning', /não foi possível salvar/);
  warning(app, 'holiday-save-warning', /não foi possível salvar/);
});
test('save failure: blocked reads and writes still allow calculation', () => {
  const app = boot(undefined, { readError: true, writeError: () => new Error('blocked') });
  recovered(app); submit(app); usable(app);
  warning(app, 'save-warning', /não foi possível salvar/);
});
test('save failure: invalid calculation does not attempt storage or clear the warning', () => {
  const app = boot(undefined, { writeError: () => new Error('blocked') });
  submit(app); const attempts = app.attempts.length;
  submit(app, { anchor: '2026-02-30' });
  assert.equal(app.attempts.length, attempts);
  assert.match(app.$('error').textContent, /data válida/);
  warning(app, 'save-warning', /não foi possível salvar/);
});
test('save failure: normal opening and successful save have no warning or startup writes', () => {
  const app = boot(JSON.stringify(valid)); usable(app);
  assert.equal(app.attempts.length, 0);
  for (const id of ['save-warning', 'holiday-save-warning']) assert.equal(app.$(id).hidden, true);
  submit(app); app.$('show-holidays').fire('change');
  assert.equal(app.writes.length, 2);
  for (const id of ['save-warning', 'holiday-save-warning']) assert.equal(app.$(id).hidden, true);
});

test('month picker: restores legacy ISO month as editable MM/YYYY without writing', () => {
  const app = boot(JSON.stringify(valid));
  assert.equal(app.$('until').value, '11/2026');
  assert.equal(app.attempts.length, 0);
  assert.equal(app.$('until-picker').hidden, true);
});
test('month picker: manual local format calculates and persists the existing ISO format', () => {
  const app = boot(); submit(app, { until: '12/2026' }); usable(app);
  assert.equal(JSON.parse(app.storage.get('minha-escala')).until, '2026-12');
  assert.equal(app.$('overview-end').dateTime, '2026-12-31');
});
test('month picker: chooses month and year without saving until confirmation', () => {
  const app = boot(JSON.stringify(valid));
  app.$('until-toggle').fire('click');
  assert.equal(app.$('until-picker').hidden, false);
  assert.equal(app.$('until-toggle').getAttribute('aria-expanded'), 'true');
  assert.equal(app.$('until-months').children.length, 12);
  assert.equal(app.$('until-months').children[10].getAttribute('aria-pressed'), 'true');
  app.$('until-next-year').fire('click');
  assert.equal(Number(app.$('until-year').value), 2027);
  app.$('until-months').children[2].fire('click');
  assert.equal(app.$('until').value, '03/2027');
  assert.equal(app.$('until-picker').hidden, true);
  assert.equal(app.attempts.length, 0);
  app.$('schedule-form').fire('submit');
  assert.equal(JSON.parse(app.storage.get('minha-escala')).until, '2027-03');
});
test('month picker: typed year, leap month and keyboard navigation', () => {
  const app = boot(JSON.stringify(valid)); app.$('until-toggle').fire('click');
  app.$('until-year').value = '2028'; app.$('until-year').fire('input');
  const months = app.$('until-months').children;
  months[0].fire('keydown', { key: 'ArrowRight' }); assert.equal(months[1].focused, true);
  months[1].fire('click'); assert.equal(app.$('until').value, '02/2028');
  app.$('schedule-form').fire('submit'); assert.equal(app.$('overview-end').dateTime, '2028-02-29');
});
test('month picker: close and Escape preserve typed value; view changes close the picker', () => {
  const app = boot(JSON.stringify(valid));
  for (const action of ['close', 'escape', 'view']) {
    app.$('until-toggle').fire('click'); app.$('until-prev-year').fire('click');
    if (action === 'close') app.$('until-close').fire('click');
    if (action === 'escape') app.$('until-picker').fire('keydown', { key: 'Escape' });
    if (action === 'view') app.nav[0].fire('click');
    assert.equal(app.$('until-picker').hidden, true);
    assert.equal(app.$('until-year').disabled, true);
    assert.equal(app.$('until').value, '11/2026');
  }
});
test('month picker: invalid typed month, backward period and excessive horizon never save', () => {
  for (const until of ['13/2026', '02/26', '00/2026', '09/2026', '11/2037']) {
    const app = boot(JSON.stringify(valid)); submit(app, { until });
    assert.ok(app.$('error').textContent);
    assert.equal(app.attempts.length, 0);
  }
});
test('month picker: manual edits synchronize reopening and invalid input can be replaced by selection', () => {
  const app = boot(); app.$('until').value = '04/2028'; app.$('until').fire('input');
  app.$('until-toggle').fire('click'); assert.equal(Number(app.$('until-year').value), 2028);
  assert.equal(app.$('until-months').children[3].getAttribute('aria-pressed'), 'true');
  app.$('until').value = 'invalid'; app.$('until').fire('input'); assert.ok(app.$('until').validationMessage);
  app.$('until-toggle').fire('click'); app.$('until-months').children[0].fire('click');
  assert.equal(app.$('until').validationMessage, ''); assert.match(app.$('until').value, /^01\/\d{4}$/);
});
test('month picker: invalid year cannot select and can be corrected without changing period', () => {
  const app = boot(JSON.stringify(valid)); app.$('until-toggle').fire('click');
  app.$('until-year').value = '10000'; app.$('until-year').fire('input');
  app.$('until-months').children[0].fire('click'); assert.equal(app.$('until').value, '11/2026');
  assert.ok(app.$('until-year').validationMessage);
  app.$('until-year').value = '2027'; app.$('until-year').fire('input');
  app.$('until-months').children[0].fire('click'); assert.equal(app.$('until').value, '01/2027');
});
