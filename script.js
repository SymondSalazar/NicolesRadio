// --- VARIABLES GLOBALES ---
let allSongs = [];
let currentPlaylist = [];
let currentSongIndex = 0;
let isPlaying = false;
let moods = [];
let currentMoodId = null;

// --- ELEMENTOS DEL DOM ---
const audioPlayer = document.getElementById("audioPlayer");
const coverImage = document.getElementById("coverImage");
const songTitle = document.getElementById("songTitle");
const artistName = document.getElementById("artistName");
const progressFill = document.getElementById("progressFill");
const playPauseBtn = document.getElementById("playPauseBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const lyricsDisplay = document.getElementById("lyricsDisplay");

// Mood Elements
const addToMoodBtn = document.getElementById("addToMoodBtn");
const moodsBtn = document.getElementById("moodsBtn");
const moodModal = document.getElementById("moodModal");
const closeModal = document.getElementById("closeModal");
const currentMoodIndicator = document.getElementById("currentMoodIndicator");
const newMoodInput = document.getElementById("newMoodInput");
const saveMoodBtn = document.getElementById("saveMoodBtn");
const modalTitle = document.getElementById("modalTitle");

// --- SISTEMA DE ALMACENAMIENTO ---
function loadMoodsFromStorage() {
  const stored = localStorage.getItem("nicole_moods");
  if (stored) {
    moods = JSON.parse(stored);
  } else {
    moods = [];
  }
}

function saveMoodsToStorage() {
  localStorage.setItem("nicole_moods", JSON.stringify(moods));
}

// --- CARGA INICIAL ---
async function initPlayer() {
  try {
    loadMoodsFromStorage();
    const response = await fetch("data.json");
    const data = await response.json();
    allSongs = data.songs || [];
    currentPlaylist = [...allSongs];
    if (currentPlaylist.length > 0) loadSong(0);
  } catch (error) {
    console.error("Error:", error);
    songTitle.innerText = "Error cargando";
  }
}

// --- PLAYER LOGIC ---
function loadSong(index) {
  if (currentPlaylist.length === 0) return;
  currentSongIndex = index;
  const song = currentPlaylist[index];

  songTitle.textContent = song.title;
  artistName.textContent = song.artist;

  if (song.coverPath) {
    coverImage.src = song.coverPath;
  } else {
    coverImage.src = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' style='background:%23ffafc5'><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='30'>🎵</text></svg>`;
  }

  audioPlayer.src = song.audioPath;

  // Reset UI
  document.querySelector(".player-container").classList.remove("playing");
  updatePlayPauseIcon(false);
  loadLyrics(song.lyrics);

  if (isPlaying) {
    audioPlayer.play().catch((e) => console.warn(e));
    document.querySelector(".player-container").classList.add("playing");
    updatePlayPauseIcon(true);
  }
}

function togglePlay() {
  if (audioPlayer.paused) {
    audioPlayer.play();
    isPlaying = true;
    document.querySelector(".player-container").classList.add("playing");
  } else {
    audioPlayer.pause();
    isPlaying = false;
    document.querySelector(".player-container").classList.remove("playing");
  }
  updatePlayPauseIcon(isPlaying);
}

function updatePlayPauseIcon(playing) {
  const icon = playPauseBtn.querySelector("i");
  icon.className = playing ? "fa-solid fa-pause" : "fa-solid fa-play";
}

function nextSong() {
  let nextIndex = currentSongIndex + 1;
  if (nextIndex >= currentPlaylist.length) nextIndex = 0;
  loadSong(nextIndex);
}

function prevSong() {
  let prevIndex = currentSongIndex - 1;
  if (prevIndex < 0) prevIndex = currentPlaylist.length - 1;
  loadSong(prevIndex);
}

// --- MOODS LOGIC ---

// 1. Crear Nuevo Mood (Optimizado para Celular)
saveMoodBtn.addEventListener("click", () => {
  const moodName = newMoodInput.value.trim();
  if (!moodName) {
    newMoodInput.style.borderColor = "var(--primary)";
    setTimeout(() => (newMoodInput.style.borderColor = "#f0f0f0"), 1000);
    return;
  }

  const newMood = {
    id: Date.now().toString(),
    name: moodName,
    songs: [],
  };

  moods.push(newMood);
  saveMoodsToStorage();
  newMoodInput.value = "";

  // TRUCO CELULAR: Cerrar teclado
  newMoodInput.blur();

  const isSelectionMode = modalTitle.innerText.includes("Guardar");
  renderMoodsInModal(isSelectionMode);
});

// Permitir crear con Enter
newMoodInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") saveMoodBtn.click();
});

// 2. Abrir modales
moodsBtn.addEventListener("click", () => {
  modalTitle.innerText = "Tus moods";
  openModal(false);
});

addToMoodBtn.addEventListener("click", () => {
  modalTitle.innerText = "Guardar  en tu mood";
  openModal(true);
});

