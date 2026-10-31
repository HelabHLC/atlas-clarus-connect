(function (root) {
  'use strict';
  // Quark's XPress Tags 2026 guide, Colors and Special Characters chapters.
  // RGB process colours use normalized channels. <e9> declares UTF-8.
  const HEADER = '<v21.00><e9>';
  const MAX_COLORS = 256;
  const SAFE_NAME = /^[A-Za-z0-9_# .-]+$/;
  const RGB8 = rgb => Array.isArray(rgb) && rgb.length === 3 &&
    rgb.every(v => Number.isInteger(v) && v >= 0 && v <= 255);

  function text(value) {
    if (typeof value !== 'string' || !value.length) throw Error('A palette name is required.');
    for (const ch of value) {
      const n = ch.codePointAt(0);
      if (n < 32 || n === 127 || (n >= 0xD800 && n <= 0xDFFF)) {
        throw Error('The palette name contains an unsupported control character.');
      }
    }
    return value.replace(/[@<\\]/g, ch => ({'@':'<\\@>', '<':'<\\<>', '\\':'<\\\\>'}[ch]));
  }

  function validate(palette) {
    if (!Array.isArray(palette) || !palette.length || palette.length > MAX_COLORS) {
      throw Error('QuarkXPress export requires 1–256 colours.');
    }
    const names = new Set();
    for (const color of palette) {
      if (!color || typeof color.ref !== 'string' || !SAFE_NAME.test(color.ref) || !color.ref.trim()) {
        throw Error('QuarkXPress requires an Atlas address or a safe RGB swatch name (letters, digits, spaces, _, #, . or -).');
      }
      // Do not silently rename or reinterpret ambiguous native swatches.
      const key = color.ref.toLowerCase();
      if (names.has(key) || ['black', 'white', 'none', 'registration', 'cyan', 'magenta', 'yellow'].includes(key)) {
        throw Error('QuarkXPress colour names must be unique and must not use reserved names.');
      }
      if (!RGB8(color.rgb)) throw Error('QuarkXPress export requires exact 8-bit RGB values.');
      names.add(key);
    }
  }

  function quarkXtg(palette, master, name = 'ATLAS Clarus Palette') {
    validate(palette);
    if (typeof master !== 'string' || !/^[0-9a-f]{64}$/.test(master)) throw Error('Invalid master SHA-256.');
    const title = text(name);
    const definitions = palette.map(c => '@' + c.ref + '=[C]<"RGB",P,' + c.rgb.map(v => String(v / 255)).join(',') + '>');
    const labels = palette.map(c => '<c"' + c.ref + '">' + c.ref + '\tRGB ' + c.rgb.join(' / ') + '<c"Black">');
    return [HEADER, ...definitions,
      '<c"Black">ATLAS Clarus - ' + title,
      'RGB swatches: set the QuarkXPress RGB solid-colour source profile to sRGB IEC61966-2.1.',
      'Master SHA-256: ' + master,
      'Keep Clarus JSON or the complete reduction job for identity and source evidence.',
      ...labels, ''].join('\r\n');
  }

  // Strict readback of this export dialect; not a general XPress Tags reader.
  // Native QuarkXPress acceptance must be checked separately.
  function readQuarkXtg(source) {
    if (typeof source !== 'string') throw Error('Invalid XPress Tags input.');
    const lines = source.split('\r\n');
    if (lines.shift() !== HEADER) throw Error('Invalid XPress Tags version or UTF-8 header.');
    const palette = [];
    while (lines.length && lines[0].startsWith('@')) {
      const line = lines.shift();
      const match = /^@([A-Za-z0-9_# .-]+)=\[C\]<"RGB",P,([^,]+),([^,]+),([^>]+)>$/.exec(line);
      if (!match) throw Error('Invalid XPress Tags RGB process-colour definition.');
      const values = match.slice(2).map(s => {
        if (!/^(?:0(?:\.\d+)?|1(?:\.0+)?)$/.test(s)) throw Error('Invalid XPress Tags RGB channel.');
        return Number(s);
      });
      const rgb = values.map(v => Math.round(v * 255));
      if (values.some((v, i) => v !== rgb[i] / 255)) throw Error('XPress Tags channel does not preserve RGB8.');
      palette.push({ref: match[1], rgb});
    }
    validate(palette);
    return palette;
  }

  function verifyQuarkXtg(source, palette, master, name = 'ATLAS Clarus Palette') {
    const back = readQuarkXtg(source);
    if (back.length !== palette.length || back.some((c, i) => c.ref !== palette[i].ref || c.rgb.some((v, j) => v !== palette[i].rgb[j])) ||
        source !== quarkXtg(palette, master, name)) {
      throw Error('QuarkXPress export readback failed.');
    }
    return true;
  }

  if (!root.ATLAS_CLARUS_EXPORTS) throw Error('Load palette-export.js before quarkxpress-export.js.');
  Object.assign(root.ATLAS_CLARUS_EXPORTS, {quarkXtg, readQuarkXtg, verifyQuarkXtg});
})(typeof window !== 'undefined' ? window : globalThis);
