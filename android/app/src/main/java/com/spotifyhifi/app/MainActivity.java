package com.spotifyhifi.app;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);

        // Keep screen on during music playback
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Edge-to-edge: the Liquid Glass wallpaper runs underneath the status and
        // gesture bars, and the page reads them through env(safe-area-inset-*).
        goEdgeToEdge();

        // Enable Chrome DevTools remote debugging
        WebView.setWebContentsDebuggingEnabled(true);

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        // True 1:1 mobile resolution mapping
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(100);

        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // Hardware accelerated layer for 60/120fps video and canvas animations
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        webView.setWebChromeClient(new SpotifyWebChromeClient());
        webView.setWebViewClient(new SpotifyWebViewClient(this));
        webView.addJavascriptInterface(new AndroidBridge(this), "AndroidBridge");

        setContentView(webView);
        webView.loadUrl("https://spotify-hifi.local/index.html");
    }

    private void goEdgeToEdge() {
        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        View decor = window.getDecorView();
        int vis = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
        // White system icons: the material is always dark glass.
        vis &= ~(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        decor.setSystemUiVisibility(vis);

        if (Build.VERSION.SDK_INT >= 30) {
            window.setDecorFitsSystemWindows(false);
        }
        if (Build.VERSION.SDK_INT >= 29) {
            window.setNavigationBarDividerColor(0x00000000);
        }
        if (Build.VERSION.SDK_INT >= 27) {
            // Full-bleed glass: the wallpaper continues behind punch-holes and notches
            // and the page receives them as env(safe-area-inset-*).
            window.getAttributes().layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null) {
            webView.loadUrl("javascript:(function(){if(window.spotifyHiFiApp&&window.spotifyHiFiApp.handleBackPressed){if(!window.spotifyHiFiApp.handleBackPressed()){if(window.AndroidBridge&&window.AndroidBridge.closeApp){window.AndroidBridge.closeApp();}}}})();");
        } else {
            super.onBackPressed();
        }
    }
}
