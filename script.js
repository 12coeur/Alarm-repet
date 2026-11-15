// Variables globales
let timerInterval = null;
let prepaSeconds = 12;
let workSeconds = 22;      // durée exercice en mode chrono
let workRepsTarget = 10;   // décompte en mode compteur (initialisé à 10)
let currentPrepa = 12;
let currentWork = 22;
let isRunning = false;
let cycles = 0;
let selectedRingtone = 'sonnerie1.wav';
let selectedPrepaRingtone = 'sonnerie4.wav';
// Lecteur persistant pour la sonnerie verte
const prepaSoundPlayer = new Audio();
prepaSoundPlayer.preload = 'auto';
let wakeLockObj = null;
let wakeLockEnabled = true;
let vibrateEnabled = true;
let phase = 'idle';
let currentMode = 'chrono';

// Accéléromètre
let accelerometerActive = false;
let lastAcceleration = null;
let smoothedVariation = 0;
let lastMoveTime = 0;
let imageIndex = 0;
let sensitivity = 2.0;
let deviceMotionHandler = null;

// Éléments DOM
const timeDisplay = document.getElementById('timeDisplay');
const progressBar = document.getElementById('progressBar');
const cycleCountCenter = document.getElementById('cycleCountCenter');
const prepaSlider = document.getElementById('secondes_prepa');
const prepaValue = document.getElementById('secondesPrepaValue');
const secondsSlider = document.getElementById('seconds');
const secondsValue = document.getElementById('secondsValue');
const repsSlider = document.getElementById('repsTarget');
const repsValue = document.getElementById('repsValue');
const startStopBtn = document.getElementById('startStopBtn');
const resetBtn = document.getElementById('resetBtn');
const ringtonesContainer = document.getElementById('ringtonesContainer');
const prepaRingtonesContainer = document.getElementById('prepaRingtonesContainer');
const alarmSound = document.getElementById('alarmSound');
const wakeLockCheckbox = document.getElementById('wakeLock');
const vibrateCheckbox = document.getElementById('vibrate');
const screenLockCheckbox = document.getElementById('screenLock');
const sensitivitySlider = document.getElementById('sensitivitySlider');
const sensitivityValueSpan = document.getElementById('sensitivityValue');
const prepSliderSection = document.getElementById('prepSliderSection');
const sensitivityItem = document.getElementById('sensitivityItem');
const activitySection = document.getElementById('activitySection');
const exerciseRingtonesSection = document.getElementById('exerciseRingtonesSection');
const cycleDisplay = document.getElementById('cycleDisplay');
const settingsCompact = document.querySelector('.settings-compact');
const modeChronoBtn = document.getElementById('modeChronoBtn');
const modeCompteurBtn = document.getElementById('modeCompteurBtn');
const chronoWorkDiv = document.getElementById('chronoWorkDiv');
const counterWorkDiv = document.getElementById('counterWorkDiv');
const activitySelect = document.getElementById('activity-select');
const activityTitleSpan = document.getElementById('activityTitle');
const burgerMenu = document.getElementById('burger-menu');

const SERIES = {
    allonge: { folder: 'Images/allonge', maxImages: 10 },
    gainage: { folder: 'Images/gainage', maxImages: 10 },
    ballon: { folder: 'Images/ballon', maxImages: 10 },
    abdo: { folder: 'Images/Abdo', maxImages: 10 },
    chaise: { folder: 'Images/chaise', maxImages: 10 },
    decompte: { folder: 'Images/comptage', maxImages: 10 }
};
let currentSeries = 'allonge';
let lastChronoSeries = 'allonge';

// --- SON POUR LE COMPTEUR ---
function playCompteurTick() {
    let url = `Sonneries/${selectedRingtone}`;
    let snd = new Audio(url);
    snd.volume = 0.5;
    snd.play().catch(e => console.log("son compteur erreur", e));
    if (vibrateEnabled && 'vibrate' in navigator) navigator.vibrate(80);
}

