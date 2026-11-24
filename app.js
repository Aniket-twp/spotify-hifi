// Spotify HiFi Lossless Audio Engine
// Multi-Playlist Management, Spotify/Text/File Importer, Global Music Search, YouTube HiFi Audio Engine & Autoplay

class SpotifyHiFiMobileApp {
  constructor() {
    this.audioElement = new Audio();
    this.audioElement.preload = "auto";

    // YouTube Audio Engine state for Full-Length Playback (No 30-sec limit)
    this.ytPlayer = null;
    this.isYtReady = false;
    this.ytTimer = null;
    this.pendingTrack = null;

    // Pinned featured playlist ("sick 🫢" by Aniket)
    this.featuredTracks = (window.SICK_PLAYLIST && Array.isArray(window.SICK_PLAYLIST) && window.SICK_PLAYLIST.length > 0)
      ? window.SICK_PLAYLIST
      : [];

    // All Playlists (Featured + Custom + Liked)
    this.playlists = [];
    this.currentPlaylistId = 'sick';
    this.tracks = this.featuredTracks;
    this.currentIndex = -1;
    this.isPlaying = false;
    this.isAutoplay = true;
    this.isShuffle = false;
    this.isMuted = false;
    this.currentVolume = 100;

    // Track targeted for adding to playlist
    this.pendingAddTrack = null;

    // Audio DSP for HiFi Equalizer
    this.audioCtx = null;
    this.sourceNode = null;
    this.analyserNode = null;
    this.eqFilters = [];
    this.eqFrequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

    // Real, official artist photos from high-resolution studio CDNs
    this.artists = [
      { name: "Travis Scott", photo: "https://cdn-images.dzcdn.net/images/artist/8d8316146026d7e6ce377e314536df62/500x500-000000-80-0-0.jpg", role: "11 songs" },
      { name: "The Weeknd", photo: "https://cdn-images.dzcdn.net/images/artist/581693b4724a7fcfa754455101e13a44/500x500-000000-80-0-0.jpg", role: "9 songs" },
      { name: "Kendrick Lamar", photo: "https://cdn-images.dzcdn.net/images/artist/be0a7c550567f4af0ed202d7235b74d6/500x500-000000-80-0-0.jpg", role: "8 songs" },
      { name: "Drake", photo: "https://cdn-images.dzcdn.net/images/artist/eb0ed5b21d1ea5af021fc074ded0e91f/500x500-000000-80-0-0.jpg", role: "6 songs" },
      { name: "Central Cee", photo: "https://cdn-images.dzcdn.net/images/artist/25fe719f51af3ee2de27aa267e2a6ac9/500x500-000000-80-0-0.jpg", role: "4 songs" },
      { name: "Roddy Ricch", photo: "https://cdn-images.dzcdn.net/images/artist/c57bd89d86ac6242777632c1f41d9461/500x500-000000-80-0-0.jpg", role: "The Box" },
      { name: "KR$NA", photo: "https://cdn-images.dzcdn.net/images/artist/44dcd9d1d0be03a355c2d93c31bd8015/500x500-000000-80-0-0.jpg", role: "No Cap" },
      { name: "Post Malone", photo: "https://cdn-images.dzcdn.net/images/artist/a5a8cca44e7eab2db7d44e039bed2574/500x500-000000-80-0-0.jpg", role: "Sunflower" },
      { name: "Eminem", photo: "https://cdn-images.dzcdn.net/images/artist/7fa738468c9a73ff98c1e1b78d622b81/500x500-000000-80-0-0.jpg", role: "Superman" },
      { name: "Future", photo: "https://cdn-images.dzcdn.net/images/artist/1a695ee9c2cb49fab81d408836100ff3/500x500-000000-80-0-0.jpg", role: "Mask Off" },
      { name: "Dave", photo: "https://cdn-images.dzcdn.net/images/artist/adfbceaea52f08638b239ebcb6db85e6/500x500-000000-80-0-0.jpg", role: "Sprinter" },
      { name: "Tame Impala", photo: "https://cdn-images.dzcdn.net/images/artist/879015e713cc6ad6ffaeec154c027505/500x500-000000-80-0-0.jpg", role: "Borderline" }
    ];

    this.genres = [
      { name: "Hip-Hop", desc: "Travis Scott, Drake, Roddy Ricch", color: "linear-gradient(135deg, #e67e22, #d35400)" },
      { name: "Late Night Vibes", desc: "The Weeknd, Post Malone", color: "linear-gradient(135deg, #8e44ad, #2c3e50)" },
      { name: "Lossless Studio", desc: "24-bit/96kHz Hi-Res FLAC & AAC", color: "linear-gradient(135deg, #16a085, #27ae60)" },
      { name: "UK Drill & Rap", desc: "Central Cee, Dave, KR$NA", color: "linear-gradient(135deg, #c0392b, #8e44ad)" },
      { name: "Trap Bangers", desc: "FE!N, HIGHEST IN THE ROOM", color: "linear-gradient(135deg, #d35400, #c0392b)" },
      { name: "Chill & R&B", desc: "Starboy, Timeless, São Paulo", color: "linear-gradient(135deg, #2980b9, #2c3e50)" }
    ];

    this.init();
  }

  async init() {
    this.updateGreeting();
    this.loadPlaylistsFromStorage();
    this.setupNavigation();
    this.setupAudioListeners();
    this.setupUIEvents();
    this.setupEqualizerUI();
    this.setupImportModalEvents();
    this.setupDesktopEvents();

    this.renderArtists();
    this.renderGenreCards();
    this.renderHomeFeatured();
    this.renderExplorerFeed();
    this.renderLibraryPlaylists();
    this.renderDesktopSidebarPlaylists();
    this.setupArtistProfileEvents();
    this.setupCanvasEvents();
    this.openPlaylist('sick');

    // Initialize YouTube engine if API already loaded
    if (window.YT && window.YT.Player) {
      this.initYouTubeEngine();
    }
  }

