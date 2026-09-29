package com.atlasclarus.browseredition.test;

import android.app.Activity;
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
    private static final int MAX_EXPORT = 64 * 1024 * 1024;

    private WebView webView;
    private android.webkit.ValueCallback<Uri[]> fileCallback;
    private byte[] pendingExport;

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
                            path.endsWith(".css") ? "text/css" : "application/octet-stream";
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
            @Override public boolean onShowFileChooser(WebView view,
                    android.webkit.ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), PICK_FILE);
                    return true;
                } catch (ActivityNotFoundException exception) {
                    fileCallback = null;
                    callback.onReceiveValue(null);
                    show("No document picker is available.");
                    return false;
                }
            }
        });
        webView.loadUrl(BUNDLE);
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
        if (request == PICK_FILE && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
            fileCallback = null;
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
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        webView.removeJavascriptInterface("AndroidExport");
        webView.destroy();
        super.onDestroy();
    }
}
