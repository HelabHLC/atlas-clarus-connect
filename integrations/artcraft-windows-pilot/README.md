# ArtCraft Windows pilot

Build the already tested Clarus importer into an independent Windows x64
ArtCraft test executable. The user target is Windows 10 build 19045 with
ArtCraft 0.41.0, upstream commit
`c3844acdadf630db0c17ec1d1512bcf6bbc1b4f9`.

The workflow checks out that exact public ArtCraft revision in a separate
directory, verifies the patch hashes, applies the tested frontend integration,
and gives the native pilot its own product name, identifier, version and
application data folder. ArtCraft's vendored HTTP cookie store uses the
identifier-scoped Tauri cache directory; WebView storage is likewise scoped
by the different application identifier. The custom native data folder is
changed separately because it is hardcoded upstream.

No changes are pushed to storytold/artcraft. No frozen ATLAS master, live
website, Android package or signing secret is touched. This branch adds only
this integration directory and its Actions workflow to atlas-clarus-connect.
The job has read-only repository permissions and uploads a test artifact;
it does not publish a release or deploy anything.

The frontend patch was checked with 63 tests, a TypeScript project build,
a production frontend build and seven real Chromium interaction checks.
The Windows workflow repeats the tests and builds the native executable,
then checks startup and that the default ArtCraft data folder is untouched.
Native WebView import acceptance on Windows 10 remains a separate user test.

The reference CSV is an unmodified, checksum-pinned read-only projection.
The palette extractor and upstream dependency lockfiles must remain unchanged.
See the source patch's `docs/atlas-clarus-pilot.md` for the full data contract.

To reproduce on a clean checkout with Windows build prerequisites:

```powershell
python prepare.py C:\path\to\fresh-artcraft
./build-windows.ps1 -ArtcraftCheckout C:\path\to\fresh-artcraft -OutputDirectory C:\path\to\output
```

Use PowerShell 7, Node 24, Rust stable MSVC, Visual Studio C++ Build Tools,
Windows SDK, CMake, LLVM, Strawberry Perl, pkg-config and NASM.
The GitHub workflow installs/configures those dependencies for the hosted runner.
The portable executable is unsigned; all source and data licenses are retained.
