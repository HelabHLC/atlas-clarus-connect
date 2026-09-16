(function (root) {
  'use strict';
  const FORMAT = 'ATLAS_CLARUS_PROFILED_REFERENCE_CARD';
  const VERSION = '0.1.0';
  const stable = value => JSON.stringify(value);
  const clone = value => JSON.parse(stable(value));
  const requireThat = (ok, message) => { if (!ok) throw Error(message); };
  const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); Object.values(value).forEach(freeze); } return value; };

  function create({ entry, colors, master, profile, settings, separation, createdAt = new Date().toISOString() }) {
    const reference = root.ATLAS_CLARUS_REFERENCE_CARD.canonicalReference(entry, colors, master);
    requireThat(profile && /^[a-f0-9]{64}$/.test(profile.sha256) && profile.file_name && profile.device_space,
      'A verified ICC output profile is required.');
    requireThat(settings && settings.rendering_intent === separation.intent &&
      settings.black_point_compensation === separation.bpc, 'ICC settings and separation result differ.');
    requireThat(separation && separation.method === 'SRGB_TO_DEVICE16' && separation.path === settings.path_id &&
      separation.channels === separation.channel_order.length && separation.channels === separation.device_values_16bit.length,
      'Invalid LittleCMS separation result.');
    requireThat(separation.device_values_16bit.every(v => Number.isInteger(v) && v >= 0 && v <= 65535),
      'Invalid 16-bit device values.');
    requireThat(typeof createdAt === 'string' && new Date(createdAt).toISOString() === createdAt, 'Invalid creation timestamp.');
    return freeze({
      format: FORMAT, version: VERSION, created_at: createdAt, master_sha256: master, row_id_base: 0,
      freeze_status: 'FROZEN', reference,
      production: {
        output_status: 'PROFILE_BOUND_NOT_MEASURED', source_representation: 'MASTER_SRGB_8BIT',
        path_id: settings.path_id, printing_condition: settings.printing_condition, substrate: settings.substrate,
        rendering_intent: settings.rendering_intent, black_point_compensation: settings.black_point_compensation,
        profile: { file_name: profile.file_name, sha256: profile.sha256, byte_length: profile.byte_length,
          version: profile.version, device_space: profile.device_space, pcs: profile.pcs },
        transform: { engine: separation.engine, method: separation.method, channel_order: clone(separation.channel_order),
          device_values_16bit: clone(separation.device_values_16bit), device_values_normalized: clone(separation.device_values_normalized) },
        measured_qc_status: 'NOT_MEASURED', production_approval: 'NOT_PROVIDED', printable_device_file: 'NOT_GENERATED'
      },
      identity_change: 'NONE'
    });
  }

  function validate(data, colors, master) {
    requireThat(data && data.format === FORMAT && data.version === VERSION && data.master_sha256 === master,
      'Not a compatible profiled ATLAS reference card.');
    const entry = { id: data.reference?.atlas_row_id, ref: data.reference?.atlas_address,
      rgb: data.reference?.master_rgb, hex: data.reference?.master_hex, lab: data.reference?.master_lab };
    const p = data.production;
    const rebuilt = create({ entry, colors, master, profile: p.profile,
      settings: { path_id: p.path_id, printing_condition: p.printing_condition, substrate: p.substrate,
        rendering_intent: p.rendering_intent, black_point_compensation: p.black_point_compensation },
      separation: { ...p.transform, path: p.path_id, channels: p.transform.channel_order.length,
        intent: p.rendering_intent, bpc: p.black_point_compensation }, createdAt: data.created_at });
    requireThat(stable(rebuilt) === stable(data), 'Profile-bound card rejected: identity or evidence fields have changed.');
    return rebuilt;
  }

  root.ATLAS_CLARUS_PROFILED_REFERENCE_CARD = { FORMAT, VERSION, create, validate, clone };
})(typeof window !== 'undefined' ? window : globalThis);
