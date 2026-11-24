package com.spotifyhifi.app;

import android.app.Activity;
import android.webkit.JavascriptInterface;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class AndroidBridge implements Runnable {
    private final Activity activity;

    public AndroidBridge(Activity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public String resolveYouTubeId(String query) {
        try {
            String encoded = URLEncoder.encode(query, "UTF-8");
            URL url = new URL("https://www.youtube.com/results?search_query=" + encoded);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);

            BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
                if (sb.length() > 250000) break;
            }
            reader.close();
            conn.disconnect();

            String html = sb.toString();
            Pattern pattern = Pattern.compile("\"videoId\":\"([a-zA-Z0-9_-]{11})\"");
            Matcher matcher = pattern.matcher(html);
            if (matcher.find()) {
                String vid = matcher.group(1);
                android.util.Log.d("SpotifyHiFiBridge", "Resolved YouTube ID for [" + query + "]: " + vid);
                return vid;
            }

            Pattern fallbackPattern = Pattern.compile("/watch\\?v=([a-zA-Z0-9_-]{11})");
            Matcher fbMatcher = fallbackPattern.matcher(html);
            if (fbMatcher.find()) {
                String vid = fbMatcher.group(1);
                android.util.Log.d("SpotifyHiFiBridge", "Fallback YouTube ID for [" + query + "]: " + vid);
                return vid;
            }
        } catch (Exception e) {
            android.util.Log.e("SpotifyHiFiBridge", "Error resolving YouTube ID for: " + query, e);
        }
        return "";
    }

    @JavascriptInterface
    public void closeApp() {
        if (activity != null) {
            activity.runOnUiThread(this);
        }
    }

    @Override
    public void run() {
        if (activity != null) {
            activity.finish();
        }
    }
}
