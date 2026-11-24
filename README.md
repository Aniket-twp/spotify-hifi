# 🎵 Refract — Lossless Hi-Fi (Web & Android)

[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Android%2014+-0a84ff?style=for-the-badge&logo=android)](https://github.com/Aniket-twp/spotify-hifi)
[![Audio Quality](https://img.shields.io/badge/Audio-24--bit%20%2F%2096kHz%20Lossless-8f7bff?style=for-the-badge)](https://github.com/Aniket-twp/spotify-hifi)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

An ultra-responsive, native-feel music player built for true audiophiles, wearing a **Liquid Glass** interface: translucent materials that refract an ambient wallpaper, spring-driven motion, and an SF Pro type scale. Packed with studio-grade 24-bit/96kHz lossless DSP, a 10-band graphic equalizer, real-time audio spectrum analyzer, continuous autoplay, ambient artwork tinting, and the complete 62-song **"sick 🫢"** playlist.

---

## 📲 Download & Install Android APK

Get the signed standalone Android APK ready for Android 8.0 through Android 14+ / One UI 6+:

👉 **[Download Spotify-HiFi.apk (Latest v1.0.0)](https://github.com/Aniket-twp/spotify-hifi/releases/latest/download/Spotify-HiFi.apk)**

### Installation on Samsung Galaxy & Android Devices:
1. Download `Spotify-HiFi.apk` directly to your phone.
2. Tap the file in **My Files** or **Downloads**.
3. If prompted by **Google Play Protect**, tap **"More details"** ➔ **"Install anyway"** (the APK is signed with a local developer certificate).
4. Enjoy continuous lossless audio streaming!

---

## ✨ Features

- **🧊 Liquid Glass Design System**: One animated wallpaper behind every surface, so nav, player, sheets and modals are real `backdrop-filter` glass with refracted rims, specular sweeps and depth-aware shadows.
- **📱 True Native Mobile UI**: Floating glass tab bar (`Home`, `Search`, `Your Library`), mini-player docked above it, and a full-screen slide-up Now Playing view with drag-to-dismiss.
- **🔣 "Refract" Brand Mark**: Custom vector logo rendered into PWA icons, Android adaptive icons, favicons and store art by `make_icons.py`.
- **🎧 Studio-Grade 10-Band Equalizer**: 32Hz to 16kHz DSP filters with presets for Studio Flat, Bass Boost, Hip-Hop/Rap, Vocal Clarity, and Electronic.
- **📊 Real-Time Audio Spectrum**: Live 64-band visualizer powered by Web Audio API.
- **🔄 Smart Autoplay Engine**: Seamless continuous playback across the entire queue without manual input.
- **🔥 Curated 62-Track "sick 🫢" Playlist**: Featuring Travis Scott, Kendrick Lamar, The Weeknd, Drake, Central Cee, Roddy Ricch, KR$NA, Post Malone, and more.
- **🖼️ High-Res Album & Artist Artwork**: Official 600×600 studio covers and high-resolution artist portraits.
- **🎨 Ambient Artwork Tint**: The whole app re-tints from the playing track's artwork via a single `--np-tint` variable.
- **🔍 Explore & Browse Hub**: Discover by mood, vibe, and genre tags with instant live search.

---

## 🛠️ Project Structure

```text
spotify-hifi/
├── index.html              # Mobile & desktop responsive web app
├── styles.css              # Liquid Glass design system, materials & motion
├── app.js                  # Audio engine, DSP filters, autoplay & UI
├── sick_playlist.json      # 62 enriched studio tracks with metadata
├── icon.svg                # "Refract" brand mark (vector source of truth)
├── make_icons.py           # Renders the mark into PWA / Android / store art
├── manifest.json           # PWA installation manifest
├── sw.js                   # Service worker for offline caching
├── android/                # Native Android WebView wrapper project
│   └── app/src/main/
│       ├── AndroidManifest.xml
│       └── java/com/spotifyhifi/app/MainActivity.java
├── server.py               # Local Python HTTP/1.1 audio streaming server
└── build_apk.py            # Standalone Android SDK compiler & signer
```

---

## 🚀 Running Locally

### Web Player
Simply open `index.html` in any modern web browser or start a local server:
```bash
python server.py
# Open http://localhost:8080
```

### Building the Android APK
Prerequisites: Android SDK (`build-tools 34.0.0`, `platforms/android-34`) and JDK 17+.
```bash
python build_apk.py
```
Outputs a production-aligned, v1+v2+v3 signed `Spotify-HiFi.apk`.

---

## 📄 License
MIT License. Open source and free for personal music streaming.