// --- Réinitialisation des sliders selon le mode actuel ---
function resetToCurrentModeDefaults() {
    if (currentMode === 'chrono') {
        prepaSlider.value = 12; secondsSlider.value = 22; repsSlider.value = 0;
        prepaSlider.disabled = false; secondsSlider.disabled = false; repsSlider.disabled = true;
    } else {
        prepaSlider.value = 0; secondsSlider.value = 0; 
        // Conserve la valeur actuelle du slider repsSlider si elle a été modifiée par l'utilisateur, ou 10 par défaut
        if (!repsSlider.value || repsSlider.value == 0) repsSlider.value = 10;
        prepaSlider.disabled = true; secondsSlider.disabled = true; repsSlider.disabled = false;
        workRepsTarget = parseInt(repsSlider.value);
        currentWork = workRepsTarget;
    }
    prepaValue.textContent = prepaSlider.value;
    secondsValue.textContent = secondsSlider.value;
    repsValue.textContent = repsSlider.value;
    updateTimeFromSliders();
}

function applyModePreset() {
    if (isRunning) stopTimer();
    if (currentMode === 'chrono') {
        prepaSlider.value = 12; secondsSlider.value = 22; repsSlider.value = 0;
        prepaSlider.disabled = false; secondsSlider.disabled = false; repsSlider.disabled = true;
        currentSeries = lastChronoSeries || 'allonge';
    } else {
        prepaSlider.value = 0; secondsSlider.value = 0; 
        if (!repsSlider.value || repsSlider.value == 0) repsSlider.value = 10;
        prepaSlider.disabled = true; secondsSlider.disabled = true; repsSlider.disabled = false;
        currentSeries = 'decompte'; activitySelect.value = 'decompte'; imageIndex = 0;
        workRepsTarget = parseInt(repsSlider.value);
        currentWork = workRepsTarget;
    }
    prepaValue.textContent = prepaSlider.value;
    secondsValue.textContent = secondsSlider.value;
    repsValue.textContent = repsSlider.value;
    updateTimeFromSliders();
    resetTimer();
}

// --- Gestion du verrouillage d'orientation ---
let screenLockAttempted = false;
function handleScreenLock() {
    if (screenLockCheckbox.checked) {
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('portrait-primary').catch(err => {
                console.log("Orientation lock non autorisée:", err);
            });
        }
    } else {
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }
    }
}
function attemptScreenLockOnUserAction() {
    if (!screenLockAttempted && screenLockCheckbox.checked) {
        handleScreenLock();
        screenLockAttempted = true;
    }
}

// --- Affichage principal ---
function updateDisplay() {
    const remaining = (phase === 'prepa') ? currentPrepa : currentWork;
    if (phase === 'prepa' || (phase === 'work' && currentMode === 'chrono')) {
        const minutes = Math.floor(remaining / 60);
        const secs = remaining % 60;
        timeDisplay.textContent = `${minutes.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
    } else if (phase === 'work' && currentMode === 'compteur') {
        timeDisplay.textContent = `${remaining}`;
    } else if (phase === 'idle') {
        if (currentMode === 'chrono') {
            const total = prepaSeconds + workSeconds;
            const minutes = Math.floor(total / 60);
            const secs = total % 60;
            timeDisplay.textContent = `${minutes.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
        } else {
            timeDisplay.textContent = `${currentWork}`;
        }
    }

    let elapsed = 0, totalSegment = 0;
    if (phase === 'prepa') { totalSegment = prepaSeconds; elapsed = prepaSeconds - currentPrepa; }
    else if (phase === 'work') {
        if (currentMode === 'chrono') { totalSegment = workSeconds; elapsed = workSeconds - currentWork; }
        else { totalSegment = workRepsTarget; elapsed = workRepsTarget - currentWork; }
    }
    let percent = (totalSegment > 0) ? (elapsed / totalSegment) * 100 : 0;
    progressBar.style.width = `${Math.min(100,percent)}%`;
    cycleCountCenter.textContent = (currentMode === 'compteur') ? Math.max(0, currentWork) : cycles;
    cycleDisplay.classList.toggle('counter-remaining', currentMode === 'compteur');
    updateCircularTimer();
}

