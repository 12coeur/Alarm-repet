// Variables globales
let timerInterval = null;
let totalSeconds = 5; // Valeur par défaut: 5 secondes
let currentSeconds = 5;
let isRunning = false;
let cycles = 0;
let selectedRingtone = 'sonnerie1.wav';
let wakeLock = null;
let wakeLockEnabled = true;
let vibrateEnabled = true;

// Éléments DOM
const timeDisplay = document.getElementById('timeDisplay');
const progressBar = document.getElementById('progressBar');
const cycleCountCenter = document.getElementById('cycleCountCenter');
const minutesSlider = document.getElementById('minutes');
const secondsSlider = document.getElementById('seconds');
const minutesValue = document.getElementById('minutesValue');
const secondsValue = document.getElementById('secondsValue');
const startStopBtn = document.getElementById('startStopBtn');
const resetBtn = document.getElementById('resetBtn');
const ringtonesContainer = document.getElementById('ringtonesContainer');
const alarmSound = document.getElementById('alarmSound');
const wakeLockCheckbox = document.getElementById('wakeLock');
const vibrateCheckbox = document.getElementById('vibrate');

// Initialisation de l'application
function initApp() {
    // Mise à jour des valeurs des curseurs
    updateTimeFromSliders();
    
    // Création des boutons de sonnerie
    createRingtoneButtons();
    
    // Configuration des écouteurs d'événements
    setupEventListeners();
    
    // Mise à jour de l'affichage initial
    updateDisplay();
    
    // Mise à jour de l'année dans le footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    
    // Vérification de la prise en charge de l'API Wake Lock
    checkWakeLockSupport();
}

// Vérifie si l'API Wake Lock est supportée
function checkWakeLockSupport() {
    if ('wakeLock' in navigator) {
        console.log('API Wake Lock supportée');
        wakeLockCheckbox.disabled = false;
    } else {
        console.log('API Wake Lock non supportée');
        wakeLockCheckbox.disabled = true;
        wakeLockCheckbox.parentElement.innerHTML += ' <span class="unsupported">(Non supporté par votre navigateur)</span>';
    }
}

// Met à jour le temps total à partir des curseurs
function updateTimeFromSliders() {
    const minutes = parseInt(minutesSlider.value);
    const seconds = parseInt(secondsSlider.value);
    
    totalSeconds = minutes * 60 + seconds;
    currentSeconds = totalSeconds;
    
    // Mise à jour des valeurs affichées
    minutesValue.textContent = minutes;
    secondsValue.textContent = seconds;
    
    updateDisplay();
}

// Met à jour l'affichage du minuteur
function updateDisplay() {
    const minutes = Math.floor(currentSeconds / 60);
    const seconds = currentSeconds % 60;
    
    timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Mise à jour de la barre de progression
    const progressPercentage = ((totalSeconds - currentSeconds) / totalSeconds) * 100;
    progressBar.style.width = `${progressPercentage}%`;
    
    // Mise à jour du compteur de cycles (affichage central seulement)
    cycleCountCenter.textContent = cycles;
    
    // Animation verte pour les dernières secondes (réussite)
    if (isRunning && currentSeconds <= 3 && currentSeconds > 0) {
        timeDisplay.classList.add('success-active');
    } else {
        timeDisplay.classList.remove('success-active');
    }
}

// Crée les boutons de sélection des sonneries
function createRingtoneButtons() {
    const ringtones = [
        { id: 1, name: 'Sonnerie 1', file: 'sonnerie1.wav', icon: 'bell' },
        { id: 2, name: 'Sonnerie 2', file: 'sonnerie2.wav', icon: 'clock' },
        { id: 3, name: 'Sonnerie 3', file: 'sonnerie3.wav', icon: 'music' },
        { id: 4, name: 'Sonnerie 4', file: 'sonnerie4.wav', icon: 'volume-up' }
    ];
    
    ringtonesContainer.innerHTML = '';
    
    ringtones.forEach(ringtone => {
        const button = document.createElement('button');
        button.className = `ringtone-btn ${ringtone.id === 1 ? 'active' : ''}`;
        button.innerHTML = `<i class="fas fa-${ringtone.icon}"></i> ${ringtone.name}`;
        
        button.addEventListener('click', () => {
            selectRingtone(ringtone.file, button);
            playRingtonePreview(ringtone.file);
        });
        
        ringtonesContainer.appendChild(button);
    });
}

