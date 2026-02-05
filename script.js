// Variables globales
let timerInterval = null;
let prepaSeconds = 5;        // Temps de préparation
let workSeconds = 5;         // Durée du cycle d'exercice
let currentPrepa = 5;
let currentWork = 5;
let totalSeconds = 10;
let isRunning = false;
let cycles = 0;
let selectedRingtone = 'sonnerie1.wav';      // Sonnerie fin cycle
let selectedPrepaRingtone = 'sonnerie4.wav'; // ← Sonnerie fin prépa (PAR DÉFAUT)
let wakeLock = null;
let wakeLockEnabled = true;
let vibrateEnabled = true;
let phase = 'idle';  // 'idle' | 'prepa' | 'work'

// Éléments DOM
const timeDisplay = document.getElementById('timeDisplay');
const progressBar = document.getElementById('progressBar');
const cycleCountCenter = document.getElementById('cycleCountCenter');
const prepaSlider = document.getElementById('secondes_prepa');
const prepaValue = document.getElementById('secondesPrepaValue');
const secondsSlider = document.getElementById('seconds');
const secondsValue = document.getElementById('secondsValue');
const startStopBtn = document.getElementById('startStopBtn');
const resetBtn = document.getElementById('resetBtn');
const ringtonesContainer = document.getElementById('ringtonesContainer');
const prepaRingtonesContainer = document.getElementById('prepaRingtonesContainer');
const alarmSound = document.getElementById('alarmSound');
const wakeLockCheckbox = document.getElementById('wakeLock');
const vibrateCheckbox = document.getElementById('vibrate');
const burgerBtn = document.getElementById('burger-btn');
const burgerMenu = document.getElementById('burger-menu');
const seriesBackground = document.getElementById('series-background');
const activitySelect = document.getElementById('activity-select');

const SERIES = {
    allonge: {
        folder: 'Images/allonge',
        maxImages: 10
    },
    gainage: {
        folder: 'Images/gainage',
        maxImages: 10
    }
};

let currentSeries = 'allonge';

// Initialisation
function initApp() {
    prepaSlider.value = 5;
    prepaSlider.max = 60;        // ← AJOUTÉ
    prepaSlider.step = 1;        // ← AJOUTÉ
    updateTimeFromSliders();
    createPrepaRingtoneButtons();  // ← Sonneries fin prépa
    createRingtoneButtons();       // Sonneries fin cycle
    setupEventListeners();
    updateDisplay();
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    checkWakeLockSupport();
    updateBackgroundForCycle();
}

// Met à jour le temps total
function updateTimeFromSliders() {
    prepaSeconds = parseInt(prepaSlider.value);
    workSeconds = parseInt(secondsSlider.value);
    totalSeconds = prepaSeconds + workSeconds;
    
    currentPrepa = prepaSeconds;
    currentWork = workSeconds;
    
    prepaValue.textContent = prepaSeconds;
    secondsValue.textContent = workSeconds;
    
    updateDisplay();
}

// Met à jour l'affichage
function updateDisplay() {
    const remaining = currentPrepa + currentWork;
    const minutes = Math.floor(remaining / 60);
    const secs = remaining % 60;
    
    timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    const elapsed = totalSeconds - remaining;
    const progressPercentage = totalSeconds > 0 ? (elapsed / totalSeconds) * 100 : 0;
    progressBar.style.width = `${progressPercentage}%`;
    
    cycleCountCenter.textContent = cycles;
    updateCircularTimer();
    
    if (isRunning && remaining <= 3 && remaining > 0) {
        timeDisplay.classList.add('success-active');
    } else {
        timeDisplay.classList.remove('success-active');
    }
}

// CERCLE 360° VERT → ROUGE
function updateCircularTimer() {
    const circularTimer = document.getElementById('circular-timer');
    if (!circularTimer) return;
    
    if (phase === 'prepa') {
        const prepaProgress = (prepaSeconds - currentPrepa) / prepaSeconds;
        const angleVert = 360 * (1 - prepaProgress);
        circularTimer.style.background = `
            conic-gradient(
                limegreen 0deg ${angleVert}deg,
                transparent ${angleVert}deg 360deg
            )
        `;
    } else if (phase === 'work') {
        const cycleProgress = (workSeconds - currentWork) / workSeconds;
        const angleRouge = 360 * (1 - cycleProgress);
        circularTimer.style.background = `
            conic-gradient(
                red 0deg ${angleRouge}deg,
                transparent ${angleRouge}deg 360deg
            )
        `;
    }
}