function updateCircularTimer() {
    const circularTimer = document.getElementById('circular-timer');
    if (!circularTimer) return;
    let angle = 0;
    if (phase === 'prepa') {
        let progress = (prepaSeconds - currentPrepa) / prepaSeconds;
        angle = 360 * progress;
        circularTimer.style.background = `conic-gradient(rgba(76, 175, 80, 0.7) 0deg ${angle}deg, transparent ${angle}deg 360deg)`;
    } else if (phase === 'work') {
        let total = (currentMode === 'chrono') ? workSeconds : workRepsTarget;
        let done = (currentMode === 'chrono') ? (workSeconds - currentWork) : (workRepsTarget - currentWork);
        let progress = (total > 0) ? done / total : 0;
        angle = 360 * progress;
        circularTimer.style.background = `conic-gradient(rgba(244, 67, 54, 0.7) 0deg ${angle}deg, transparent ${angle}deg 360deg)`;
    } else {
        circularTimer.style.background = `conic-gradient(rgba(255,255,255,0.05) 0deg 360deg)`;
    }
}

function initAudioEarly() {
    alarmSound.src = `Sonneries/${selectedRingtone}`;
    prepaSoundPlayer.src = `Sonneries/${selectedPrepaRingtone}`;
    [alarmSound, prepaSoundPlayer].forEach((audio) => {
        if (!audio) return;
        const wasMuted = audio.muted;
        audio.muted = true;
        const attempt = audio.play();
        if (attempt && typeof attempt.then === 'function') {
            attempt.then(() => {
                audio.pause();
                audio.currentTime = 0;
                audio.muted = wasMuted;
            }).catch(() => { audio.muted = wasMuted; });
        } else {
            audio.pause();
            audio.currentTime = 0;
            audio.muted = wasMuted;
        }
    });
}

function playSound(url, volume=0.7) {
    const snd = prepaSoundPlayer;
    if (snd.src !== new URL(url, document.baseURI).href) {
        snd.src = url;
        snd.load();
    }
    snd.volume = volume;
    snd.currentTime = 0;
    snd.play().catch(e => console.warn('Lecture sonnerie impossible :', e));
}

function triggerSuccess() {
    alarmSound.src = `Sonneries/${selectedRingtone}`;
    alarmSound.currentTime = 0;
    alarmSound.play().catch(e=>console.log);
    if (vibrateEnabled && 'vibrate' in navigator) navigator.vibrate([300,100,300]);
    document.body.classList.add('success-flash');
    setTimeout(()=>document.body.classList.remove('success-flash'),500);
}

function playPrepaEndSound() { playSound(`Sonneries/${selectedPrepaRingtone}`,0.7); }

