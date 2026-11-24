// Spotify HiFi Lossless Audio Engine
// Multi-Playlist Management, Spotify/Text/File Importer, Global Music Search & Offline Autoplay

class SpotifyHiFiMobileApp {
  constructor() {
    this.audioElement = new Audio();
    this.audioElement.preload = "auto";

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

    // Track targeted for adding to playlist
    this.pendingAddTrack = null;

    // Audio DSP for HiFi Equalizer
    this.audioCtx = null;
    this.sourceNode = null;
    this.analyserNode = null;
    this.eqFilters = [];
    this.eqFrequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

    // Top Artists in rotation
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

    this.renderArtists();
    this.renderGenreCards();
    this.renderHomeFeatured();
    this.renderLibraryPlaylists();
    this.openPlaylist('sick');
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

  // NAVIGATION & VIEW SWITCHING
  setupNavigation() {
    const navButtons = document.querySelectorAll('.mobile-nav-btn');
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

    const btnModalEQ = document.getElementById('btnModalEQ');
    if (btnModalEQ) {
      btnModalEQ.addEventListener('click', () => {
        this.closeNowPlayingModal();
        const eqNavBtn = document.getElementById('mNavEQ');
        this.switchView('viewEQ', eqNavBtn);
      });
    }

    const btnSeeAll = document.getElementById('btnSeeAllTracks');
    if (btnSeeAll) {
      btnSeeAll.addEventListener('click', () => {
        this.openPlaylist('sick');
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

    this.audioElement.addEventListener('ended', () => {
      if (this.isAutoplay) {
        this.nextTrack();
      }
    });

    this.audioElement.addEventListener('error', (e) => {
      console.warn("Audio playback error:", e);
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
        console.warn("Play error:", err);
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
    ['ctrlPlayIcon', 'heroPlayIcon', 'modalPlayIcon'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = playing ? 'none' : 'block';
    });
    ['ctrlPauseIcon', 'heroPauseIcon', 'modalPauseIcon'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = playing ? 'block' : 'none';
    });
  }

  updateUIForTrack(track) {
    const curTitle = document.getElementById('currentTitle');
    const curArtist = document.getElementById('currentArtist');
    const playerThumb = document.getElementById('playerThumb');
    if (curTitle) curTitle.textContent = track.title;
    if (curArtist) curArtist.textContent = track.artist;
    if (playerThumb && track.artwork) playerThumb.src = track.artwork;

    const modalTitle = document.getElementById('modalSongTitle');
    const modalArtist = document.getElementById('modalArtistName');
    const modalCover = document.getElementById('modalCoverImg');
    const modalTotalTime = document.getElementById('modalTotalTime');
    const modalPlName = document.getElementById('modalPlayingPlaylistName');
    if (modalTitle) modalTitle.textContent = track.title;
    if (modalArtist) modalArtist.textContent = track.artist;
    if (modalCover && track.artwork) modalCover.src = track.artwork;
    if (modalTotalTime) modalTotalTime.textContent = this.formatTime(track.duration || 180);

    const currentPl = this.playlists.find(p => p.id === this.currentPlaylistId);
    if (modalPlName && currentPl) modalPlName.textContent = currentPl.title;

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

  // OPEN PLAYLIST VIEW
  openPlaylist(playlistId) {
    const pl = this.playlists.find(p => p.id === playlistId);
    if (!pl) return;

    this.currentPlaylistId = pl.id;
    this.tracks = pl.tracks;

    // Switch view
    this.switchView('viewPlaylist', null);

    // Update Hero elements
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

    // Render tracklist
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
      this.openPlaylist('sick');
    }
  }

  // RENDER LIBRARY
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
          <div class="lib-card-sub">
            <span class="lib-tag-pill">${pl.type || 'playlist'}</span>
            <span>${pl.tracks.length} songs • ${pl.curator || 'You'}</span>
          </div>
        </div>
      `;
      card.addEventListener('click', () => {
        this.openPlaylist(pl.id);
      });
      grid.appendChild(card);
    });
  }

  // RENDER HOME & ARTISTS
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

    const count = Math.min(this.featuredTracks.length, 30);
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
          this.addTrackToPlaylist(pl.id, track);
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
      alert(`"${track.title}" is already in ${pl.title}!`);
      return;
    }

    pl.tracks.push(track);
    this.saveCustomPlaylists();
    this.renderLibraryPlaylists();
    if (this.currentPlaylistId === playlistId) {
      this.openPlaylist(playlistId);
    }
    alert(`Added "${track.title}" to ${pl.title}!`);
  }

  // IMPORT MODAL & LOGIC
  setupImportModalEvents() {
    // Open / Close Import Modal
    const btnOpenImport = document.getElementById('btnOpenImportModal');
    const btnCloseImport = document.getElementById('btnCloseImportModal');
    const importModal = document.getElementById('importModal');

    if (btnOpenImport) btnOpenImport.addEventListener('click', () => this.openImportModal());
    if (btnCloseImport) btnCloseImport.addEventListener('click', () => importModal.classList.remove('open'));

    // Tabs
    document.querySelectorAll('.import-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.import-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.import-tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        const pane = document.getElementById(tabId);
        if (pane) pane.classList.add('active');
      });
    });

    // Method 1: Spotify Link Import
    const btnDoSpotify = document.getElementById('btnDoImportSpotify');
    if (btnDoSpotify) {
      btnDoSpotify.addEventListener('click', () => this.handleSpotifyImport());
    }

    // Method 2: Text Import
    const btnDoText = document.getElementById('btnDoImportText');
    if (btnDoText) {
      btnDoText.addEventListener('click', () => this.handleTextImport());
    }

    // Method 3: File Drop / Select
    const dropzone = document.getElementById('fileDropzone');
    const fileInput = document.getElementById('importFileInput');
    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    }

    // Create New Playlist Modal
    const btnOpenCreate = document.getElementById('btnOpenCreateModal');
    const btnCloseCreate = document.getElementById('btnCloseCreateModal');
    const createModal = document.getElementById('createPlaylistModal');
    const btnConfirmCreate = document.getElementById('btnConfirmCreatePlaylist');

    if (btnOpenCreate) btnOpenCreate.addEventListener('click', () => createModal.classList.add('open'));
    if (btnCloseCreate) btnCloseCreate.addEventListener('click', () => createModal.classList.remove('open'));

    if (btnConfirmCreate) {
      btnConfirmCreate.addEventListener('click', () => {
        const title = document.getElementById('newPlaylistTitleInput').value.trim();
        const desc = document.getElementById('newPlaylistDescInput').value.trim();
        if (!title) {
          alert("Please enter a playlist name.");
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
        createModal.classList.remove('open');
        this.openPlaylist(newPl.id);
      });
    }

    // Close Add to Playlist Modal
    const btnCloseAdd = document.getElementById('btnCloseAddTrackModal');
    const addModal = document.getElementById('addToPlaylistModal');
    if (btnCloseAdd) btnCloseAdd.addEventListener('click', () => addModal.classList.remove('open'));

    // Share / Export Playlist
    const btnExport = document.getElementById('btnExportPlaylist');
    if (btnExport) {
      btnExport.addEventListener('click', () => this.exportCurrentPlaylist());
    }
  }

  openImportModal() {
    const modal = document.getElementById('importModal');
    if (modal) modal.classList.add('open');
  }

  async handleSpotifyImport() {
    const input = document.getElementById('importSpotifyUrl');
    const url = input ? input.value.trim() : '';
    if (!url || !url.includes('spotify.com')) {
      alert("Please enter a valid Spotify playlist URL (e.g. https://open.spotify.com/playlist/...)");
      return;
    }

    this.showImportLoading(true, "Connecting to Spotify & resolving metadata...");

    try {
      // 1. Fetch playlist title and cover from Spotify OEmbed
      const oembedRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
      let playlistTitle = "Imported Spotify Playlist";
      let playlistCover = "";

      if (oembedRes.ok) {
        const odata = await oembedRes.json();
        if (odata.title) playlistTitle = odata.title;
        if (odata.thumbnail_url) playlistCover = odata.thumbnail_url;
      }

      this.showImportLoading(true, `Found "${playlistTitle}". Resolving tracks in HiFi Lossless...`);

      // 2. Fetch tracks using global catalog lookup for popular tracks
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

      const newPl = {
        id: 'spotify_' + Date.now(),
        title: playlistTitle,
        curator: 'Spotify Import',
        type: 'imported',
        artwork: playlistCover || (importedTracks[0] ? importedTracks[0].artwork : 'icon-512.png'),
        themeColor: '#1db954',
        tracks: importedTracks
      };

      this.playlists.push(newPl);
      this.saveCustomPlaylists();
      this.renderLibraryPlaylists();
      this.showImportLoading(false);
      document.getElementById('importModal').classList.remove('open');
      this.openPlaylist(newPl.id);
      alert(`Successfully imported "${playlistTitle}" with ${importedTracks.length} tracks!`);
    } catch (err) {
      console.error("Spotify import error:", err);
      this.showImportLoading(false);
      alert("Could not import this Spotify link. Please try pasting the song names into the 'Song List' tab!");
    }
  }

  async handleTextImport() {
    const titleInput = document.getElementById('importTextPlaylistName');
    const textarea = document.getElementById('importTextSongs');
    const playlistName = titleInput ? (titleInput.value.trim() || 'My Imported Playlist') : 'Imported Playlist';
    const text = textarea ? textarea.value.trim() : '';

    if (!text) {
      alert("Please paste at least one song title.");
      return;
    }

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    this.showImportLoading(true, `Resolving ${lines.length} songs from global studio catalog...`);

    const importedTracks = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].replace(/^\d+[\.\-\s]+/, ''); // strip numbers
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

    const newPl = {
      id: 'text_' + Date.now(),
      title: playlistName,
      curator: 'Imported',
      type: 'imported',
      artwork: importedTracks[0] ? importedTracks[0].artwork : 'icon-512.png',
      themeColor: '#1db954',
      tracks: importedTracks
    };

    this.playlists.push(newPl);
    this.saveCustomPlaylists();
    this.renderLibraryPlaylists();
    this.showImportLoading(false);
    document.getElementById('importModal').classList.remove('open');
    this.openPlaylist(newPl.id);
    alert(`Successfully imported "${playlistName}" with ${importedTracks.length} tracks!`);
  }

  handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        let tracks = [];
        let name = file.name.replace(/\.[^/.]+$/, "");

        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content);
          tracks = Array.isArray(parsed) ? parsed : (parsed.tracks || []);
        } else {
          // M3U or text
          const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
          tracks = lines.map(l => ({
            title: l.trim(),
            artist: 'Imported Artist',
            album: name,
            duration: 180,
            artwork: 'icon-192.png',
            streamUrl: ''
          }));
        }

        const newPl = {
          id: 'file_' + Date.now(),
          title: name,
          curator: 'File Upload',
          type: 'imported',
          artwork: tracks[0] && tracks[0].artwork ? tracks[0].artwork : 'icon-512.png',
          themeColor: '#1db954',
          tracks: tracks
        };

        this.playlists.push(newPl);
        this.saveCustomPlaylists();
        this.renderLibraryPlaylists();
        document.getElementById('importModal').classList.remove('open');
        this.openPlaylist(newPl.id);
        alert(`Successfully imported playlist "${name}" with ${tracks.length} tracks!`);
      } catch (err) {
        alert("Failed to parse playlist file. Please check that it is a valid JSON or M3U file.");
      }
    };
    reader.readAsText(file);
  }

  exportCurrentPlaylist() {
    const pl = this.playlists.find(p => p.id === this.currentPlaylistId);
    if (!pl) return;

    const exportData = JSON.stringify({
      title: pl.title,
      curator: pl.curator,
      trackCount: pl.tracks.length,
      tracks: pl.tracks
    }, null, 2);

    if (navigator.clipboard) {
      navigator.clipboard.writeText(exportData).then(() => {
        alert(`Playlist "${pl.title}" copied to clipboard as JSON! You can send this text to your friend to import instantly.`);
      });
    } else {
      prompt("Copy playlist JSON to share with your friend:", exportData);
    }
  }

  showImportLoading(show, text = "Loading...") {
    const box = document.getElementById('importLoadingStatus');
    const statusText = document.getElementById('importStatusText');
    if (box) box.style.display = show ? 'flex' : 'none';
    if (statusText) statusText.textContent = text;
  }

  // GLOBAL SEARCH (Local + Millions of tracks via iTunes API)
  setupUIEvents() {
    const quickPlay = document.getElementById('quickPlaySick');
    if (quickPlay) {
      quickPlay.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openPlaylist('sick');
        this.playTrack(0);
      });
    }

    const heroPlay = document.getElementById('heroPlayBtn');
    if (heroPlay) {
      heroPlay.addEventListener('click', () => this.togglePlayPause());
    }

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

    const miniZone = document.getElementById('miniPlayerClickZone');
    if (miniZone) {
      miniZone.addEventListener('click', () => this.openNowPlayingModal());
    }

    const modalClose = document.getElementById('modalCloseBtn');
    const modalChevron = document.getElementById('modalDismissChevron');
    if (modalClose) modalClose.addEventListener('click', () => this.closeNowPlayingModal());
    if (modalChevron) modalChevron.addEventListener('click', () => this.closeNowPlayingModal());

    const modalPlay = document.getElementById('btnModalPlayPause');
    if (modalPlay) modalPlay.addEventListener('click', () => this.togglePlayPause());
    const modalPrev = document.getElementById('btnModalPrev');
    if (modalPrev) modalPrev.addEventListener('click', () => this.prevTrack());
    const modalNext = document.getElementById('btnModalNext');
    if (modalNext) modalNext.addEventListener('click', () => this.nextTrack());

    // Add current track in player to a playlist
    const btnAddCurrent = document.getElementById('btnModalAddCurrentToPlaylist');
    if (btnAddCurrent) {
      btnAddCurrent.addEventListener('click', () => {
        if (this.currentIndex >= 0 && this.currentIndex < this.tracks.length) {
          this.openAddToPlaylistModal(this.tracks[this.currentIndex]);
        }
      });
    }

    // Autoplay toggle
    const btnAutoplay = document.getElementById('btnAutoplayToggle');
    const btnModalAutoplay = document.getElementById('btnModalAutoplay');
    const toggleAutoplay = () => {
      this.isAutoplay = !this.isAutoplay;
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

    // Shuffle
    const btnShuffle = document.getElementById('btnShufflePlaylist');
    const btnModalShuffle = document.getElementById('btnModalShuffle');
    const toggleShuffle = () => {
      this.isShuffle = !this.isShuffle;
      if (btnShuffle) btnShuffle.classList.toggle('active', this.isShuffle);
      if (btnModalShuffle) btnModalShuffle.classList.toggle('active', this.isShuffle);
    };
    if (btnShuffle) btnShuffle.addEventListener('click', toggleShuffle);
    if (btnModalShuffle) btnModalShuffle.addEventListener('click', toggleShuffle);

    // Timeline Scrubbing
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

    // Global Search Input (Debounced with Global Catalog API)
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
        }, 250);
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

    // Library filter chips
    document.querySelectorAll('.filter-chips-row [data-lib-filter]').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-chips-row [data-lib-filter]').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.renderLibraryPlaylists(pill.getAttribute('data-lib-filter'));
      });
    });
  }

  async performGlobalSearch(query) {
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
    if (tracksBody) tracksBody.innerHTML = '<p style="padding:16px;color:#b3b3b3;">Searching global catalog...</p>';

    // 1. Search local library
    let localMatches = this.featuredTracks.filter(t => 
      t.title.toLowerCase().includes(query.toLowerCase()) || 
      t.artist.toLowerCase().includes(query.toLowerCase())
    );

    // 2. Query Global Studio Catalog (iTunes API)
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

        // Merge results avoiding exact duplicates
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
            tracksBody.appendChild(this.createTrackElement(track, idx, true));
          });
        }
      }
    } catch (err) {
      console.warn("Global search error:", err);
      if (tracksBody) {
        tracksBody.innerHTML = '';
        this.tracks = localMatches;
        localMatches.forEach((track, idx) => {
          tracksBody.appendChild(this.createTrackElement(track, idx, true));
        });
      }
    }
  }

  filterByArtist(artistName) {
    this.openPlaylist('sick');
    const heroTitle = document.getElementById('playlistTitle');
    if (heroTitle) heroTitle.textContent = `${artistName} Essentials`;

    const filtered = this.featuredTracks.filter(t => t.artist.toLowerCase().includes(artistName.toLowerCase()));
    this.tracks = filtered;

    const container = document.getElementById('tracklistBody');
    if (container) {
      container.innerHTML = '';
      filtered.forEach((track, index) => {
        container.appendChild(this.createTrackElement(track, index, true));
      });
    }
    if (filtered.length > 0) this.playTrack(0);
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

// Instantiate App
window.addEventListener('DOMContentLoaded', () => {
  window.spotifyHiFiApp = new SpotifyHiFiMobileApp();
});
