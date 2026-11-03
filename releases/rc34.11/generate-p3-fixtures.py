"""Deterministic PNG fixtures + independent LittleCMS oracle. No ATLAS code used.

Requires system liblcms2; stdlib only. Profiles are synthetic matrix/TRC test
profiles, not Apple-distributed files. Display P3 parameters: ICC RGB registry.
"""
import ctypes as C
import ctypes.util
import hashlib
import json
import math
import platform
import struct
import sys
import zlib
from pathlib import Path

lib = C.CDLL(ctypes.util.find_library('lcms2') or 'liblcms2.so.2')
P, U, D = C.c_void_p, C.c_uint32, C.c_double


class xyY(C.Structure):
    _fields_ = [('x', D), ('y', D), ('Y', D)]


class Primaries(C.Structure):
    _fields_ = [('r', xyY), ('g', xyY), ('b', xyY)]


def bind(name, result, *args):
    fn = getattr(lib, name)
    fn.restype, fn.argtypes = result, args
    return fn


version = bind('cmsGetEncodedCMMversion', C.c_int)
curve = bind('cmsBuildParametricToneCurve', P, P, C.c_int, C.POINTER(D))
free_curve = bind('cmsFreeToneCurve', None, P)
rgb_profile = bind('cmsCreateRGBProfile', P, C.POINTER(xyY), C.POINTER(Primaries), C.POINTER(P))
srgb_profile = bind('cmsCreate_sRGBProfile', P)
lab_profile = bind('cmsCreateLab4Profile', P, P)
save = bind('cmsSaveProfileToMem', C.c_int, P, P, C.POINTER(U))
open_profile = bind('cmsOpenProfileFromMem', P, P, U)
close = bind('cmsCloseProfile', C.c_int, P)
mlu_alloc = bind('cmsMLUalloc', P, P, U)
mlu_set = bind('cmsMLUsetASCII', C.c_int, P, C.c_char_p, C.c_char_p, C.c_char_p)
mlu_free = bind('cmsMLUfree', None, P)
write_tag = bind('cmsWriteTag', C.c_int, P, U, P)
create_transform = bind('cmsCreateTransform', P, P, U, P, U, U, U)
transform = bind('cmsDoTransform', None, P, P, P, U)
delete_transform = bind('cmsDeleteTransform', None, P)
RGB_DBL = (1 << 22) | (4 << 16) | (3 << 3)
LAB_DBL = (1 << 22) | (10 << 16) | (3 << 3)
RGB_8 = (4 << 16) | (3 << 3) | 1
RELATIVE_COLORIMETRIC, NOOPTIMIZE = 1, 0x100  # no BPC flag


def conversion(src, dst, values, lab=False, byte=False):
    kind = LAB_DBL if lab else (RGB_8 if byte else RGB_DBL)
    t = create_transform(src, RGB_DBL, dst, kind, RELATIVE_COLORIMETRIC, NOOPTIMIZE)
    if not t:
        raise RuntimeError('LittleCMS transform creation failed')
    result = (C.c_ubyte * 3)() if byte else (D * 3)()
    try:
        transform(t, (D * 3)(*values), result, 1)
        return list(result)
    finally:
        delete_transform(t)


def profile_bytes(handle, name):
    m = mlu_alloc(None, 1)
    assert m and mlu_set(m, b'en', b'US', name.encode('ascii'))
    assert write_tag(handle, int.from_bytes(b'desc', 'big'), m)
    mlu_free(m)
    size = U()
    assert save(handle, None, C.byref(size))
    buf = C.create_string_buffer(size.value)
    assert save(handle, buf, C.byref(size))
    data = bytearray(buf.raw)
    data[24:36] = struct.pack('>6H', 2026, 11, 3, 0, 0, 0)
    data[84:100] = bytes(16)  # optional ICC v4 ID omitted, SHA-256 below is authoritative
    return bytes(data)


def chunk(name, data):
    return struct.pack('>I', len(data)) + name + data + struct.pack('>I', zlib.crc32(name + data))


def png(pixel, bits, icc):
    # Opaque uniform 32x32; no resampling, alpha or JPEG quantization ambiguity.
    px = struct.pack('>3H', *pixel) if bits == 16 else bytes(pixel)
    raw = (b'\0' + px * 32) * 32
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 32, 32, bits, 2, 0, 0, 0))
            + (chunk(b'iCCP', b'Test ICC\0\0' + zlib.compress(icc, 9)) if icc else b'')
            + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))