// --- ACCÉLÉROMÈTRE (COMPTEUR) ---
function initAccelerometerListener() {
    if (deviceMotionHandler) window.removeEventListener('devicemotion', deviceMotionHandler);
    
    const menuOpen = burgerMenu && burgerMenu.classList.contains('open');
    const allowTestInMenu = (currentMode === 'compteur' && menuOpen && !isRunning);

    if (currentMode !== 'compteur' || (!isRunning && !allowTestInMenu)) return;

    lastAcceleration = null;
    smoothedVariation = 0;

    deviceMotionHandler = (event) => {
        const mOpen = burgerMenu && burgerMenu.classList.contains('open');
        const activeTest = (currentMode === 'compteur' && mOpen && !isRunning);
        if (!activeTest && (!isRunning || phase !== 'work' || currentMode !== 'compteur')) return;

        const acc = event.accelerationIncludingGravity || event.acceleration;
        if (!acc || acc.x == null || acc.y == null || acc.z == null) return;
        const current = { x: acc.x, y: acc.y, z: acc.z };
        if (!lastAcceleration) { lastAcceleration = current; return; }

        const variation = Math.max(
            Math.abs(current.x - lastAcceleration.x),
            Math.abs(current.y - lastAcceleration.y),
            Math.abs(current.z - lastAcceleration.z)
        );
        lastAcceleration = current;

        const alpha = Math.max(0.08, Math.min(0.67, 1 / (1 + sensitivity)));
        smoothedVariation = alpha * variation + (1 - alpha) * smoothedVariation;

        if (smoothedVariation >= sensitivity) {
            const now = Date.now();
            if (now - lastMoveTime > 700) {
                lastMoveTime = now;
                
                if (activeTest) {
                    if (currentWork > 0) {
                        currentWork--;
                    } else {
                        currentWork = workRepsTarget;
                    }
                    imageIndex = (imageIndex % 10) + 1;
                    updateCounterImage();
                    updateDisplay();
                    triggerSuccess();
                } else if (isRunning && phase === 'work' && currentWork > 0) {
                    currentWork--;
                    imageIndex = (imageIndex % 10) + 1;
                    updateCounterImage();
                    updateDisplay();
                    triggerSuccess();

                    if (currentWork === 0) {
                        playPrepaEndSound(); 
                        cycles++;
                        updateDisplay();
                        stopTimer();
                    }
                }
            }
        }
    };
    window.addEventListener('devicemotion', deviceMotionHandler);
}

function resetAccelerometerListener() {
    if (deviceMotionHandler) {
        window.removeEventListener('devicemotion', deviceMotionHandler);
        deviceMotionHandler = null;
    }
    lastAcceleration = null;
    initAccelerometerListener();
}

// --- TIMER ---
function updateTimer() {
    if (!isRunning) return;
    if (phase === 'prepa') {
        if (currentPrepa > 0) {
            currentPrepa--;
            updateDisplay();
            if (currentPrepa === 0) {
                playPrepaEndSound();
                phase = 'work';
                if (currentMode === 'chrono') currentWork = workSeconds;
                else currentWork = workRepsTarget;
                updateDisplay();
                if (currentMode === 'compteur') resetAccelerometerListener();
                return;
            }
        }
    } else if (phase === 'work' && currentMode === 'chrono') {
        if (currentWork > 0) {
            currentWork--;
            updateDisplay();
            if (currentWork === 0) {
                triggerSuccess();
                cycles++;
                updateBackgroundForCycle();
                currentPrepa = prepaSeconds;
                currentWork = (currentMode === 'chrono') ? workSeconds : workRepsTarget;
                phase = (currentMode === 'chrono' && prepaSeconds > 0) ? 'prepa' : 'work';
                updateDisplay();
                return;
            }
        }
    }
    updateDisplay();
}

// --- START / STOP / RESET ---
async function startTimer() {
    if (isRunning) return;
    initAudioEarly();
    updateTimeFromSliders();
    if ((currentMode==='chrono' && prepaSeconds+workSeconds===0) || (currentMode==='compteur' && prepaSeconds===0 && workRepsTarget===0)) return;
    isRunning = true;
    phase = (currentMode === 'chrono' && prepaSeconds > 0) ? 'prepa' : 'work';
    if (phase === 'prepa') { currentPrepa = prepaSeconds; }
    else { 
        if (currentMode === 'chrono') currentWork = workSeconds;
        else currentWork = workRepsTarget;
    }
    if (phase === 'work' && currentMode === 'compteur') initAccelerometerListener();
    startStopBtn.innerHTML = '<i class="fas fa-stop"></i> Stop';
    startStopBtn.classList.remove('start-btn');
    startStopBtn.classList.add('stop-btn');
    if (wakeLockEnabled && 'wakeLock' in navigator) requestWakeLock();
    prepaSlider.disabled = true;
    secondsSlider.disabled = true;
    repsSlider.disabled = true;
    resetBtn.disabled = false;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => updateTimer(), 1000);
    updateDisplay();
    attemptScreenLockOnUserAction();
}

