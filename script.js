// Variables globales
let currentSongIndex = 0;
let songs = [];
let isPlaying = false;

// Elementos del DOM
const audioPlayer = document.getElementById('audioPlayer');
const coverImage = document.getElementById('coverImage');
const songTitle = document.getElementById('songTitle');
const artistName = document.getElementById('artistName');
const currentTime = document.getElementById('currentTime');
const totalTime = document.getElementById('totalTime');
const progressFill = document.getElementById('progressFill');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const lyricsDisplay = document.getElementById('lyricsDisplay');
const progressBar = document.querySelector('.progress-bar');

// Placeholder SVG para cuando no hay portada
const placeholderCover = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">' +
    '<rect width="100%" height="100%" fill="%23FFCFD2"/>' +
    '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23553E4E" font-family="Arial" font-size="24" font-weight="bold">Sin portada</text>' +
    '</svg>'
);

// Función para precargar imágenes
function preloadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(src);
        img.onerror = () => reject(new Error(`No se pudo cargar: ${src}`));
        img.src = src;
    });
}

// Cargar datos del JSON
async function loadSongs() {
    console.log('🎵 Iniciando carga de canciones...');
    try {
        console.log('📡 Haciendo fetch a data.json...');
        const response = await fetch('data.json');
        console.log('✅ Respuesta recibida:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        console.log('📄 Parseando JSON...');
        const data = await response.json();
        console.log('✅ JSON parseado correctamente:', data);
        
        songs = data.songs || [];
        console.log(`🎶 Canciones cargadas: ${songs.length}`);
        
        if (songs.length === 0) {
            console.warn('⚠️ No hay canciones en el array');
            songTitle.textContent = 'No hay canciones disponibles';
            artistName.textContent = '';
            return;
        }
        
        // Precargar imágenes de control
        try {
            await Promise.all([
                preloadImage('play.png'),
                preloadImage('pausa.png')
            ]);
            console.log('✅ Imágenes de control precargadas');
        } catch (error) {
            console.error('❌ Error precargando imágenes:', error);
        }
        
        console.log('🎵 Cargando primera canción...');
        loadSong(currentSongIndex);
    } catch (error) {
        console.error('❌ Error al cargar las canciones:', error);
        console.error('Stack:', error.stack);
        songTitle.textContent = 'Error al cargar música';
        artistName.textContent = `${error.message} - Abre la consola (F12) para más detalles`;
    }
}

// Cargar una canción específica
function loadSong(index) {
    if (songs.length === 0) return;
    
    const song = songs[index];
    
    // Actualizar información
    songTitle.textContent = song.title;
    artistName.textContent = song.artist;
    
    // Cargar portada con fallback
    if (song.coverPath) {
        coverImage.src = song.coverPath;
        coverImage.onerror = () => {
            console.warn(`Portada no encontrada: ${song.coverPath}`);
            coverImage.src = placeholderCover;
        };
    } else {
        coverImage.src = placeholderCover;
    }
    
    // Cargar audio
    audioPlayer.src = song.audioPath;
    
    // Manejar errores de audio
    audioPlayer.onerror = (e) => {
        console.error(`Error cargando audio: ${song.audioPath}`, e);
        songTitle.textContent = `⚠️ Audio no encontrado: ${song.title}`;
        artistName.textContent = 'Verifica la ruta del archivo';
    };
    
    // Actualizar duración cuando cargue metadata
    audioPlayer.onloadedmetadata = () => {
        if (audioPlayer.duration && !isNaN(audioPlayer.duration)) {
            totalTime.textContent = formatTime(audioPlayer.duration);
        }
    };
    
    // Mostrar duración del JSON como placeholder
    totalTime.textContent = formatTime(song.duration);
    
    // Cargar letras
    loadLyrics(song.lyrics);
    
    // Reproducir automáticamente si ya estaba reproduciendo
    if (isPlaying) {
        audioPlayer.play().catch(err => {
            console.warn('No se pudo reproducir automáticamente:', err);
            isPlaying = false;
            updatePlayPauseButton();
        });
    }
}

// Actualizar el botón de play/pause
function updatePlayPauseButton() {
    const playImg = playPauseBtn.querySelector('img');
    if (!playImg) {
        console.error('No se encontró el elemento img dentro del botón');
        return;
    }
    
    // Forzar cambio de imagen
    const newSrc = isPlaying ? 'pausa.png' : 'play.png';
    const newAlt = isPlaying ? 'Pausar' : 'Reproducir';
    
    console.log(`Cambiando botón a: ${newSrc}`);
    
    // Cambiar atributos
    playImg.setAttribute('src', newSrc);
    playImg.setAttribute('alt', newAlt);
    
    // Verificar que se aplicó el cambio
    setTimeout(() => {
        console.log('Imagen actual del botón:', playImg.src);
        console.log('Estado isPlaying:', isPlaying);
    }, 100);
    
    // Manejar error de carga
    playImg.onerror = function() {
        console.error(`❌ Error cargando imagen: ${this.src}`);
        console.log('Ruta absoluta intentada:', this.src);
        // Intentar con ruta alternativa
        if (!this.src.includes('1x/')) {
            console.log('Intentando con carpeta 1x/...');
            this.src = '1x/' + (isPlaying ? 'pausa.png' : 'play.png');
        }
    };
}

// Cargar letras en el contenedor
function loadLyrics(lyrics) {
    lyricsDisplay.innerHTML = '';
    
    if (lyrics && lyrics.length > 0) {
        lyrics.forEach((lyric, index) => {
            const lyricLine = document.createElement('div');
            lyricLine.className = 'lyric-line';
            lyricLine.textContent = lyric.text;
            lyricLine.dataset.time = lyric.time;
            lyricLine.dataset.index = index;
            lyricsDisplay.appendChild(lyricLine);
        });
    } else {
        lyricsDisplay.innerHTML = '<p style="color: #999; font-size: 14px;">No hay letras disponibles</p>';
    }
}

// Actualizar letra activa (solo muestra la línea actual)
function updateLyrics() {
    const song = songs[currentSongIndex];
    if (!song.lyrics || song.lyrics.length === 0) return;
    
    const currentTimeValue = audioPlayer.currentTime;
    const lyricLines = document.querySelectorAll('.lyric-line');
    
    let activeLyricIndex = -1;
    
    // Encontrar la línea de letra activa
    for (let i = song.lyrics.length - 1; i >= 0; i--) {
        if (currentTimeValue >= song.lyrics[i].time) {
            activeLyricIndex = i;
            break;
        }
    }
    
    // Solo mostrar la línea activa
    lyricLines.forEach((line, index) => {
        if (index === activeLyricIndex) {
            line.classList.add('active');
        } else {
            line.classList.remove('active');
        }
    });
}

// Formatear tiempo en minutos:segundos
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Reproducir/Pausar
function togglePlayPause() {
    console.log('Toggle play/pause - Estado actual:', isPlaying);
    
    if (isPlaying) {
        audioPlayer.pause();
        isPlaying = false;
        console.log('Audio pausado');
    } else {
        audioPlayer.play()
            .then(() => {
                isPlaying = true;
                console.log('Audio reproduciendo');
                updatePlayPauseButton();
            })
            .catch(err => {
                console.error('Error al reproducir:', err);
                songTitle.textContent = '⚠️ No se pudo reproducir';
                isPlaying = false;
                updatePlayPauseButton();
            });
        return; // Evitar doble actualización
    }
    
    updatePlayPauseButton();
}

// Canción anterior
function previousSong() {
    currentSongIndex--;
    if (currentSongIndex < 0) {
        currentSongIndex = songs.length - 1;
    }
    loadSong(currentSongIndex);
}

// Canción siguiente
function nextSong() {
    currentSongIndex++;
    if (currentSongIndex >= songs.length) {
        currentSongIndex = 0;
    }
    loadSong(currentSongIndex);
}

// Event Listeners
playPauseBtn.addEventListener('click', togglePlayPause);
prevBtn.addEventListener('click', previousSong);
nextBtn.addEventListener('click', nextSong);

// Actualizar progreso
audioPlayer.addEventListener('timeupdate', () => {
    if (audioPlayer.currentTime && !isNaN(audioPlayer.currentTime)) {
        currentTime.textContent = formatTime(audioPlayer.currentTime);
    }
    
    if (audioPlayer.duration && !isNaN(audioPlayer.duration) && audioPlayer.duration > 0) {
        const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressFill.style.width = `${progress}%`;
    }
    
    // Actualizar letras
    updateLyrics();
});

// Cuando termina la canción
audioPlayer.addEventListener('ended', () => {
    nextSong();
});

// Click en la barra de progreso
progressBar.addEventListener('click', (e) => {
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioPlayer.currentTime = percent * audioPlayer.duration;
});

// Inicializar
loadSongs();