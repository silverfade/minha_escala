// Feriados nacionais de data fixa: leis 662/1949, 6.802/1980 e 14.759/2023.
// Feriados religiosos locais e pontos facultativos não são incluídos.
(() => {
  const dates = { '01-01': 'Confraternização Universal', '04-21': 'Tiradentes', '05-01': 'Dia do Trabalho', '09-07': 'Independência do Brasil', '10-12': 'Nossa Senhora Aparecida', '11-02': 'Finados', '11-15': 'Proclamação da República', '11-20': 'Dia Nacional de Zumbi e da Consciência Negra', '12-25': 'Natal' };
  globalThis.Holidays = { name(date) { if (date.slice(5) === '11-20' && Number(date.slice(0, 4)) < 2024) return ''; return dates[date.slice(5)] || ''; } };
})();