function stopTimer() {
    if (!isRunning) return;
    isRunning = false;
    clearInterval(timerInterval);
    startStopBtn.innerHTML = '<i class="fas fa-play"></i> Start';
    startStopBtn.classList.remove('stop-btn');
    startStopBtn.classList.add('start-btn');
    releaseWakeLock();
    if (currentMode === 'chrono') {
        prepaSlider.disabled = false;
        secondsSlider.disabled = false;
        repsSlider.disabled = true;
    } else {
        prepaSlider.disabled = true;
        secondsSlider.disabled = true;
        repsSlider.disabled = false;
    }
    alarmSound.pause();
    alarmSound.currentTime = 0;
    phase = 'idle';
    resetAccelerometerListener();
    updateDisplay();
}

function resetTimer() {
    if (isRunning) stopTimer();
    cycles = 0;
    phase = 'idle';
    
    // Met à jour les valeurs à partir des sliders actuels
    updateTimeFromSliders();
    
    if (currentMode === 'compteur') {
        currentWork = workRepsTarget; // Force la réinitialisation sur la valeur du slider
    }
    
    updateBackgroundForCycle();
    updateDisplay();
    resetBtn.disabled = false;
}

function updateTimeFromSliders() {
    prepaSeconds = parseInt(prepaSlider.value) || 0;
    prepaValue.textContent = prepaSeconds;
    workSeconds = parseInt(secondsSlider.value) || 0;
    secondsValue.textContent = workSeconds;
    workRepsTarget = parseInt(repsSlider.value) || 0;
    repsValue.textContent = workRepsTarget;
    
    if (!isRunning) {
        currentPrepa = prepaSeconds;
        if (currentMode === 'chrono') {
            currentWork = workSeconds;
        } else {
            currentWork = workRepsTarget; // Synchronise directement la valeur courante avec le slider du décompte
        }
    }
    updateDisplay();
    resetBtn.disabled = (prepaSeconds===0 && ((currentMode==='chrono' && workSeconds===0)||(currentMode==='compteur' && workRepsTarget===0)));
}

function updateCounterImage() {
    const imgDiv = document.getElementById('series-image-behind');
    if (imgDiv) imgDiv.style.backgroundImage = `url('Images/comptage/serie${imageIndex}.png')`;
}

function updateBackgroundForCycle() {
    if (currentMode === 'compteur') {
        currentSeries = 'decompte';
        if (imageIndex === 0) imageIndex = 1;
        updateCounterImage();
        activityTitleSpan.textContent = '';
        return;
    }
    const config = SERIES[currentSeries] || SERIES.allonge;
    const idx = (cycles % config.maxImages) || config.maxImages;
    const imgDiv = document.getElementById('series-image-behind');
    if (imgDiv) imgDiv.style.backgroundImage = `url('${config.folder}/serie${idx}.png')`;
    activityTitleSpan.textContent = activitySelect.options[activitySelect.selectedIndex]?.text || "Activité";
}

// --- WAKE LOCK & ORIENTATION ---
async function requestWakeLock() { if(wakeLockEnabled && 'wakeLock' in navigator) { try { wakeLockObj = await navigator.wakeLock.request('screen'); } catch(e){} } }
function releaseWakeLock() { if(wakeLockObj) { wakeLockObj.release().then(()=>wakeLockObj=null); } }