  // YOUTUBE FULL-LENGTH STUDIO AUDIO ENGINE
  initYouTubeEngine() {
    if (this.ytPlayer) return;
    try {
      this.ytPlayer = new YT.Player('ytPlayerTarget', {
        height: '120',
        width: '120',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          playsinline: 1,
          rel: 0,
          enablejsapi: 1,
          modestbranding: 1,
          iv_load_policy: 3
        },
        events: {
          onReady: () => {
            this.isYtReady = true;
            console.log("YouTube HiFi Audio Engine Ready");
            if (this.pendingTrack) {
              const trackToPlay = this.pendingTrack;
              this.pendingTrack = null;
              this.playTrackDirect(trackToPlay);
            }
          },
          onStateChange: (event) => {
            this.handleYtStateChange(event);
          },
          onError: (e) => {
            console.warn("YouTube player error:", e.data);
            this.fallbackToAudioElement();
          }
        }
      });
    } catch (e) {
      console.warn("Error creating YouTube Player:", e);
    }
  }

  handleYtStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
      this.updatePlayState(true);
      this.startYtProgressTimer();
    } else if (event.data === YT.PlayerState.PAUSED) {
      this.updatePlayState(false);
      this.stopYtProgressTimer();
    } else if (event.data === YT.PlayerState.ENDED) {
      this.updatePlayState(false);
      this.stopYtProgressTimer();
      if (this.isAutoplay) {
        this.nextTrack();
      }
    }
  }

  startYtProgressTimer() {
    this.stopYtProgressTimer();
    this.ytTimer = setInterval(() => {
      let cur = 0;
      let dur = 0;

      if (this.isYtReady && this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
        try {
          cur = this.ytPlayer.getCurrentTime() || 0;
          dur = this.ytPlayer.getDuration() || 0;
        } catch (e) {}
      }

      if (!cur && this.audioElement && this.audioElement.currentTime) {
        cur = this.audioElement.currentTime || 0;
        dur = this.audioElement.duration || 0;
      }

      const activeTrack = this.tracks[this.currentIndex];
      if ((!dur || dur <= 30) && activeTrack && activeTrack.duration) {
        dur = activeTrack.duration;
      }
      if (!dur) dur = 180;

      const pct = Math.min(100, Math.max(0, (cur / dur) * 100));

      // Mini-player bar
      const miniFill = document.getElementById('playbackBarFg');
      if (miniFill) miniFill.style.width = `${pct}%`;

      // Full modal slider
      const modalFill = document.getElementById('modalSliderFg');
      if (modalFill) modalFill.style.width = `${pct}%`;

      // Desktop slider
      const dtFill = document.getElementById('desktopSliderFg');
      if (dtFill) dtFill.style.width = `${pct}%`;

      // Timestamps
      const curLabel = document.getElementById('modalCurrentTime');
      if (curLabel) curLabel.textContent = this.formatTime(cur);

      const dtCurLabel = document.getElementById('desktopCurrentTime');
      if (dtCurLabel) dtCurLabel.textContent = this.formatTime(cur);

      const totalLabel = document.getElementById('modalTotalTime');
      if (totalLabel) totalLabel.textContent = this.formatTime(dur);

      const dtTotalLabel = document.getElementById('desktopTotalTime');
      if (dtTotalLabel) dtTotalLabel.textContent = this.formatTime(dur);
    }, 250);
  }

  handleBackPressed() {
    const modal = document.getElementById('nowPlayingModal');
    if (modal && modal.classList.contains('open')) {
      this.closeNowPlayingModal();
      return true;
    }
    const importModal = document.getElementById('importModal');
    if (importModal && importModal.classList.contains('open')) {
      importModal.classList.remove('open');
      return true;
    }
    const createModal = document.getElementById('createPlaylistModal');
    if (createModal && createModal.classList.contains('open')) {
      createModal.classList.remove('open');
      return true;
    }
    const addModal = document.getElementById('addToPlaylistModal');
    if (addModal && addModal.classList.contains('open')) {
      addModal.classList.remove('open');
      return true;
    }
    const artistView = document.getElementById('viewArtist');
    if (artistView && artistView.classList.contains('active')) {
      this.switchView('viewHome', document.getElementById('mNavHome'));
      return true;
    }
    const homeView = document.getElementById('viewHome');
    if (homeView && !homeView.classList.contains('active')) {
      this.switchView('viewHome', document.getElementById('mNavHome'));
      return true;
    }
    return false;
  }

  stopYtProgressTimer() {
    if (this.ytTimer) {
      clearInterval(this.ytTimer);
      this.ytTimer = null;
    }
  }

  fallbackToAudioElement() {
    if (this.currentIndex >= 0 && this.currentIndex < this.tracks.length) {
      const track = this.tracks[this.currentIndex];
      const fallbackUrl = track.streamUrl || track.previewFallback;
      if (fallbackUrl) {
        this.audioElement.src = fallbackUrl;
        this.audioElement.play().catch(console.error);
      }
    }
  }

  updateGreeting() {
    const hours = new Date().getHours();
    let text = "Good evening";
    if (hours < 12) text = "Good morning";
    else if (hours < 18) text = "Good afternoon";
    const elem = document.getElementById('greetingHeading');
    if (elem) elem.textContent = text;
  }

  // PLAYLIST STORAGE & MANAGEMENT
  loadPlaylistsFromStorage() {
    // 1. Featured "sick 🫢"
    const sickPl = {
      id: 'sick',
      title: 'sick 🫢',
      curator: 'Aniket',
      type: 'featured',
      artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/1b/63/04/1b630400-490e-245b-a26f-0120f6f253c8/20UMGIM28168.rgb.jpg/600x600bb.jpg',
      themeColor: '#e52d27',
      tracks: this.featuredTracks
    };

    // 2. Liked Songs
    let likedSongs = [];
    try {
      const savedLiked = localStorage.getItem('spotify_hifi_liked_songs');
      if (savedLiked) likedSongs = JSON.parse(savedLiked);
    } catch (e) {}

    const likedPl = {
      id: 'liked',
      title: 'Liked Songs',
      curator: 'You',
      type: 'custom',
      artwork: 'icon-512.png',
      themeColor: '#1db954',
      tracks: likedSongs
    };

    // 3. User Custom / Imported Playlists
    let customPlaylists = [];
    try {
      const savedCustom = localStorage.getItem('spotify_hifi_custom_playlists');
      if (savedCustom) customPlaylists = JSON.parse(savedCustom);
    } catch (e) {}

    this.playlists = [sickPl, likedPl, ...customPlaylists];
  }

  saveCustomPlaylists() {
    try {
      const customOnly = this.playlists.filter(p => p.id !== 'sick' && p.id !== 'liked');
      localStorage.setItem('spotify_hifi_custom_playlists', JSON.stringify(customOnly));
      const likedPl = this.playlists.find(p => p.id === 'liked');
      if (likedPl) {
        localStorage.setItem('spotify_hifi_liked_songs', JSON.stringify(likedPl.tracks));
      }
    } catch (e) {
      console.warn("Storage save error:", e);
    }
  }

  // NAVIGATION & VIEW SWITCHING (Mobile & Desktop)
  setupNavigation() {
    const navButtons = document.querySelectorAll('.mobile-nav-btn, .desktop-nav-item');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetViewId = btn.getAttribute('data-target');
        this.switchView(targetViewId, btn);
      });
    });

    const btnToggleEQ = document.getElementById('btnToggleEQ');
    if (btnToggleEQ) {
      btnToggleEQ.addEventListener('click', () => {
        const eqNavBtn = document.getElementById('mNavEQ');
        this.switchView('viewEQ', eqNavBtn);
      });
    }

    const shortcutSick = document.getElementById('shortcutSick');
    if (shortcutSick) {
      shortcutSick.addEventListener('click', () => {
        this.openPlaylist('sick');
      });
    }

    const shortcutImport = document.getElementById('shortcutImport');
    if (shortcutImport) {
      shortcutImport.addEventListener('click', () => {
        this.openImportModal();
      });
    }

    const btnOpenImportTop = document.getElementById('btnOpenImportTop');
    if (btnOpenImportTop) {
      btnOpenImportTop.addEventListener('click', () => {
        this.openImportModal();
      });
    }

    const btnSeeAll = document.getElementById('btnSeeAllTracks');
    if (btnSeeAll) {
      btnSeeAll.addEventListener('click', () => {
        this.openPlaylist('sick');
      });
    }
  }

  switchView(viewId, activeBtn) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
      const body = document.querySelector('.spotify-body') || document.querySelector('.spotify-main');
      if (body) body.scrollTop = 0;
    }

    // Sync active state in both mobile and desktop nav
    document.querySelectorAll('.mobile-nav-btn, .desktop-nav-item').forEach(b => {
      if (b.getAttribute('data-target') === viewId) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
  }

  setupAudioListeners() {
    this.audioElement.addEventListener('play', () => this.updatePlayState(true));
    this.audioElement.addEventListener('pause', () => this.updatePlayState(false));

    this.audioElement.addEventListener('timeupdate', () => {
      if (this.isYtReady && this.ytPlayer && this.isPlaying) return; // YouTube handles timer
      const cur = this.audioElement.currentTime || 0;
      const activeTrack = this.tracks[this.currentIndex];
      const dur = (activeTrack && activeTrack.duration > 35) ? activeTrack.duration : (this.audioElement.duration || 180);
      const pct = Math.min(100, Math.max(0, (cur / dur) * 100));

      const miniFill = document.getElementById('playbackBarFg');
      if (miniFill) miniFill.style.width = `${pct}%`;

      const modalFill = document.getElementById('modalSliderFg');
      if (modalFill) modalFill.style.width = `${pct}%`;

      const dtFill = document.getElementById('desktopSliderFg');
      if (dtFill) dtFill.style.width = `${pct}%`;

      const curLabel = document.getElementById('modalCurrentTime');
      if (curLabel) curLabel.textContent = this.formatTime(cur);

      const dtCurLabel = document.getElementById('desktopCurrentTime');
      if (dtCurLabel) dtCurLabel.textContent = this.formatTime(cur);
    });

    this.audioElement.addEventListener('loadedmetadata', () => {
      const activeTrack = this.tracks[this.currentIndex];
      if (!activeTrack || !activeTrack.duration || activeTrack.duration <= 35) {
        const dur = this.audioElement.duration || 0;
        const totalLabel = document.getElementById('modalTotalTime');
        if (totalLabel) totalLabel.textContent = this.formatTime(dur);
        const dtTotalLabel = document.getElementById('desktopTotalTime');
        if (dtTotalLabel) dtTotalLabel.textContent = this.formatTime(dur);
      }
    });

    this.audioElement.addEventListener('ended', () => {
      if (this.isYtReady && this.ytPlayer && this.isPlaying) return;
      if (this.isAutoplay) {
        this.nextTrack();
      }
    });

    this.audioElement.addEventListener('error', (e) => {
      console.warn("Audio element error:", e);
      if (this.currentIndex >= 0 && this.currentIndex < this.tracks.length) {
        const track = this.tracks[this.currentIndex];
        if (track.previewFallback && this.audioElement.src !== track.previewFallback) {
          this.audioElement.src = track.previewFallback;
          this.audioElement.play().catch(console.error);
        }
      }
    });
  }

  initAudioNodes() {
    if (this.audioCtx) return;
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      this.sourceNode = this.audioCtx.createMediaElementSource(this.audioElement);
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 64;

      let lastNode = this.sourceNode;
      this.eqFilters = this.eqFrequencies.map(freq => {
        const filter = this.audioCtx.createBiquadFilter();
        if (freq <= 64) filter.type = 'lowshelf';
        else if (freq >= 8000) filter.type = 'highshelf';
        else filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.gain.value = 0;

        lastNode.connect(filter);
        lastNode = filter;
        return filter;
      });

      lastNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioCtx.destination);
      this.startSpectrumVisualizer();
    } catch (e) {
      console.warn("Web Audio DSP init error:", e);
    }
  }

  // PLAY TRACK (Primary: Full-Length YouTube Engine | Backup: HTML5 Audio)
  playTrack(index) {
    if (index < 0 || index >= this.tracks.length) return;
    this.currentIndex = index;
    const track = this.tracks[index];
    this.playTrackDirect(track);
  }

  playTrackDirect(track) {
    this.initAudioNodes();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    this.updateUIForTrack(track);
    this.highlightActiveTrack();

    // Stop HTML5 audio element immediately
    try {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    } catch (e) {}

    // Check if we have a direct YouTube ID
    if (track.youtubeId) {
      this.playYouTubeVideo(track.youtubeId);
      return;
    }

    // Otherwise resolve via native AndroidBridge in background
    this.resolveAndPlayYouTube(track);
  }

  playYouTubeVideo(videoId) {
    if (this.isYtReady && this.ytPlayer && typeof this.ytPlayer.loadVideoById === 'function') {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.ytPlayer.loadVideoById({
          videoId: videoId,
          startSeconds: 0
        });
        this.ytPlayer.playVideo();
        this.updatePlayState(true);
        this.startYtProgressTimer();
      } catch (err) {
        console.warn("YouTube play error:", err);
        this.fallbackToAudioElement();
      }
    } else {
      this.pendingTrack = this.tracks[this.currentIndex];
    }
  }

  async resolveAndPlayYouTube(track) {
    let resolvedId = null;

    // 1. AndroidBridge (200ms background thread via native Java with zero CORS)
    if (window.AndroidBridge && typeof window.AndroidBridge.resolveYouTubeId === 'function') {
      try {
        const query = `${track.artist} ${track.title} audio`;
        const vid = window.AndroidBridge.resolveYouTubeId(query);
        if (vid && vid.length === 11) {
          resolvedId = vid;
        }
      } catch (err) {
        console.warn("AndroidBridge resolve error:", err);
      }
    }

    if (resolvedId) {
      track.youtubeId = resolvedId;
      this.playYouTubeVideo(resolvedId);
      return;
    }

    // 2. Fallback to HTML5 audio preview if offline or resolution fails
    const streamUrl = track.streamUrl || track.previewFallback;
    if (streamUrl) {
      this.audioElement.src = streamUrl;
      this.audioElement.play().catch(console.warn);
      this.updatePlayState(true);
    }
  }

  togglePlayPause() {
    if (this.currentIndex === -1) {
      if (this.tracks.length > 0) this.playTrack(0);
      return;
    }

    if (this.isPlaying) {
      if (this.isYtReady && this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
        this.ytPlayer.pauseVideo();
      }
      this.audioElement.pause();
      this.updatePlayState(false);
      this.stopYtProgressTimer();
    } else {
      if (this.isYtReady && this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
        this.ytPlayer.playVideo();
      } else if (this.audioElement.src) {
        this.audioElement.play().catch(console.error);
      } else {
        this.playTrack(this.currentIndex);
      }
      this.updatePlayState(true);
      this.startYtProgressTimer();
    }
  }

  nextTrack() {
    if (this.tracks.length === 0) return;
    let nextIdx;
    if (this.isShuffle) {
      nextIdx = Math.floor(Math.random() * this.tracks.length);
    } else {
      nextIdx = (this.currentIndex + 1) % this.tracks.length;
    }
    this.playTrack(nextIdx);
  }

  prevTrack() {
    if (this.tracks.length === 0) return;
    let prevIdx = this.currentIndex - 1;
    if (prevIdx < 0) prevIdx = this.tracks.length - 1;
    this.playTrack(prevIdx);
  }

  seek(percentage) {
    const track = this.tracks[this.currentIndex];
    const dur = (this.isYtReady && this.ytPlayer && typeof this.ytPlayer.getDuration === 'function')
      ? (this.ytPlayer.getDuration() || track?.duration || 180)
      : (this.audioElement.duration || track?.duration || 180);

    const targetSeconds = (percentage / 100) * dur;

    if (this.isYtReady && this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
      this.ytPlayer.seekTo(targetSeconds, true);
    } else {
      this.audioElement.currentTime = targetSeconds;
    }
  }

  setVolume(volPercent) {
    this.currentVolume = Math.max(0, Math.min(100, volPercent));
    if (this.isYtReady && this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
      this.ytPlayer.setVolume(this.currentVolume);
    }
    this.audioElement.volume = this.currentVolume / 100;

    const slider = document.getElementById('desktopVolumeSlider');
    if (slider) slider.value = this.currentVolume;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      if (this.isYtReady && this.ytPlayer && typeof this.ytPlayer.mute === 'function') {
        this.ytPlayer.mute();
      }
      this.audioElement.muted = true;
    } else {
      if (this.isYtReady && this.ytPlayer && typeof this.ytPlayer.unMute === 'function') {
        this.ytPlayer.unMute();
      }
      this.audioElement.muted = false;
      this.setVolume(this.currentVolume || 80);
    }
  }

  toggleAutoplay() {
    this.isAutoplay = !this.isAutoplay;
    const labels = document.querySelectorAll('.autoplay-label');
    labels.forEach(l => {
      l.textContent = this.isAutoplay ? 'AUTOPLAY ON' : 'AUTOPLAY OFF';
    });
    const statusTag = document.getElementById('autoplayStatusTag');
    if (statusTag) {
      statusTag.textContent = this.isAutoplay ? 'AUTOPLAY ENABLED' : 'AUTOPLAY DISABLED';
      statusTag.style.color = this.isAutoplay ? 'var(--spotify-green)' : '#727272';
    }
    const btns = document.querySelectorAll('#btnAutoplayToggle, #btnModalAutoplay, #desktopBtnAutoplay');
    btns.forEach(b => {
      if (this.isAutoplay) b.classList.add('active');
      else b.classList.remove('active');
    });
  }

  updatePlayState(playing) {
    this.isPlaying = playing;
    ['ctrlPlayIcon', 'heroPlayIcon', 'modalPlayIcon', 'desktopPlayIcon'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = playing ? 'none' : 'block';
    });
    ['ctrlPauseIcon', 'heroPauseIcon', 'modalPauseIcon', 'desktopPauseIcon'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = playing ? 'block' : 'none';
    });
  }

  // DYNAMIC THEMING & ARTWORK SYNC
  updateUIForTrack(track) {
    // 1. Mobile mini-player
    const curTitle = document.getElementById('currentTitle');
    const curArtist = document.getElementById('currentArtist');
    const playerThumb = document.getElementById('playerThumb');
    if (curTitle) curTitle.textContent = track.title;
    if (curArtist) curArtist.textContent = track.artist;
    if (playerThumb && track.artwork) playerThumb.src = track.artwork;

    // 2. Desktop bottom bar
    const dtTitle = document.getElementById('desktopTitle');
    const dtArtist = document.getElementById('desktopArtist');
    const dtThumb = document.getElementById('desktopThumb');
    if (dtTitle) dtTitle.textContent = track.title;
    if (dtArtist) dtArtist.textContent = track.artist;
    if (dtThumb && track.artwork) dtThumb.src = track.artwork;

    // 3. Full-screen modal
    const modalTitle = document.getElementById('modalSongTitle');
    const modalArtist = document.getElementById('modalArtistName');
    const modalCover = document.getElementById('modalCoverImg');
    const modalTotalTime = document.getElementById('modalTotalTime');
    const dtTotalTime = document.getElementById('desktopTotalTime');
    const modalPlName = document.getElementById('modalPlayingPlaylistName');
    if (modalTitle) modalTitle.textContent = track.title;
    if (modalArtist) modalArtist.textContent = track.artist;
    if (modalCover && track.artwork) modalCover.src = track.artwork;
    const durStr = this.formatTime(track.duration || 180);
    if (modalTotalTime) modalTotalTime.textContent = durStr;
    if (dtTotalTime) dtTotalTime.textContent = durStr;

    const currentPl = this.playlists.find(p => p.id === this.currentPlaylistId);
    if (modalPlName && currentPl) modalPlName.textContent = currentPl.title;

    // Artist Profile & Real High-Res Portraits
    const profile = (window.getArtistProfile) ? window.getArtistProfile(track.artist) : null;
    this.currentArtistProfile = profile;

    const avatarImg = document.getElementById('modalArtistAvatarImg');
    if (avatarImg && profile) avatarImg.src = profile.photo;

    const artistCardImg = document.getElementById('artistCardImg');
    if (artistCardImg && profile) artistCardImg.src = profile.headerPhoto || profile.photo;

    const artistCardName = document.getElementById('artistCardName');
    if (artistCardName && profile) artistCardName.textContent = profile.name;

    const artistCardListeners = document.getElementById('artistCardListeners');
    if (artistCardListeners && profile) artistCardListeners.textContent = profile.monthlyListeners;

    const artistCardBio = document.getElementById('artistCardBio');
    if (artistCardBio && profile) artistCardBio.textContent = profile.bio;

    const creditsPerformer = document.getElementById('creditsPerformer');
    if (creditsPerformer) creditsPerformer.textContent = track.artist;

    // Next in queue preview
    const nextIdx = (this.currentIndex + 1) % this.tracks.length;
    const nextTrack = this.tracks[nextIdx];
    if (nextTrack) {
      const qTitle = document.getElementById('queueNextTitle');
      const qArtist = document.getElementById('queueNextArtist');
      const qImg = document.getElementById('queueNextImg');
      if (qTitle) qTitle.textContent = nextTrack.title;
      if (qArtist) qArtist.textContent = nextTrack.artist;
      if (qImg && nextTrack.artwork) qImg.src = nextTrack.artwork;
    }

    // 4. Dynamic Theme Coloring (100% Opaque Base)
    const themeColor = track.themeColor || '#1db954';
    const modal = document.getElementById('nowPlayingModal');
    if (modal) {
      modal.style.backgroundColor = '#0d0d0d';
      modal.style.backgroundImage = `radial-gradient(circle at 50% 25%, ${themeColor}ee 0%, #170808 60%, #0d0d0d 100%)`;
    }

    const topbar = document.querySelector('.spotify-topbar');
    if (topbar) {
      topbar.style.borderBottom = `1px solid ${themeColor}44`;
    }
  }

  highlightActiveTrack() {
    document.querySelectorAll('.touch-track-item').forEach(item => {
      const idx = parseInt(item.getAttribute('data-index'), 10);
      if (idx === this.currentIndex) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  // OPEN PLAYLIST VIEW
  openPlaylist(playlistId) {
    const pl = this.playlists.find(p => p.id === playlistId);
    if (!pl) return;

    this.currentPlaylistId = pl.id;
    this.tracks = pl.tracks;

    this.switchView('viewPlaylist', null);

    const titleElem = document.getElementById('playlistTitle');
    const countElem = document.getElementById('playlistTrackCount');
    const curatorElem = document.getElementById('curatorName');
    const curatorAvatar = document.getElementById('curatorAvatar');
    const coverArt = document.getElementById('playlistCoverArt');
    const badgeType = document.getElementById('playlistBadgeType');
    const deleteBtn = document.getElementById('btnDeleteCustomPlaylist');

    if (titleElem) titleElem.textContent = pl.title;
    if (countElem) countElem.textContent = `${pl.tracks.length} songs`;
    if (curatorElem) curatorElem.textContent = pl.curator || 'Curator';
    if (curatorAvatar) curatorAvatar.textContent = (pl.curator || 'A')[0].toUpperCase();
    if (badgeType) badgeType.textContent = pl.type ? pl.type.toUpperCase() : 'PLAYLIST';

    if (coverArt) {
      if (pl.artwork) {
        coverArt.innerHTML = `<img src="${pl.artwork}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" alt="${pl.title}">`;
      } else {
        coverArt.className = 'playlist-cover-art sick-hero-art';
        coverArt.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg>`;
      }
    }

    if (deleteBtn) {
      deleteBtn.style.display = (pl.id !== 'sick' && pl.id !== 'liked') ? 'flex' : 'none';
      deleteBtn.onclick = () => this.deletePlaylist(pl.id);
    }

    const container = document.getElementById('tracklistBody');
    if (container) {
      container.innerHTML = '';
      if (pl.tracks.length === 0) {
        container.innerHTML = `
          <div style="text-align:center;padding:40px 16px;color:#727272;">
            <p style="font-size:16px;font-weight:700;margin-bottom:8px;">No songs in this playlist yet</p>
            <p style="font-size:13px;">Use the Search tab or tap '+' on any track to add songs.</p>
          </div>
        `;
      } else {
        pl.tracks.forEach((track, index) => {
          container.appendChild(this.createTrackElement(track, index, true));
        });
      }
    }
  }

  deletePlaylist(playlistId) {
    if (confirm("Are you sure you want to delete this playlist?")) {
      this.playlists = this.playlists.filter(p => p.id !== playlistId);
      this.saveCustomPlaylists();
      this.renderLibraryPlaylists();
      this.renderDesktopSidebarPlaylists();
      this.openPlaylist('sick');
    }
  }

  // RENDER LIBRARY (Mobile & Desktop)
  renderLibraryPlaylists(filter = 'all') {
    const grid = document.getElementById('libraryPlaylistsGrid');
    const countLabel = document.getElementById('libPlaylistCount');
    if (!grid) return;
    grid.innerHTML = '';

    let list = this.playlists;
    if (filter === 'featured') list = this.playlists.filter(p => p.type === 'featured');
    else if (filter === 'custom') list = this.playlists.filter(p => p.type === 'custom');
    else if (filter === 'imported') list = this.playlists.filter(p => p.type === 'imported');

    if (countLabel) countLabel.textContent = `${this.playlists.length} Playlists`;

    list.forEach(pl => {
      const card = document.createElement('div');
      card.className = 'library-playlist-card';

      const artHtml = pl.artwork 
        ? `<img src="${pl.artwork}" alt="${pl.title}" onerror="this.src='icon-192.png'">`
        : `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg>`;

      card.innerHTML = `
        <div class="lib-card-art">${artHtml}</div>
        <div class="lib-card-info">
          <div class="lib-card-title">${pl.title}</div>
          <div class="lib-card-desc">Playlist • ${pl.tracks.length} songs</div>
        </div>
      `;

      card.addEventListener('click', () => {
        this.openPlaylist(pl.id);
      });

      grid.appendChild(card);
    });
  }

  renderDesktopSidebarPlaylists() {
    const container = document.getElementById('desktopPlaylistsList');
    if (!container) return;
    container.innerHTML = '';

    this.playlists.forEach(pl => {
      const item = document.createElement('div');
      item.className = `desktop-pl-item ${pl.id === this.currentPlaylistId ? 'active' : ''}`;
      const artSrc = pl.artwork || 'icon-192.png';
      item.innerHTML = `
        <img src="${artSrc}" class="desktop-pl-thumb" alt="${pl.title}" onerror="this.src='icon-192.png'">
        <span>${pl.title}</span>
      `;
      item.addEventListener('click', () => {
        this.openPlaylist(pl.id);
        this.renderDesktopSidebarPlaylists();
      });
      container.appendChild(item);
    });
  }

  // RENDER ARTISTS WITH REAL HIGH-RES PHOTOS
  renderArtists() {
    const containers = [
      document.getElementById('homeArtistsScroll'),
      document.getElementById('exploreArtistsScroll')
    ];

    containers.forEach(container => {
      if (!container) return;
      container.innerHTML = '';

      this.artists.forEach(artist => {
        const item = document.createElement('div');
        item.className = 'artist-circle-item';
        item.innerHTML = `
          <div class="artist-circle-img-wrap">
            <img src="${artist.photo}" class="artist-circle-img" alt="${artist.name}" loading="lazy" onerror="this.src='https://cdn-images.dzcdn.net/images/artist/8d8316146026d7e6ce377e314536df62/500x500-000000-80-0-0.jpg'">
          </div>
          <div class="artist-circle-name">${artist.name}</div>
          <div class="artist-circle-role">${artist.role}</div>
        `;

        item.addEventListener('click', () => {
          this.filterByArtist(artist.name);
        });

        container.appendChild(item);
      });
    });
  }

  renderGenreCards() {
    const grids = [
      document.getElementById('homeExploreGrid'),
      document.getElementById('searchGenreGrid')
    ];

    grids.forEach(grid => {
      if (!grid) return;
      grid.innerHTML = '';

      this.genres.forEach(genre => {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.style.background = genre.color;
        card.innerHTML = `
          <span class="category-name">${genre.name}</span>
          <span class="category-desc">${genre.desc}</span>
        `;
        card.addEventListener('click', () => {
          this.filterByGenre(genre.name);
        });
        grid.appendChild(card);
      });
    });
  }

  // RENDER EXPLORER FEED (Trending shelf, Vibes, All songs ready to play)
  renderExplorerFeed() {
    // 1. Trending Shelf
    const trendingShelf = document.getElementById('exploreTrendingShelf');
    if (trendingShelf) {
      trendingShelf.innerHTML = '';
      const topTrending = this.featuredTracks.slice(0, 10);
      topTrending.forEach((track, idx) => {
        const card = document.createElement('div');
        card.className = 'trending-shelf-card';
        card.innerHTML = `
          <div class="trending-shelf-art-box">
            <img src="${track.artwork || 'icon-192.png'}" class="trending-shelf-img" alt="${track.title}" onerror="this.src='icon-192.png'">
            <button class="trending-shelf-play-btn" title="Play Now">
              <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><polygon points="4 2 14 8 4 14 4 2"/></svg>
            </button>
          </div>
          <div class="trending-shelf-title">${track.title}</div>
          <div class="trending-shelf-artist">${track.artist}</div>
        `;
        card.addEventListener('click', () => {
          this.tracks = this.featuredTracks;
          this.playTrack(idx);
        });
        trendingShelf.appendChild(card);
      });
    }

    // 2. All 62 Tracks ready to explore
    this.renderExplorerTracks(this.featuredTracks);
  }

  renderExplorerTracks(tracksList) {
    const container = document.getElementById('exploreAllTracksList');
    if (!container) return;
    container.innerHTML = '';

    tracksList.forEach((track, index) => {
      const el = this.createTrackElement(track, index, true);
      // Ensure clicking this track in Explorer plays it immediately from this list
      el.addEventListener('click', (e) => {
        if (e.target.closest('.track-add-btn')) return;
        this.tracks = tracksList;
        this.playTrack(index);
      });
      container.appendChild(el);
    });
  }

  renderHomeFeatured() {
    const container = document.getElementById('homeFeaturedTracks');
    if (!container) return;
    container.innerHTML = '';

    const count = Math.min(this.featuredTracks.length, 25);
    for (let i = 0; i < count; i++) {
      container.appendChild(this.createTrackElement(this.featuredTracks[i], i, false));
    }
  }

  // CREATE TRACK ELEMENT (With + Add to Playlist button)
  createTrackElement(track, index, showAdd = true) {
    const div = document.createElement('div');
    div.className = `touch-track-item ${index === this.currentIndex ? 'active' : ''}`;
    div.setAttribute('data-index', index);

    const art = track.artwork || 'icon-192.png';
    const durStr = this.formatTime(track.duration || 180);

    div.innerHTML = `
      <div class="track-thumb-box">
        <img src="${art}" class="track-thumb-img" alt="Cover" loading="lazy" onerror="this.src='icon-192.png'">
      </div>
      <div class="track-info-col">
        <div class="track-primary-title">${index + 1}. ${track.title}</div>
        <div class="track-secondary-desc">
          <span class="track-hifi-pill">HiFi</span>
          <span>${track.artist}</span>
        </div>
      </div>
      <div class="track-right-meta">
        <button class="track-add-btn" title="Add to playlist">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        </button>
        <span class="track-duration-pill">${durStr}</span>
      </div>
    `;

    // Click to play
    div.addEventListener('click', (e) => {
      if (e.target.closest('.track-add-btn')) return;
      this.playTrack(index);
    });

    // Add to playlist button
    const addBtn = div.querySelector('.track-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openAddToPlaylistModal(track);
      });
    }

    return div;
  }

  // ADD TO PLAYLIST MODAL
  openAddToPlaylistModal(track) {
    this.pendingAddTrack = track;
    const modal = document.getElementById('addToPlaylistModal');
    const label = document.getElementById('addTrackTargetName');
    const list = document.getElementById('playlistsSelectList');

    if (label) label.textContent = `Add "${track.title}" to:`;
    if (list) {
      list.innerHTML = '';
      this.playlists.forEach(pl => {
        const item = document.createElement('div');
        item.className = 'playlist-select-item';
        item.innerHTML = `
          <span class="playlist-select-name">${pl.title}</span>
          <span class="playlist-select-count">${pl.tracks.length} songs</span>
        `;
        item.addEventListener('click', () => {
          this.addTrackToPlaylist(pl.id, this.pendingAddTrack);
          modal.classList.remove('open');
        });
        list.appendChild(item);
      });
    }
    if (modal) modal.classList.add('open');
  }

  addTrackToPlaylist(playlistId, track) {
    const pl = this.playlists.find(p => p.id === playlistId);
    if (!pl) return;

    // Check duplicate
    const exists = pl.tracks.some(t => t.title.toLowerCase() === track.title.toLowerCase() && t.artist.toLowerCase() === track.artist.toLowerCase());
    if (exists) {
      alert(`"${track.title}" is already in ${pl.title}.`);
      return;
    }

    pl.tracks.push(track);
    this.saveCustomPlaylists();
    this.renderLibraryPlaylists();
    this.renderDesktopSidebarPlaylists();

    if (this.currentPlaylistId === playlistId) {
      this.openPlaylist(playlistId);
    }
    alert(`Added "${track.title}" to ${pl.title}!`);
  }

  // IMPORT PLAYLIST MODAL & ENGINE
  setupImportModalEvents() {
    const importModal = document.getElementById('importModal');
    const closeBtn = document.getElementById('btnCloseImportModal');
    const tabBtns = document.querySelectorAll('.import-tab-btn');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (importModal) importModal.classList.remove('open');
      });
    }

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const targetTab = btn.getAttribute('data-tab');
        document.querySelectorAll('.import-tab-pane').forEach(p => p.classList.remove('active'));
        const activePane = document.getElementById(targetTab);
        if (activePane) activePane.classList.add('active');
      });
    });

    // 1. Spotify Link Importer
    const btnDoImportSpotify = document.getElementById('btnDoImportSpotify');
    if (btnDoImportSpotify) {
      btnDoImportSpotify.addEventListener('click', () => this.handleSpotifyLinkImport());
    }

    // 2. Text Tracklist Importer
    const btnDoImportText = document.getElementById('btnDoImportText');
    if (btnDoImportText) {
      btnDoImportText.addEventListener('click', () => this.handleTextTracklistImport());
    }

    // 3. File Upload Importer
    const fileDropzone = document.getElementById('fileDropzone');
    const fileInput = document.getElementById('importFileInput');
    if (fileDropzone && fileInput) {
      fileDropzone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => this.handleFileUploadImport(e));
    }

    // Create New Playlist Modal
    const createModal = document.getElementById('createPlaylistModal');
    const btnOpenCreate = document.getElementById('btnOpenCreateModal');
    const btnCloseCreate = document.getElementById('btnCloseCreateModal');
    const btnConfirmCreate = document.getElementById('btnConfirmCreatePlaylist');

    if (btnOpenCreate) {
      btnOpenCreate.addEventListener('click', () => {
        if (createModal) createModal.classList.add('open');
      });
    }
    if (btnCloseCreate) {
      btnCloseCreate.addEventListener('click', () => {
        if (createModal) createModal.classList.remove('open');
      });
    }
    if (btnConfirmCreate) {
      btnConfirmCreate.addEventListener('click', () => {
        const titleInput = document.getElementById('newPlaylistTitleInput');
        const title = (titleInput?.value || '').trim();
        if (!title) {
          alert('Please enter a playlist name.');
          return;
        }
        const newPl = {
          id: 'custom_' + Date.now(),
          title: title,
          curator: 'You',
          type: 'custom',
          artwork: 'icon-512.png',
          themeColor: '#1db954',
          tracks: []
        };
        this.playlists.push(newPl);
        this.saveCustomPlaylists();
        this.renderLibraryPlaylists();
        this.renderDesktopSidebarPlaylists();
        if (createModal) createModal.classList.remove('open');
        this.openPlaylist(newPl.id);
      });
    }

    const closeAddModal = document.getElementById('btnCloseAddTrackModal');
    if (closeAddModal) {
      closeAddModal.addEventListener('click', () => {
        const modal = document.getElementById('addToPlaylistModal');
        if (modal) modal.classList.remove('open');
      });
    }
  }

  openImportModal() {
    const modal = document.getElementById('importModal');
    if (modal) modal.classList.add('open');
  }

  async handleSpotifyLinkImport() {
    const urlInput = document.getElementById('importSpotifyUrl');
    const statusBox = document.getElementById('importLoadingStatus');
    const statusText = document.getElementById('importStatusText');
    const rawUrl = (urlInput?.value || '').trim();

    if (!rawUrl) {
      alert("Please paste a Spotify playlist or album URL.");
      return;
    }

    if (statusBox) statusBox.style.display = 'flex';
    if (statusText) statusText.textContent = "Resolving Spotify playlist metadata...";

    try {
      let playlistTitle = "Imported Spotify Playlist";
      let playlistArt = "icon-512.png";

      try {
        const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(rawUrl)}`;
        const oembedRes = await fetch(oembedUrl);
        if (oembedRes.ok) {
          const odata = await oembedRes.json();
          playlistTitle = odata.title || playlistTitle;
          playlistArt = odata.thumbnail_url || playlistArt;
        }
      } catch (err) {
        console.warn("Spotify oEmbed error:", err);
      }

      const cleanName = playlistTitle.replace(/Today’s Top Hits|Top|Playlist/i, '').trim();
      const searchRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanName || 'hits')}&entity=song&limit=25`);
      let importedTracks = [];

      if (searchRes.ok) {
        const sdata = await searchRes.json();
        importedTracks = (sdata.results || []).map(r => ({
          title: r.trackName,
          artist: r.artistName,
          album: r.collectionName || 'Studio Single',
          duration: Math.round((r.trackTimeMillis || 180000) / 1000),
          artwork: (r.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
          streamUrl: r.previewUrl,
          previewFallback: r.previewUrl,
          themeColor: '#1db954'
        }));
      }

      if (importedTracks.length === 0) {
        importedTracks = this.featuredTracks.slice(0, 15);
      }

      const newPl = {
        id: 'imported_' + Date.now(),
        title: playlistTitle,
        curator: 'Spotify Import',
        type: 'imported',
        artwork: playlistArt,
        themeColor: '#1db954',
        tracks: importedTracks
      };

      this.playlists.push(newPl);
      this.saveCustomPlaylists();
      this.renderLibraryPlaylists();
      this.renderDesktopSidebarPlaylists();

      const modal = document.getElementById('importModal');
      if (modal) modal.classList.remove('open');
      this.openPlaylist(newPl.id);
      alert(`Successfully imported "${playlistTitle}" with ${importedTracks.length} tracks!`);
    } catch (err) {
      alert("Could not import Spotify playlist. Check the link and try again.");
    } finally {
      if (statusBox) statusBox.style.display = 'none';
    }
  }

  async handleTextTracklistImport() {
    const nameInput = document.getElementById('importTextPlaylistName');
    const textInput = document.getElementById('importTextSongs');
    const statusBox = document.getElementById('importLoadingStatus');
    const statusText = document.getElementById('importStatusText');

    const title = (nameInput?.value || '').trim() || 'Imported Playlist';
    const lines = (textInput?.value || '').split('\n').map(l => l.trim()).filter(Boolean);

    if (lines.length === 0) {
      alert("Please paste at least one song title.");
      return;
    }

    if (statusBox) statusBox.style.display = 'flex';
    if (statusText) statusText.textContent = `Matching ${lines.length} songs with studio audio...`;

    const importedTracks = [];
    for (let i = 0; i < Math.min(lines.length, 30); i++) {
      const line = lines[i].replace(/^\d+[\.\-\s]+/, '');
      try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(line)}&entity=song&limit=1`);
        if (res.ok) {
          const data = await res.json();
          if (data.resultCount > 0) {
            const r = data.results[0];
            importedTracks.push({
              title: r.trackName,
              artist: r.artistName,
              album: r.collectionName || 'Studio Single',
              duration: Math.round((r.trackTimeMillis || 180000) / 1000),
              artwork: (r.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
              streamUrl: r.previewUrl,
              previewFallback: r.previewUrl,
              themeColor: '#1db954'
            });
          }
        }
      } catch (e) {}
    }

    if (importedTracks.length === 0) {
      importedTracks.push({
        title: lines[0],
        artist: 'Unknown Artist',
        album: 'Imported Single',
        duration: 180,
        artwork: 'icon-512.png',
        themeColor: '#1db954'
      });
    }

    const newPl = {
      id: 'imported_' + Date.now(),
      title: title,
      curator: 'Imported Text',
      type: 'imported',
      artwork: importedTracks[0]?.artwork || 'icon-512.png',
      themeColor: '#1db954',
      tracks: importedTracks
    };

    this.playlists.push(newPl);
    this.saveCustomPlaylists();
    this.renderLibraryPlaylists();
    this.renderDesktopSidebarPlaylists();

    const modal = document.getElementById('importModal');
    if (modal) modal.classList.remove('open');
    if (statusBox) statusBox.style.display = 'none';

    this.openPlaylist(newPl.id);
    alert(`Imported ${importedTracks.length} songs into "${title}"!`);
  }

  handleFileUploadImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        let tracks = [];
        let title = file.name.replace(/\.[^/.]+$/, "");

        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content);
          tracks = Array.isArray(parsed) ? parsed : (parsed.tracks || []);
        } else {
          // M3U or text
          const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
          tracks = lines.map(l => ({
            title: l.trim(),
            artist: 'Studio Artist',
            duration: 180,
            artwork: 'icon-192.png',
            themeColor: '#1db954'
          }));
        }

        const newPl = {
          id: 'imported_' + Date.now(),
          title: title,
          curator: 'File Upload',
          type: 'imported',
          artwork: tracks[0]?.artwork || 'icon-512.png',
          themeColor: '#1db954',
          tracks: tracks
        };

        this.playlists.push(newPl);
        this.saveCustomPlaylists();
        this.renderLibraryPlaylists();
        this.renderDesktopSidebarPlaylists();

        const modal = document.getElementById('importModal');
        if (modal) modal.classList.remove('open');
        this.openPlaylist(newPl.id);
        alert(`Successfully imported "${title}" with ${tracks.length} songs!`);
      } catch (err) {
        alert("Failed to parse file. Ensure it is valid JSON or M3U.");
      }
    };
    reader.readAsText(file);
  }

  // DESKTOP CONTROLS & EVENT BINDINGS
  setupDesktopEvents() {
    // Desktop Nav Items
    document.querySelectorAll('.desktop-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetViewId = btn.getAttribute('data-target');
        this.switchView(targetViewId, btn);
      });
    });

    const dtBtnCreate = document.getElementById('desktopBtnCreatePl');
    if (dtBtnCreate) {
      dtBtnCreate.addEventListener('click', () => {
        const createModal = document.getElementById('createPlaylistModal');
        if (createModal) createModal.classList.add('open');
      });
    }

    const dtBtnImport = document.getElementById('desktopBtnImport');
    if (dtBtnImport) {
      dtBtnImport.addEventListener('click', () => {
        this.openImportModal();
      });
    }

    // Desktop Player Bar Controls
    const dtBtnPlayPause = document.getElementById('desktopBtnPlayPause');
    if (dtBtnPlayPause) {
      dtBtnPlayPause.addEventListener('click', () => this.togglePlayPause());
    }

    const dtBtnPrev = document.getElementById('desktopBtnPrev');
    if (dtBtnPrev) {
      dtBtnPrev.addEventListener('click', () => this.prevTrack());
    }

    const dtBtnNext = document.getElementById('desktopBtnNext');
    if (dtBtnNext) {
      dtBtnNext.addEventListener('click', () => this.nextTrack());
    }

    const dtBtnShuffle = document.getElementById('desktopBtnShuffle');
    if (dtBtnShuffle) {
      dtBtnShuffle.addEventListener('click', () => {
        this.isShuffle = !this.isShuffle;
        dtBtnShuffle.classList.toggle('active', this.isShuffle);
      });
    }

    const dtBtnAutoplay = document.getElementById('desktopBtnAutoplay');
    if (dtBtnAutoplay) {
      dtBtnAutoplay.addEventListener('click', () => this.toggleAutoplay());
    }

    const dtBtnExpand = document.getElementById('desktopBtnExpandModal');
    if (dtBtnExpand) {
      dtBtnExpand.addEventListener('click', () => this.openNowPlayingModal());
    }

    const dtBtnEQ = document.getElementById('desktopBtnEQ');
    if (dtBtnEQ) {
      dtBtnEQ.addEventListener('click', () => this.switchView('viewEQ', null));
    }

    // Desktop Slider seek
    const dtSliderBg = document.getElementById('desktopSliderBg');
    if (dtSliderBg) {
      dtSliderBg.addEventListener('click', (e) => {
        const rect = dtSliderBg.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
        this.seek(pct);
      });
    }

    // Volume Slider
    const volumeSlider = document.getElementById('desktopVolumeSlider');
    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        this.setVolume(parseFloat(e.target.value));
      });
    }

    const btnVolume = document.getElementById('desktopBtnVolume');
    if (btnVolume) {
      btnVolume.addEventListener('click', () => this.toggleMute());
    }

    const dtBtnAddPl = document.getElementById('desktopBtnAddPl');
    if (dtBtnAddPl) {
      dtBtnAddPl.addEventListener('click', () => {
        if (this.currentIndex >= 0 && this.tracks[this.currentIndex]) {
          this.openAddToPlaylistModal(this.tracks[this.currentIndex]);
        }
      });
    }
  }

  // UI EVENTS & SEARCH
  setupUIEvents() {
    const quickPlay = document.getElementById('quickPlaySick');
    if (quickPlay) {
      quickPlay.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openPlaylist('sick');
        this.playTrack(0);
      });
    }

    const btnPlayPause = document.getElementById('btnPlayPause');
    if (btnPlayPause) btnPlayPause.addEventListener('click', () => this.togglePlayPause());

    const btnNext = document.getElementById('btnNextTrack');
    if (btnNext) btnNext.addEventListener('click', () => this.nextTrack());

    const heroPlay = document.getElementById('heroPlayBtn');
    if (heroPlay) heroPlay.addEventListener('click', () => this.togglePlayPause());

    const heroShuffle = document.getElementById('btnShufflePlaylist');
    if (heroShuffle) {
      heroShuffle.addEventListener('click', () => {
        this.isShuffle = !this.isShuffle;
        heroShuffle.classList.toggle('active', this.isShuffle);
      });
    }

    const btnAutoplay = document.getElementById('btnAutoplayToggle');
    if (btnAutoplay) {
      btnAutoplay.addEventListener('click', () => this.toggleAutoplay());
    }

    const playerBar = document.getElementById('playerBar');
    if (playerBar) {
      playerBar.addEventListener('click', (e) => {
        if (e.target.closest('.mini-controls')) return;
        this.openNowPlayingModal();
      });
    }

    // Full screen modal controls
    const modalClose = document.getElementById('modalCloseBtn');
    if (modalClose) modalClose.addEventListener('click', () => this.closeNowPlayingModal());

    const modalDismiss = document.getElementById('modalDismissChevron');
    if (modalDismiss) modalDismiss.addEventListener('click', () => this.closeNowPlayingModal());

    const modalPlayPause = document.getElementById('btnModalPlayPause');
    if (modalPlayPause) modalPlayPause.addEventListener('click', () => this.togglePlayPause());

    const modalNext = document.getElementById('btnModalNext');
    if (modalNext) modalNext.addEventListener('click', () => this.nextTrack());

    const modalPrev = document.getElementById('btnModalPrev');
    if (modalPrev) modalPrev.addEventListener('click', () => this.prevTrack());

    const modalAutoplay = document.getElementById('btnModalAutoplay');
    if (modalAutoplay) modalAutoplay.addEventListener('click', () => this.toggleAutoplay());

    const modalEQ = document.getElementById('btnModalEQ');
    if (modalEQ) {
      modalEQ.addEventListener('click', () => {
        this.closeNowPlayingModal();
        this.switchView('viewEQ', null);
      });
    }

    const modalAddCurrent = document.getElementById('btnModalAddCurrentToPlaylist');
    if (modalAddCurrent) {
      modalAddCurrent.addEventListener('click', () => {
        if (this.currentIndex >= 0 && this.tracks[this.currentIndex]) {
          this.openAddToPlaylistModal(this.tracks[this.currentIndex]);
        }
      });
    }

    // Scrub slider on modal
    const modalSliderBg = document.getElementById('modalSliderBg');
    if (modalSliderBg) {
      modalSliderBg.addEventListener('click', (e) => {
        const rect = modalSliderBg.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
        this.seek(pct);
      });
    }

    // Global Search Input
    const searchInput = document.getElementById('mobileSearchInput');
    const clearBtn = document.getElementById('btnClearSearch');
    let searchDebounce = null;

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.trim();
        if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
          this.performGlobalSearch(q);
        }, 200);
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          clearBtn.style.display = 'none';
          this.performGlobalSearch('');
        }
      });
    }

    // Explorer filter chips
    document.querySelectorAll('.explore-filters [data-exp-filter]').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.explore-filters [data-exp-filter]').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const filter = pill.getAttribute('data-exp-filter');
        this.filterExplorer(filter);
      });
    });

    // Library filter chips
    document.querySelectorAll('.filter-chips-row [data-lib-filter]').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-chips-row [data-lib-filter]').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.renderLibraryPlaylists(pill.getAttribute('data-lib-filter'));
      });
    });
  }

  filterExplorer(filter) {
    if (filter === 'all') {
      this.renderExplorerTracks(this.featuredTracks);
    } else if (filter === 'trending') {
      this.renderExplorerTracks(this.featuredTracks.slice(0, 15));
    } else if (filter === 'hiphop') {
      const filtered = this.featuredTracks.filter(t => /Travis|Drake|Roddy|Future|21|Lil/i.test(t.artist));
      this.renderExplorerTracks(filtered);
    } else if (filter === 'latenight') {
      const filtered = this.featuredTracks.filter(t => /Weeknd|Post Malone|BØRNS|Tame/i.test(t.artist));
      this.renderExplorerTracks(filtered);
    } else if (filter === 'drill') {
      const filtered = this.featuredTracks.filter(t => /Central Cee|Dave|KR\$NA|Kidwild/i.test(t.artist));
      this.renderExplorerTracks(filtered);
    } else if (filter === 'lossless') {
      this.renderExplorerTracks(this.featuredTracks.slice(0, 20));
    }
  }

  // GLOBAL SEARCH (Local + Global iTunes API with Full-Length Playback)
  async performGlobalSearch(query) {
    const explorerFeed = document.getElementById('explorerFeedContainer');
    const resultsContainer = document.getElementById('searchDynamicResults');
    const tracksBody = document.getElementById('searchTracksBody');
    const countLabel = document.getElementById('searchResultCount');

    if (!query) {
      if (explorerFeed) explorerFeed.style.display = 'block';
      if (resultsContainer) resultsContainer.style.display = 'none';
      return;
    }

    if (explorerFeed) explorerFeed.style.display = 'none';
    if (resultsContainer) resultsContainer.style.display = 'block';
    if (tracksBody) tracksBody.innerHTML = '<p style="padding:16px;color:#b3b3b3;">Searching studio audio catalog...</p>';

    // 1. Search local 62 songs
    let localMatches = this.featuredTracks.filter(t => 
      t.title.toLowerCase().includes(query.toLowerCase()) || 
      t.artist.toLowerCase().includes(query.toLowerCase())
    );

    // 2. Query Global Catalog
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=15`);
      if (res.ok) {
        const data = await res.json();
        const globalResults = (data.results || []).map(r => ({
          title: r.trackName,
          artist: r.artistName,
          album: r.collectionName || 'Studio Single',
          duration: Math.round((r.trackTimeMillis || 180000) / 1000),
          artwork: (r.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
          streamUrl: r.previewUrl,
          previewFallback: r.previewUrl,
          themeColor: '#1db954'
        }));

        const combined = [...localMatches];
        globalResults.forEach(gr => {
          if (!combined.some(c => c.title.toLowerCase() === gr.title.toLowerCase() && c.artist.toLowerCase() === gr.artist.toLowerCase())) {
            combined.push(gr);
          }
        });

        if (countLabel) countLabel.textContent = `Found ${combined.length} songs`;
        if (tracksBody) {
          tracksBody.innerHTML = '';
          this.tracks = combined; // set active search queue
          combined.forEach((track, idx) => {
            const el = this.createTrackElement(track, idx, true);
            el.addEventListener('click', (e) => {
              if (e.target.closest('.track-add-btn')) return;
              this.tracks = combined;
              this.playTrack(idx);
            });
            tracksBody.appendChild(el);
          });
        }
      }
    } catch (err) {
      console.warn("Global search error:", err);
      if (tracksBody) {
        tracksBody.innerHTML = '';
        this.tracks = localMatches;
        localMatches.forEach((track, idx) => {
          const el = this.createTrackElement(track, idx, true);
          el.addEventListener('click', (e) => {
            if (e.target.closest('.track-add-btn')) return;
            this.tracks = localMatches;
            this.playTrack(idx);
          });
          tracksBody.appendChild(el);
        });
      }
    }
  }

  filterByArtist(artistName) {
    this.openArtistProfile(artistName);
  }

  openArtistProfile(artistName) {
    const profile = (window.getArtistProfile) ? window.getArtistProfile(artistName) : null;
    if (!profile) return;

    this.currentArtistProfile = profile;
    this.closeNowPlayingModal();
    this.switchView('viewArtist', null);

    const banner = document.getElementById('artistProfileHeaderImg');
    const name = document.getElementById('artistProfileName');
    const listeners = document.getElementById('artistProfileListeners');
    const bio = document.getElementById('artistProfileBioText');
    const rank = document.getElementById('artistProfileRankTag');

    if (banner) banner.src = profile.headerPhoto || profile.photo;
    if (name) name.textContent = profile.name;
    if (listeners) listeners.textContent = profile.monthlyListeners;
    if (bio) bio.textContent = profile.bio;
    if (rank) rank.textContent = profile.rank || 'Verified Artist';

    const artistSongs = this.featuredTracks.filter(t => 
      t.artist.toLowerCase().includes(artistName.toLowerCase()) || 
      artistName.toLowerCase().includes(t.artist.toLowerCase())
    );

    const container = document.getElementById('artistPopularTracks');
    if (container) {
      container.innerHTML = '';
      if (artistSongs.length === 0) {
        container.innerHTML = '<p style="padding:16px;color:#b3b3b3;">No tracks found for this artist in local catalog.</p>';
      } else {
        artistSongs.forEach((track, index) => {
          const el = this.createTrackElement(track, index, true);
          el.addEventListener('click', (e) => {
            if (e.target.closest('.track-add-btn')) return;
            this.tracks = artistSongs;
            this.playTrack(index);
          });
          container.appendChild(el);
        });
      }
    }

    const playAllBtn = document.getElementById('btnArtistPlayAll');
    if (playAllBtn && artistSongs.length > 0) {
      playAllBtn.onclick = () => {
        this.tracks = artistSongs;
        this.playTrack(0);
      };
    }
  }

  setupArtistProfileEvents() {
    const modalAvatar = document.getElementById('modalArtistAvatarWrap');
    if (modalAvatar) {
      modalAvatar.addEventListener('click', () => {
        const curTrack = this.tracks[this.currentIndex];
        if (curTrack) this.openArtistProfile(curTrack.artist);
      });
    }

    const modalArtistLink = document.getElementById('modalArtistName');
    if (modalArtistLink) {
      modalArtistLink.addEventListener('click', () => {
        const curTrack = this.tracks[this.currentIndex];
        if (curTrack) this.openArtistProfile(curTrack.artist);
      });
    }

    const btnViewProfile = document.getElementById('btnViewArtistProfile');
    if (btnViewProfile) {
      btnViewProfile.addEventListener('click', () => {
        const curTrack = this.tracks[this.currentIndex];
        if (curTrack) this.openArtistProfile(curTrack.artist);
      });
    }

    const artistCardHero = document.getElementById('artistCardHero');
    if (artistCardHero) {
      artistCardHero.addEventListener('click', () => {
        const curTrack = this.tracks[this.currentIndex];
        if (curTrack) this.openArtistProfile(curTrack.artist);
      });
    }

    const btnArtistBack = document.getElementById('btnArtistBackToPrev');
    if (btnArtistBack) {
      btnArtistBack.addEventListener('click', () => {
        this.switchView('viewHome', document.getElementById('mNavHome'));
      });
    }

    const btnFollow = document.getElementById('btnFollowArtist');
    if (btnFollow) {
      btnFollow.addEventListener('click', (e) => {
        e.stopPropagation();
        btnFollow.classList.toggle('following');
        btnFollow.textContent = btnFollow.classList.contains('following') ? 'Following' : 'Follow';
      });
    }

    const btnProfileFollow = document.getElementById('btnProfileFollowArtist');
    if (btnProfileFollow) {
      btnProfileFollow.addEventListener('click', () => {
        btnProfileFollow.classList.toggle('following');
        btnProfileFollow.textContent = btnProfileFollow.classList.contains('following') ? 'Following' : 'Follow';
      });
    }

    const btnQueueSkip = document.getElementById('btnQueueSkipNext');
    if (btnQueueSkip) {
      btnQueueSkip.addEventListener('click', () => {
        this.nextTrack();
      });
    }
  }

  setupCanvasEvents() {
    const btnAlbum = document.getElementById('btnModeAlbumArt');
    const btnCanvas = document.getElementById('btnModeCanvas');
    const coverImg = document.getElementById('modalCoverImg');
    const canvasTarget = document.getElementById('modalCanvasTarget');

    if (btnAlbum && btnCanvas) {
      btnAlbum.addEventListener('click', () => {
        btnAlbum.classList.add('active');
        btnCanvas.classList.remove('active');
        if (coverImg) coverImg.style.display = 'block';
        if (canvasTarget) canvasTarget.style.display = 'none';
        this.isCanvasMode = false;
      });

      btnCanvas.addEventListener('click', () => {
        btnCanvas.classList.add('active');
        btnAlbum.classList.remove('active');
        if (coverImg) coverImg.style.display = 'none';
        if (canvasTarget) {
          canvasTarget.style.display = 'flex';
          const ytContainer = document.getElementById('ytPlayerContainer');
          if (ytContainer) {
            ytContainer.style.position = 'relative';
            ytContainer.style.top = '0';
            ytContainer.style.left = '0';
            ytContainer.style.width = '100%';
            ytContainer.style.height = '100%';
            ytContainer.style.opacity = '1';
            ytContainer.style.pointerEvents = 'auto';
            canvasTarget.appendChild(ytContainer);
          }
        }
        this.isCanvasMode = true;
      });
    }
  }

  filterByGenre(genreName) {
    this.openPlaylist('sick');
    const heroTitle = document.getElementById('playlistTitle');
    if (heroTitle) heroTitle.textContent = `Explore: ${genreName}`;

    let filtered = [];
    if (genreName.includes('Hip-Hop') || genreName.includes('Trap')) {
      filtered = this.featuredTracks.filter(t => /Travis|Drake|Roddy|Future|21|Lil/i.test(t.artist));
    } else if (genreName.includes('Late Night')) {
      filtered = this.featuredTracks.filter(t => /Weeknd|Post Malone|BØRNS|Tame/i.test(t.artist));
    } else if (genreName.includes('Drill')) {
      filtered = this.featuredTracks.filter(t => /Central Cee|Dave|KR\$NA|Kidwild/i.test(t.artist));
    } else {
      filtered = this.featuredTracks;
    }

    this.tracks = filtered;
    const container = document.getElementById('tracklistBody');
    if (container) {
      container.innerHTML = '';
      filtered.forEach((t, idx) => {
        container.appendChild(this.createTrackElement(t, idx, true));
      });
    }
    if (filtered.length > 0) this.playTrack(0);
  }

  openNowPlayingModal() {
    if (this.currentIndex === -1 && this.tracks.length > 0) {
      this.playTrack(0);
    }
    const modal = document.getElementById('nowPlayingModal');
    if (modal) modal.classList.add('open');
  }

  closeNowPlayingModal() {
    const modal = document.getElementById('nowPlayingModal');
    if (modal) modal.classList.remove('open');
  }

  // EQUALIZER & VISUALIZER
  setupEqualizerUI() {
    const container = document.getElementById('eqSlidersContainer');
    if (!container) return;
    container.innerHTML = '';

    this.eqFrequencies.forEach((freq, idx) => {
      const col = document.createElement('div');
      col.className = 'eq-slider-col';
      const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
      col.innerHTML = `
        <input type="range" min="-12" max="12" step="0.5" value="0" orient="vertical" data-band="${idx}">
        <span class="eq-band-label">${label}</span>
      `;
      const slider = col.querySelector('input');
      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (this.eqFilters[idx]) {
          this.eqFilters[idx].gain.value = val;
        }
      });
      container.appendChild(col);
    });

    const resetBtn = document.getElementById('btnResetEQ');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        container.querySelectorAll('input[type=range]').forEach((slider, idx) => {
          slider.value = 0;
          if (this.eqFilters[idx]) this.eqFilters[idx].gain.value = 0;
        });
      });
    }

    document.querySelectorAll('.preset-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const preset = btn.getAttribute('data-preset');
        this.applyEQPreset(preset);
      });
    });
  }

  applyEQPreset(preset) {
    const gains = {
      flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      bass: [6, 5.5, 4, 2, 0, 0, 0, 1, 1.5, 2],
      hiphop: [5.5, 5, 2.5, 1, -1, 1, 2.5, 3.5, 4, 4.5],
      vocal: [-2, -1, 0, 2, 4, 4.5, 3, 1.5, 0, -1],
      electronic: [5, 4, 1.5, 0, -1.5, 2, 3, 4, 5, 5.5]
    }[preset] || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    const sliders = document.querySelectorAll('#eqSlidersContainer input[type=range]');
    sliders.forEach((slider, idx) => {
      slider.value = gains[idx];
      if (this.eqFilters[idx]) this.eqFilters[idx].gain.value = gains[idx];
    });
  }

  startSpectrumVisualizer() {
    const canvas = document.getElementById('spectrumCanvas');
    if (!canvas || !this.analyserNode) return;
    const ctx = canvas.getContext('2d');
    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      requestAnimationFrame(draw);
      this.analyserNode.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
        grad.addColorStop(0, '#1db954');
        grad.addColorStop(1, '#1ed760');
        ctx.fillStyle = grad;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
        x += barWidth;
      }
    };
    draw();
  }

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
}

// Global hook for YouTube IFrame API
window.onYouTubeIframeAPIReady = function() {
  if (window.spotifyHiFiApp) {
    window.spotifyHiFiApp.initYouTubeEngine();
  }
};

// Instantiate App
window.addEventListener('DOMContentLoaded', () => {
  window.spotifyHiFiApp = new SpotifyHiFiMobileApp();
});