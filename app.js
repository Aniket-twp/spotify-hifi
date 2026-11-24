// Spotify HiFi Mobile & Lossless Audio Engine
// Fully optimized for Android screens with Autoplay, Explore, Artist Imagery, & All 62 Tracks

class SpotifyHiFiMobileApp {
  constructor() {
    this.audioElement = new Audio();
    this.audioElement.preload = "auto";

    // Synchronously bind full 62-song playlist from window.SICK_PLAYLIST
    this.tracks = (window.SICK_PLAYLIST && Array.isArray(window.SICK_PLAYLIST) && window.SICK_PLAYLIST.length > 0)
      ? window.SICK_PLAYLIST
      : [];

    this.currentIndex = -1;
    this.isPlaying = false;
    this.isAutoplay = true;
    this.isShuffle = false;
    this.activeFilter = 'all';

    // Audio Context & DSP for HiFi Equalizer
    this.audioCtx = null;
    this.sourceNode = null;
    this.analyserNode = null;
    this.eqFilters = [];
    this.eqFrequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

    // Top Artists with high-res photos
    this.artists = [
      { name: "Travis Scott", photo: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80", role: "11 songs" },
      { name: "The Weeknd", photo: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80", role: "9 songs" },
      { name: "Kendrick Lamar", photo: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80", role: "8 songs" },
      { name: "Drake", photo: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80", role: "6 songs" },
      { name: "Central Cee", photo: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&auto=format&fit=crop&q=80", role: "4 songs" },
      { name: "Roddy Ricch", photo: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80", role: "The Box" },
      { name: "KR$NA", photo: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80", role: "No Cap" },
      { name: "Post Malone", photo: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&auto=format&fit=crop&q=80", role: "Sunflower" },
      { name: "Eminem", photo: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=500&auto=format&fit=crop&q=80", role: "Superman" },
      { name: "Future", photo: "https://images.unsplash.com/photo-1520523839898-5071282543e1?w=500&auto=format&fit=crop&q=80", role: "Mask Off" }
    ];

    // Explore Genres
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
    this.setupNavigation();
    this.setupAudioListeners();
    this.setupUIEvents();
    this.setupEqualizerUI();
    this.renderArtists();
    this.renderGenreCards();

    // Ensure tracks are loaded
    if (this.tracks.length === 0) {
      await this.loadPlaylistData();
    }

    console.log(`Spotify HiFi loaded with ${this.tracks.length} tracks.`);
    this.renderHomeFeatured();
    this.renderMainTracklist();
  }

  updateGreeting() {
    const hours = new Date().getHours();
    let text = "Good evening";
    if (hours < 12) text = "Good morning";
    else if (hours < 18) text = "Good afternoon";
    const elem = document.getElementById('greetingHeading');
    if (elem) elem.textContent = text;
  }

  async loadPlaylistData() {
    try {
      const res = await fetch('sick_playlist.json');
      if (res.ok) {
        this.tracks = await res.json();
      }
    } catch (e) {
      console.warn("fetch failed, checking window.SICK_PLAYLIST:", e);
      if (window.SICK_PLAYLIST && window.SICK_PLAYLIST.length) {
        this.tracks = window.SICK_PLAYLIST;
      }
    }
  }

  // BOTTOM NAVIGATION & VIEW SWITCHING
  setupNavigation() {
    const navButtons = document.querySelectorAll('.mobile-nav-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetViewId = btn.getAttribute('data-target');
        this.switchView(targetViewId, btn);
      });
    });

    // Topbar EQ button
    const btnToggleEQ = document.getElementById('btnToggleEQ');
    if (btnToggleEQ) {
      btnToggleEQ.addEventListener('click', () => {
        const eqNavBtn = document.getElementById('mNavEQ');
        this.switchView('viewEQ', eqNavBtn);
      });
    }

    // Modal EQ button
    const btnModalEQ = document.getElementById('btnModalEQ');
    if (btnModalEQ) {
      btnModalEQ.addEventListener('click', () => {
        this.closeNowPlayingModal();
        const eqNavBtn = document.getElementById('mNavEQ');
        this.switchView('viewEQ', eqNavBtn);
      });
    }

    // See all tracks link
    const btnSeeAll = document.getElementById('btnSeeAllTracks');
    if (btnSeeAll) {
      btnSeeAll.addEventListener('click', () => {
        const plNavBtn = document.getElementById('mNavPlaylist');
        this.switchView('viewPlaylist', plNavBtn);
      });
    }

    // Home Shortcut click
    const shortcutSick = document.getElementById('shortcutSick');
    if (shortcutSick) {
      shortcutSick.addEventListener('click', () => {
        const plNavBtn = document.getElementById('mNavPlaylist');
        this.switchView('viewPlaylist', plNavBtn);
      });
    }
  }

  switchView(viewId, activeBtn) {
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.remove('active');
    });
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');

    document.querySelectorAll('.mobile-nav-btn').forEach(b => {
      b.classList.remove('active');
    });
    if (activeBtn) activeBtn.classList.add('active');

    const body = document.querySelector('.spotify-body');
    if (body) body.scrollTop = 0;
  }

  // AUDIO ENGINE & AUTOPLAY LOGIC
  setupAudioListeners() {
    this.audioElement.addEventListener('play', () => this.updatePlayState(true));
    this.audioElement.addEventListener('pause', () => this.updatePlayState(false));

    this.audioElement.addEventListener('timeupdate', () => {
      const cur = this.audioElement.currentTime || 0;
      const dur = this.audioElement.duration || 1;
      const pct = (cur / dur) * 100;

      const miniFill = document.getElementById('playbackBarFg');
      if (miniFill) miniFill.style.width = `${pct}%`;

      const modalFill = document.getElementById('modalSliderFg');
      if (modalFill) modalFill.style.width = `${pct}%`;

      const curLabel = document.getElementById('modalCurrentTime');
      if (curLabel) curLabel.textContent = this.formatTime(cur);
    });

    this.audioElement.addEventListener('loadedmetadata', () => {
      const dur = this.audioElement.duration || 0;
      const totalLabel = document.getElementById('modalTotalTime');
      if (totalLabel) totalLabel.textContent = this.formatTime(dur);
    });

    // CONTINUOUS AUTOPLAY
    this.audioElement.addEventListener('ended', () => {
      if (this.isAutoplay) {
        this.nextTrack();
      }
    });

    this.audioElement.addEventListener('error', (e) => {
      console.warn("Audio playback error on track:", this.currentIndex, e);
      if (this.currentIndex >= 0 && this.currentIndex < this.tracks.length) {
        const track = this.tracks[this.currentIndex];
        // If preview failed, attempt fallback previewUrl
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

  playTrack(index) {
    if (index < 0 || index >= this.tracks.length) return;
    this.currentIndex = index;
    const track = this.tracks[index];

    this.initAudioNodes();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const streamUrl = track.streamUrl || track.previewFallback;
    if (streamUrl) {
      this.audioElement.src = streamUrl;
      this.audioElement.play().catch(err => {
        console.warn("Direct stream play error:", err);
      });
    }

    this.updateUIForTrack(track);
    this.highlightActiveTrack();
  }

  togglePlayPause() {
    if (this.currentIndex === -1) {
      if (this.tracks.length > 0) this.playTrack(0);
      return;
    }
    if (this.isPlaying) {
      this.audioElement.pause();
    } else {
      this.audioElement.play().catch(console.error);
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

  updatePlayState(playing) {
    this.isPlaying = playing;
    const ctrlPlay = document.getElementById('ctrlPlayIcon');
    const ctrlPause = document.getElementById('ctrlPauseIcon');
    const heroPlay = document.getElementById('heroPlayIcon');
    const heroPause = document.getElementById('heroPauseIcon');
    const modalPlay = document.getElementById('modalPlayIcon');
    const modalPause = document.getElementById('modalPauseIcon');

    if (ctrlPlay && ctrlPause) {
      ctrlPlay.style.display = playing ? 'none' : 'block';
      ctrlPause.style.display = playing ? 'block' : 'none';
    }
    if (heroPlay && heroPause) {
      heroPlay.style.display = playing ? 'none' : 'block';
      heroPause.style.display = playing ? 'block' : 'none';
    }
    if (modalPlay && modalPause) {
      modalPlay.style.display = playing ? 'none' : 'block';
      modalPause.style.display = playing ? 'block' : 'none';
    }
  }

  updateUIForTrack(track) {
    // Mini-player updates
    const currentTitle = document.getElementById('currentTitle');
    const currentArtist = document.getElementById('currentArtist');
    const playerThumb = document.getElementById('playerThumb');
    if (currentTitle) currentTitle.textContent = track.title;
    if (currentArtist) currentArtist.textContent = track.artist;
    if (playerThumb && track.artwork) playerThumb.src = track.artwork;

    // Full modal updates
    const modalTitle = document.getElementById('modalSongTitle');
    const modalArtist = document.getElementById('modalArtistName');
    const modalCover = document.getElementById('modalCoverImg');
    const modalTotalTime = document.getElementById('modalTotalTime');
    if (modalTitle) modalTitle.textContent = track.title;
    if (modalArtist) modalArtist.textContent = track.artist;
    if (modalCover && track.artwork) modalCover.src = track.artwork;
    if (modalTotalTime) modalTotalTime.textContent = this.formatTime(track.duration || 180);

    // Dynamic background theme
    const themeColor = track.themeColor || '#1db954';
    const modal = document.getElementById('nowPlayingModal');
    if (modal) {
      modal.style.background = `linear-gradient(180deg, ${themeColor}66 0%, #180a0a 40%, #121212 100%)`;
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

  // RENDER VIEWS
  renderArtists() {
    const container = document.getElementById('homeArtistsScroll');
    if (!container) return;
    container.innerHTML = '';

    this.artists.forEach(artist => {
      const div = document.createElement('div');
      div.className = 'artist-circle-item';
      div.innerHTML = `
        <div class="artist-circle-img-wrap">
          <img src="${artist.photo}" class="artist-circle-img" alt="${artist.name}" loading="lazy" onerror="this.src='icon-192.png'">
        </div>
        <span class="artist-circle-name">${artist.name}</span>
        <span class="artist-circle-role">${artist.role}</span>
      `;
      div.addEventListener('click', () => {
        this.filterByArtist(artist.name);
      });
      container.appendChild(div);
    });
  }

  renderGenreCards() {
    const grid = document.getElementById('searchGenreGrid');
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

    document.querySelectorAll('.explore-category-grid .category-card').forEach(card => {
      card.addEventListener('click', () => {
        const genre = card.getAttribute('data-genre');
        if (genre) this.filterByGenre(genre);
      });
    });
  }

  renderHomeFeatured() {
    const container = document.getElementById('homeFeaturedTracks');
    if (!container) return;
    container.innerHTML = '';

    // Render all tracks or up to 20 on Home feed with fast touch items
    const count = Math.min(this.tracks.length, 25);
    for (let i = 0; i < count; i++) {
      const item = this.createTrackElement(this.tracks[i], i);
      container.appendChild(item);
    }
  }

  renderMainTracklist() {
    const container = document.getElementById('tracklistBody');
    if (!container) return;
    container.innerHTML = '';

    const countElem = document.getElementById('playlistTrackCount');
    if (countElem) countElem.textContent = `${this.tracks.length} songs`;

    this.tracks.forEach((track, index) => {
      const item = this.createTrackElement(track, index);
      container.appendChild(item);
    });
  }

  createTrackElement(track, index) {
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
        <span class="track-duration-pill">${durStr}</span>
      </div>
    `;

    div.addEventListener('click', () => this.playTrack(index));
    return div;
  }

  // SEARCH & EXPLORE FILTER
  setupUIEvents() {
    // Quick play sick button
    const quickPlay = document.getElementById('quickPlaySick');
    if (quickPlay) {
      quickPlay.addEventListener('click', (e) => {
        e.stopPropagation();
        this.playTrack(0);
      });
    }

    // Hero Play button
    const heroPlay = document.getElementById('heroPlayBtn');
    if (heroPlay) {
      heroPlay.addEventListener('click', () => this.togglePlayPause());
    }

    // Mini Player Play/Pause and Next
    const miniPlay = document.getElementById('btnPlayPause');
    if (miniPlay) {
      miniPlay.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePlayPause();
      });
    }
    const miniNext = document.getElementById('btnNextTrack');
    if (miniNext) {
      miniNext.addEventListener('click', (e) => {
        e.stopPropagation();
        this.nextTrack();
      });
    }

    // Mini Player click to open Full Modal
    const miniZone = document.getElementById('miniPlayerClickZone');
    if (miniZone) {
      miniZone.addEventListener('click', () => this.openNowPlayingModal());
    }

    // Modal Close button & Drag bar
    const modalClose = document.getElementById('modalCloseBtn');
    const modalChevron = document.getElementById('modalDismissChevron');
    if (modalClose) modalClose.addEventListener('click', () => this.closeNowPlayingModal());
    if (modalChevron) modalChevron.addEventListener('click', () => this.closeNowPlayingModal());

    // Modal Controls
    const modalPlay = document.getElementById('btnModalPlayPause');
    if (modalPlay) modalPlay.addEventListener('click', () => this.togglePlayPause());
    const modalPrev = document.getElementById('btnModalPrev');
    if (modalPrev) modalPrev.addEventListener('click', () => this.prevTrack());
    const modalNext = document.getElementById('btnModalNext');
    if (modalNext) modalNext.addEventListener('click', () => this.nextTrack());

    // Filter Chips on Home
    document.querySelectorAll('.filter-chips-row .chip-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-chips-row .chip-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const filter = pill.getAttribute('data-filter');
        this.applyHomeFilter(filter);
      });
    });

    // AUTOPLAY TOGGLE BUTTONS
    const btnAutoplay = document.getElementById('btnAutoplayToggle');
    const btnModalAutoplay = document.getElementById('btnModalAutoplay');
    const toggleAutoplay = () => {
      this.isAutoplay = !this.isAutoplay;
      console.log("Autoplay is now:", this.isAutoplay);
      if (btnAutoplay) {
        const label = btnAutoplay.querySelector('.autoplay-label');
        if (label) label.textContent = this.isAutoplay ? 'AUTOPLAY ON' : 'AUTOPLAY OFF';
        btnAutoplay.classList.toggle('active', this.isAutoplay);
      }
      if (btnModalAutoplay) {
        btnModalAutoplay.classList.toggle('active', this.isAutoplay);
      }
      const statusTag = document.getElementById('autoplayStatusTag');
      if (statusTag) {
        statusTag.textContent = this.isAutoplay ? 'AUTOPLAY ENABLED' : 'AUTOPLAY DISABLED';
        statusTag.style.color = this.isAutoplay ? 'var(--spotify-green)' : '#727272';
      }
    };
    if (btnAutoplay) btnAutoplay.addEventListener('click', toggleAutoplay);
    if (btnModalAutoplay) btnModalAutoplay.addEventListener('click', toggleAutoplay);

    // Shuffle buttons
    const btnShuffle = document.getElementById('btnShufflePlaylist');
    const btnModalShuffle = document.getElementById('btnModalShuffle');
    const toggleShuffle = () => {
      this.isShuffle = !this.isShuffle;
      if (btnShuffle) btnShuffle.classList.toggle('active', this.isShuffle);
      if (btnModalShuffle) btnModalShuffle.classList.toggle('active', this.isShuffle);
    };
    if (btnShuffle) btnShuffle.addEventListener('click', toggleShuffle);
    if (btnModalShuffle) btnModalShuffle.addEventListener('click', toggleShuffle);

    // Modal Scrubbing
    const sliderBg = document.getElementById('modalSliderBg');
    if (sliderBg) {
      sliderBg.addEventListener('click', (e) => {
        const rect = sliderBg.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(1, clickX / rect.width));
        if (this.audioElement.duration) {
          this.audioElement.currentTime = pct * this.audioElement.duration;
        }
      });
    }

    // Search Input
    const searchInput = document.getElementById('mobileSearchInput');
    const clearBtn = document.getElementById('btnClearSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.trim().toLowerCase();
        if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';
        this.performSearch(q);
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          clearBtn.style.display = 'none';
          this.performSearch('');
        }
      });
    }
  }

  applyHomeFilter(filter) {
    const container = document.getElementById('homeFeaturedTracks');
    if (!container) return;
    container.innerHTML = '';

    let list = this.tracks;
    if (filter === 'music') {
      list = this.tracks.filter(t => !/speech|podcast|intro/i.test(t.title));
    } else if (filter === 'lossless') {
      list = this.tracks;
    }

    list.forEach((track, idx) => {
      const origIdx = this.tracks.indexOf(track);
      container.appendChild(this.createTrackElement(track, origIdx >= 0 ? origIdx : idx));
    });
  }

  performSearch(query) {
    const genreContainer = document.getElementById('searchResultsContainer');
    const resultsContainer = document.getElementById('searchDynamicResults');
    const tracksBody = document.getElementById('searchTracksBody');
    const countLabel = document.getElementById('searchResultCount');

    if (!query) {
      if (genreContainer) genreContainer.style.display = 'block';
      if (resultsContainer) resultsContainer.style.display = 'none';
      return;
    }

    if (genreContainer) genreContainer.style.display = 'none';
    if (resultsContainer) resultsContainer.style.display = 'block';
    if (tracksBody) tracksBody.innerHTML = '';

    const matches = this.tracks
      .map((t, idx) => ({ track: t, originalIndex: idx }))
      .filter(({ track }) => {
        return track.title.toLowerCase().includes(query) ||
               track.artist.toLowerCase().includes(query) ||
               (track.album && track.album.toLowerCase().includes(query));
      });

    if (countLabel) countLabel.textContent = `Found ${matches.length} matching songs`;

    matches.forEach(({ track, originalIndex }) => {
      const item = this.createTrackElement(track, originalIndex);
      if (tracksBody) tracksBody.appendChild(item);
    });
  }

  filterByArtist(artistName) {
    const plNavBtn = document.getElementById('mNavPlaylist');
    this.switchView('viewPlaylist', plNavBtn);
    const heroTitle = document.getElementById('playlistTitle');
    if (heroTitle) heroTitle.textContent = `${artistName} Essentials`;

    const filtered = this.tracks
      .map((t, idx) => ({ track: t, originalIndex: idx }))
      .filter(({ track }) => track.artist.toLowerCase().includes(artistName.toLowerCase()));

    const container = document.getElementById('tracklistBody');
    if (container) {
      container.innerHTML = '';
      filtered.forEach(({ track, originalIndex }) => {
        container.appendChild(this.createTrackElement(track, originalIndex));
      });
    }
    if (filtered.length > 0) {
      this.playTrack(filtered[0].originalIndex);
    }
  }

  filterByGenre(genreName) {
    const plNavBtn = document.getElementById('mNavPlaylist');
    this.switchView('viewPlaylist', plNavBtn);
    const heroTitle = document.getElementById('playlistTitle');
    if (heroTitle) heroTitle.textContent = `Explore: ${genreName}`;

    let filtered = [];
    if (genreName.includes('Hip-Hop') || genreName.includes('Trap')) {
      filtered = this.tracks.filter(t => /Travis|Drake|Roddy|Future|21|Lil/i.test(t.artist));
    } else if (genreName.includes('Late Night')) {
      filtered = this.tracks.filter(t => /Weeknd|Post Malone|BØRNS|Tame/i.test(t.artist));
    } else if (genreName.includes('Drill')) {
      filtered = this.tracks.filter(t => /Central Cee|Dave|KR\$NA|Kidwild/i.test(t.artist));
    } else {
      filtered = this.tracks;
    }

    const container = document.getElementById('tracklistBody');
    if (container) {
      container.innerHTML = '';
      filtered.forEach(t => {
        const origIdx = this.tracks.indexOf(t);
        container.appendChild(this.createTrackElement(t, origIdx >= 0 ? origIdx : 0));
      });
    }
    if (filtered.length > 0) {
      const firstOrig = this.tracks.indexOf(filtered[0]);
      this.playTrack(firstOrig >= 0 ? firstOrig : 0);
    }
  }

  openNowPlayingModal() {
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

    // Presets
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

// Instantiate App
window.addEventListener('DOMContentLoaded', () => {
  window.spotifyHiFiApp = new SpotifyHiFiMobileApp();
});