// --- SONNERIES UI ---
function createRingtoneButtons() {
    const numbers = [1,2,3,4,5,6,7,8];
    ringtonesContainer.innerHTML = '';
    numbers.forEach(n=>{
        const btn = document.createElement('button');
        btn.className = `ringtone-btn ${n===1?'active':''}`;
        btn.textContent = n;
        btn.dataset.file = `sonnerie${n}.wav`;
        btn.addEventListener('click',()=>{
            if(`sonnerie${n}.wav` === selectedPrepaRingtone) { alert("Même sonnerie que prépa, choisissez une autre"); return; }
            document.querySelectorAll('#ringtonesContainer .ringtone-btn').forEach(b=>b.classList.remove('active'));
            btn.classList.add('active');
            selectedRingtone = `sonnerie${n}.wav`;
            alarmSound.src = `Sonneries/${selectedRingtone}`;
            alarmSound.load();
            playSound(`Sonneries/${selectedRingtone}`,0.3);
        });
        ringtonesContainer.appendChild(btn);
    });
}

function createPrepaRingtoneButtons() {
    const numbers = [1,2,3,4,5,6,7,8];
    prepaRingtonesContainer.innerHTML = '';
    numbers.forEach(n=>{
        const btn = document.createElement('button');
        btn.className = `prepa-ringtone-btn ringtone-btn ${n===4?'active':''}`;
        btn.textContent = n;
        btn.dataset.file = `sonnerie${n}.wav`;
        btn.addEventListener('click',()=>{
            if(`sonnerie${n}.wav` === selectedRingtone) { alert("Même sonnerie que l'exercice"); return; }
            document.querySelectorAll('#prepaRingtonesContainer .ringtone-btn').forEach(b=>b.classList.remove('active'));
            btn.classList.add('active');
            selectedPrepaRingtone = `sonnerie${n}.wav`;
            playSound(`Sonneries/${selectedPrepaRingtone}`,0.3);
        });
        prepaRingtonesContainer.appendChild(btn);
    });
}

// --- ÉCOUTEURS ---
function setupListeners() {
    prepaSlider.addEventListener('input', updateTimeFromSliders);
    secondsSlider.addEventListener('input', updateTimeFromSliders);
    repsTarget.addEventListener('input', updateTimeFromSliders);
    startStopBtn.addEventListener('click', () => isRunning ? stopTimer() : startTimer());
    resetBtn.addEventListener('click', resetTimer);

    // Menu hamburger
    const burgerBtn = document.getElementById('burger-btn');
    if (burgerBtn && burgerMenu) {
        burgerBtn.addEventListener('click', (e) => {
            e.stopImmediatePropagation();
            const willBeOpen = !burgerMenu.classList.contains('open');
            burgerMenu.classList.toggle('open');
            if (willBeOpen) {
                initAccelerometerListener(); 
            } else {
                if (currentMode === 'compteur') {
                    currentWork = workRepsTarget;
                    updateDisplay();
                }
                resetAccelerometerListener();
            }
        });
        document.addEventListener('click', (e) => {
            if (!burgerMenu.contains(e.target) && !burgerBtn.contains(e.target) && burgerMenu.classList.contains('open')) {
                burgerMenu.classList.remove('open');
                if (currentMode === 'compteur') {
                    currentWork = workRepsTarget;
                    updateDisplay();
                }
                resetAccelerometerListener();
            }
        });
    }

    wakeLockCheckbox.addEventListener('change', (e) => {
        wakeLockEnabled = e.target.checked;
        if (!wakeLockEnabled && wakeLockObj) releaseWakeLock();
        else if (wakeLockEnabled && isRunning) requestWakeLock();
    });
    vibrateCheckbox.addEventListener('change', (e) => { vibrateEnabled = e.target.checked; });
    screenLockCheckbox.addEventListener('change', handleScreenLock);

    modeChronoBtn.addEventListener('click', () => {
        if (currentMode !== 'chrono') {
            currentMode = 'chrono';
            applyModePreset();
            updateModeUI();
            resetAccelerometerListener();
        }
    });
    modeCompteurBtn.addEventListener('click', () => {
        if (currentMode !== 'compteur') {
            currentMode = 'compteur';
            applyModePreset();
            updateModeUI();
            resetAccelerometerListener();
        }
    });

    activitySelect.addEventListener('change', () => {
        currentSeries = activitySelect.value;
        if (currentSeries !== 'decompte') lastChronoSeries = currentSeries;
        cycles = 0;
        updateBackgroundForCycle();
        if (!isRunning) updateDisplay();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && isRunning && wakeLockEnabled && 'wakeLock' in navigator) {
            requestWakeLock();
        }
    });

    sensitivitySlider.addEventListener('input', () => {
        sensitivity = parseFloat(sensitivitySlider.value);
        sensitivityValueSpan.textContent = sensitivity.toFixed(1);
    });
    sensitivitySlider.addEventListener('change', () => {
        let url = `Sonneries/${selectedPrepaRingtone}`;
        let snd = new Audio(url);
        snd.volume = 0.3;
        snd.play().catch(e=>console.log);
    });
}

