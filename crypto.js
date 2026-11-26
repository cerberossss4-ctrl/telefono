// Cifratura end-to-end tra smartphone e PC.
// Questo STESSO file e' usato dall'estensione e dalla pagina per lo smartphone.
//
// Formato messaggio: "v1." + base64url( IV(12 byte) || AES-GCM(ciphertext+tag) )
// La chiave (256 bit) viaggia solo nel frammento (#...) dell'URL di abbinamento,
// che non viene mai inviato a nessun server. Il nome del topic e' usato come
// "dati aggiuntivi autenticati": un messaggio copiato su un altro topic non e' valido.

const enc = new TextEncoder();
const dec = new TextDecoder();

export function b64uEncode(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64uDecode(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Stringa casuale sicura (n byte di entropia, codificati base64url). */
export function randomToken(n = 16) {
  return b64uEncode(crypto.getRandomValues(new Uint8Array(n)));
}

async function importKey(keyStr) {
  const raw = b64uDecode(keyStr);
  if (raw.length !== 32) throw new Error('Chiave non valida');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptMessage(keyStr, topic, obj) {
  const key = await importKey(keyStr);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: enc.encode(topic) },
      key,
      enc.encode(JSON.stringify(obj))
    )
  );
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return 'v1.' + b64uEncode(out);
}

export async function decryptMessage(keyStr, topic, message) {
  if (typeof message !== 'string' || !message.startsWith('v1.')) throw new Error('Formato sconosciuto');
  const data = b64uDecode(message.slice(3));
  if (data.length < 12 + 16) throw new Error('Messaggio troppo corto');
  const key = await importKey(keyStr);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: data.slice(0, 12), additionalData: enc.encode(topic) },
    key,
    data.slice(12)
  );
  return JSON.parse(dec.decode(pt));
}
