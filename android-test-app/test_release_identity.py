#!/usr/bin/env python3
"""Guard beta.14, RC34.4 and the reviewed Android camera boundary before CI or reserved-key signing."""
import ast
import hashlib
from pathlib import Path
import re
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
VERSION_CODE = 14
VERSION_NAME = '0.4.0-beta.14'
BUNDLE_VERSION = '0.2.0-rc34.4-reference-libraries'
BUNDLE_SHA256 = '0163cfd86adf51219bdc1eaf051ba0f656fca03a1fb8ae5ae8478ebcefbe976e'
DEFAULT_BUNDLE_VERSION = '0.2.0-rc28-source-provenance'
SOURCE_BINDING_SHA256 = {
    'image-projects.js': '3b5b6e90abd28f52b5236ea0793ff6b9394cb0754f504951df2f0da6117e2c45',
    'image-projects-ui.js': '2995ae7b5e520de513d97a929346225d50c6ec476bdb3c07e6649c0a348396c8',
}
REFERENCE_CARD_SHA256 = {
    'colour-reference-card.js': '32dff3a94ed98099aaae8b93365e94b66ba4262112564b91757304afe687e2e2',
}
BUILD_SOURCE_BINDING_SHA256 = {'image-projects.js': '3b5b6e90abd28f52b5236ea0793ff6b9394cb0754f504951df2f0da6117e2c45',
    'image-projects-ui.js': '648bb3f2486a8cb6cd1a054a6c512fc241bcbe2ffe0c4551fdf9b117b21c6082'}
# Reviewed beta.14 native camera boundary; app origin, storage and export adapter retained.
NATIVE_SHA256 = {
    'app/src/main/java/com/atlasclarus/browseredition/test/MainActivity.java': 'fcaa95f535b616dc34883bc662213c76d2e3b8147c9a67034e4f077566634e5c',
    'app/src/main/AndroidManifest.xml': 'b350bc7280a81776cd4a7fa0a5f9b494f4c0cf4c1574d7959cc9ecdccd4d9d96',
    'android-export.js': '1fdecb97a14561df0bd7fc440b654d68727ecca018da187501716a4db5cfb4b3',
}
FILES = (
    'android-test-app/app/build.gradle',
    'android-test-app/prepare_bundle.py',
    'browser-bundle/build_bundle.py',
    '.github/workflows/android-test-app.yml',
    '.github/workflows/android-signed-beta.yml',
)


def literal(source, name):
    # Builders have side effects; only inspect literal assignments.
    for statement in ast.parse(source).body:
        if isinstance(statement, ast.Assign):
            if any(isinstance(t, ast.Name) and t.id == name for t in statement.targets):
                return ast.literal_eval(statement.value)
    raise ValueError(f'Missing constant: {name}')


def check_identity(files):
    gradle, prepare, builder, debug, signed = (files[path] for path in FILES)
    checks = {
        'applicationId': re.findall(r"^\s*applicationId\s+'([^']+)'\s*$", gradle, re.M) == ['com.atlasclarus.connect'],
        'versionCode': re.findall(r'^\s*versionCode\s+(\d+)\s*$', gradle, re.M) == [str(VERSION_CODE)],
        'versionName': re.findall(r"^\s*versionName\s+'([^']+)'\s*$", gradle, re.M) == [VERSION_NAME],
        'Android bundle version': literal(prepare, 'EXPECTED_BUNDLE_VERSION') == BUNDLE_VERSION,
        'Android ZIP pin': literal(prepare, 'EXPECTED_ZIP_SHA256') == BUNDLE_SHA256,
        'RC34.4 builder': literal(prepare, 'BUNDLE_BUILDER') == 'build_reference_libraries_release.py',
        'reviewed builder used': "ROOT / 'browser-bundle' / BUNDLE_BUILDER" in prepare,
        'reference-card pin': literal(prepare, 'REFERENCE_CARD_SHA256') == REFERENCE_CARD_SHA256,
        'built read-only bridge pin': literal(prepare, 'BUILD_SOURCE_BINDING_SHA256') == BUILD_SOURCE_BINDING_SHA256,
        'source-binding pins': literal(prepare, 'SOURCE_BINDING_SHA256') == SOURCE_BINDING_SHA256,
        'default browser version preserved': literal(builder, 'VERSION') == DEFAULT_BUNDLE_VERSION,
        'pilot version available': literal((ROOT / 'browser-bundle/build_reference_libraries_release.py').read_text(), 'VERSION') == BUNDLE_VERSION,
    }
    identity = f"package: name='com.atlasclarus.connect' versionCode='{VERSION_CODE}' versionName='{VERSION_NAME}'"
    for name, workflow in [('debug', debug), ('signed', signed)]:
        checks[f'{name} APK assertion'] = identity in workflow
        checks[f'{name} AAB build'] = ':app:bundleRelease' in workflow
        checks[f'{name} preflight'] = 'python3 android-test-app/test_release_identity.py' in workflow
        checks[f'{name} packaged assets'] = 'python3 android-test-app/test_packaged_bundle.py' in workflow
    checks['signed APK artifact'] = f'name: ATLAS-Clarus-Connect-Beta-{VERSION_NAME}\n' in signed
    checks['signed AAB artifact'] = f'name: ATLAS-Clarus-Connect-Play-{VERSION_NAME}-AAB\n' in signed
    checks['manual signing only'] = 'workflow_dispatch:' in signed and not re.search(r'^  (push|pull_request|pull_request_target|workflow_run):', signed, re.M)
    failed = [name for name, ok in checks.items() if not ok]
    if failed:
        raise ValueError('Android release identity mismatch: ' + ', '.join(failed))


