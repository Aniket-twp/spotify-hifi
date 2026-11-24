package com.spotifyhifi.app;

import android.content.Context;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.InputStream;

public class SpotifyWebViewClient extends WebViewClient {
    private final Context context;

    public SpotifyWebViewClient(Context context) {
        this.context = context;
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        if (request != null && request.getUrl() != null) {
            String url = request.getUrl().toString();
            if (url.startsWith("https://spotify-hifi.local/")) {
                String path = request.getUrl().getPath();
                if (path == null || path.equals("/") || path.isEmpty()) {
                    path = "/index.html";
                }
                try {
                    String assetPath = "www" + path;
                    InputStream is = context.getAssets().open(assetPath);
                    String mime = "text/html";
                    if (path.endsWith(".js")) mime = "application/javascript";
                    else if (path.endsWith(".css")) mime = "text/css";
                    else if (path.endsWith(".png")) mime = "image/png";
                    else if (path.endsWith(".jpg") || path.endsWith(".jpeg")) mime = "image/jpeg";
                    else if (path.endsWith(".json")) mime = "application/json";
                    else if (path.endsWith(".svg")) mime = "image/svg+xml";
                    return new WebResourceResponse(mime, "UTF-8", is);
                } catch (Exception e) {
                    android.util.Log.w("SpotifyHiFiClient", "Asset load error for: " + path, e);
                }
            }
        }
        return super.shouldInterceptRequest(view, request);
    }
}
