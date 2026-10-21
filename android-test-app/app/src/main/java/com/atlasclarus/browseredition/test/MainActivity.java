package com.atlasclarus.browseredition.test;

import android.app.Activity;
import android.Manifest;
import android.content.pm.PackageManager;
import android.webkit.PermissionRequest;
import android.app.AlertDialog;
import android.content.ClipData;
import android.provider.MediaStore;
import androidx.core.content.FileProvider;
import java.io.File;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Collections;

public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String BUNDLE = "https://" + HOST + "/index.html#home";
    private static final String COLOUR_ID = "https://" + HOST + "/colour-id.html";
    private static final String COLOUR_ID_EN = "https://" + HOST + "/colour-id-en.html";
    private static final int PICK_FILE = 101;
    private static final int SAVE_FILE = 102;
    private static final int TAKE_PHOTO = 103;
    private static final int CAMERA_PERMISSION = 104;
    private static final int MAX_EXPORT = 64 * 1024 * 1024;

    private WebView webView;
    private android.webkit.ValueCallback<Uri[]> fileCallback;
    private byte[] pendingExport;
    private File cameraFile;
    private Uri cameraUri;
    private PermissionRequest pendingCameraPermission;
    private boolean pendingPhotoPermission;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        FrameLayout root = new FrameLayout(this);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(0, insets.getSystemWindowInsetTop(), 0,
                    insets.getSystemWindowInsetBottom());
            return insets;
        });
        LinearLayout shell = new LinearLayout(this);
        shell.setOrientation(LinearLayout.VERTICAL);
        root.addView(shell, new FrameLayout.LayoutParams(-1, -1));
        LinearLayout navigation = new LinearLayout(this);
        navigation.setBackgroundColor(0xff102638);
        Button colourIdButton = new Button(this);
        colourIdButton.setText("Colour ID");
        colourIdButton.setAllCaps(false);
        colourIdButton.setOnClickListener(view -> {
            // Re-selecting this native item must not discard an in-memory image or trace.
            String currentUrl = webView.getUrl();
            String currentPath = currentUrl == null ? null : Uri.parse(currentUrl).getPath();
            if ("/colour-id.html".equals(currentPath) || "/colour-id-en.html".equals(currentPath)) return;
            webView.evaluateJavascript("localStorage.getItem('atlasColourIdLanguage')", value ->
                    webView.loadUrl("\"en\"".equals(value) ? COLOUR_ID_EN : COLOUR_ID));
        });
        navigation.addView(colourIdButton, new LinearLayout.LayoutParams(0, -2, 1));
        Button bundleButton = new Button(this);
        bundleButton.setText("ATLAS Clarus Connect");
        bundleButton.setAllCaps(false);
        bundleButton.setOnClickListener(view -> webView.loadUrl(BUNDLE));
        navigation.addView(bundleButton, new LinearLayout.LayoutParams(0, -2, 1));
        shell.addView(navigation);
        webView = new WebView(this);
        shell.addView(webView, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);
        getWindow().setStatusBarColor(0xff0a0d12);
        getWindow().setNavigationBarColor(0xff0a0d12);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); // Android's document picker returns content: URIs.
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        webView.addJavascriptInterface(new ExportBridge(), "AndroidExport");
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!"https".equals(uri.getScheme()) || !HOST.equals(uri.getHost())) return null;
                String path = uri.getPath();
                if (path == null || path.equals("/")) path = "/index.html";
                if (path.contains("..") || path.contains("\\") || !path.matches("/[A-Za-z0-9_./-]+"))
                    return missing();
                try {
                    InputStream stream = getAssets().open("bundle" + path);
                    String mime = path.endsWith(".html") ? "text/html" :
                            path.endsWith(".json") ? "application/json" :
                            path.endsWith(".css") ? "text/css" :
                            path.endsWith(".js") ? "application/javascript" : "application/octet-stream";
                    return new WebResourceResponse(mime, "UTF-8", stream);
                } catch (IOException exception) {
                    return missing();
                }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equals(uri.getScheme()) && HOST.equals(uri.getHost())) return false;
                if (!request.isForMainFrame()) return true;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (ActivityNotFoundException exception) {
                    show("No app can open this link.");
                }
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    if (!trustedCameraRequest(request.getOrigin(), request.getResources()) ||
                            pendingCameraPermission != null || pendingPhotoPermission) {
                        request.deny();
                        return;
                    }
                    if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                    } else {
                        pendingCameraPermission = request;
                        requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION);
                    }
                });
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest request) {
                runOnUiThread(() -> {
                    if (pendingCameraPermission == request) pendingCameraPermission = null;
                });
            }
            @Override public boolean onShowFileChooser(WebView view,
                    android.webkit.ValueCallback<Uri[]> callback, FileChooserParams params) {
                // Never replace an outstanding camera/document request with another callback.
                if (fileCallback != null) {
                    callback.onReceiveValue(null);
                    return true;
                }
                fileCallback = callback;
                if (acceptsJpeg(params.getAcceptTypes()) && params.getMode() == FileChooserParams.MODE_OPEN) {
                    new AlertDialog.Builder(MainActivity.this)
                            .setTitle("Image source / Bildquelle")
                            .setItems(new String[]{"Take photo / Foto aufnehmen", "Choose image / Bild auswählen"},
                                    (dialog, choice) -> {
                                        if (choice == 0) takePhoto();
                                        else pickDocument(params);
                                    })
                            .setOnCancelListener(dialog -> finishFile(null))
                            .show();
                } else {
                    pickDocument(params);
                }
                return true;
            }
        });
        webView.loadUrl(BUNDLE);
    }

    static boolean trustedCameraRequest(Uri origin, String[] resources) {
        return origin != null && "https".equals(origin.getScheme()) && HOST.equals(origin.getHost()) &&
                (origin.getPort() == -1 || origin.getPort() == 443) &&
                resources != null && resources.length == 1 &&
                PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resources[0]);
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode != CAMERA_PERMISSION) return;
        boolean granted = results.length == 1 && results[0] == PackageManager.PERMISSION_GRANTED &&
                checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
        PermissionRequest pending = pendingCameraPermission;
        pendingCameraPermission = null;
        if (pending != null) {
            if (granted) pending.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            else pending.deny();
        }
        if (pendingPhotoPermission) {
            pendingPhotoPermission = false;
            if (granted) takePhoto();
            else { finishFile(null); show("Camera access denied. You can still choose an existing image."); }
        }
    }

    @Override protected void onPause() {
        // A runtime permission dialog may pause the activity before capture has started.
        if (webView != null && pendingCameraPermission == null && !pendingPhotoPermission) {
            webView.evaluateJavascript("window.ATLAS_LIVE_CAMERA && window.ATLAS_LIVE_CAMERA.close()", null);
            webView.onPause();
        }
        super.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    static boolean acceptsJpeg(String[] types) {
        if (types == null) return false;
        for (String group : types) {
            if (group == null) continue;
            for (String value : group.split(",")) {
                String type = value.trim().toLowerCase(java.util.Locale.ROOT);
                if (type.equals("image/*") || type.equals("image/jpeg") ||
                        type.equals(".jpg") || type.equals(".jpeg")) return true;
            }
        }
        return false;
    }

    private void pickDocument(WebChromeClient.FileChooserParams params) {
        try {
            startActivityForResult(params.createIntent(), PICK_FILE);
        } catch (ActivityNotFoundException | SecurityException exception) {
            finishFile(null);
            show("No document picker is available.");
        }
    }

    private void takePhoto() {
        // Declaring CAMERA for live capture also requires runtime permission for the system camera.
        if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            if (pendingCameraPermission != null || pendingPhotoPermission) { finishFile(null); return; }
            pendingPhotoPermission = true;
            requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION);
            return;
        }
        try {
            File directory = new File(getCacheDir(), "camera");
            if (!directory.isDirectory() && !directory.mkdirs()) throw new IOException("Camera cache unavailable");
            cameraFile = File.createTempFile("atlas-photo-", ".jpg", directory);
            cameraUri = FileProvider.getUriForFile(this, getPackageName() + ".camera", cameraFile);
            Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            intent.putExtra(MediaStore.EXTRA_OUTPUT, cameraUri);
            intent.setClipData(ClipData.newRawUri("ATLAS photo", cameraUri));
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            startActivityForResult(intent, TAKE_PHOTO);
        } catch (IOException | ActivityNotFoundException | SecurityException exception) {
            clearCamera(true);
            finishFile(null);
            show("Camera could not be opened. Please choose an existing image.");
        }
    }

    private void clearCamera(boolean delete) {
        if (cameraUri != null) revokeUriPermission(cameraUri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        if (delete && cameraFile != null) cameraFile.delete();
        cameraUri = null;
        cameraFile = null;
    }

    private void finishFile(Uri[] result) {
        android.webkit.ValueCallback<Uri[]> callback = fileCallback;
        fileCallback = null;
        if (callback != null) callback.onReceiveValue(result);
    }

    private static WebResourceResponse missing() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
                Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }

    private void show(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }

    private final class ExportBridge {
        @JavascriptInterface public void save(String filename, String mime, String encoded) {
            if (encoded.length() > MAX_EXPORT * 4L / 3L + 16) {
                runOnUiThread(() -> show("Export exceeds the 64 MB test limit."));
                return;
            }
            final byte[] bytes;
            try {
                bytes = Base64.decode(encoded, Base64.DEFAULT);
                if (bytes.length > MAX_EXPORT) throw new IllegalArgumentException("Too large");
            } catch (IllegalArgumentException exception) {
                runOnUiThread(() -> show("Export data could not be decoded."));
                return;
            }
            runOnUiThread(() -> {
                if (pendingExport != null) {
                    show("Finish the current export first.");
                    return;
                }
                pendingExport = bytes;
                String safeName = filename.replaceAll("[^A-Za-z0-9._-]", "_");
                if (safeName.isEmpty()) safeName = "atlas-export";
                String safeMime = mime.matches("[A-Za-z0-9.+-]+/[A-Za-z0-9.+-]+")
                        ? mime : "application/octet-stream";
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(safeMime);
                intent.putExtra(Intent.EXTRA_TITLE, safeName);
                try {
                    startActivityForResult(intent, SAVE_FILE);
                } catch (ActivityNotFoundException exception) {
                    pendingExport = null;
                    show("No document saver is available.");
                }
            });
        }
        @JavascriptInterface public void error(String message) {
            runOnUiThread(() -> show("Export failed: " + message));
        }
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == TAKE_PHOTO) {
            boolean valid = result == RESULT_OK && cameraFile != null && cameraFile.length() > 0;
            Uri photo = cameraUri;
            // Keep successful bytes for WebView's asynchronous read; cache is cleared on app destruction.
            clearCamera(!valid);
            finishFile(valid ? new Uri[]{photo} : null);
            if (result == RESULT_OK && !valid) show("No photo was returned. Please try again.");
        } else if (request == PICK_FILE) {
            finishFile(WebChromeClient.FileChooserParams.parseResult(result, data));
        } else if (request == SAVE_FILE) {
            byte[] bytes = pendingExport;
            pendingExport = null;
            if (result == RESULT_OK && data != null && data.getData() != null && bytes != null) {
                try (OutputStream out = getContentResolver().openOutputStream(data.getData())) {
                    if (out == null) throw new IOException("No output stream");
                    out.write(bytes);
                    show("Export saved.");
                } catch (IOException exception) {
                    show("Export could not be saved.");
                }
            }
        }
    }

    @Override public void onBackPressed() {
        webView.evaluateJavascript("(function(){if(window.ATLAS_LIVE_CAMERA && window.ATLAS_LIVE_CAMERA.isOpen()){window.ATLAS_LIVE_CAMERA.close();return true;}return false;})()",
                value -> { if (!"true".equals(value)) navigateBack(); });
    }

    private void navigateBack() {
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (pendingCameraPermission != null) {
            pendingCameraPermission.deny();
            pendingCameraPermission = null;
        }
        pendingPhotoPermission = false;
        clearCamera(true);
        finishFile(null);
        File[] photos = new File(getCacheDir(), "camera").listFiles();
        if (photos != null) for (File photo : photos) photo.delete();
        webView.removeJavascriptInterface("AndroidExport");
        webView.destroy();
        super.onDestroy();
    }
}