class ReleaseIdentityTests(unittest.TestCase):
    def setUp(self):
        self.files = {path: (ROOT / path).read_text(encoding='utf-8') for path in FILES}

    def test_reviewed_release_tuple(self):
        check_identity(self.files)

    def test_reject_prior_version_codes(self):
        for code in (4, 5, 6, 7, 8, 9, 10, 11, 12, 13):
            with self.subTest(code=code):
                changed = dict(self.files)
                changed[FILES[0]] = changed[FILES[0]].replace('versionCode 14', f'versionCode {code}')
                with self.assertRaisesRegex(ValueError, 'versionCode'):
                    check_identity(changed)

    def test_reject_old_name(self):
        self.files[FILES[0]] = self.files[FILES[0]].replace(VERSION_NAME, '0.4.0-beta.5')
        with self.assertRaisesRegex(ValueError, 'versionName'):
            check_identity(self.files)

    def test_reject_old_bundle_pin(self):
        self.files[FILES[1]] = self.files[FILES[1]].replace(BUNDLE_SHA256, '79a7b9a3df20d0ba6e2620b1d16d39316cce5d2c8534b622d7260fe896da12d8')
        with self.assertRaisesRegex(ValueError, 'ZIP pin'):
            check_identity(self.files)

    def test_reject_older_builder(self):
        self.files[FILES[1]] = self.files[FILES[1]].replace('build_reference_libraries_release.py', 'build_colour_reference_card_pilot.py')
        with self.assertRaisesRegex(ValueError, 'RC34.4 builder'):
            check_identity(self.files)

    def test_reviewed_native_camera_boundary(self):
        for name, expected in NATIVE_SHA256.items():
            self.assertEqual(hashlib.sha256((ROOT / 'android-test-app' / name).read_bytes()).hexdigest(), expected, name)

    def test_camera_provider_is_private_and_narrow(self):
        ns = '{http://schemas.android.com/apk/res/android}'
        root = ET.parse(ROOT / 'android-test-app/app/src/main/AndroidManifest.xml').getroot()
        permissions = {entry.get(ns + 'name') for entry in root.findall('uses-permission')}
        self.assertFalse(permissions & {'android.permission.INTERNET', 'android.permission.RECORD_AUDIO',
                                       'android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE'})
        self.assertEqual(permissions, {'android.permission.CAMERA'})
        provider = root.find('application/provider')
        self.assertEqual(provider.get(ns + 'exported'), 'false')
        self.assertEqual(provider.get(ns + 'grantUriPermissions'), 'true')
        self.assertEqual(provider.get(ns + 'authorities'), '${applicationId}.camera')
        paths = ET.parse(ROOT / 'android-test-app/app/src/main/res/xml/camera_paths.xml').getroot()
        self.assertEqual([(p.tag, p.get('path')) for p in paths], [('cache-path', 'camera/')])

    def test_reject_changed_default_browser_version(self):
        self.files[FILES[2]] = self.files[FILES[2]].replace(DEFAULT_BUNDLE_VERSION, '0.2.0-rc99')
        with self.assertRaisesRegex(ValueError, 'default browser version'):
            check_identity(self.files)

    def test_source_binding_implementation_is_exact(self):
        for name, expected in {**SOURCE_BINDING_SHA256, **REFERENCE_CARD_SHA256}.items():
            self.assertEqual(hashlib.sha256((ROOT / 'browser-bundle/src' / name).read_bytes()).hexdigest(), expected, name)

    def test_reject_stale_workflow_identity_and_labels(self):
        for path in FILES[3:]:
            changed = dict(self.files)
            changed[path] = changed[path].replace(VERSION_NAME, '0.4.0-beta.5')
            with self.assertRaisesRegex(ValueError, 'APK assertion'):
                check_identity(changed)

    def test_reject_automatic_signing(self):
        self.files[FILES[4]] = self.files[FILES[4]].replace('  workflow_dispatch:', '  push:\n  workflow_dispatch:')
        with self.assertRaisesRegex(ValueError, 'manual signing'):
            check_identity(self.files)


if __name__ == '__main__':
    unittest.main(verbosity=2)