def read_png(data):
    pos, payload, icc, bits = 8, b'', None, None
    while pos < len(data):
        n = int.from_bytes(data[pos:pos+4], 'big')
        name, block = data[pos+4:pos+8], data[pos+8:pos+8+n]
        assert zlib.crc32(name + block) == int.from_bytes(data[pos+8+n:pos+12+n], 'big')
        if name == b'iCCP':
            after_name = block.split(b'\0', 1)[1]
            assert after_name[0] == 0
            icc = zlib.decompress(after_name[1:])
        if name == b'IHDR':
            bits = block[8]
        if name == b'IDAT':
            payload += block
        pos += 12 + n
    raw = zlib.decompress(payload)
    assert raw[0] == 0
    pixel = list(struct.unpack('>3H', raw[1:7])) if bits == 16 else list(raw[1:4])
    return bits, pixel, icc


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main(out):
    out.mkdir(parents=True, exist_ok=True)
    white = xyY(.3127, .3290, 1)
    primaries = Primaries(xyY(.68, .32, 1), xyY(.265, .69, 1), xyY(.15, .06, 1))
    trc = curve(None, 4, (D * 5)(2.4, 1/1.055, .055/1.055, 1/12.92, .04045))
    assert trc
    p3 = rgb_profile(C.byref(white), C.byref(primaries), (P * 3)(trc, trc, trc))
    free_curve(trc)
    s = srgb_profile()
    profiles = {'srgb': profile_bytes(s, 'ATLAS test sRGB'),
                'display-p3': profile_bytes(p3, 'ATLAS test Display P3')}
    close(s); close(p3)
    handles = {}
    buffers = {}  # keep cmsOpenProfileFromMem inputs alive
    for name, data in profiles.items():
        (out / (name + '.icc')).write_bytes(data)
        buffers[name] = C.create_string_buffer(data)
        handles[name] = open_profile(buffers[name], len(data))
        assert handles[name]
    s, p3 = handles['srgb'], handles['display-p3']
    lab = lab_profile(None)
    target = [61/255, 123/255, 25/255]
    target_p3 = conversion(s, p3, target)
    outside = [1, .5, 0]
    clipped = [max(0, min(1, v)) for v in conversion(p3, s, outside)]
    specifications = [
        ('in-srgb16.png', target, 16, 'srgb', 'same-target'),
        ('in-p3-16.png', target_p3, 16, 'display-p3', 'same-target'),
        ('in-srgb8.png', target, 8, 'srgb', 'quantization'),
        ('in-p3-8.png', target_p3, 8, 'display-p3', 'quantization'),
        ('out-p3-16.png', outside, 16, 'display-p3', 'outside-srgb'),
        ('out-clipped-srgb16.png', clipped, 16, 'srgb', 'clipped-comparator-not-same-target'),
        ('control-p3-codes-srgb16.png', target_p3, 16, 'srgb', 'profile-control'),
        ('control-p3-codes-untagged16.png', target_p3, 16, None, 'untagged-control'),
    ]
    fixtures = {}
    for name, values, bits, profile, purpose in specifications:
        codes = [math.floor(v * (2**bits-1) + .5) for v in values]
        data = png(codes, bits, profiles.get(profile))
        (out / name).write_bytes(data)
        read_bits, read_codes, embedded = read_png((out / name).read_bytes())
        assert (read_bits, read_codes, embedded) == (bits, codes, profiles.get(profile))
        buf = C.create_string_buffer(embedded) if embedded else None
        h = open_profile(buf, len(embedded)) if embedded else s
        actual = [v / (2**bits-1) for v in read_codes]
        expected = conversion(h, s, actual, byte=True)
        fixtures[name] = dict(purpose=purpose, bits=bits, encoded_rgb=codes, profile=profile,
            file_sha256=sha(data), icc_sha256=sha(embedded) if embedded else None,
            icc_bytes=len(embedded) if embedded else None,
            expected_srgb8=expected, expected_srgb_float=conversion(h, s, actual),
            lab_d50=conversion(h, lab, actual, lab=True),
            untagged_oracle_assumption='sRGB for control only' if not profile else None)
        if embedded:
            close(h)
    a, b = [fixtures[n]['lab_d50'] for n in ['in-srgb16.png', 'in-p3-16.png']]
    de76 = math.dist(a, b)
    assert de76 < .01, de76  # near-identical PCS after 16-bit/profile quantization
    a, b = [fixtures[n]['lab_d50'] for n in ['out-p3-16.png', 'out-clipped-srgb16.png']]
    outside_loss = math.dist(a, b)
    assert outside_loss > 5, outside_loss
    result = dict(schema='atlas-p3-regression/1', lcms_version=version(), python=platform.python_version(),
        intent='RELATIVE_COLORIMETRIC', black_point_compensation=False,
        flags=['NOOPTIMIZE'], profile_source='Synthetic LittleCMS ICC v4 matrix/TRC profiles',
        profile_spec='https://registry.color.org/rgb-registry/displayp3',
        in_gamut_pair_delta_e76=de76, out_of_gamut_clipping_delta_e76=outside_loss,
        rgb8_tolerance_per_channel=1, fixtures=fixtures)
    (out / 'oracle-p3.json').write_text(json.dumps(result, indent=2) + '\n')
    for h in [s, p3, lab]:
        close(h)
    print(json.dumps({k: v for k, v in result.items() if k != 'fixtures'}, indent=2))


if __name__ == '__main__':
    main(Path(sys.argv[1]))