// Sonneries FIN PRÉPA (6 boutons)
function createPrepaRingtoneButtons() {
    const ringtones = [
        { id: 1, name: 'Fin prépa 1', file: 'sonnerie1.wav' },
        { id: 2, name: 'Fin prépa 2', file: 'sonnerie2.wav' },
        { id: 3, name: 'Fin prépa 3', file: 'sonnerie3.wav' },
        { id: 4, name: 'Fin prépa 4', file: 'sonnerie4.wav' },  // ← DÉFAUT
        { id: 5, name: 'Fin prépa 5', file: 'sonnerie5.wav' },
        { id: 6, name: 'Fin prépa 6', file: 'sonnerie6.wav' }
    ];
    
    prepaRingtonesContainer.innerHTML = '';
    
    ringtones.forEach(ringtone => {
        const button = document.createElement('button');
        button.className = `ringtone-btn prepa-ringtone-btn ${ringtone.id === 4 ? 'active' : ''}`;
        button.textContent = ringtone.name;
        
        button.addEventListener('click', () => {
            selectPrepaRingtone(ringtone.file, button);
            playRingtonePreview(ringtone.file);
        });
        
        prepaRingtonesContainer.appendChild(button);
    });
}

function selectPrepaRingtone(ringtoneFile, button) {
    document.querySelectorAll('.prepa-ringtone-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');
    selectedPrepaRingtone = ringtoneFile;
}

function playRingtonePreview(ringtoneFile) {
    if (isRunning) return;
    const previewAudio = new Audio(`Sonneries/${ringtoneFile}`);
    previewAudio.volume = 0.5;
    previewAudio.play().catch(e => console.log("Aperçu impossible:", e));
}

// Sonneries FIN CYCLE (6 boutons existants)
function createRingtoneButtons() {
    const ringtones =[
        { id: 1, name: 'Son 1', file: 'sonnerie1.wav' },     // ← "Son" au lieu de "Succès"
        { id: 2, name: 'Son 2', file: 'sonnerie2.wav' },
        { id: 3, name: 'Son 3', file: 'sonnerie3.wav' },
        { id: 4, name: 'Son 4', file: 'sonnerie4.wav' },
        { id: 5, name: 'Son 5', file: 'sonnerie5.wav' },
        { id: 6, name: 'Son 6', file: 'sonnerie6.wav' }
    ];
    
    ringtonesContainer.innerHTML = '';
    
    ringtones.forEach(ringtone => {
        const button = document.createElement('button');
        button.className = `ringtone-btn ${ringtone.id === 1 ? 'active' : ''}`;
        button.textContent = ringtone.name;
        
        button.addEventListener('click', () => {
            selectRingtone(ringtone.file, button);
            playRingtonePreview(ringtone.file);
        });
        
        ringtonesContainer.appendChild(button);
    });
}

function selectRingtone(ringtoneFile, button) {
    document.querySelectorAll('.ringtone-btn:not(.prepa-ringtone-btn)').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');
    selectedRingtone = ringtoneFile;
    alarmSound.src = `Sonneries/${ringtoneFile}`;
    alarmSound.load();
}

// Timer principal
function toggleTimer() {
    if (isRunning) stopTimer(); else startTimer();
}

function startTimer() {
    if (isRunning) return;
    updateTimeFromSliders();
    if (totalSeconds === 0) return;
    
    isRunning = true;
    phase = prepaSeconds > 0 ? 'prepa' : 'work';
    
    startStopBtn.innerHTML = '<i class="fas fa-stop"></i> Stop';
    startStopBtn.classList.remove('start-btn');
    startStopBtn.classList.add('stop-btn');
    
    if (wakeLockEnabled && 'wakeLock' in navigator) requestWakeLock();
    
    prepaSlider.disabled = true;
    secondsSlider.disabled = true;
    resetBtn.disabled = false;
    
    setPhaseVisuals();
    timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
    if (!isRunning) return;
    isRunning = false;
    clearInterval(timerInterval);
    
    startStopBtn.innerHTML = '<i class="fas fa-play"></i> Start';
    startStopBtn.classList.remove('stop-btn');
    startStopBtn.classList.add('start-btn');
    
    releaseWakeLock();
    prepaSlider.disabled = false;
    secondsSlider.disabled = false;
    
    alarmSound.pause();
    alarmSound.currentTime = 0;
    phase = 'idle';
}

