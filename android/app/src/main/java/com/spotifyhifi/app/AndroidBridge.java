package com.spotifyhifi.app;

import android.app.Activity;
import android.content.Intent;
import android.webkit.JavascriptInterface;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class AndroidBridge implements Runnable {
    private final Activity activity;

    public AndroidBridge(Activity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public String resolveYouTubeId(String query) {
        if (query == null || query.trim().isEmpty()) return "";

        // 1. Primary: YouTube Innertube API (Ultra-fast JSON response ~150ms)
        try {
            String vid = resolveViaInnertube(query);
            if (vid != null && vid.length() == 11) {
                android.util.Log.d("SpotifyHiFiBridge", "Innertube resolved [" + query + "] -> " + vid);
                return vid;
            }
        } catch (Exception e) {
            android.util.Log.w("SpotifyHiFiBridge", "Innertube resolution failed: " + e.getMessage());
        }

        // 2. Fallback: Desktop Search Scraping with high buffer
        try {
            String vid = resolveViaDesktopSearch(query);
            if (vid != null && vid.length() == 11) {
                android.util.Log.d("SpotifyHiFiBridge", "Desktop scrape resolved [" + query + "] -> " + vid);
                return vid;
            }
        } catch (Exception e) {
            android.util.Log.w("SpotifyHiFiBridge", "Desktop scrape failed: " + e.getMessage());
        }

        return "";
    }

    private String resolveViaInnertube(String query) throws Exception {
        URL url = new URL("https://www.youtube.com/youtubei/v1/search");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
        conn.setConnectTimeout(6000);
        conn.setReadTimeout(6000);
        conn.setDoOutput(true);

        String jsonPayload = "{\"context\":{\"client\":{\"clientName\":\"WEB\",\"clientVersion\":\"2.20240101.01.00\"}},\"query\":\"" 
            + query.replace("\"", "\\\"") + "\"}";

        try (OutputStream os = conn.getOutputStream()) {
            os.write(jsonPayload.getBytes(StandardCharsets.UTF_8));
        }

        BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
        Pattern pattern = Pattern.compile("\"videoId\":\\s*\"([a-zA-Z0-9_-]{11})\"");
        String line;
        String resolvedId = null;
        while ((line = reader.readLine()) != null) {
            Matcher m = pattern.matcher(line);
            if (m.find()) {
                resolvedId = m.group(1);
                break;
            }
        }
        reader.close();
        conn.disconnect();
        return resolvedId;
    }

    private String resolveViaDesktopSearch(String query) throws Exception {
        String encoded = URLEncoder.encode(query, "UTF-8");
        URL url = new URL("https://www.youtube.com/results?search_query=" + encoded);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
        conn.setConnectTimeout(6000);
        conn.setReadTimeout(6000);

        BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
        Pattern pattern = Pattern.compile("\"videoId\":\"([a-zA-Z0-9_-]{11})\"");
        String line;
        String resolvedId = null;
        int totalRead = 0;
        while ((line = reader.readLine()) != null) {
            totalRead += line.length();
            Matcher m = pattern.matcher(line);
            if (m.find()) {
                resolvedId = m.group(1);
                break;
            }
            if (totalRead > 2000000) break; // up to 2MB
        }
        reader.close();
        conn.disconnect();
        return resolvedId;
    }

    @JavascriptInterface
    public void shareText(final String title, final String text) {
        if (activity != null) {
            activity.runOnUiThread(new ShareRunnable(activity, title, text));
        }
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
