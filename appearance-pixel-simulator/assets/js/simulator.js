(function () {
  'use strict';

  const materials = {
    paper: { label: 'coated paperboard', code: 1, diffuse: 1.00, specular: 0.65, grain: 0.08, warm: 0 },
    polymer: { label: 'polymer film', code: 2, diffuse: 1.05, specular: 1.20, grain: 0.02, warm: 0 },
    metal: { label: 'brushed metal', code: 3, diffuse: 0.72, specular: 1.65, grain: 0.12, warm: 0 },
    textile: { label: 'woven textile', code: 4, diffuse: 0.88, specular: 0.28, grain: 0.22, warm: 0 },
    glass: { label: 'translucent glass', code: 5, diffuse: 0.76, specular: 1.45, grain: 0.01, warm: 0 },
    wood: { label: 'wood veneer', code: 6, diffuse: 0.84, specular: 0.42, grain: 0.20, warm: 0.12 }
  };
  const finishes = {
    matte: { label: 'matte', specular: 0.18, spread: 0.32, saturation: 0.96 },
    satin: { label: 'satin', specular: 0.55, spread: 0.20, saturation: 1.00 },
    gloss: { label: 'high gloss', specular: 1.25, spread: 0.09, saturation: 1.03 },
    metallic: { label: 'metallic', specular: 1.55, spread: 0.13, saturation: 0.78 },
    pearlescent: { label: 'pearlescent', specular: 1.30, spread: 0.16, saturation: 0.88 },
    softtouch: { label: 'soft-touch', specular: 0.12, spread: 0.38, saturation: 0.92 },
    uncoated: { label: 'uncoated', specular: 0.08, spread: 0.45, saturation: 0.86 }
  };
  const effects = {
    none: { label: 'no embellishment', code: 0 }, spot: { label: 'spot varnish', code: 1 },
    foil: { label: 'metal foil', code: 2 }, emboss: { label: 'emboss', code: 3 },
    raised: { label: 'raised ink', code: 4 }, holographic: { label: 'holographic foil', code: 5 }
  };
  const lightMatrices = {
    ALS_BASE_D50: [1.04, 1.00, 0.90], ALS_BASE_D65: [0.97, 1.00, 1.08],
    ALS_BASE_A: [1.25, 0.93, 0.58], ALS_LED_P1: [0.96, 1.04, 1.06],
    ALS_LED_P2: [0.90, 1.04, 1.14], ALS_LED_P3: [1.08, 1.02, 0.93],
    ALS_STR_1: [1.15, 0.96, 0.82], ALS_STR_2: [0.88, 1.08, 1.04], ALS_STR_3: [1.03, 0.94, 1.13]
  };
  const mapLabels = {
    composite: 'Appearance composite', identity: 'Frozen identity', spectral: 'Master spectral reflectance',
    specular: 'Simulated specular intensity', height: 'Simulated surface height', mask: 'Embellishment mask'
  };

  function clamp(value, min, max) {
    return Math.max(min === undefined ? 0 : min, Math.min(max === undefined ? 255 : max, value));
  }

  function noise(x, y, seed) {
    const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return (value - Math.floor(value)) * 2 - 1;
  }

  function downloadBlob(filename, data, type) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function sha256(buffer) {
    if (!window.crypto || !window.crypto.subtle) throw new Error('Web Crypto SHA-256 unavailable; master verification cannot run.');
    const digest = await window.crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('');
  }

  async function fetchVerified(url, expectedHash) {
    const response = await fetch(url, { credentials: 'same-origin', cache: 'no-cache' });
    if (!response.ok) throw new Error('Master asset unavailable: ' + response.status + ' ' + url);
    const buffer = await response.arrayBuffer();
    const actual = await sha256(buffer);
    if (actual !== expectedHash) throw new Error('Master projection digest mismatch for ' + url.split('/').pop());
    return buffer;
  }

  function decodeJson(buffer) {
    return JSON.parse(new TextDecoder('utf-8').decode(buffer));
  }

  async function init(root) {
    if (root.dataset.initialized === 'true') return;
    root.dataset.initialized = 'true';
    const canvas = root.querySelector('canvas');
    const context = canvas.getContext('2d', { alpha: false });
    const controls = {};
    const outputs = {};
    root.querySelectorAll('[data-control]').forEach((node) => { controls[node.dataset.control] = node; });
    root.querySelectorAll('[data-output]').forEach((node) => { outputs[node.dataset.output] = node; });
    const buttons = Array.from(root.querySelectorAll('[data-export]'));
    buttons.forEach((button) => { button.disabled = true; });
    const state = {
      ready: false, selectedX: 20, selectedY: 12, cells: [], columns: 40, rows: 25,
      selectedRowId: Number(root.dataset.rowId), manifest: null, index: null,
      numeric: null, illuminant: null, spectral: null, numericFields: {}, illuminantFields: {}
    };

    function identity() { return state.index.rows[state.selectedRowId]; }
    function numericValue(field) {
      return state.numeric[state.selectedRowId * state.manifest.numeric.shape[1] + state.numericFields[field]];
    }
    function illuminantValue(field) {
      const position = state.illuminantFields[field];
      return position === undefined ? null : state.illuminant[state.selectedRowId * state.manifest.illuminant.shape[1] + position];
    }
    function spectrumValue(wavelength) {
      const position = Math.round((wavelength - 380) / 10);
      return state.spectral[state.selectedRowId * state.manifest.spectral.shape[1] + position];
    }
    function baseRgb() {
      const row = identity();
      return [row[3], row[4], row[5]];
    }
    function heightAt(x, y, nx, ny) {
      const type = controls.texture.value;
      const baseNoise = noise(x, y, 1);
      if (type === 'grain') return baseNoise * 0.45 + Math.sin(nx * 38) * 0.18;
      if (type === 'fibres') return baseNoise * 0.25 + Math.sin(ny * 58 + nx * 5) * 0.48;
      if (type === 'woven') return (Math.sin(nx * 42) + Math.sin(ny * 42)) * 0.32;
      return baseNoise * 0.08;
    }
    function effectMask(nx, ny) {
      const effect = controls.effect.value;
      if (effect === 'none') return 0;
      const circle = Math.hypot(nx - 0.5, ny - 0.5) < 0.27 ? 1 : 0;
      const diagonal = Math.abs(nx + ny - 1) < 0.08 ? 1 : 0;
      const stripes = Math.sin((nx - ny) * 42) > 0.45 ? 1 : 0;
      if (effect === 'spot') return circle;
      if (effect === 'foil') return diagonal;
      if (effect === 'emboss') return Math.max(circle, diagonal);
      if (effect === 'raised') return circle * (0.5 + 0.5 * stripes);
      if (effect === 'holographic') return Math.max(circle, stripes * 0.6);
      return 0;
    }

    function simulateCell(x, y, columns, rows) {
      const base = baseRgb();
      const nx = (x + 0.5) / columns;
      const ny = (y + 0.5) / rows;
      const material = materials[controls.material.value];
      const finish = finishes[controls.finish.value];
      const light = lightMatrices[controls.light.value];
      const angle = Number(controls.angle.value) / 80;
      const gloss = Number(controls.gloss.value) / 100;
      const depth = Number(controls.depth.value) / 100;
      const surface = heightAt(x, y, nx, ny) * material.grain;
      const mask = effectMask(nx, ny);
      const lightX = 0.18 + angle * 0.64;
      const ridge = Math.exp(-Math.pow(nx + surface * depth - lightX, 2) / Math.max(0.003, finish.spread * finish.spread));
      const radial = Math.exp(-Math.pow(Math.hypot(nx - lightX, ny - 0.35), 2) / Math.max(0.008, finish.spread));
      let specular = clamp((ridge * 0.72 + radial * 0.55) * finish.specular * material.specular * gloss + mask * gloss * 0.36, 0, 1.6);
      if (controls.material.value === 'metal') specular *= 0.75 + 0.25 * Math.sin(ny * 95);
      if (controls.finish.value === 'pearlescent') specular *= 0.8 + 0.3 * Math.sin((nx + angle) * 12);
      if (controls.effect.value === 'holographic' && mask > 0) specular *= 0.7 + 0.35 * Math.sin((nx + ny + angle) * 35);
      const random = noise(x, y, 4) * material.grain;
      const shade = material.diffuse * (1 - 0.20 * angle) * (1 + random + surface * depth);
      const mean = (base[0] + base[1] + base[2]) / 3;
      const saturated = base.map((channel) => mean + (channel - mean) * finish.saturation);
      let rgb = saturated.map((channel, index) => channel * shade * light[index]);
      rgb[0] += 48 * material.warm;
      rgb[1] -= 14 * material.warm;
      if (controls.material.value === 'glass') rgb = rgb.map((channel) => channel * 0.78 + 36);
      if (controls.finish.value === 'metallic') rgb = rgb.map((channel) => channel * 0.72 + 45);
      if (controls.effect.value === 'holographic' && mask > 0) {
        rgb[0] += 55 * Math.max(0, Math.sin((nx + angle) * 18));
        rgb[1] += 55 * Math.max(0, Math.sin((nx + angle) * 18 + 2.1));
        rgb[2] += 55 * Math.max(0, Math.sin((nx + angle) * 18 + 4.2));
      }
      rgb = rgb.map((channel) => clamp(Math.round(channel + specular * 145)));
      const normalizedHeight = clamp(surface * depth + 0.5, 0, 1);
      const dx = 0.03 * Math.cos(nx * 18) * depth;
      const dy = 0.03 * Math.sin(ny * 18) * depth;
      const normalLength = Math.hypot(dx, dy, 1);
      return {
        identityIndex: state.selectedRowId, materialIndex: material.code,
        spectralReferenceIndex: state.selectedRowId, specular: specular, height: normalizedHeight,
        normal: [-dx / normalLength, -dy / normalLength, 1 / normalLength],
        embellishmentClass: mask > 0 ? effects[controls.effect.value].code : 0,
        coverage: mask, rgb: rgb, referenceReflectance: spectrumValue(Number(controls.wavelength.value)),
        uncertainty: clamp(0.28 + mask * 0.24 + specular * 0.12, 0, 1), qcStatus: 0
      };
    }

    function displayRgb(cell) {
      const map = controls.map.value;
      if (map === 'identity') return baseRgb();
      if (map === 'spectral') {
        const value = clamp(Math.round(cell.referenceReflectance * 255));
        return [value, value, value];
      }
      if (map === 'specular') {
        const value = clamp(Math.round(cell.specular / 1.6 * 255));
        return [value, value, value];
      }
      if (map === 'height') {
        const value = clamp(Math.round(cell.height * 255));
        return [value, clamp(255 - value), clamp(80 + value * 0.55)];
      }
      if (map === 'mask') {
        const value = Math.round(cell.coverage * 255);
        return [value, value, value];
      }
      return cell.rgb;
    }

    function masterDiagnostics() {
      const scenario = controls.light.value;
      return {
        scenario: scenario,
        lambdaV2Nm: illuminantValue('illumext_lambda_v2_nm__' + scenario),
        shiftFromCoreNm: illuminantValue('illumext_shift_from_core_nm__' + scenario),
        de00FromD50: scenario === 'ALS_BASE_D50' ? 0 : illuminantValue('de00_from_d50__' + scenario)
      };
    }

    function draw() {
      if (!state.ready) return;
      state.columns = Number(controls.grid.value);
      state.rows = Math.round(state.columns * 10 / 16);
      state.selectedX = Math.min(state.selectedX, state.columns - 1);
      state.selectedY = Math.min(state.selectedY, state.rows - 1);
      state.cells = Array.from({ length: state.rows }, () => Array(state.columns));
      const cellWidth = canvas.width / state.columns;
      const cellHeight = canvas.height / state.rows;
      for (let y = 0; y < state.rows; y += 1) {
        for (let x = 0; x < state.columns; x += 1) {
          const cell = simulateCell(x, y, state.columns, state.rows);
          state.cells[y][x] = cell;
          const rgb = displayRgb(cell);
          context.fillStyle = 'rgb(' + rgb.join(',') + ')';
          context.fillRect(Math.floor(x * cellWidth), Math.floor(y * cellHeight), Math.ceil(cellWidth), Math.ceil(cellHeight));
        }
      }
      if (controls.gridlines.checked) {
        context.strokeStyle = 'rgba(0,0,0,.26)';
        context.lineWidth = 1;
        for (let x = 1; x < state.columns; x += 1) {
          context.beginPath(); context.moveTo(Math.round(x * cellWidth) + 0.5, 0); context.lineTo(Math.round(x * cellWidth) + 0.5, canvas.height); context.stroke();
        }
        for (let y = 1; y < state.rows; y += 1) {
          context.beginPath(); context.moveTo(0, Math.round(y * cellHeight) + 0.5); context.lineTo(canvas.width, Math.round(y * cellHeight) + 0.5); context.stroke();
        }
      }
      context.strokeStyle = '#000';
      context.lineWidth = 2;
      context.strokeRect(state.selectedX * cellWidth + 1, state.selectedY * cellHeight + 1, Math.max(2, cellWidth - 2), Math.max(2, cellHeight - 2));
      updateOutputs();
    }

    function formatNumber(value, digits) {
      return value === null || !Number.isFinite(value) ? 'n/a' : value.toFixed(digits);
    }

    function updateOutputs() {
      const row = identity();
      const base = baseRgb();
      const cell = state.cells[state.selectedY] && state.cells[state.selectedY][state.selectedX];
      const diagnostics = masterDiagnostics();
      outputs.pkl.textContent = row[1];
      outputs.identity.textContent = row[2] + ' · RGB ' + base.join(' / ') + ' · source_atlas_row_id ' + row[0] + ' · Lab ' + [numericValue('lab_L'), numericValue('lab_a'), numericValue('lab_b')].map((value) => formatNumber(value, 2)).join(' / ');
      root.querySelector('.atlas-clarus-aps__swatch').style.setProperty('--atlas-clarus-reference', row[2]);
      outputs.angle.textContent = controls.angle.value + '°';
      outputs.gloss.textContent = controls.gloss.value + ' GU';
      outputs.depth.textContent = controls.depth.value + '%';
      outputs.wavelength.textContent = controls.wavelength.value + ' nm';
      outputs.combination.textContent = materials[controls.material.value].label + ' · ' + finishes[controls.finish.value].label + ' · ' + diagnostics.scenario + ' · ' + effects[controls.effect.value].label;
      outputs['map-label'].textContent = mapLabels[controls.map.value];
      if (!cell) return;
      outputs.pixel.textContent = 'x ' + state.selectedX + ' · y ' + state.selectedY + ' · ID ' + cell.identityIndex + ' · ' + state.columns + ' × ' + state.rows;
      outputs['pixel-rgb'].textContent = cell.rgb.join(' / ') + ' · simulated appearance';
      outputs.channels.textContent = 'R' + controls.wavelength.value + ' ' + formatNumber(cell.referenceReflectance, 4) + ' · λv2 ' + formatNumber(diagnostics.lambdaV2Nm, 3) + ' nm · shift ' + formatNumber(diagnostics.shiftFromCoreNm, 3) + ' nm · ΔE00 ' + formatNumber(diagnostics.de00FromD50, 3) + ' · QC NOT_MEASURED';
    }

    function populateResults(query) {
      const normalized = String(query || '').trim().toUpperCase();
      const matches = [];
      if (/^[0-9]+$/.test(normalized)) {
        const rowId = Number(normalized);
        if (rowId >= 0 && rowId < state.index.rows.length) matches.push(state.index.rows[rowId]);
      }
      for (let rowId = 0; rowId < state.index.rows.length && matches.length < 30; rowId += 1) {
        const row = state.index.rows[rowId];
        if (!normalized || row[1].includes(normalized) || row[2].includes(normalized)) {
          if (!matches.some((candidate) => candidate[0] === row[0])) matches.push(row);
        }
      }
      if (!matches.length) matches.push(identity());
      controls['master-row'].replaceChildren(...matches.map((row) => {
        const option = document.createElement('option');
        option.value = String(row[0]);
        option.textContent = row[0] + ' · ' + row[1] + ' · ' + row[2];
        option.selected = row[0] === state.selectedRowId;
        return option;
      }));
    }

    function selectedMasterRecord() {
      const row = identity();
      const numeric = {};
      state.manifest.numeric.fields.forEach((field) => { numeric[field] = numericValue(field); });
      const illuminant = {};
      state.manifest.illuminant.fields.forEach((field) => { illuminant[field] = illuminantValue(field); });
      const spectrum = {};
      state.manifest.spectral.fields.forEach((field, index) => {
        spectrum[field] = state.spectral[state.selectedRowId * state.manifest.spectral.shape[1] + index];
      });
      return {
        source_atlas_row_id: row[0], reference: row[1], hex: row[2], rgb: baseRgb(),
        atlas_identity_valid: row[6], cxf_present: row[7], cxf_object_index: row[8],
        cxf_measure_date: row[9], cxf_spectrum_exact_match_bin: row[10],
        srgb_out_of_gamut_before_clip: row[11], hex_provenance: row[12], rgb_provenance: row[13],
        id_components_match: row[14] && row[15] && row[16], reference_pattern_valid: row[17],
        numeric: numeric, illuminant_extension: illuminant, spectral_reflectance: spectrum
      };
    }

    function configuration() {
      return {
        material: controls.material.value, finish: controls.finish.value,
        illuminant_scenario: controls.light.value, embellishment: controls.effect.value,
        texture: controls.texture.value, view_angle_degrees: Number(controls.angle.value),
        gloss_proxy_GU: Number(controls.gloss.value), relief_depth_percent: Number(controls.depth.value),
        inspected_wavelength_nm: Number(controls.wavelength.value), grid: [state.rows, state.columns]
      };
    }

    function pixelExport() {
      const layers = {
        identity_index: [], material_index: [], spectral_reference_index: [], specular_proxy: [],
        height: [], normal_xyz: [], embellishment_class: [], embellishment_coverage: [],
        appearance_rgb_u8: [], uncertainty: [], qc_status: []
      };
      state.cells.forEach((row) => row.forEach((cell) => {
        layers.identity_index.push(cell.identityIndex); layers.material_index.push(cell.materialIndex);
        layers.spectral_reference_index.push(cell.spectralReferenceIndex);
        layers.specular_proxy.push(Number(cell.specular.toFixed(6))); layers.height.push(Number(cell.height.toFixed(6)));
        layers.normal_xyz.push(cell.normal.map((value) => Number(value.toFixed(6))));
        layers.embellishment_class.push(cell.embellishmentClass);
        layers.embellishment_coverage.push(Number(cell.coverage.toFixed(6)));
        layers.appearance_rgb_u8.push(cell.rgb); layers.uncertainty.push(Number(cell.uncertainty.toFixed(6)));
        layers.qc_status.push(0);
      }));
      return {
        format_name: 'ATLAS Clarus Appearance Pixel Data', format_version: '0.1.2',
        evidence_class: 'MASTER_REFERENCE_WITH_ENGINEERING_SIMULATION',
        identity: selectedMasterRecord(), configuration: configuration(),
        storage: 'row-major flattened arrays', shape: [state.rows, state.columns], layers: layers,
        layer_evidence: {
          identity_index: 'REFERENCE', spectral_reference_index: 'REFERENCE',
          material_index: 'CONTROL', specular_proxy: 'SIMULATED', height: 'SIMULATED',
          normal_xyz: 'CALCULATED', embellishment_class: 'CONTROL',
          embellishment_coverage: 'CONTROL', appearance_rgb_u8: 'SIMULATED',
          uncertainty: 'CALCULATED', qc_status: 'NOT_MEASURED'
        }
      };
    }

    function newEnvelopeId() {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
        const random = Math.floor(Math.random() * 16);
        return (character === 'x' ? random : (random & 3) | 8).toString(16);
      });
    }

    function canvasBlob() {
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG export failed.')), 'image/png');
      });
    }

    function apfEnvelope(pixelSha256, previewSha256) {
      const row = identity();
      const selectedPixel = state.cells[state.selectedY][state.selectedX];
      return {
        apf_version: '0.1', envelope_id: newEnvelopeId(), created_utc: new Date().toISOString(),
        conformance: 'APF-EVIDENCE',
        identity: {
          authority: 'ATLAS_CLARUS', source_atlas_row_id: row[0], reference: row[1],
          master_sha256: state.manifest.source_master_sha256, freeze_status: 'VERIFIED',
          rgb_u8: baseRgb(), hex: row[2]
        },
        assets: [
          { asset_id: 'master_projection_manifest', role: 'OTHER', uri: root.dataset.masterBase + 'master-manifest.json', media_type: 'application/json', sha256: root.dataset.projectionManifestSha256, format_profile: 'ATLAS Clarus Master Browser Projection v0.1.1' },
          { asset_id: 'appearance_pixels', role: 'PIXEL_CONTAINER', uri: 'atlas-clarus-apf-pixels.json', media_type: 'application/json', sha256: pixelSha256, format_profile: 'ATLAS Clarus row-major appearance layers v0.1.2' },
          { asset_id: 'appearance_preview', role: 'PREVIEW', uri: 'atlas-clarus-apf-preview.png', media_type: 'image/png', sha256: previewSha256 }
        ],
        bindings: [
          { binding_id: 'identity_pixel', asset_id: 'appearance_pixels', relationship: 'IDENTITY_REPRESENTATION', locator: { pixel_xy: [state.selectedX, state.selectedY], selector: 'layers.identity_index' }, status: 'REFERENCE_BOUND' },
          { binding_id: 'appearance_region', asset_id: 'appearance_pixels', relationship: 'APPEARANCE_OUTPUT', locator: { region_xywh: [0, 0, state.columns, state.rows], selector: 'layers.appearance_rgb_u8' }, status: 'SIMULATED' },
          { binding_id: 'preview_output', asset_id: 'appearance_preview', relationship: 'APPEARANCE_OUTPUT', status: 'SIMULATED' }
        ],
        conditions: [
          { condition_id: 'simulated_view', kind: 'VIEWING', parameters: { illuminant_scenario: controls.light.value, view_angle_degrees: Number(controls.angle.value), gloss_proxy_GU: Number(controls.gloss.value), relief_depth_percent: Number(controls.depth.value) } }
        ],
        claims: [
          { claim_id: 'identity_verified', subject: 'IDENTITY', status: 'VERIFIED', method: 'Runtime SHA-256 verification of the ATLAS master projection and selected row binding', evidence_asset_ids: ['master_projection_manifest'], responsible_system: 'ATLAS Clarus Appearance Pixel Simulator v' + root.dataset.version },
          { claim_id: 'spectral_reference', subject: 'SPECTRAL_REFERENCE', status: 'REFERENCE_BOUND', method: 'Selected master row spectral reflectance on the 380–730 nm grid', evidence_asset_ids: ['master_projection_manifest', 'appearance_pixels'], responsible_system: 'ATLAS Clarus active master projection' },
          { claim_id: 'appearance_simulation', subject: 'APPEARANCE', status: 'SIMULATED', method: 'Deterministic browser appearance simulation using declared controls', condition_id: 'simulated_view', evidence_asset_ids: ['appearance_pixels', 'appearance_preview'], result: { selected_pixel_rgb_u8: selectedPixel.rgb, physical_proof: false }, responsible_system: 'ATLAS Clarus Appearance Pixel Simulator v' + root.dataset.version },
          { claim_id: 'production_not_executed', subject: 'PRODUCTION_FEASIBILITY', status: 'NOT_EXECUTED', method: 'No production target evaluated', evidence_asset_ids: [] },
          { claim_id: 'device_values_not_executed', subject: 'DEVICE_VALUES', status: 'NOT_EXECUTED', method: 'No device separation generated', evidence_asset_ids: [] },
          { claim_id: 'qc_not_measured', subject: 'MEASURED_QC', status: 'NOT_MEASURED', method: 'No physical sample measured', evidence_asset_ids: [] }
        ],
        workflow: {
          reference_identity: { status: 'VERIFIED', claim_ids: ['identity_verified'] },
          appearance_evidence: { status: 'SIMULATED', claim_ids: ['spectral_reference', 'appearance_simulation'] },
          production_feasibility: { status: 'NOT_EXECUTED', claim_ids: ['production_not_executed'] },
          device_values: { status: 'NOT_EXECUTED', claim_ids: ['device_values_not_executed'] },
          measured_qc: { status: 'NOT_MEASURED', claim_ids: ['qc_not_measured'] }
        }
      };
    }

    async function exportApfBundle(button) {
      button.disabled = true;
      const originalText = button.textContent;
      button.textContent = 'Building APF…';
      try {
        const pixelText = JSON.stringify(pixelExport()) + '\n';
        const previewBlob = await canvasBlob();
        const pixelDigest = await sha256(new TextEncoder().encode(pixelText));
        const previewDigest = await sha256(await previewBlob.arrayBuffer());
        const envelopeText = JSON.stringify(apfEnvelope(pixelDigest, previewDigest), null, 2) + '\n';
        downloadBlob('atlas-clarus-apf-pixels.json', pixelText, 'application/json');
        downloadBlob('atlas-clarus-apf-preview.png', previewBlob, 'image/png');
        downloadBlob('atlas-clarus.apf.json', envelopeText, 'application/json');
      } finally {
        button.textContent = originalText;
        button.disabled = false;
      }
    }

    Object.keys(controls).forEach((name) => {
      if (name === 'master-search' || name === 'master-row') return;
      controls[name].addEventListener('input', draw);
      controls[name].addEventListener('change', draw);
    });
    controls['master-search'].addEventListener('input', () => populateResults(controls['master-search'].value));
    controls['master-row'].addEventListener('change', () => {
      state.selectedRowId = Number(controls['master-row'].value);
      controls['master-search'].value = identity()[1];
      populateResults(controls['master-search'].value);
      draw();
    });
    canvas.addEventListener('pointerdown', (event) => {
      if (!state.ready) return;
      const rect = canvas.getBoundingClientRect();
      state.selectedX = clamp(Math.floor((event.clientX - rect.left) / rect.width * state.columns), 0, state.columns - 1);
      state.selectedY = clamp(Math.floor((event.clientY - rect.top) / rect.height * state.rows), 0, state.rows - 1);
      draw();
    });
    root.querySelector('[data-export="apf"]').addEventListener('click', (event) => {
      exportApfBundle(event.currentTarget).catch((error) => {
        outputs['master-status'].textContent = 'APF EXPORT FAILED · ' + error.message;
      });
    });
    root.querySelector('[data-export="pixels"]').addEventListener('click', () => {
      downloadBlob('atlas-clarus-apf-pixels.json', JSON.stringify(pixelExport()) + '\n', 'application/json');
    });
    root.querySelector('[data-export="png"]').addEventListener('click', () => {
      canvas.toBlob((blob) => { if (blob) downloadBlob('atlas-clarus-apf-preview.png', blob, 'image/png'); }, 'image/png');
    });

    try {
      const baseUrl = root.dataset.masterBase;
      const manifestBuffer = await fetchVerified(baseUrl + 'master-manifest.json?ver=' + root.dataset.version, root.dataset.projectionManifestSha256);
      state.manifest = decodeJson(manifestBuffer);
      if (state.manifest.source_master_sha256 !== root.dataset.masterSha256) throw new Error('Source master SHA-256 does not match plugin authority.');
      const names = ['index', 'numeric', 'illuminant', 'spectral'];
      const buffers = await Promise.all(names.map((name) => {
        const record = state.manifest.files[name];
        return fetchVerified(baseUrl + record.path + '?ver=' + root.dataset.version, record.sha256);
      }));
      state.index = decodeJson(buffers[0]);
      state.numeric = new Float64Array(buffers[1]);
      state.illuminant = new Float64Array(buffers[2]);
      state.spectral = new Float32Array(buffers[3]);
      if (state.index.row_count !== 13283 || state.index.rows.length !== 13283) throw new Error('Master row-count gate failed.');
      if (state.numeric.length !== state.manifest.numeric.shape[0] * state.manifest.numeric.shape[1]) throw new Error('Numeric projection shape gate failed.');
      if (state.illuminant.length !== state.manifest.illuminant.shape[0] * state.manifest.illuminant.shape[1]) throw new Error('Illuminant projection shape gate failed.');
      if (state.spectral.length !== state.manifest.spectral.shape[0] * state.manifest.spectral.shape[1]) throw new Error('Spectral projection shape gate failed.');
      state.manifest.numeric.fields.forEach((field, index) => { state.numericFields[field] = index; });
      state.manifest.illuminant.fields.forEach((field, index) => { state.illuminantFields[field] = index; });
      state.selectedRowId = clamp(state.selectedRowId, 0, 13282);
      state.ready = true;
      controls['master-search'].value = identity()[1];
      populateResults(controls['master-search'].value);
      buttons.forEach((button) => { button.disabled = false; });
      outputs['master-status'].textContent = 'MASTER VERIFIED · REFERENCE + SIMULATION · NOT MEASURED';
      draw();
    } catch (error) {
      outputs['master-status'].textContent = 'MASTER VERIFICATION FAILED';
      outputs.pkl.textContent = 'Reference unavailable';
      outputs.identity.textContent = error.message;
      root.classList.add('atlas-clarus-aps--error');
    }
  }

  function boot() {
    document.querySelectorAll('.atlas-clarus-appearance-simulator').forEach((root) => { init(root); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}());
