(function (root) {
  'use strict';
  function create(colors, masterSha256) {
    if (!Array.isArray(colors) || !colors.length) throw Error('The active PKL master is unavailable.');
    if (!/^[0-9a-f]{64}$/i.test(masterSha256 || '')) throw Error('The active PKL master SHA-256 is invalid.');
    const rows = colors.map(c => {
      if (!Number.isInteger(c.id) || !Array.isArray(c.rgb) || c.rgb.length !== 3 ||
        !c.rgb.every(v => Number.isInteger(v) && v >= 0 && v <= 255)) throw Error('The PKL master contains an invalid row.');
      return { id: c.id, ref: c.ref, rgb: c.rgb.slice() };
    });
    const ids = new Set(rows.map(r => r.id));
    if (ids.size !== rows.length) throw Error('The PKL master contains duplicate atlas_row_id values.');
    function build(items, depth = 0) {
      if (!items.length) return null;
      const axis = depth % 3;
      items.sort((a, b) => a.rgb[axis] - b.rgb[axis] || a.id - b.id);
      const middle = Math.floor(items.length / 2);
      return { row: items[middle], axis, left: build(items.slice(0, middle), depth + 1), right: build(items.slice(middle + 1), depth + 1) };
    }
    const tree = build(rows.slice());
    function nearest(rgb) {
      let best = null, bestD = Infinity;
      function visit(node) {
        if (!node) return;
        const q = node.row.rgb;
        const d = (q[0] - rgb[0]) ** 2 + (q[1] - rgb[1]) ** 2 + (q[2] - rgb[2]) ** 2;
        if (d < bestD || (d === bestD && node.row.id < best.id)) { best = node.row; bestD = d; }
        const delta = rgb[node.axis] - q[node.axis];
        visit(delta <= 0 ? node.left : node.right);
        if (delta * delta <= bestD) visit(delta <= 0 ? node.right : node.left);
      }
      visit(tree);
      return { row: best, d2: bestD };
    }
    function bind(rgba) {
      if (!ArrayBuffer.isView(rgba) || rgba.BYTES_PER_ELEMENT !== 1 || rgba.length % 4) throw Error('PKL binding requires RGBA pixels.');
      const output = new Uint8Array(rgba.length), cache = new Map(), counts = new Map();
      let maximumD2 = 0;
      for (let i = 0; i < rgba.length; i += 4) {
        const key = (rgba[i] << 16) | (rgba[i + 1] << 8) | rgba[i + 2];
        let match = cache.get(key);
        if (!match) { match = nearest([rgba[i], rgba[i + 1], rgba[i + 2]]); cache.set(key, match); }
        const row = match.row;
        output[i] = row.rgb[0]; output[i + 1] = row.rgb[1]; output[i + 2] = row.rgb[2]; output[i + 3] = 255;
        counts.set(row.id, (counts.get(row.id) || 0) + 1); maximumD2 = Math.max(maximumD2, match.d2);
      }
      const byId = new Map(rows.map(row => [row.id, row]));
      return {
        pixels: output,
        evidence: {
          method: 'RGB_ONLY_NEAREST_MASTER_WITH_ATLAS_ROW_ID_TIEBREAK',
          master_sha256: masterSha256,
          master_rows: rows.length,
          source_unique_rgb: cache.size,
          assigned_master_rows: counts.size,
          maximum_rgb_squared_distance: maximumD2,
          foreign_colors: 0,
          assignments: [...counts].sort((a, b) => a[0] - b[0]).map(([id, pixel_count]) => ({
            atlas_row_id: id, reference: byId.get(id).ref, master_rgb: byId.get(id).rgb.slice(), pixel_count
          }))
        }
      };
    }
    return { bind, nearest };
  }
  root.ATLAS_CLARUS_PKL_IMAGE = { create };
})(typeof window === 'undefined' ? globalThis : window);
