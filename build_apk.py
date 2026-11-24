import os
import sys
import subprocess
import shutil
import zipfile

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)

SDK_DIR = r"C:\Users\anike\AppData\Local\Android\Sdk"
BUILD_TOOLS = os.path.join(SDK_DIR, "build-tools", "34.0.0")
PLATFORM_DIR = os.path.join(SDK_DIR, "platforms", "android-34")
JDK_BIN = r"C:\Program Files\Microsoft\jdk-21.0.13.21-hotspot\bin"

AAPT2 = os.path.join(BUILD_TOOLS, "aapt2.exe")
D8_BAT = os.path.join(BUILD_TOOLS, "d8.bat")
ZIPALIGN = os.path.join(BUILD_TOOLS, "zipalign.exe")
APKSIGNER = os.path.join(BUILD_TOOLS, "apksigner.bat")
ANDROID_JAR = os.path.join(PLATFORM_DIR, "android.jar")
JAVAC = os.path.join(JDK_BIN, "javac.exe")
KEYTOOL = os.path.join(JDK_BIN, "keytool.exe")

BUILD_DIR = os.path.join(BASE_DIR, "apk_build")
if os.path.exists(BUILD_DIR):
    shutil.rmtree(BUILD_DIR)
os.makedirs(BUILD_DIR, exist_ok=True)

GEN_DIR = os.path.join(BUILD_DIR, "gen")
OBJ_DIR = os.path.join(BUILD_DIR, "obj")
os.makedirs(GEN_DIR, exist_ok=True)
os.makedirs(OBJ_DIR, exist_ok=True)

# Prepare assets for APK
assets_dir = os.path.join(BASE_DIR, "android", "app", "src", "main", "assets", "www")
os.makedirs(assets_dir, exist_ok=True)
for item in ["index.html", "styles.css", "app.js", "sick_playlist.json", "manifest.json", "sw.js"]:
    src = os.path.join(BASE_DIR, item)
    if os.path.exists(src):
        shutil.copy2(src, os.path.join(assets_dir, item))

print("Step 1: Compiling resources with aapt2...")
res_zip = os.path.join(BUILD_DIR, "resources.zip")
cmd = [AAPT2, "compile", "--dir", os.path.join(BASE_DIR, "android", "app", "src", "main", "res"), "-o", res_zip]
subprocess.run(cmd, check=True)

print("Step 2: Linking resources with Samsung/Android 14 SDK parameters...")
manifest_xml = os.path.join(BASE_DIR, "android", "app", "src", "main", "AndroidManifest.xml")
app_assets = os.path.join(BASE_DIR, "android", "app", "src", "main", "assets")
unaligned_apk = os.path.join(BUILD_DIR, "unaligned.apk")

cmd = [
    AAPT2, "link",
    "-I", ANDROID_JAR,
    "--manifest", manifest_xml,
    "--min-sdk-version", "24",
    "--target-sdk-version", "34",
    "--version-code", "1",
    "--version-name", "1.0.0",
    "-o", unaligned_apk,
    "--java", GEN_DIR,
    "-A", app_assets,
    res_zip
]
subprocess.run(cmd, check=True)

print("Step 3: Compiling Java source...")
java_files = [
    os.path.join(GEN_DIR, "com", "spotifyhifi", "app", "R.java"),
    os.path.join(BASE_DIR, "android", "app", "src", "main", "java", "com", "spotifyhifi", "app", "MainActivity.java")
]
cmd = [
    JAVAC,
    "-source", "8",
    "-target", "8",
    "-cp", ANDROID_JAR,
    "-d", OBJ_DIR
] + java_files
subprocess.run(cmd, check=True)

print("Step 4: Converting class files to DEX with d8...")
class_files = []
for root, _, files in os.walk(OBJ_DIR):
    for f in files:
        if f.endswith(".class"):
            class_files.append(os.path.join(root, f))

cmd = [D8_BAT, "--min-api", "24", "--lib", ANDROID_JAR, "--output", BUILD_DIR] + class_files
subprocess.run(cmd, shell=True, check=True)

print("Step 5: Packaging classes.dex into unaligned.apk...")
classes_dex = os.path.join(BUILD_DIR, "classes.dex")
with zipfile.ZipFile(unaligned_apk, 'a') as zf:
    zf.write(classes_dex, "classes.dex")

print("Step 6: Running zipalign...")
aligned_apk = os.path.join(BUILD_DIR, "aligned.apk")
cmd = [ZIPALIGN, "-f", "-p", "4", unaligned_apk, aligned_apk]
subprocess.run(cmd, check=True)

print("Step 7: Creating debug keystore...")
keystore_path = os.path.join(BUILD_DIR, "debug.keystore")
cmd = [
    KEYTOOL, "-genkeypair",
    "-keystore", keystore_path,
    "-storepass", "android",
    "-alias", "androiddebugkey",
    "-keypass", "android",
    "-keyalg", "RSA",
    "-keysize", "2048",
    "-validity", "10000",
    "-dname", "CN=Android Debug,O=Android,C=US"
]
subprocess.run(cmd, check=True)

print("Step 8: Signing APK with apksigner...")
final_apk = os.path.join(BASE_DIR, "Spotify-HiFi.apk")
cmd = [
    APKSIGNER, "sign",
    "--ks", keystore_path,
    "--ks-pass", "pass:android",
    "--key-pass", "pass:android",
    "--ks-key-alias", "androiddebugkey",
    "--out", final_apk,
    aligned_apk
]
subprocess.run(cmd, shell=True, check=True)
print(f"SUCCESS: Built and signed Android APK -> {final_apk}")
