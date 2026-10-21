package com.atlasclarus.browseredition.test;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.provider.MediaStore;
import android.webkit.ValueCallback;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;
import java.io.File;
import java.io.FileOutputStream;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import static org.junit.Assert.*;
import static org.robolectric.Shadows.shadowOf;

@RunWith(RobolectricTestRunner.class)
@Config(sdk = 35)
public class CameraInputTest {
    @Test public void onlyJpegCompatibleInputsOfferCamera() {
        assertTrue(MainActivity.acceptsJpeg(new String[]{"image/png,image/jpeg"}));
        assertTrue(MainActivity.acceptsJpeg(new String[]{"image/*"}));
        assertFalse(MainActivity.acceptsJpeg(new String[]{"image/png"}));
        assertFalse(MainActivity.acceptsJpeg(new String[]{"application/json", ".icc"}));
        assertFalse(MainActivity.acceptsJpeg(new String[]{"*/*"}));
        assertFalse(MainActivity.acceptsJpeg(null));
    }

    @Test public void cameraPermissionOnlyAllowsLocalVideoOrigin() {
        String video = android.webkit.PermissionRequest.RESOURCE_VIDEO_CAPTURE;
        String audio = android.webkit.PermissionRequest.RESOURCE_AUDIO_CAPTURE;
        assertTrue(MainActivity.trustedCameraRequest(Uri.parse("https://appassets.androidplatform.net"), new String[]{video}));
        assertFalse(MainActivity.trustedCameraRequest(Uri.parse("https://example.com"), new String[]{video}));
        assertFalse(MainActivity.trustedCameraRequest(Uri.parse("http://appassets.androidplatform.net"), new String[]{video}));
        assertFalse(MainActivity.trustedCameraRequest(Uri.parse("https://appassets.androidplatform.net:444"), new String[]{video}));
        assertFalse(MainActivity.trustedCameraRequest(Uri.parse("https://appassets.androidplatform.net"), new String[]{video, audio}));
        assertFalse(MainActivity.trustedCameraRequest(Uri.parse("https://appassets.androidplatform.net"), new String[]{audio}));
    }

    @Test public void deniedPhotoPermissionCompletesWithoutCapture() throws Exception {
        try (var controller = Robolectric.buildActivity(MainActivity.class).setup()) {
            MainActivity activity = controller.get();
            int[] calls = {0};
            Field callback = MainActivity.class.getDeclaredField("fileCallback");
            callback.setAccessible(true);
            callback.set(activity, (ValueCallback<Uri[]>) value -> { assertNull(value); calls[0]++; });
            Field pending = MainActivity.class.getDeclaredField("pendingPhotoPermission");
            pending.setAccessible(true);pending.set(activity, true);
            activity.onRequestPermissionsResult(104, new String[]{android.Manifest.permission.CAMERA},
                    new int[]{android.content.pm.PackageManager.PERMISSION_DENIED});
            assertEquals(1, calls[0]);assertNull(field(activity, "cameraFile"));
        }
    }

    private static Object field(MainActivity activity, String name) throws Exception {
        Field f = MainActivity.class.getDeclaredField(name);
        f.setAccessible(true);
        return f.get(activity);
    }

    private static void capture(MainActivity activity, ValueCallback<Uri[]> callback) throws Exception {
        org.robolectric.Shadows.shadowOf(activity.getApplication()).grantPermissions(android.Manifest.permission.CAMERA);
        Field f = MainActivity.class.getDeclaredField("fileCallback");
        f.setAccessible(true);
        f.set(activity, callback);
        Method method = MainActivity.class.getDeclaredMethod("takePhoto");
        method.setAccessible(true);
        method.invoke(activity);
    }

    @Test public void fullResolutionOutputReturnsToOriginalCallbackOnce() throws Exception {
        try (var controller = Robolectric.buildActivity(MainActivity.class).setup()) {
            MainActivity activity = controller.get();
            Uri[][] received = new Uri[1][];
            int[] calls = {0};
            capture(activity, value -> { received[0] = value; calls[0]++; });
            Intent camera = shadowOf(activity).getNextStartedActivityForResult().intent;
            assertEquals(MediaStore.ACTION_IMAGE_CAPTURE, camera.getAction());
            Uri output = camera.getParcelableExtra(MediaStore.EXTRA_OUTPUT);
            assertEquals("content", output.getScheme());
            assertEquals(output, camera.getClipData().getItemAt(0).getUri());
            assertTrue((camera.getFlags() & Intent.FLAG_GRANT_WRITE_URI_PERMISSION) != 0);
            File file = (File) field(activity, "cameraFile");
            try (FileOutputStream stream = new FileOutputStream(file)) { stream.write(new byte[]{1,2,3}); }
            activity.onActivityResult(103, Activity.RESULT_OK, null);
            assertArrayEquals(new Uri[]{output}, received[0]);
            assertTrue(file.exists()); // WebView reads asynchronously.
            activity.onActivityResult(103, Activity.RESULT_CANCELED, null);
            assertEquals(1, calls[0]);
        }
    }

    @Test public void cancellationAndEmptyOutputDoNotReplaceImage() throws Exception {
        // Repeated attempts belong to one live activity, as on a phone. Creating a second
        // Robolectric activity here changes its cache context while FileProvider caches roots.
        try (var controller = Robolectric.buildActivity(MainActivity.class).setup()) {
            MainActivity activity = controller.get();
            for (int result : new int[]{Activity.RESULT_CANCELED, Activity.RESULT_OK}) {
                int[] calls = {0};
                capture(activity, value -> { assertNull(value); calls[0]++; });
                File file = (File) field(activity, "cameraFile");
                activity.onActivityResult(103, result, null);
                assertEquals(1, calls[0]);
                assertFalse(file.exists());
                assertNull(field(activity, "fileCallback"));
            }
        }
    }
}
