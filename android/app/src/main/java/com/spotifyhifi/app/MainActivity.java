package com.spotifyhifi.app;

import android.app.Activity;
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

    @Override
    public void onBackPressed() {
        if (webView != null) {
            webView.loadUrl("javascript:(function(){if(window.spotifyHiFiApp&&window.spotifyHiFiApp.handleBackPressed){if(!window.spotifyHiFiApp.handleBackPressed()){if(window.AndroidBridge&&window.AndroidBridge.closeApp){window.AndroidBridge.closeApp();}}}})();");
        } else {
            super.onBackPressed();
        }
    }
}
