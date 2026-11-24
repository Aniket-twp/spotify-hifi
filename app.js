// Refract - Lossless Hi-Fi Audio Engine
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

    // Multi-User Profile (Customizable for User & Friends)
    this.userProfile = { name: 'Aniket', avatar: 'A' };

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
    this.loadUserProfile();
    this.updateGreeting();
    this.loadPlaylistsFromStorage();
    this.setupNavigation();
    this.setupAudioListeners();
    this.setupUIEvents();
    this.setupEqualizerUI();
    this.setupImportModalEvents();
    this.setupProfileModalEvents();
    this.setupDesktopEvents();

    this.renderArtists();
    this.renderGenreCards();
    this.renderHomeFeatured();
    this.renderExplorerFeed();
    this.renderLibraryPlaylists();
    this.renderDesktopSidebarPlaylists();
    this.setupArtistProfileEvents();
    this.setupCanvasEvents();

    // Prepare active playlist data
    const sickPl = this.playlists.find(p => p.id === 'sick');
    if (sickPl) {
      this.currentPlaylistId = 'sick';
      this.tracks = sickPl.tracks;
      this.renderPlaylistTracks(sickPl);
    }
    // Start strictly on Home view
    this.switchView('viewHome', document.getElementById('mNavHome'));

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
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          playsinline: 1,
          rel: 0,
          enablejsapi: 1,
          modestbranding: 1,
          iv_load_policy: 3,
          origin: window.location.origin || 'https://spotify-hifi.local',
          widget_referrer: window.location.origin || 'https://spotify-hifi.local'
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
      if (activeTrack && activeTrack.duration > 35) {
        dur = activeTrack.duration;
      } else if (!dur || dur <= 35) {
        dur = 180;
      }

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
    const profileModal = document.getElementById('profileModal');
    if (profileModal && profileModal.classList.contains('open')) {
      profileModal.classList.remove('open');
      return true;
    }
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

  loadUserProfile() {
    let profile = { name: 'Aniket', avatar: 'A' };
    try {
      const saved = localStorage.getItem('spotify_hifi_user_profile');
      if (saved) profile = JSON.parse(saved);
    } catch (e) {}
    this.userProfile = profile;
    this.applyUserProfile();
  }

  applyUserProfile() {
    const topAvatar = document.getElementById('topbarUserAvatar');
    if (topAvatar) topAvatar.textContent = this.userProfile.avatar || (this.userProfile.name ? this.userProfile.name[0].toUpperCase() : 'A');

    const libAvatar = document.getElementById('libUserAvatar');
    if (libAvatar) libAvatar.textContent = this.userProfile.avatar || (this.userProfile.name ? this.userProfile.name[0].toUpperCase() : 'A');

    this.updateGreeting();
  }

  updateGreeting() {
    const hours = new Date().getHours();
    let text = "Good evening";
    if (hours < 12) text = "Good morning";
    else if (hours < 18) text = "Good afternoon";
    if (this.userProfile && this.userProfile.name && this.userProfile.name.trim() !== '') {
      text = `${text}, ${this.userProfile.name}`;
    }
    const elem = document.getElementById('greetingHeading');
    if (elem) elem.textContent = text;
  }

  // PLAYLIST STORAGE & MANAGEMENT
  loadPlaylistsFromStorage(forceRestore = false) {
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

    // 2. Built-in "Today's Top Hits" (Lossless Master)
    const topHitsPl = {
      id: 'tophits',
      title: "Today's Top Hits",
      curator: 'Refract Editorial',
      type: 'featured',
      artwork: 'https://cdn-images.dzcdn.net/images/artist/581693b4724a7fcfa754455101e13a44/500x500-000000-80-0-0.jpg',
      themeColor: '#1db954',
      tracks: this.featuredTracks.slice(0, 20)
    };

    // 3. Built-in "RapCaviar 2026"
    const rapTracks = this.featuredTracks.filter(t => /Travis|Kendrick|Roddy|Drake|Future|21|Lil/i.test(t.artist));
    const rapCaviarPl = {
      id: 'rapcaviar',
      title: 'RapCaviar 2026',
      curator: 'HiFi Hip-Hop',
      type: 'featured',
      artwork: 'https://cdn-images.dzcdn.net/images/artist/8d8316146026d7e6ce377e314536df62/500x500-000000-80-0-0.jpg',
      themeColor: '#ff7700',
      tracks: rapTracks.length > 0 ? rapTracks : this.featuredTracks.slice(0, 15)
    };

    // 4. Liked Songs
    let likedSongs = [];
    try {
      const savedLiked = localStorage.getItem('spotify_hifi_liked_songs');
      if (savedLiked && !forceRestore) likedSongs = JSON.parse(savedLiked);
    } catch (e) {}

    const likedPl = {
      id: 'liked',
      title: 'Liked Songs',
      curator: this.userProfile ? this.userProfile.name : 'You',
      type: 'custom',
      artwork: 'icon-512.png',
      themeColor: '#1db954',
      tracks: likedSongs
    };

    // 5. User Custom / Imported Playlists
    let customPlaylists = [];
    try {
      const savedCustom = localStorage.getItem('spotify_hifi_custom_playlists');
      if (savedCustom && !forceRestore) customPlaylists = JSON.parse(savedCustom);
    } catch (e) {}

    this.playlists = [sickPl, topHitsPl, rapCaviarPl, likedPl, ...customPlaylists];
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

    const btnEQBack = document.getElementById('btnEQBack');
    if (btnEQBack) {
      btnEQBack.addEventListener('click', () => {
        this.switchView('viewHome', document.getElementById('mNavHome'));
      });
    }

    const btnPlaylistBack = document.getElementById('btnPlaylistBackToPrev');
    if (btnPlaylistBack) {
      btnPlaylistBack.addEventListener('click', () => {
        this.switchView('viewHome', document.getElementById('mNavHome'));
      });
    }

    const shortcutSick = document.getElementById('shortcutSick');
    if (shortcutSick) {
      shortcutSick.addEventListener('click', () => {
        this.openPlaylist('sick');
      });
    }

    const quickPlaySick = document.getElementById('quickPlaySick');
    if (quickPlaySick) {
      quickPlaySick.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openPlaylist('sick');
        this.playTrack(0);
      });
    }

    const shortcutLiked = document.getElementById('shortcutLiked');
    if (shortcutLiked) {
      shortcutLiked.addEventListener('click', () => {
        this.openPlaylist('liked');
      });
    }

    const cardSickJump = document.getElementById('cardSickJump');
    if (cardSickJump) {
      cardSickJump.addEventListener('click', () => {
        this.openPlaylist('sick');
      });
    }

    const cardImportJump = document.getElementById('cardImportJump');
    if (cardImportJump) {
      cardImportJump.addEventListener('click', () => {
        this.openImportModal();
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

    const btnOpenImportModal = document.getElementById('btnOpenImportModal');
    if (btnOpenImportModal) {
      btnOpenImportModal.addEventListener('click', () => {
        this.openImportModal();
      });
    }

    const btnSeeAll = document.getElementById('btnSeeAllTracks');
    if (btnSeeAll) {
      btnSeeAll.addEventListener('click', () => {
        this.openPlaylist('sick');
      });
    }

    // Topbar category chips
    document.querySelectorAll('.topbar-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.topbar-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const filter = chip.getAttribute('data-filter');
        this.filterHomeByChip(filter);
      });
    });
  }

  filterHomeByChip(filter) {
    if (filter === 'all') {
      this.renderHomeFeatured();
    } else if (filter === 'music') {
      this.renderHomeFeatured();
    } else if (filter === 'lossless') {
      const lossless = this.featuredTracks.filter(t => t.duration > 180);
      const container = document.getElementById('homeFeaturedTracks');
      if (container) {
        container.innerHTML = '';
        lossless.slice(0, 20).forEach((t, i) => {
          container.appendChild(this.createTrackElement(t, i, false));
        });
      }
    }
  }

  switchView(viewId, activeBtn) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) {
      // restart the staggered glass reveal on every view change
      target.classList.remove('active');
      void target.offsetWidth;
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
      const dur = (activeTrack && activeTrack.duration > 35) 
        ? activeTrack.duration 
        : (this.audioElement.duration > 35 ? this.audioElement.duration : 180);
      const totalLabel = document.getElementById('modalTotalTime');
      if (totalLabel) totalLabel.textContent = this.formatTime(dur);
      const dtTotalLabel = document.getElementById('desktopTotalTime');
      if (dtTotalLabel) dtTotalLabel.textContent = this.formatTime(dur);
    });

    this.audioElement.addEventListener('ended', () => {
      if (this.isYtReady && this.ytPlayer && this.isPlaying) return;
      const activeTrack = this.tracks[this.currentIndex];
      if (activeTrack && activeTrack.duration > 35) {
        // Smoothly loop preview so audio NEVER abruptly stops or terminates
        this.audioElement.currentTime = 0;
        this.audioElement.play().catch(console.warn);
      } else if (this.isAutoplay) {
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
    this.currentEngine = 'youtube';
    const target = document.getElementById('ytPlayerTarget');

    try {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    } catch (e) {}

    if (!this.isYtReady || !this.ytPlayer || typeof this.ytPlayer.loadVideoById !== 'function') {
      if (target) {
        target.innerHTML = `<iframe id="ytActiveIframe" width="100%" height="100%" src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&enablejsapi=1&controls=0" frameborder="0" allow="autoplay; encrypted-media"></iframe>`;
      }
      this.updatePlayState(true);
      this.startYtProgressTimer();
      return;
    }

    try {
      this.ytPlayer.loadVideoById({
        videoId: videoId,
        startSeconds: 0
      });
      this.ytPlayer.playVideo();
      this.updatePlayState(true);
      this.startYtProgressTimer();
    } catch (err) {
      console.warn("YouTube play error:", err);
      if (target) {
        target.innerHTML = `<iframe id="ytActiveIframe" width="100%" height="100%" src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&enablejsapi=1&controls=0" frameborder="0" allow="autoplay; encrypted-media"></iframe>`;
      }
      this.updatePlayState(true);
      this.startYtProgressTimer();
    }
  }

  async resolveAndPlayYouTube(track) {
    let resolvedId = null;

    // 1. AndroidBridge (Ultra-fast Innertube API via Java with zero CORS)
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

    // 2. Direct Web Innertube API Fallback
    if (!resolvedId) {
      try {
        const query = `${track.artist} ${track.title} audio`;
        const resp = await fetch('https://www.youtube.com/youtubei/v1/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: { client: { clientName: 'WEB', clientVersion: '2.20240101.01.00' } },
            query: query
          })
        });
        if (resp.ok) {
          const text = await resp.text();
          const match = text.match(/"videoId":\s*"([a-zA-Z0-9_-]{11})"/);
          if (match && match[1]) {
            resolvedId = match[1];
          }
        }
      } catch (e) {
        console.warn("JS Innertube search error:", e);
      }
    }

    if (resolvedId) {
      track.youtubeId = resolvedId;
      this.playYouTubeVideo(resolvedId);
      return;
    }

    // 3. Fallback to HTML5 audio preview if offline or resolution fails
    const streamUrl = track.streamUrl || track.previewFallback;
    if (streamUrl) {
      this.currentEngine = 'html5';
      this.audioElement.src = streamUrl;
      this.audioElement.play().catch(console.warn);
      this.updatePlayState(true);
      this.startYtProgressTimer();
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

    // 4. Liquid Glass tint — hand the artwork colour to CSS, which composes it
    const themeColor = track.themeColor || '#6f7bff';
    const modal = document.getElementById('nowPlayingModal');
    if (modal) {
      modal.style.setProperty('--np-tint', themeColor);
    }

    const root = document.documentElement;
    if (root) root.style.setProperty('--np-tint', themeColor);
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
    this.renderPlaylistTracks(pl);
  }

  renderPlaylistTracks(pl) {
    const titleElem = document.getElementById('playlistTitle');
    const stickyNavTitle = document.getElementById('stickyPlaylistNavTitle');
    const countElem = document.getElementById('playlistTrackCount');
    const curatorElem = document.getElementById('curatorName');
    const coverArt = document.getElementById('playlistCoverArt');
    const deleteBtn = document.getElementById('btnDeleteCustomPlaylist');

    if (titleElem) titleElem.textContent = pl.title;
    if (stickyNavTitle) stickyNavTitle.textContent = pl.title;
    if (countElem) countElem.textContent = `${pl.tracks.length} songs`;
    if (curatorElem) curatorElem.textContent = pl.curator || 'Aniket';

    if (coverArt) {
      if (pl.artwork) {
        coverArt.innerHTML = `<img src="${pl.artwork}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" alt="${pl.title}">`;
      } else {
        coverArt.className = 'playlist-header-art sick-hero-art';
        coverArt.innerHTML = `<span class="playlist-art-emoji">🫢</span>`;
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
      card.className = 'lib-playlist-row';

      const artHtml = pl.artwork 
        ? `<img src="${pl.artwork}" alt="${pl.title}" onerror="this.src='icon-192.png'">`
        : `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2.6a9.4 9.4 0 1 0 0 18.8 9.4 9.4 0 0 0 0-18.8Zm-2.3 5.9a.9.9 0 0 1 1.35-.78l6.4 3.7a.9.9 0 0 1 0 1.56l-6.4 3.7A.9.9 0 0 1 9.7 16Z"/></svg>`;

      card.innerHTML = `
        <div class="lib-cover-art sick-gradient">${artHtml}</div>
        <div class="lib-info">
          <div class="lib-title">${pl.title}</div>
          <div class="lib-sub">Playlist • ${pl.tracks.length} songs</div>
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
        item.className = 'artist-card-bubble';
        item.innerHTML = `
          <div class="artist-avatar-box">
            <img src="${artist.photo}" class="artist-avatar-img" alt="${artist.name}" loading="lazy" onerror="this.src='https://cdn-images.dzcdn.net/images/artist/8d8316146026d7e6ce377e314536df62/500x500-000000-80-0-0.jpg'">
            <div class="artist-verified-dot">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5.4 12.8 4.5 4.4L18.9 7.4"/></svg>
            </div>
          </div>
          <div class="artist-bubble-name">${artist.name}</div>
          <div class="artist-bubble-sub">Artist</div>
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
              <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M4.4 3.3c0-1 .9-1.6 1.75-1.1l7.6 4.8c.75.5.75 1.5 0 2l-7.6 4.8c-.85.5-1.75-.1-1.75-1.1Z"/></svg>
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

  // CREATE TRACK ELEMENT (High Density Authentic Spotify Layout)
  createTrackElement(track, index, showAdd = true) {
    const div = document.createElement('div');
    div.className = `touch-track-item ${index === this.currentIndex ? 'active' : ''}`;
    div.setAttribute('data-index', index);

    const art = track.artwork || 'icon-192.png';
    const durStr = this.formatTime(track.duration || 180);

    div.innerHTML = `
      <span class="track-index-num">${index + 1}</span>
      <div class="touch-track-art-box">
        <img src="${art}" class="touch-track-img" alt="Cover" loading="lazy" onerror="this.src='icon-192.png'">
      </div>
      <div class="touch-track-info">
        <div class="touch-track-title">${track.title}</div>
        <div class="touch-track-meta">
          <span class="track-hifi-badge">HiFi</span>
          <span class="touch-track-artist">${track.artist}</span>
        </div>
      </div>
      <div class="touch-track-actions">
        <span class="touch-track-duration">${durStr}</span>
        <button class="touch-track-btn track-add-btn" title="Options">
          <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5.6" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="18.4" cy="12" r="1.9"/></svg>
        </button>
      </div>
    `;

    // Click to play
    div.addEventListener('click', (e) => {
      if (e.target.closest('.track-add-btn')) return;
      this.playTrack(index);
    });

    // Add to playlist / options button
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

    // 2. YouTube Music Link Importer
    const btnDoImportYT = document.getElementById('btnDoImportYouTube');
    if (btnDoImportYT) {
      btnDoImportYT.addEventListener('click', () => this.handleYouTubeLinkImport());
    }

    // 3. Text Tracklist Importer
    const btnDoImportText = document.getElementById('btnDoImportText');
    if (btnDoImportText) {
      btnDoImportText.addEventListener('click', () => this.handleTextTracklistImport());
    }

    // 4. Share Code Importer
    const btnDoImportShare = document.getElementById('btnDoImportShareCode');
    if (btnDoImportShare) {
      btnDoImportShare.addEventListener('click', () => this.handleShareCodeImport());
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

  async handleYouTubeLinkImport() {
    const urlInput = document.getElementById('importYouTubeUrl');
    const statusBox = document.getElementById('importLoadingStatus');
    const statusText = document.getElementById('importStatusText');
    const rawUrl = (urlInput?.value || '').trim();

    if (!rawUrl) {
      alert("Please paste a YouTube or YouTube Music playlist URL.");
      return;
    }

    if (statusBox) statusBox.style.display = 'flex';
    if (statusText) statusText.textContent = "Parsing YouTube Music playlist...";

    try {
      let listId = null;
      const match = rawUrl.match(/[?&]list=([a-zA-Z0-9_-]+)/);
      if (match) listId = match[1];

      let playlistTitle = "YouTube Music Mix";
      let tracks = [];

      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/playlist?list=${listId}&format=json`);
        if (oembedRes.ok) {
          const odata = await oembedRes.json();
          playlistTitle = odata.title || playlistTitle;
        }
      } catch (e) {}

      const cleanQuery = playlistTitle.replace(/playlist|music|mix|songs/gi, '').trim() || 'trending';
      const searchRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&entity=song&limit=25`);
      if (searchRes.ok) {
        const sdata = await searchRes.json();
        tracks = (sdata.results || []).map(r => ({
          title: r.trackName,
          artist: r.artistName,
          album: r.collectionName || 'Studio Single',
          duration: Math.round((r.trackTimeMillis || 180000) / 1000),
          artwork: (r.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
          streamUrl: r.previewUrl,
          previewFallback: r.previewUrl,
          themeColor: '#ff0000'
        }));
      }

      if (tracks.length === 0) {
        tracks = this.featuredTracks.slice(0, 15);
      }

      const newPl = {
        id: 'imported_yt_' + Date.now(),
        title: playlistTitle,
        curator: 'YouTube Music Import',
        type: 'imported',
        artwork: tracks[0]?.artwork || 'icon-512.png',
        themeColor: '#ff0000',
        tracks: tracks
      };

      this.playlists.push(newPl);
      this.saveCustomPlaylists();
      this.renderLibraryPlaylists();
      this.renderDesktopSidebarPlaylists();

      const modal = document.getElementById('importModal');
      if (modal) modal.classList.remove('open');
      this.openPlaylist(newPl.id);
      alert(`Imported "${playlistTitle}" with ${tracks.length} songs!`);
    } catch (e) {
      alert("Could not import YouTube playlist. Please check the URL.");
    } finally {
      if (statusBox) statusBox.style.display = 'none';
    }
  }

  handleShareCodeImport() {
    const input = document.getElementById('importShareCodeInput');
    const raw = (input?.value || '').trim();
    if (!raw) {
      alert("Please paste a HIFI-SHARE code or JSON playlist data.");
      return;
    }

    try {
      let jsonStr = raw;
      if (raw.includes('HIFI-SHARE:')) {
        const parts = raw.split('HIFI-SHARE:');
        const codePart = parts[1].trim().split(/\s+/)[0];
        jsonStr = decodeURIComponent(escape(atob(codePart)));
      }
      const data = JSON.parse(jsonStr);
      if (!data.tracks || !Array.isArray(data.tracks)) {
        throw new Error("Invalid playlist format");
      }

      const newPl = {
        id: 'imported_' + Date.now(),
        title: data.title || 'Shared Playlist',
        curator: data.curator || 'Friend Import',
        type: 'imported',
        artwork: data.artwork || (data.tracks[0] ? data.tracks[0].artwork : 'icon-512.png'),
        themeColor: '#1db954',
        tracks: data.tracks
      };

      this.playlists.push(newPl);
      this.saveCustomPlaylists();
      this.renderLibraryPlaylists();
      this.renderDesktopSidebarPlaylists();

      const modal = document.getElementById('importModal');
      if (modal) modal.classList.remove('open');
      this.openPlaylist(newPl.id);
      alert(`Successfully imported "${newPl.title}" with ${newPl.tracks.length} songs!`);
    } catch (e) {
      alert("Could not parse share code. Please ensure the full HIFI-SHARE code is pasted.");
    }
  }

  exportPlaylist(playlistId) {
    const pl = this.playlists.find(p => p.id === playlistId);
    if (!pl) return;

    const payload = {
      title: pl.title,
      curator: pl.curator || this.userProfile.name,
      tracks: pl.tracks.map(t => ({
        title: t.title,
        artist: t.artist,
        album: t.album,
        duration: t.duration,
        artwork: t.artwork,
        streamUrl: t.streamUrl,
        youtubeId: t.youtubeId
      }))
    };

    let encodedCode = '';
    try {
      encodedCode = 'HIFI-SHARE:' + btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    } catch (e) {
      encodedCode = JSON.stringify(payload);
    }

    const shareTitle = `Refract · ${pl.title}`;
    const shareMessage = `🎵 Check out my HiFi Playlist "${pl.title}" (${pl.tracks.length} songs)!\n\n` +
      `Import Code (paste into Refract -> Import Playlist -> Share Code):\n\n` +
      `${encodedCode}\n\n` +
      `Lossless 24-bit / 96kHz Master Audio`;

    if (window.AndroidBridge && typeof window.AndroidBridge.shareText === 'function') {
      window.AndroidBridge.shareText(shareTitle, shareMessage);
    } else if (navigator.share) {
      navigator.share({ title: shareTitle, text: shareMessage }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareMessage).then(() => {
        alert(`Share code for "${pl.title}" copied to clipboard! Send it to your friend.`);
      }).catch(() => {
        prompt("Copy this playlist share code:", encodedCode);
      });
    }
  }

  deletePlaylist(playlistId) {
    if (playlistId === 'sick' || playlistId === 'liked') {
      alert("This default playlist cannot be deleted.");
      return;
    }
    const pl = this.playlists.find(p => p.id === playlistId);
    const title = pl ? pl.title : 'this playlist';
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    this.playlists = this.playlists.filter(p => p.id !== playlistId);
    this.saveCustomPlaylists();
    this.renderLibraryPlaylists();
    this.renderDesktopSidebarPlaylists();
    this.switchView('viewLibrary', document.getElementById('mNavLibrary'));
  }

  setupProfileModalEvents() {
    this.loadUserProfile();

    const profileModal = document.getElementById('profileModal');
    const btnClose = document.getElementById('btnCloseProfileModal');
    const topAvatar = document.getElementById('topbarUserAvatar');
    const libAvatar = document.getElementById('libUserAvatar');
    const nameInput = document.getElementById('profileNameInput');
    const btnSave = document.getElementById('btnSaveProfile');
    const btnResetFresh = document.getElementById('btnResetAppFresh');
    const btnRestoreMixes = document.getElementById('btnRestoreCuratedMixes');
    const avatarPicker = document.getElementById('profileAvatarPicker');

    let currentSelectedAvatar = this.userProfile.avatar || 'A';

    const openProfile = () => {
      if (nameInput) nameInput.value = this.userProfile.name || 'Aniket';
      if (avatarPicker) {
        avatarPicker.querySelectorAll('.avatar-choice-btn').forEach(btn => {
          btn.classList.toggle('selected', btn.getAttribute('data-avatar') === currentSelectedAvatar);
        });
      }
      if (profileModal) profileModal.classList.add('open');
    };

    if (topAvatar) topAvatar.addEventListener('click', openProfile);
    if (libAvatar) libAvatar.addEventListener('click', openProfile);

    if (btnClose) {
      btnClose.addEventListener('click', () => {
        if (profileModal) profileModal.classList.remove('open');
      });
    }

    if (avatarPicker) {
      avatarPicker.querySelectorAll('.avatar-choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          avatarPicker.querySelectorAll('.avatar-choice-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          currentSelectedAvatar = btn.getAttribute('data-avatar');
        });
      });
    }

    if (btnSave) {
      btnSave.addEventListener('click', () => {
        const newName = (nameInput?.value || '').trim() || 'Music Lover';
        this.userProfile = {
          name: newName,
          avatar: currentSelectedAvatar
        };
        try {
          localStorage.setItem('spotify_hifi_user_profile', JSON.stringify(this.userProfile));
        } catch (e) {}
        this.applyUserProfile();
        if (profileModal) profileModal.classList.remove('open');
        alert(`Profile saved! Welcome, ${newName}.`);
      });
    }

    if (btnRestoreMixes) {
      btnRestoreMixes.addEventListener('click', () => {
        this.loadPlaylistsFromStorage(true);
        this.renderLibraryPlaylists();
        this.renderDesktopSidebarPlaylists();
        if (profileModal) profileModal.classList.remove('open');
        alert("Restored built-in studio mixes: sick 🫢, Today's Top Hits, RapCaviar 2026.");
      });
    }

    if (btnResetFresh) {
      btnResetFresh.addEventListener('click', () => {
        if (!confirm("Are you sure you want to clear custom playlists and start fresh?")) return;
        try {
          localStorage.removeItem('spotify_hifi_custom_playlists');
          localStorage.removeItem('spotify_hifi_liked_songs');
          this.userProfile = { name: 'Music Lover', avatar: '🎧' };
          localStorage.setItem('spotify_hifi_user_profile', JSON.stringify(this.userProfile));
        } catch (e) {}
        this.loadPlaylistsFromStorage();
        this.applyUserProfile();
        this.renderLibraryPlaylists();
        this.renderDesktopSidebarPlaylists();
        if (profileModal) profileModal.classList.remove('open');
        this.openPlaylist('tophits');
        alert("App reset to fresh state!");
      });
    }
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

    const btnExport = document.getElementById('btnExportPlaylist');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        this.exportPlaylist(this.currentPlaylistId);
      });
    }

    const btnDelete = document.getElementById('btnDeleteCustomPlaylist');
    if (btnDelete) {
      btnDelete.addEventListener('click', () => {
        this.deletePlaylist(this.currentPlaylistId);
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
        this.updateEqFill(slider);
      });
      this.updateEqFill(slider);
      container.appendChild(col);
    });

    const resetBtn = document.getElementById('btnResetEQ');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        container.querySelectorAll('input[type=range]').forEach((slider, idx) => {
          slider.value = 0;
          if (this.eqFilters[idx]) this.eqFilters[idx].gain.value = 0;
          this.updateEqFill(slider);
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
      this.updateEqFill(slider);
    });
  }

  // Fill the EQ groove outward from 0 dB, the way a hardware EQ reads
  updateEqFill(slider) {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const p = (parseFloat(slider.value) - min) / (max - min);
    const zero = (0 - min) / (max - min);
    slider.style.setProperty('--eq-lo', Math.min(p, zero).toFixed(3));
    slider.style.setProperty('--eq-hi', Math.max(p, zero).toFixed(3));
  }

  startSpectrumVisualizer() {
    const canvas = document.getElementById('spectrumCanvas');
    if (!canvas || !this.analyserNode || canvas._spectrumOn) return;
    canvas._spectrumOn = true;

    const ctx = canvas.getContext('2d');
    const bins = this.analyserNode.frequencyBinCount;
    const data = new Uint8Array(bins);
    const smooth = new Float32Array(bins);

    // Backing store follows the CSS box so bars are never stretched or clipped
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return false;
      const bw = Math.round(w * dpr);
      const bh = Math.round(h * dpr);
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    };
    fit();
    if (typeof ResizeObserver === 'function') {
      this._spectrumRO = new ResizeObserver(() => fit());
      this._spectrumRO.observe(canvas);
    } else {
      window.addEventListener('resize', () => fit());
    }

    let colors = ['#ff4d6d', '#c81046'];
    let frame = 0;
    const draw = () => {
      requestAnimationFrame(draw);
      if (!fit()) return; // view hidden: skip the work entirely
      this.analyserNode.getByteFrequencyData(data);

      if ((frame++ % 30) === 0) {
        const css = getComputedStyle(document.documentElement);
        colors = [
          (css.getPropertyValue('--accent-hot') || '#ff4d6d').trim(),
          (css.getPropertyValue('--accent-deep') || '#c81046').trim(),
        ];
      }

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const slot = w / bins;
      const gap = Math.max(1.5, slot * 0.26);
      const barW = slot - gap;
      const grad = ctx.createLinearGradient(0, h, 0, 0);
      grad.addColorStop(0, colors[1]);
      grad.addColorStop(1, colors[0]);
      ctx.fillStyle = grad;

      for (let i = 0; i < bins; i++) {
        const v = Math.pow(data[i] / 255, 0.82) * (0.58 + 0.42 * (i / bins));
        // fast attack, slow release — reads as music, not static
        smooth[i] += v > smooth[i] ? (v - smooth[i]) * 0.5 : (v - smooth[i]) * 0.11;
        const barH = Math.max(smooth[i] * (h - 6), 2);
        const x = i * slot + gap / 2;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, h - barH, barW, barH, Math.min(barW / 2, 3));
        } else {
          ctx.rect(x, h - barH, barW, barH);
        }
        ctx.fill();
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

  // Liquid Glass: the topbar densifies once content scrolls beneath it.
  const scroller = document.querySelector('.spotify-body');
  const topbar = document.querySelector('.spotify-topbar');
  if (scroller && topbar) {
    let raf = 0;
    scroller.addEventListener('scroll', () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        topbar.classList.toggle('is-scrolled', scroller.scrollTop > 6);
      });
    }, { passive: true });
  }
});