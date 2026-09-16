"""Generate artificial ICC parser/transform fixtures and native-LittleCMS vectors.

These invented CLUTs are software tests, not press profiles or measured colours.
Nothing from this file is shipped as an end-user output profile.
"""
from pathlib import Path
import base64
import ctypes as C
import ctypes.util
import itertools
import json
import struct

def u16(value):
    return struct.pack('>H', round(max(0, min(1, value)) * 65535))

def lut(channels, outputs, mapping):
    grid = 3 if channels == 3 else 2
    header = b'mft2' + bytes(4) + bytes([channels, outputs, grid, 0])
    header += b''.join(struct.pack('>i', 65536 if i in [0, 4, 8] else 0) for i in range(9))
    header += struct.pack('>HH', 2, 2)
    input_tables = (u16(0) + u16(1)) * channels
    clut = b''.join(u16(v) for coordinate in itertools.product(range(grid), repeat=channels)
                    for v in mapping([n / (grid - 1) for n in coordinate]))
    return header + input_tables + clut + (u16(0) + u16(1)) * outputs

def make_profile(n):
    white = [.9642, 1.0, .8249]
    def forward(device):
        extra = .08 * sum(device[4:]) if n == 7 else 0
        return [white[i] * max(0, 1 - .8 * device[i] - .15 * device[3] - extra) / 1.999969 for i in range(3)]
    def inverse(xyz):
        cmy = [max(0, min(1, 1 - 1.999969 * xyz[i] / white[i])) for i in range(3)]
        return cmy + [min(cmy) * .2] + ([cmy[0] * .3, cmy[1] * .2, cmy[2] * .4] if n == 7 else [])
    tags = {
        b'desc': b'desc' + bytes(4) + struct.pack('>I', 24) + b'SYNTHETIC SOFTWARE TEST\0' + bytes(90),
        b'cprt': b'text' + bytes(4) + b'ATLAS test fixture, not a press profile\0',
        b'wtpt': b'XYZ ' + bytes(4) + b''.join(struct.pack('>i', round(x * 65536)) for x in white),
        b'A2B0': lut(n, 3, forward), b'B2A0': lut(3, n, inverse),
    }
    header = bytearray(128)
    header[8:12] = bytes([2, 0x40, 0, 0])
    header[12:24] = b'prtr' + (b'CMYK' if n == 4 else b'7CLR') + b'XYZ '
    header[24:36] = struct.pack('>6H', 2026, 1, 1, 0, 0, 0)
    header[36:40] = b'acsp'
    header[68:80] = b''.join(struct.pack('>i', round(x * 65536)) for x in white)
    offset = 132 + len(tags) * 12
    table = bytearray(struct.pack('>I', len(tags)))
    body = bytearray()
    for sig, data in tags.items():
        table.extend(sig + struct.pack('>II', offset + len(body), len(data)))
        body.extend(data); body.extend(bytes((-len(data)) % 4))
    struct.pack_into('>I', header, 0, offset + len(body))
    return bytes(header + table + body)

def main():
    lib = C.CDLL(ctypes.util.find_library('lcms2'))
    def setup(name, restype, argtypes):
        fn = getattr(lib, name); fn.restype = restype; fn.argtypes = argtypes; return fn
    ptr, uint = C.c_void_p, C.c_uint32
    open_profile = setup('cmsOpenProfileFromMem', ptr, [ptr, uint])
    srgb = setup('cmsCreate_sRGBProfile', ptr, [])()
    create = setup('cmsCreateTransform', ptr, [ptr, uint, ptr, uint, uint, uint])
    transform = setup('cmsDoTransform', None, [ptr, ptr, ptr, uint])
    fmt = setup('cmsFormatterForColorspaceOfProfile', uint, [ptr, uint, C.c_int])
    close = setup('cmsCloseProfile', C.c_int, [ptr])
    delete = setup('cmsDeleteTransform', None, [ptr])
    rgb = [255, 255, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 128, 128, 128, 37, 131, 213]
    source = (C.c_ubyte * len(rgb))(*rgb)
    cases = []
    for n in [4, 7]:
        data = make_profile(n); profile = open_profile(data, len(data)); assert profile
        vectors = []
        for intent in range(4):
            for bpc in [False, True]:
                f = create(srgb, 262169, profile, fmt(profile, 2, 0), intent, 256 | (8192 if bpc else 0))
                b = create(profile, fmt(profile, 2, 0), srgb, 262169, 1, 256)
                assert f and b
                device = (C.c_uint16 * (len(rgb) // 3 * n))()
                result = (C.c_ubyte * len(rgb))()
                transform(f, source, device, len(rgb) // 3)
                transform(b, device, result, len(rgb) // 3)
                vectors.append({'intent': intent, 'bpc': bpc, 'rgb': list(result)})
                delete(f); delete(b)
        close(profile)
        cases.append({'path': '4C' if n == 4 else 'ECG', 'icc_base64': base64.b64encode(data).decode(), 'vectors': vectors})
    close(srgb)
    output = {'status': 'SYNTHETIC_SOFTWARE_TEST_ONLY_NOT_A_PRESS_PROFILE', 'native_lcms_version': lib.cmsGetEncodedCMMversion(),
              'input_rgb': rgb, 'cases': cases}
    path = Path(__file__).with_name('preview-vectors.json')
    path.write_text(json.dumps(output, indent=2) + '\n')
    print(path, output['native_lcms_version'])

if __name__ == '__main__':
    main()
