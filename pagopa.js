// Parser del QR dell'avviso di pagamento pagoPA.
// Formato (specifiche tecniche avviso analogico pagoPA):
//   PAGOPA|002|<codice avviso: 18 cifre>|<CF ente creditore: 11 cifre>|<importo in centesimi: 2-11 cifre>
// Questo STESSO file e' usato dall'estensione e dalla pagina per lo smartphone.

export function parsePagoPA(text) {
  if (typeof text !== 'string') return { ok: false };
  const parts = text.trim().split('|');
  if (parts.length !== 5 || parts[0] !== 'PAGOPA') return { ok: false };
  const [, versione, avviso, cf, centesimi] = parts;
  if (!/^\d{3}$/.test(versione)) return { ok: false };
  if (!/^\d{18}$/.test(avviso)) return { ok: false };
  if (!/^\d{11}$/.test(cf)) return { ok: false };
  if (!/^\d{2,11}$/.test(centesimi)) return { ok: false };
  return {
    ok: true,
    versione,
    avviso,
    cf,
    centesimi,
    importo: formatImporto(centesimi), // "123,45"
  };
}

/** Centesimi -> "1234,56" (formato italiano, senza separatore delle migliaia). */
export function formatImporto(centesimi) {
  const c = String(centesimi).replace(/^0+(?=\d{3,})/, '').padStart(3, '0');
  return c.slice(0, -2) + ',' + c.slice(-2);
}

/** "0000012345" -> "123,45" con separatore delle migliaia: "1.234,56". */
export function formatEuro(centesimi) {
  const [int, dec] = formatImporto(centesimi).split(',');
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + dec;
}

/** Codice avviso a gruppi di 4 cifre, solo per la visualizzazione. */
export function formatAvviso(avviso) {
  return avviso.replace(/(\d{4})(?=\d)/g, '$1 ');
}