// Sélectionne une sonnerie
function selectRingtone(ringtoneFile, button) {
    // Retire la classe active de tous les boutons
    document.querySelectorAll('.ringtone-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Ajoute la classe active au bouton sélectionné
    button.classList.add('active');
    
    // Met à jour la sonnerie sélectionnée
    selectedRingtone = ringtoneFile;
    
    // Met à jour la source audio
    alarmSound.src = `Sonneries/${ringtoneFile}`;
    alarmSound.load();
}

// Joue un aperçu de la sonnerie
function playRingtonePreview(ringtoneFile) {
    if (isRunning) return; // Ne pas jouer d'aperçu pendant le décompte
    
    const previewAudio = new Audio(`Sonneries/${ringtoneFile}`);
    previewAudio.volume = 0.5;
    previewAudio.play().catch(e => console.log("Impossible de jouer l'aperçu audio:", e));
}

// Démarre ou arrête le minuteur
function toggleTimer() {
    if (isRunning) {
        stopTimer();
    } else {
        startTimer();
    }
}

// Démarre le minuteur
function startTimer() {
    if (isRunning) return;
    
    // Met à jour le temps total à partir des curseurs
    updateTimeFromSliders();
    
    isRunning = true;
    startStopBtn.innerHTML = '<i class="fas fa-stop"></i> Stop';
    startStopBtn.classList.remove('start-btn');
    startStopBtn.classList.add('stop-btn');
    
    // Active le Wake Lock si activé
    if (wakeLockEnabled && 'wakeLock' in navigator) {
        requestWakeLock();
    }
    
    // Désactive les curseurs pendant l'exécution
    minutesSlider.disabled = true;
    secondsSlider.disabled = true;
    
    // Active le bouton Reset
    resetBtn.disabled = false;
    
    // Démarre l'intervalle du minuteur
    timerInterval = setInterval(updateTimer, 1000);
}

// Arrête le minuteur
function stopTimer() {
    if (!isRunning) return;
    
    isRunning = false;
    clearInterval(timerInterval);
    
    startStopBtn.innerHTML = '<i class="fas fa-play"></i> Start';
    startStopBtn.classList.remove('stop-btn');
    startStopBtn.classList.add('start-btn');
    
    // Libère le Wake Lock
    releaseWakeLock();
    
    // Réactive les curseurs
    minutesSlider.disabled = false;
    secondsSlider.disabled = false;
    
    // Arrête le son d'alarme s'il est en cours
    alarmSound.pause();
    alarmSound.currentTime = 0;
    
    // Retire l'animation de réussite
    timeDisplay.classList.remove('success-active');
}

// Réinitialise le minuteur
function resetTimer() {
    // Arrête le minuteur s'il est en cours
    if (isRunning) {
        stopTimer();
    }
    
    // Réinitialise les cycles
    cycles = 0;
    
    // Réinitialise le minuteur à la valeur des curseurs
    updateTimeFromSliders();
    
    // Désactive le bouton Reset si le minuteur est à zéro
    if (totalSeconds === 0) {
        resetBtn.disabled = true;
    }
    
    // Retire l'animation de réussite
    timeDisplay.classList.remove('success-active');
}

// Met à jour le minuteur chaque seconde
function updateTimer() {
    currentSeconds--;
    
    if (currentSeconds <= 0) {
        // Temps écoulé - SUCCÈS !
        currentSeconds = 0;
        updateDisplay();
        
        // Déclenche l'alarme de réussite
        triggerSuccess();
        
        // Incrémente le compteur de cycles
        cycles++;
        
        // Réinitialise le minuteur pour le cycle suivant
        setTimeout(() => {
            currentSeconds = totalSeconds;
            updateDisplay();
        }, 100);
        
        return;
    }
    
    updateDisplay();
}

// Déclenche l'effet de réussite (remplace l'alarme)
function triggerSuccess() {
    // Joue la sonnerie (mais avec une signification positive)
    alarmSound.currentTime = 0;
    alarmSound.play().catch(e => console.log("Impossible de jouer le son de réussite:", e));
    
    // Active la vibration si disponible et activée
    if (vibrateEnabled && 'vibrate' in navigator) {
        navigator.vibrate([300, 100, 300]); // Vibration plus douce
    }
    
    // Effet visuel de réussite (vert)
    flashSuccess();
}

// Fait clignoter l'écran en vert pour la réussite
function flashSuccess() {
    const originalBg = document.body.style.background;
    document.body.style.background = 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)';
    
    setTimeout(() => {
        document.body.style.background = originalBg;
    }, 500);
}

// Demande un Wake Lock pour empêcher la mise en veille
async function requestWakeLock() {
    try {
        if (wakeLockEnabled && 'wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock activé');
            
            wakeLock.addEventListener('release', () => {
                console.log('Wake Lock libéré');
            });
        }
    } catch (err) {
        console.error(`Erreur Wake Lock: ${err.name}, ${err.message}`);
    }
}

// Libère le Wake Lock
function releaseWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release().then(() => {
            wakeLock = null;
            console.log('Wake Lock libéré manuellement');
        });
    }
}

// Configure les écouteurs d'événements
function setupEventListeners() {
    // Curseurs de minutes et secondes
    minutesSlider.addEventListener('input', updateTimeFromSliders);
    secondsSlider.addEventListener('input', updateTimeFromSliders);
    
    // Bouton Start/Stop
    startStopBtn.addEventListener('click', toggleTimer);
    
    // Bouton Reset
    resetBtn.addEventListener('click', resetTimer);
    
    // Cases à cocher des paramètres
    wakeLockCheckbox.addEventListener('change', function() {
        wakeLockEnabled = this.checked;
        
        if (!wakeLockEnabled && wakeLock !== null) {
            releaseWakeLock();
        }
        
        if (wakeLockEnabled && isRunning && 'wakeLock' in navigator) {
            requestWakeLock();
        }
    });
    
    vibrateCheckbox.addEventListener('change', function() {
        vibrateEnabled = this.checked;
    });
    
    // Désactive le bouton Reset si le temps est à zéro
    minutesSlider.addEventListener('input', checkResetButton);
    secondsSlider.addEventListener('input', checkResetButton);
    
    // Vérifie l'état initial du bouton Reset
    checkResetButton();
    
    // Gestion de la visibilité de la page pour le Wake Lock
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && isRunning && wakeLockEnabled && 'wakeLock' in navigator) {
            // Redemande le Wake Lock si la page redevient visible
            requestWakeLock();
        }
    });
}

// Vérifie si le bouton Reset doit être désactivé
function checkResetButton() {
    const minutes = parseInt(minutesSlider.value);
    const seconds = parseInt(secondsSlider.value);
    
    if (minutes === 0 && seconds === 0) {
        resetBtn.disabled = true;
    } else {
        resetBtn.disabled = false;
    }
}

// Initialise l'application lorsque le DOM est chargé
document.addEventListener('DOMContentLoaded', initApp);
