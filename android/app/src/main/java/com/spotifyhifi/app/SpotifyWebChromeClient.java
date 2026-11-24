package com.spotifyhifi.app;

import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;

public class SpotifyWebChromeClient extends WebChromeClient {
    @Override
    public boolean onConsoleMessage(ConsoleMessage cm) {
        if (cm != null && cm.message() != null) {
            android.util.Log.d("SpotifyHiFiJS", "[" + cm.messageLevel() + "] " + cm.message() + " (" + cm.sourceId() + ":" + cm.lineNumber() + ")");
        }
        return true;
    }
}
