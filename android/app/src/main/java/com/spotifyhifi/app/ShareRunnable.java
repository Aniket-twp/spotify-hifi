package com.spotifyhifi.app;

import android.app.Activity;
import android.content.Intent;

public class ShareRunnable implements Runnable {
    private final Activity activity;
    private final String title;
    private final String text;

    public ShareRunnable(Activity activity, String title, String text) {
        this.activity = activity;
        this.title = title;
        this.text = text;
    }

    @Override
    public void run() {
        if (activity == null) return;
        try {
            Intent sendIntent = new Intent();
            sendIntent.setAction(Intent.ACTION_SEND);
            sendIntent.putExtra(Intent.EXTRA_TEXT, text);
            sendIntent.putExtra(Intent.EXTRA_SUBJECT, title);
            sendIntent.setType("text/plain");
            Intent chooser = Intent.createChooser(sendIntent, title);
            activity.startActivity(chooser);
        } catch (Exception e) {
            android.util.Log.e("SpotifyHiFiBridge", "Error sharing text", e);
        }
    }
}
