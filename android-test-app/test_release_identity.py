#!/usr/bin/env python3
"""Guard the reviewed beta.5/RC28 tuple before CI or reserved-key signing."""
import ast
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
VERSION_CODE = 5
VERSION_NAME = '0.4.0-beta.5'
BUNDLE_VERSION = '0.2.0-rc28-source-provenance'
BUNDLE_SHA256 = '79a7b9a3df20d0ba6e2620b1d16d39316cce5d2c8534b622d7260fe896da12d8'
FILES = (
    'android-test-app/app/build.gradle',
    'android-test-app/prepare_bundle.py',
    'browser-bundle/build_bundle.py',
    '.github/workflows/android-test-app.yml',
    '.github/workflows/android-signed-beta.yml',
)


def literal(source, name):
    # Do not import either builder: both have build-time side effects.
    for statement in ast.parse(source).body:
        if isinstance(statement, ast.Assign):
            if any(isinstance(t, ast.Name) and t.id == name for t in statement.targets):
                return ast.literal_eval(statement.value)
    raise ValueError(f'Missing constant: {name}')


def check_identity(files):
    gradle, prepare, builder, debug, signed = (files[path] for path in FILES)
    checks = {
        'versionCode (4 is already used)': re.findall(r'^\s*versionCode\s+(\d+)\s*$', gradle, re.M) == [str(VERSION_CODE)],
        'versionName': re.findall(r"^\s*versionName\s+'([^']+)'\s*$", gradle, re.M) == [VERSION_NAME],
        'Android bundle version': literal(prepare, 'EXPECTED_BUNDLE_VERSION') == BUNDLE_VERSION,
        'Android ZIP pin': literal(prepare, 'EXPECTED_ZIP_SHA256') == BUNDLE_SHA256,
        'browser bundle version': literal(builder, 'VERSION') == BUNDLE_VERSION,
    }
    identity = f"package: name='com.atlasclarus.connect' versionCode='{VERSION_CODE}' versionName='{VERSION_NAME}'"
    for name, workflow in [('debug', debug), ('signed', signed)]:
        checks[f'{name} APK assertion'] = identity in workflow
        checks[f'{name} AAB build'] = ':app:bundleRelease' in workflow
        checks[f'{name} preflight'] = 'python3 android-test-app/test_release_identity.py' in workflow
        checks[f'{name} packaged assets'] = 'python3 android-test-app/test_packaged_bundle.py' in workflow
    checks['signed APK artifact'] = f'name: ATLAS-Clarus-Connect-Beta-{VERSION_NAME}\n' in signed
    checks['signed AAB artifact'] = f'name: ATLAS-Clarus-Connect-Play-{VERSION_NAME}-AAB\n' in signed
    failed = [name for name, ok in checks.items() if not ok]
    if failed:
        raise ValueError('Android release identity mismatch: ' + ', '.join(failed))


class ReleaseIdentityTests(unittest.TestCase):
    def setUp(self):
        self.files = {path: (ROOT / path).read_text(encoding='utf-8') for path in FILES}

    def test_reviewed_release_tuple(self):
        check_identity(self.files)

    def test_reject_version_code_4_with_rc28(self):
        self.files[FILES[0]] = self.files[FILES[0]].replace('versionCode 5', 'versionCode 4')
        with self.assertRaisesRegex(ValueError, 'versionCode'):
            check_identity(self.files)

    def test_reject_beta4_name_with_new_code(self):
        self.files[FILES[0]] = self.files[FILES[0]].replace(VERSION_NAME, '0.4.0-beta.4')
        with self.assertRaisesRegex(ValueError, 'versionName'):
            check_identity(self.files)

    def test_reject_rc27_pin(self):
        self.files[FILES[1]] = self.files[FILES[1]].replace(BUNDLE_SHA256, '3142adf2088734d34c98a3b0f337aab35a728d769e4b15bae420431178a140c7')
        with self.assertRaisesRegex(ValueError, 'ZIP pin'):
            check_identity(self.files)

    def test_reject_future_bundle_under_beta5(self):
        self.files[FILES[2]] = self.files[FILES[2]].replace(BUNDLE_VERSION, '0.2.0-rc29')
        with self.assertRaisesRegex(ValueError, 'browser bundle version'):
            check_identity(self.files)

    def test_reject_stale_workflow_identity_and_labels(self):
        for path in FILES[3:]:
            with self.subTest(path=path):
                changed = dict(self.files)
                changed[path] = changed[path].replace(VERSION_NAME, '0.4.0-beta.4')
                with self.assertRaisesRegex(ValueError, 'APK assertion'):
                    check_identity(changed)


if __name__ == '__main__':
    unittest.main(verbosity=2)