function setPhaseVisuals() {
    // Rien : cercle gère tout !
}

function updateTimer() {
    if (phase === 'prepa') {
        currentPrepa--;
        if (currentPrepa <= 0) {
            currentPrepa = 0;
            playPrepaEndSound();  // ← SONNERIE FIN PRÉPA !
            phase = 'work';
            setPhaseVisuals();
        }
    } else if (phase === 'work') {
        currentWork--;
        if (currentWork <= 0) {
            currentWork = 0;
            updateDisplay();
            triggerSuccess();
            cycles++;
            updateBackgroundForCycle();
            
            setTimeout(() => {
                currentPrepa = prepaSeconds;
                currentWork = workSeconds;
                phase = prepaSeconds > 0 ? 'prepa' : 'work';
                setPhaseVisuals();
                updateDisplay();
            }, 100);
            return;
        }
    }
    
    updateDisplay();
}

// Son fin prépa
function playPrepaEndSound() {
    const prepaAudio = new Audio(`Sonneries/${selectedPrepaRingtone}`);
    prepaAudio.volume = 0.7;
    prepaAudio.play().catch(e => console.log("Fin prépa impossible:", e));
}

// Son succès cycle
function triggerSuccess() {
    alarmSound.currentTime = 0;
    alarmSound.play().catch(e => console.log("Succès impossible:", e));
    
    if (vibrateEnabled && 'vibrate' in navigator) {
        navigator.vibrate([300, 100, 300]);
    }
    flashSuccess();
}

function flashSuccess() {
    document.body.classList.add('success-flash');
    setTimeout(() => document.body.classList.remove('success-flash'), 500);
}

function updateBackgroundForCycle() {
    const seriesConfig = SERIES[currentSeries] || SERIES.allonge;
    const index = (cycles % seriesConfig.maxImages) || seriesConfig.maxImages;

    if (seriesBackground) {
        seriesBackground.style.backgroundImage =
            `url('${seriesConfig.folder}/serie${index}.png')`;
    }
}


// Wake Lock
async function requestWakeLock() {
    try {
        if (wakeLockEnabled && 'wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (err) {
        console.error('Wake Lock erreur:', err);
    }
}

function releaseWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release().then(() => wakeLock = null);
    }
}

function checkWakeLockSupport() {
    if ('wakeLock' in navigator) {
        wakeLockCheckbox.disabled = false;
    } else {
        wakeLockCheckbox.disabled = true;
        wakeLockCheckbox.parentElement.innerHTML += ' <span class="unsupported">(Non supporté)</span>';
    }
}

// Écouteurs
function setupEventListeners() {
    prepaSlider.addEventListener('input', updateTimeFromSliders);
    secondsSlider.addEventListener('input', updateTimeFromSliders);
    startStopBtn.addEventListener('click', toggleTimer);
    resetBtn.addEventListener('click', resetTimer);
    
    burgerBtn.addEventListener('click', () => burgerMenu.classList.toggle('open'));
 
 activitySelect.addEventListener('change', () => {
    currentSeries = activitySelect.value;
    cycles = 0;                      // on repart au début
    updateBackgroundForCycle();      // recharge serie1 de la nouvelle série
});
  
    document.addEventListener('click', (e) => {
        if (!burgerMenu.contains(e.target) && !burgerBtn.contains(e.target)) {
            burgerMenu.classList.remove('open');
        }
    });
    
    wakeLockCheckbox.addEventListener('change', function() {
        wakeLockEnabled = this.checked;
        if (!wakeLockEnabled && wakeLock) releaseWakeLock();
        if (wakeLockEnabled && isRunning && 'wakeLock' in navigator) requestWakeLock();
    });
    
    vibrateCheckbox.addEventListener('change', function() {
        vibrateEnabled = this.checked;
    });
    
    function checkResetButton() {
        resetBtn.disabled = totalSeconds === 0;
    }
    prepaSlider.addEventListener('input', checkResetButton);
    secondsSlider.addEventListener('input', checkResetButton);
    checkResetButton();
    
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && isRunning && wakeLockEnabled && 'wakeLock' in navigator) {
            requestWakeLock();
        }
    });
}

function resetTimer() {
    if (isRunning) stopTimer();
    cycles = 0;
    phase = 'idle';
    updateTimeFromSliders();
    if (totalSeconds === 0) resetBtn.disabled = true;
    timeDisplay.classList.remove('success-active');
    updateBackgroundForCycle();
}

document.addEventListener('DOMContentLoaded', initApp);