// 3. Renderizar lista
function renderMoodsInModal(isSelectingMode = false) {
  const list = document.getElementById("moodsList");
  list.innerHTML = "";

  if (moods.length === 0) {
    list.innerHTML =
      '<p style="text-align:center; color:#999; font-size:0.8rem; margin-top:20px;">No has creado ningún mood aún.</p>';
    return;
  }

  moods.forEach((mood, idx) => {
    const item = document.createElement("div");
    item.className = "mood-item";

    if (currentMoodId === mood.id && !isSelectingMode) {
      item.style.background = "#FFF0F3";
      item.style.borderLeft = "3px solid var(--primary)";
    }

    const count = mood.songs.length;

    item.innerHTML = `
            <span>${
              mood.name
            } <small style="color:#aaa">(${count})</small></span>
            <div class="mood-controls">
                ${
                  !isSelectingMode
                    ? `<i class="fa-solid fa-trash" onclick="deleteMood(${idx})"></i>`
                    : '<i class="fa-solid fa-plus-circle" style="color:var(--primary)"></i>'
                }
            </div>
        `;

    item.addEventListener("click", (e) => {
      if (e.target.classList.contains("fa-trash")) return;

      if (isSelectingMode) {
        addCurrentSongToMood(idx);
      } else {
        playMood(idx);
      }
    });

    list.appendChild(item);
  });
}

function addCurrentSongToMood(index) {
  const mood = moods[index];
  const song = currentPlaylist[currentSongIndex];

  const exists = mood.songs.find((s) => s.title === song.title);

  if (!exists) {
    mood.songs.push(song);
    saveMoodsToStorage();
    addToMoodBtn.classList.add("active");
    setTimeout(() => addToMoodBtn.classList.remove("active"), 1000);
    closeModalFn();
  } else {
    alert("Esta canción ya está en " + mood.name);
  }
}

function playMood(index) {
  const mood = moods[index];
  if (mood.songs.length === 0) {
    alert("Mood vacío.");
    return;
  }

  currentPlaylist = mood.songs;
  currentMoodId = mood.id;
  currentMoodIndicator.innerText = mood.name;

  loadSong(0);
  closeModalFn();
  isPlaying = true;
  audioPlayer.play();
  updatePlayPauseIcon(true);
}

document.getElementById("showAllSongsBtn").addEventListener("click", () => {
  currentPlaylist = [...allSongs];
  currentMoodId = null;
  currentMoodIndicator.innerText = "Radio General";
  loadSong(0);
  closeModalFn();
});

window.deleteMood = function (index) {
  if (confirm("¿Borrar mood?")) {
    moods.splice(index, 1);
    saveMoodsToStorage();
    renderMoodsInModal(false);
  }
};

// UTILS
function openModal(mode) {
  moodModal.classList.add("show");
  renderMoodsInModal(mode);
  // Prevenir scroll del body cuando el modal está abierto
  document.body.style.overflow = "hidden";
}
function closeModalFn() {
  moodModal.classList.remove("show");
  // Restaurar scroll del body
  document.body.style.overflow = "";
}
closeModal.addEventListener("click", closeModalFn);
window.addEventListener("click", (e) => {
  if (e.target == moodModal) closeModalFn();
});

// Eventos Audio
playPauseBtn.addEventListener("click", togglePlay);
nextBtn.addEventListener("click", nextSong);
prevBtn.addEventListener("click", prevSong);
audioPlayer.addEventListener("ended", nextSong);

audioPlayer.addEventListener("timeupdate", () => {
  const { currentTime, duration } = audioPlayer;
  if (currentTime) {
    const percent = (currentTime / duration) * 100;
    progressFill.style.width = `${percent}%`;
    document.getElementById("currentTime").innerText = formatTime(currentTime);
    document.getElementById("totalTime").innerText = formatTime(duration || 0);
    updateLyrics(currentTime);
  }
});

document.querySelector(".progress-bar").addEventListener("click", (e) => {
  const width = e.currentTarget.clientWidth;
  const clickX = e.offsetX;
  const duration = audioPlayer.duration;
  audioPlayer.currentTime = (clickX / width) * duration;
});

function loadLyrics(lyrics) {
  lyricsDisplay.innerHTML = "";
  if (!lyrics || lyrics.length === 0) {
    lyricsDisplay.innerHTML =
      '<p style="color:#aaa; font-size:0.8rem;">(Melodía)</p>';
    return;
  }
  lyrics.forEach((line) => {
    const p = document.createElement("p");
    p.className = "lyric-line";
    p.innerText = line.text;
    p.dataset.time = line.time;
    lyricsDisplay.appendChild(p);
  });
}

function updateLyrics(time) {
  const lines = document.querySelectorAll(".lyric-line");
  let activeIndex = -1;
  lines.forEach((line, i) => {
    if (time >= line.dataset.time) activeIndex = i;
    line.classList.remove("active");
  });
  if (activeIndex !== -1) {
    lines[activeIndex].classList.add("active");
  }
}

function formatTime(s) {
  const min = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${min}:${sec < 10 ? "0" + sec : sec}`;
}

initPlayer();
