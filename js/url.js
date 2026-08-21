/* The URL hash is the save file. Compact positional arrays keep it short. */

import { UNITS } from './state.js';

const VERSION = 1;
const round = (n, dp = 4) => Math.round(n * 10 ** dp) / 10 ** dp;

export function encode(config) {
  const payload = [
    VERSION,
    round(config.length),
    round(config.tempo),
    config.timeSignature,
    config.velocity,
    config.rates.map(r => [
      r.name,
      round(r.speed, 6),
      Math.max(0, UNITS.indexOf(r.unit)),
      r.note,
      r.channel,
      round(r.offset),
      r.length === null ? null : round(r.length),
      r.enabled ? 1 : 0,
    ]),
  ];
  return toBase64Url(JSON.stringify(payload));
}

export function decode(hash) {
  const p = JSON.parse(fromBase64Url(hash));
  if (!Array.isArray(p) || p[0] !== VERSION) throw new Error('Unknown config version');

  const [, length, tempo, timeSignature, velocity, rates] = p;
  return {
    length, tempo, timeSignature, velocity,
    rates: (Array.isArray(rates) ? rates : []).map(r => ({
      name: r[0],
      speed: r[1],
      unit: UNITS[r[2]] ?? 'bpm',
      note: r[3],
      channel: r[4],
      offset: r[5],
      length: r[6] ?? null,
      enabled: r[7] !== 0,
    })),
  };
}

/** Read the config from location.hash, or null if there isn't a usable one. */
export function readHash() {
  const m = /[#&]c=([A-Za-z0-9_-]+)/.exec(location.hash || '');
  if (!m) return null;
  try {
    return decode(m[1]);
  } catch {
    return null;
  }
}

/** Write without adding a history entry, so Back still leaves the site. */
export function writeHash(config) {
  history.replaceState(null, '', `#c=${encode(config)}`);
}

function toBase64Url(str) {
  let binary = '';
  for (const byte of new TextEncoder().encode(str)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
