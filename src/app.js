(() => {
  const $ = id => document.getElementById(id);
  const format = (value, options) => Schedule.parseDate(value).toLocaleDateString('pt-BR', { timeZone: 'UTC', ...options });
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  function showView(view) {
    closeMonthPicker(false);
    const editing = view === 'editor';
    $('dashboard-view').hidden = editing;
    $('editor-view').hidden = !editing;
    document.body.classList.toggle('is-details', view === 'details');
    for (const button of document.querySelectorAll('nav [data-view]')) {
      const active = button.dataset.view === view;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  for (const button of document.querySelectorAll('[data-view]')) button.addEventListener('click', () => showView(button.dataset.view));
  $('anchor').value = today;
  $('until').value = `${now.getFullYear() + 1}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  // Confirmation controls the session UI; it does not imply a successful save.
  let hasConfirmedSchedule = false;
  let restored, restorationFailed = false;
  function validateSaved(saved) {
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw new Error('Configuração inválida.');
    const presets = { '6-1': [6, 1], '6-2': [6, 2], '5-2': [5, 2], '4-2': [4, 2] };
    if (!['alternating', 'custom', ...Object.keys(presets)].includes(saved.model)) throw new Error('Modelo inválido.');
    if (saved.confirmed !== undefined && typeof saved.confirmed !== 'boolean') throw new Error('Confirmação inválida.');
    if (typeof saved.anchor !== 'string' || typeof saved.until !== 'string') throw new Error('Período incompleto.');
    // Older records may contain numeric strings and may omit mode/confirmed.
    const count = value => {
      if (typeof value !== 'number' && !(typeof value === 'string' && /^\d+$/.test(value))) throw new Error('Quantidade inválida.');
      return Number(value);
    };
    const config = { model: saved.model, mode: saved.model === 'alternating' ? 'alternating' : 'fixed', anchor: saved.anchor, rest: count(saved.rest), work: count(saved.work), until: saved.until };
    if (saved.mode !== undefined && saved.mode !== config.mode) throw new Error('Modo incoerente.');
    const preset = presets[config.model];
    if (preset && (config.work !== preset[0] || config.rest !== preset[1])) throw new Error('Modelo incoerente.');
    // Reuse the current date, integer, range and horizon rules without changing them.
    return { config, result: Schedule.calculate(config), confirmed: saved.confirmed === true };
  }
  try {
    const raw = localStorage.getItem('minha-escala');
    if (raw !== null) restored = validateSaved(JSON.parse(raw));
  } catch { restorationFailed = true; }
  if (restored) {
    for (const id of ['model', 'anchor', 'rest', 'work', 'until']) $(id).value = restored.config[id];
    hasConfirmedSchedule = restored.confirmed;
  }
  function readUntilMonth() {
    const value = $('until').value.trim();
    const local = /^(0[1-9]|1[0-2])\/(\d{4})$/.exec(value);
    if (local) return `${local[2]}-${local[1]}`;
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : '';
  }
  const displayMonth = value => `${value.slice(5, 7)}/${value.slice(0, 4)}`;
  $('until').value = displayMonth($('until').value);
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  let pickerYear = now.getFullYear();
  function closeMonthPicker(restoreFocus = true) {
    $('until-picker').hidden = true;
    $('until-year').disabled = true;
    $('until-toggle').setAttribute('aria-expanded', 'false');
    if (restoreFocus) $('until-toggle').focus();
  }
  function renderMonthPicker() {
    const selected = readUntilMonth();
    $('until-year').value = pickerYear;
    $('until-year').setCustomValidity('');
    $('until-prev-year').disabled = pickerYear <= 0;
    $('until-next-year').disabled = pickerYear >= 9999;
    $('until-months').replaceChildren();
    monthNames.forEach((name, index) => {
      const month = `${String(pickerYear).padStart(4, '0')}-${String(index + 1).padStart(2, '0')}`;
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = name;
      button.setAttribute('aria-label', `${name} de ${pickerYear}`);
      button.setAttribute('aria-pressed', String(month === selected));
      button.addEventListener('click', () => {
        if (!validPickerYear()) { $('until-year').reportValidity(); $('until-year').focus(); return; }
        $('until').value = displayMonth(month);
        $('until').setCustomValidity('');
        closeMonthPicker(false); $('until').focus();
      });
      button.addEventListener('keydown', event => {
        const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3, Home: -index, End: 11 - index };
        if (Object.prototype.hasOwnProperty.call(steps, event.key)) {
          event.preventDefault();
          const target = (index + steps[event.key] + 12) % 12;
          $('until-months').children[target].focus();
        }
      });
      $('until-months').append(button);
    });
  }
  function validPickerYear() {
    const value = $('until-year').value;
    return /^\d{1,4}$/.test(String(value)) && Number(value) >= 0 && Number(value) <= 9999;
  }
  $('until-toggle').addEventListener('click', () => {
    if (!$('until-picker').hidden) { closeMonthPicker(); return; }
    const selected = readUntilMonth();
    pickerYear = selected ? Number(selected.slice(0, 4)) : now.getFullYear();
    $('until-picker').hidden = false; $('until-year').disabled = false;
    $('until-toggle').setAttribute('aria-expanded', 'true');
    renderMonthPicker();
    const index = selected ? Number(selected.slice(5, 7)) - 1 : now.getMonth();
    $('until-months').children[index].focus();
  });
  $('until-close').addEventListener('click', () => closeMonthPicker());
  $('until-picker').addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeMonthPicker(); }
  });
  $('until-year').addEventListener('input', () => {
    if (validPickerYear()) { pickerYear = Number($('until-year').value); renderMonthPicker(); }
    else $('until-year').setCustomValidity('Informe um ano entre 0 e 9999.');
  });
  $('until-year').addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); if (validPickerYear()) $('until-months').children[0].focus(); else $('until-year').reportValidity(); }
  });
  for (const [id, offset] of [['until-prev-year', -1], ['until-next-year', 1]]) $(id).addEventListener('click', () => {
    pickerYear = Math.min(9999, Math.max(0, pickerYear + offset)); renderMonthPicker();
  });
  $('until').addEventListener('input', () => {
    $('until').setCustomValidity(readUntilMonth() ? '' : 'Informe o mês e o ano no formato MM/AAAA (por exemplo, 12/2027).');
    closeMonthPicker(false);
  });
  $('until').addEventListener('blur', () => {
    const month = readUntilMonth(); if (month) $('until').value = displayMonth(month);
  });
  document.addEventListener('click', event => {
    if (!$('until-picker').hidden && !$('until-field').contains(event.target)) closeMonthPicker(false);
  });
  function updateModel(applyPreset = false) {
    const model = $('model').value;
    const alternate = model === 'alternating', custom = model === 'custom';
    if (applyPreset && !alternate && !custom) {
      const [work, rest] = model.split('-'); $('work').value = work; $('rest').value = rest;
    }
    if (applyPreset && alternate) { $('work').value = 6; $('rest').value = Math.min(2, Math.max(1, Number($('rest').value))); }
    $('work').readOnly = !custom && !alternate; $('rest').readOnly = !alternate && !custom;
    $('rest').max = alternate ? 2 : 31;
    $('rest-label').textContent = alternate ? 'Folga inicial (1 ou 2)' : 'Dias de folga';
    $('rule-text').textContent = alternate
      ? `${$('work').value} dias de trabalho → 1 de folga → ${$('work').value} de trabalho → 2 de folga. Se a referência tem 2 dias, a próxima terá 1.`
      : `${$('work').value} dias de trabalho → ${$('rest').value} de folga. O mesmo ciclo se repete, sem reiniciar a cada mês.`;
  }
  for (const radio of document.querySelectorAll('[name="model-choice"]')) {
    radio.checked = radio.value === $('model').value;
    radio.addEventListener('change', () => { $('model').value = radio.value; updateModel(true); });
  }
  for (const id of ['work', 'rest']) $(id).addEventListener('input', () => updateModel());
  updateModel();
  let result, visibleMonth = today.slice(0, 7), lookup = new Map();
  try { $('show-holidays').checked = localStorage.getItem('minha-escala-feriados') !== 'false'; } catch { restorationFailed = true; }
  const holiday = date => $('show-holidays').checked ? Holidays.name(date) : '';
  function saveSetting(key, value, warningId, message) {
    const warning = $(warningId);
    try {
      localStorage.setItem(key, value);
      warning.hidden = true;
      warning.textContent = '';
    } catch {
      warning.hidden = false;
      warning.textContent = message;
    }
  }
  $('show-holidays').addEventListener('change', () => {
    saveSetting('minha-escala-feriados', $('show-holidays').checked, 'holiday-save-warning',
      'A marcação de feriados foi alterada nesta sessão, mas não foi possível salvar essa preferência. Ao reabrir, ela poderá voltar ao valor anterior.');
    render();
  });
  function render() {
    const first = Schedule.parseDate(visibleMonth + '-01');
    $('month-title').textContent = format(visibleMonth + '-01', { month: 'long', year: 'numeric' });
    const monthEnd = new Date(first); monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1); monthEnd.setUTCDate(0);
    document.querySelectorAll('.stat-month').forEach(label => { label.textContent = `em ${format(visibleMonth + '-01', { month: 'long' })}`; });
    $('holiday-legend').hidden = !$('show-holidays').checked;
    $('legend-rest').hidden = !result;
    $('legend-work').hidden = !result;
    $('legend-empty').hidden = !!result;
    $('overview-holidays').textContent = $('show-holidays').checked ? 'Ativados' : 'Desativados';
    $('overview-holidays').classList.toggle('is-off', !$('show-holidays').checked);
    $('calendar').replaceChildren();
    for (let i = 0; i < first.getUTCDay(); i++) $('calendar').append(document.createElement('span'));
    for (let day = 1; day <= monthEnd.getUTCDate(); day++) {
      const value = `${visibleMonth}-${String(day).padStart(2, '0')}`, type = lookup?.get(value);
      const cell = document.createElement('div'); cell.className = `day ${result ? (type || 'outside') : 'unconfigured'} ${value === today ? 'today' : ''}`;
      const number = document.createElement('span'); number.className = 'day-number'; number.textContent = day; cell.append(number);
      if (type === 'rest') { const label = document.createElement('small'); label.className = 'day-status'; label.textContent = 'Folga'; cell.append(label); }
      cell.setAttribute('aria-label', `${format(value, { day: 'numeric', month: 'long' })}: ${result ? (type === 'rest' ? 'folga' : type === 'work' ? 'trabalho' : 'fora do período') : 'escala ainda não configurada'}`);
      const name = holiday(value);
      if (name) { cell.classList.add('holiday'); cell.title = name; cell.setAttribute('aria-label', `${cell.getAttribute('aria-label')} · ${name}`); const mark = document.createElement('span'); mark.className = 'holiday-mark'; mark.textContent = '◆'; mark.setAttribute('aria-hidden', 'true'); cell.append(mark); }
      $('calendar').append(cell);
    }
    $('prev').disabled = !!result && visibleMonth <= result.start.slice(0, 7); $('next').disabled = !!result && visibleMonth >= result.end.slice(0, 7);
    $('rest-list').replaceChildren();
    const blocks = result ? result.blocks.map(block => block.filter(date => date.startsWith(visibleMonth))).filter(block => block.length) : [];
    const monthDays = result ? result.days.filter(day => day.date.startsWith(visibleMonth)) : [];
    $('month-rest').textContent = result ? monthDays.filter(day => day.type === 'rest').length : '—';
    $('month-work').textContent = result ? monthDays.filter(day => day.type === 'work').length : '—';
    for (const block of blocks) {
      const row = document.createElement('div'); row.className = 'rest-row';
      const icon = document.createElement('span'); icon.className = 'date-tile'; icon.textContent = block.length > 1 ? `${Number(block[0].slice(-2))}–${Number(block.at(-1).slice(-2))}` : Number(block[0].slice(-2));
      const detail = document.createElement('div'); const title = document.createElement('strong');
      title.textContent = block.length > 1 ? `${block.length} dias para você` : 'Seu dia de pausa';
      const subtitle = document.createElement('p'); subtitle.textContent = block.map(d => format(d, { weekday: 'long', day: 'numeric', month: 'short' })).join(' · ');
      detail.append(title, subtitle); row.append(icon, detail); $('rest-list').append(row);
    }
    if (!result) $('rest-list').textContent = 'Monte sua escala para ver aqui as próximas folgas.';
    else if (!blocks.length) $('rest-list').textContent = 'Nenhuma folga neste mês dentro do período calculado.';
    $('empty-setup').hidden = !!result;
    document.querySelectorAll('[data-export]').forEach(button => { button.hidden = !result; });
    $('summary-eyebrow').textContent = result ? 'NO SEU PERÍODO ATUAL' : 'SUA ROTINA COMEÇA AQUI';
    $('total').textContent = result ? `${result.days.filter(day => day.type === 'rest').length} dias de folga` : 'Sua escala começa aqui';
    $('range').textContent = result ? $('range').textContent : 'Monte sua escala para ver seu resumo e os próximos meses.';
    $('model-badge').hidden = !result;
    $('dashboard-view').classList.toggle('is-unconfigured', !result);
    $('hero-action-label').textContent = hasConfirmedSchedule ? 'Editar minha escala' : 'Montar minha escala';
    $('period-dates').hidden = !result;
    $('period-empty').hidden = !!result;
    if (!result) {
      $('overview-model').textContent = 'Escolha seu modelo';
      $('overview-model-description').textContent = 'Monte sua escala para começar.';
      $('overview-anchor').textContent = 'Informe uma folga conhecida';
    }
    $('holiday-list').replaceChildren();
    if ($('show-holidays').checked) {
      const heading = document.createElement('h3'); heading.textContent = '◆ Feriados nacionais'; $('holiday-list').append(heading);
      let count = 0;
      for (let day = 1; day <= monthEnd.getUTCDate(); day++) {
        const date = `${visibleMonth}-${String(day).padStart(2, '0')}`;
        if (holiday(date)) { const item = document.createElement('p'); item.textContent = `${day} · ${holiday(date)}`; $('holiday-list').append(item); count++; }
      }
      const note = document.createElement('p'); note.className = 'holiday-note'; note.textContent = `${count ? '' : 'Nenhum neste mês. ' }Feriados não alteram a escala. Datas religiosas locais e pontos facultativos não incluídos.`; $('holiday-list').append(note);
    }
  }
  function calculate(event) {
    event?.preventDefault(); $('error').textContent = '';
    if (event) for (const id of ['anchor', 'rest', 'work', 'until']) {
      if (!$(id).checkValidity()) { $(id).reportValidity(); return; }
    }
    const config = { model: $('model').value, mode: $('model').value === 'alternating' ? 'alternating' : 'fixed', anchor: $('anchor').value, rest: Number($('rest').value), work: Number($('work').value), until: readUntilMonth() };
    try {
      applyResult(config, Schedule.calculate(config));
      if (event) {
        hasConfirmedSchedule = true;
        saveSetting('minha-escala', JSON.stringify({ ...config, confirmed: true }), 'save-warning',
          'Sua escala foi calculada, mas não foi possível salvar as configurações neste navegador. Você pode consultá-la agora; ao reabrir, poderá aparecer a configuração anterior ou ser necessário configurar novamente.');
      }
      render();
      if (event) { $('recovery-warning').hidden = true; $('recovery-warning').textContent = ''; showView('home'); }
    } catch (error) { $('error').textContent = error.message; }
  }
  function applyResult(config, nextResult) {
      result = nextResult;
      lookup = new Map(result.days.map(day => [day.date, day.type])); visibleMonth = result.start.slice(0, 7);
      $('total').textContent = `${result.days.filter(day => day.type === 'rest').length} dias de folga`;
      $('model-badge').textContent = config.mode === 'alternating' ? `${config.work}–1–${config.work}–2 · alternada` : `${config.work}–${config.rest} · ciclo fixo`;
      $('range').textContent = `${format(result.start, { day: 'numeric', month: 'short', year: 'numeric' })} até ${format(result.end, { day: 'numeric', month: 'short', year: 'numeric' })} · inclui a folga de referência`;
      $('overview-model').textContent = config.mode === 'alternating' ? `${config.work} / 1 → ${config.work} / 2` : `${config.work} / ${config.rest}`;
      $('overview-model-description').textContent = config.mode === 'alternating' ? 'Folgas de 1 e 2 dias alternadas' : `${config.work} dias de trabalho · ${config.rest} ${config.rest === 1 ? 'dia' : 'dias'} de folga`;
      $('overview-anchor').textContent = format(result.start, {day:'numeric',month:'long',year:'numeric'});
      $('overview-start').textContent = format(result.start, {day:'numeric',month:'long',year:'numeric'});
      $('overview-start').dateTime = result.start;
      $('overview-end').textContent = format(result.end, {day:'numeric',month:'long',year:'numeric'});
      $('overview-end').dateTime = result.end;
  }
  $('schedule-form').addEventListener('submit', calculate);
  for (const [id, offset] of [['prev', -1], ['next', 1]]) $(id).addEventListener('click', () => {
    const date = Schedule.parseDate(visibleMonth + '-01'); date.setUTCMonth(date.getUTCMonth() + offset); visibleMonth = date.toISOString().slice(0, 7); render();
  });
  function exportPDF() {
    if (!result) return;
    const report = $('print-report'); report.replaceChildren();
    const months = [...new Set(result.days.map(day => day.date.slice(0, 7)))];
    months.forEach((month, index) => {
      const page = document.createElement('section'); page.className = 'print-page';
      const first = Schedule.parseDate(month + '-01'); const end = new Date(first); end.setUTCMonth(end.getUTCMonth() + 1); end.setUTCDate(0);
      const days = result.days.filter(day => day.date.startsWith(month));
      const heading = document.createElement('header'); const title = document.createElement('h1'); title.textContent = 'Minha escala'; const subtitle = document.createElement('p'); subtitle.textContent = $('model-badge').textContent; heading.append(title, subtitle); page.append(heading);
      const monthTitle = document.createElement('h2'); monthTitle.textContent = format(month + '-01', { month: 'long', year: 'numeric' }); page.append(monthTitle);
      const totals = document.createElement('p'); totals.textContent = `${days.filter(d => d.type === 'rest').length} dias de folga • ${days.filter(d => d.type === 'work').length} dias de trabalho`; page.append(totals);
      const table = document.createElement('table'); const head = document.createElement('thead'); const headRow = document.createElement('tr');
      for (const name of ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']) { const th = document.createElement('th'); th.textContent = name; headRow.append(th); } head.append(headRow); table.append(head);
      const body = document.createElement('tbody'); let row;
      const slots = Math.ceil((first.getUTCDay() + end.getUTCDate()) / 7) * 7;
      for (let slot = 0; slot < slots; slot++) {
        if (slot % 7 === 0) { row = document.createElement('tr'); body.append(row); }
        const cell = document.createElement('td'), day = slot - first.getUTCDay() + 1;
        if (day > 0 && day <= end.getUTCDate()) {
          const date = `${month}-${String(day).padStart(2, '0')}`, type = lookup.get(date); cell.className = type || 'not-covered';
          const number = document.createElement('strong'); number.textContent = day; const status = document.createElement('span'); status.textContent = type === 'rest' ? 'FOLGA' : type === 'work' ? 'Trabalho' : '—'; cell.append(number, status);
          if (holiday(date)) { const mark = document.createElement('small'); mark.textContent = '◆ Feriado'; cell.append(mark); }
        } row.append(cell);
      }
      table.append(body); page.append(table);
      const holidayNames = [];
      for (let day = 1; day <= end.getUTCDate(); day++) { const date = `${month}-${String(day).padStart(2, '0')}`; if (holiday(date)) holidayNames.push(`${day}: ${holiday(date)}`); }
      const notes = document.createElement('p'); notes.className = 'print-notes'; notes.textContent = holidayNames.join(' • '); page.append(notes);
      const footer = document.createElement('footer'); footer.textContent = `Período: ${format(result.start, {day:'2-digit',month:'2-digit',year:'numeric'})} a ${format(result.end, {day:'2-digit',month:'2-digit',year:'numeric'})}. Feriados não mudam a escala. ${$('show-holidays').checked ? 'Somente feriados nacionais de data fixa.' : 'Feriados ocultos.'} Página ${index + 1} de ${months.length}.`; page.append(footer); report.append(page);
    });
    window.print();
  }
  for (const button of document.querySelectorAll('[data-export]')) button.addEventListener('click', exportPDF);
  try {
    if (hasConfirmedSchedule) applyResult(restored.config, restored.result);
  } catch {
    restorationFailed = true;
    hasConfirmedSchedule = false;
    result = undefined;
    visibleMonth = today.slice(0, 7);
    lookup = new Map();
  }
  render();
  showView('home');
  if (restorationFailed) {
    $('recovery-warning').hidden = false;
    $('recovery-warning').textContent = 'Não foi possível restaurar todas as configurações salvas. Você pode montar sua escala novamente em Escala. Nenhum dado salvo foi apagado ou substituído nesta abertura.';
  }
})();
