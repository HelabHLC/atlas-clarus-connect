import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSourceReference } from './source-reference.mjs';

const sample = { hlcAddress: 'H050_L060_C075', sourceRgb: [40, 80, 120] };
const iccProfile = { space: 'display_p3', sha256: 'a'.repeat(64) };
const cases = [
  ['assumed sRGB', {}, 'srgb', 'sRGB'],
  ['confirmed sRGB', { space: 'srgb', confirmed: true }, 'srgb', 'sRGB'],
  ['confirmed P3 with profile', { space: 'display_p3', confirmed: true, iccProfile }, 'display_p3', 'Display-P3'],
  ['confirmed ProPhoto', { space: 'prophoto_rgb', confirmed: true }, 'prophoto_rgb', 'ProPhoto RGB'],
  ['confirmed profile conflict', { space: 'srgb', confirmed: true, iccProfile }, 'srgb', 'sRGB']
];

for (const [name, options, key, label] of cases) {
  test(name + ' survives saving and reopening', async t => {
    const dir = await mkdtemp(join(tmpdir(), 'atlas-source-'));
    t.after(() => rm(dir, { recursive: true, force: true }));
    const path = join(dir, 'reference.json');
    const original = createSourceReference({ ...sample, ...options });
    await writeFile(path, JSON.stringify(original));
    const restored = JSON.parse(await readFile(path, 'utf8'));
    assert.deepEqual(restored, original);
    const { record, sourceDecision } = restored;
    assert.equal(record.reference.hlcAddress, sample.hlcAddress);
    assert.deepEqual(record.source.rgb8, sample.sourceRgb);
    assert.equal(record.source.space, label);
    assert.equal(sourceDecision.source_space, key);
    assert.equal(sourceDecision.user_confirmed, Boolean(options.confirmed));
    assert.equal(sourceDecision.source_space_status, options.confirmed ? 'USER_CONFIRMED' : 'ASSUMED_SRGB_UNVERIFIED');
    assert.equal(sourceDecision.source_icc_sha256, options.iccProfile?.sha256 ?? null);
    assert.equal(sourceDecision.icc_space_conflict, Boolean(options.iccProfile && options.iccProfile.space !== key));
    assert.equal(sourceDecision.conversion_status, 'NOT_PERFORMED');
    assert.equal(record.output.iccProfile, null);
    assert.equal(record.output.deltaE00, null);
    assert.deepEqual(record.evidence, { iccCalculated: false, physicalProofMeasured: false });
  });
}

test('rejects unsupported Rec. 2020 and unconfirmed P3', () => {
  assert.throws(() => createSourceReference({ ...sample, space: 'rec2020', confirmed: true }), /cannot represent/);
  assert.throws(() => createSourceReference({ ...sample, space: 'display_p3' }), /confirmed/);
});