function updateModeUI() {
    const isChrono = currentMode === 'chrono';
    document.body.classList.toggle('mode-chrono', isChrono);
    document.body.classList.toggle('mode-compteur', !isChrono);
    chronoWorkDiv.style.display = isChrono ? 'block' : 'none';
    counterWorkDiv.style.display = isChrono ? 'none' : 'block';
    prepSliderSection.style.display = isChrono ? 'block' : 'none';
    activitySection.style.display = isChrono ? 'block' : 'none';

    if (!isChrono) {
        counterWorkDiv.after(sensitivityItem);
        sensitivityItem.style.display = 'block';
    } else {
        settingsCompact.appendChild(sensitivityItem);
        sensitivityItem.style.display = 'none';
    }

    exerciseRingtonesSection.style.display = 'block';

    const modeInfoTitle = document.getElementById('modeInfoTitle');
    const modeInfoText = document.getElementById('modeInfoText');
    if (modeInfoTitle && modeInfoText) {
        modeInfoTitle.textContent = isChrono ? 'Chrono' : 'Compteur';
        modeInfoText.innerHTML = isChrono
            ? '5 activités proposées, mais vous pouvez faire votre propre mix.<br>Le temps de préparation ; c’est aussi pour faire des pauses !'
            : 'Nouveau, compte à rebours qui vous évite de compter vos exercices et compte selon vos mouvements.<br>Vous pouvez régler ce curseur avec le mouvement que vous désirez.';
    }

    modeChronoBtn.classList.toggle('active', isChrono);
    modeCompteurBtn.classList.toggle('active', !isChrono);
    const decompteOption = activitySelect.querySelector('option[value="decompte"]');
    if (decompteOption) decompteOption.hidden = isChrono;
    if (isChrono) {
        activitySelect.value = lastChronoSeries;
        currentSeries = lastChronoSeries;
    } else {
        if (activitySelect.value !== 'decompte') lastChronoSeries = activitySelect.value || lastChronoSeries;
        currentSeries = 'decompte';
        activitySelect.value = 'decompte';
        imageIndex = Math.max(1, imageIndex);
        currentWork = workRepsTarget;
    }
    updateBackgroundForCycle();
    updateDisplay();
    resetAccelerometerListener();
}

// --- INITIALISATION ---
function init() {
    createPrepaRingtoneButtons();
    createRingtoneButtons();
    currentMode = 'chrono';
    resetToCurrentModeDefaults();
    setupListeners();
    
    initAudioEarly();
    window.addEventListener('pointerdown', initAudioEarly, { once: true });
    window.addEventListener('keydown', initAudioEarly, { once: true });

    const currentYearElement = document.getElementById('currentYear');
    if (currentYearElement) currentYearElement.textContent = new Date().getFullYear();
    updateBackgroundForCycle();
    updateModeUI();
    sensitivity = parseFloat(sensitivitySlider.value);
    sensitivityValueSpan.textContent = sensitivity;
    if ('wakeLock' in navigator) wakeLockCheckbox.disabled = false;
    else wakeLockCheckbox.disabled = true;
    screenLockCheckbox.checked = true;
    screenLockAttempted = false;
}

init();
