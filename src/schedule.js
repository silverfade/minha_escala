(function (root) {
  'use strict';
  const DAY = 86400000;
  function parseDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Informe uma data válida.');
    const date = new Date(value + 'T00:00:00Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error('Informe uma data válida.');
    return date;
  }
  const key = date => date.toISOString().slice(0, 10);
  function calculate({ anchor, rest, work, until, mode = 'alternating' }) {
    const start = parseDate(anchor);
    if (!['alternating', 'fixed'].includes(mode)) throw new Error('Escolha um modelo válido.');
    if (!Number.isInteger(rest) || rest < 1 || rest > 31 || (mode === 'alternating' && rest > 2) || !Number.isInteger(work) || work < 1 || work > 31) throw new Error('Use de 1 a 31 dias. Na alternância, a folga inicial deve ter 1 ou 2 dias.');
    if (!/^\d{4}-\d{2}$/.test(until)) throw new Error('Escolha o mês final.');
    const month = parseDate(until + '-01');
    const end = new Date(month); end.setUTCMonth(end.getUTCMonth() + 1); end.setUTCDate(0);
    if (end < start) throw new Error('O mês final precisa incluir ou ser posterior à folga de referência.');
    if (end - start > DAY * 366 * 10) throw new Error('Calcule um período de até 10 anos por vez.');
    const days = [], blocks = []; let cursor = start.getTime(), length = rest;
    while (cursor <= end.getTime()) {
      const block = [];
      for (let i = 0; i < length && cursor <= end.getTime(); i++, cursor += DAY) {
        const value = key(new Date(cursor)); days.push({ date: value, type: 'rest' }); block.push(value);
      }
      blocks.push(block);
      for (let i = 0; i < work && cursor <= end.getTime(); i++, cursor += DAY) days.push({ date: key(new Date(cursor)), type: 'work' });
      if (mode === 'alternating') length = length === 1 ? 2 : 1;
    }
    return { days, blocks, start: key(start), end: key(end) };
  }
  const api = { calculate, parseDate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Schedule = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
