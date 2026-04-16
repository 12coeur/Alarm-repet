// Variables globales
let timerInterval = null;
let prepaSeconds = 12;
let workSeconds = 5;
let workRepsTarget = 22;
let currentPrepa = 12;
let currentWork = 5;
let isRunning = false;
let cycles = 0;
let selectedRingtone = 'sonnerie1.wav';
let selectedPrepaRingtone = 'sonnerie4.wav';
let wakeLockObj = null;
let wakeLockEnabled = true;
let vibrateEnabled = true;
let phase = 'idle';
let currentMode = 'chrono';

// Accéléromètre
let accelerometerActive = false;
let lastZ = null;
let lastMoveTime = 0;
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
const zouinSound = document.getElementById('zouinSound');
const wakeLockCheckbox = document.getElementById('wakeLock');
const vibrateCheckbox = document.getElementById('vibrate');
const screenLockCheckbox = document.getElementById('screenLock');
const sensitivitySlider = document.getElementById('sensitivitySlider');
const sensitivityValueSpan = document.getElementById('sensitivityValue');
const modeChronoBtn = document.getElementById('modeChronoBtn');
const modeCompteurBtn = document.getElementById('modeCompteurBtn');
const chronoWorkDiv = document.getElementById('chronoWorkDiv');
const counterWorkDiv = document.getElementById('counterWorkDiv');
const activitySelect = document.getElementById('activity-select');
const activityTitleSpan = document.getElementById('activityTitle');

const SERIES = {
    allonge: { folder: 'Images/allonge', maxImages: 10 },
    gainage: { folder: 'Images/gainage', maxImages: 10 },
    ballon: { folder: 'Images/ballon', maxImages: 10 },
    abdo: { folder: 'Images/Abdo', maxImages: 10 }
};
let currentSeries = 'allonge';

// ========== FONCTIONS D'INTERFACE ==========
function updateModeUI() {
    const isChrono = (currentMode === 'chrono');
    document.body.classList.toggle('mode-chrono', isChrono);
    document.body.classList.toggle('mode-compteur', !isChrono);
    if (isChrono) {
        chronoWorkDiv.style.display = 'block';
        counterWorkDiv.style.display = 'none';
        modeChronoBtn.classList.add('active');
        modeCompteurBtn.classList.remove('active');
        if (!isRunning) currentWork = workSeconds;
    } else {
        chronoWorkDiv.style.display = 'none';
        counterWorkDiv.style.display = 'block';
        modeChronoBtn.classList.remove('active');
        modeCompteurBtn.classList.add('active');
        if (!isRunning) currentWork = workRepsTarget;
    }
    updateDisplay();
    resetAccelerometerListener();
}

function updateDisplay() {
    const remaining = (phase === 'prepa') ? currentPrepa : currentWork;
    if (phase === 'prepa' || (phase === 'work' && currentMode === 'chrono')) {
        const minutes = Math.floor(remaining / 60);
        const secs = remaining % 60;
        timeDisplay.textContent = `${minutes.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
    } else if (phase === 'work' && currentMode === 'compteur') {
        timeDisplay.textContent = `${remaining} reps`;
    } else if (phase === 'idle') {
        if (currentMode === 'chrono') {
            const total = prepaSeconds + workSeconds;
            const minutes = Math.floor(total / 60);
            const secs = total % 60;
            timeDisplay.textContent = `${minutes.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
        } else {
            timeDisplay.textContent = `${prepaSeconds}s / ${workRepsTarget} reps`;
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
    cycleCountCenter.textContent = cycles;
    updateCircularTimer();

    if (isRunning && ((phase === 'prepa' && currentPrepa <= 3 && currentPrepa > 0) || (phase === 'work' && currentWork <= 3 && currentWork > 0 && currentMode==='chrono'))) {
        timeDisplay.classList.add('success-active');
    } else { timeDisplay.classList.remove('success-active'); }
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

function playSound(url, volume=0.7) {
    let snd = new Audio(url);
    snd.volume = volume;
    snd.play().catch(e=>console.log("son erreur",e));
}

function triggerSuccess() {
    alarmSound.currentTime = 0;
    alarmSound.play().catch(e=>console.log);
    if (vibrateEnabled && 'vibrate' in navigator) navigator.vibrate([300,100,300]);
    document.body.classList.add('success-flash');
    setTimeout(()=>document.body.classList.remove('success-flash'),500);
}

function playPrepaEndSound() { playSound(`Sonneries/${selectedPrepaRingtone}`,0.7); }
function playZouin() { 
    zouinSound.currentTime = 0;
    zouinSound.play().catch(e=>console.log);
    if(vibrateEnabled && 'vibrate' in navigator) navigator.vibrate(80);
}

// ========== ACCÉLÉROMÈTRE (COMPTEUR) ==========
function initAccelerometerListener() {
    if (deviceMotionHandler) window.removeEventListener('devicemotion', deviceMotionHandler);
    if (currentMode !== 'compteur') return;
    deviceMotionHandler = (event) => {
        if (!isRunning || phase !== 'work' || currentMode !== 'compteur') return;
        let acc = event.accelerationIncludingGravity;
        if (!acc) return;
        let z = acc.z;
        if (z === null) return;
        if (lastZ === null) { lastZ = z; return; }
        let delta = Math.abs(z - lastZ);
        if (delta >= sensitivity) {
            let now = Date.now();
            if (now - lastMoveTime > 180) {
                lastMoveTime = now;
                if (currentWork > 0) {
                    currentWork--;
                    playZouin();
                    updateDisplay();
                    if (currentWork === 0) {
                        triggerSuccess();
                        cycles++;
                        updateBackgroundForCycle();
                        currentPrepa = prepaSeconds;
                        currentWork = (currentMode === 'chrono') ? workSeconds : workRepsTarget;
                        phase = (prepaSeconds > 0) ? 'prepa' : 'work';
                        updateDisplay();
                        if (phase === 'work' && currentMode === 'compteur') resetAccelerometerListener();
                    } else {
                        updateDisplay();
                    }
                }
            }
        }
        lastZ = z;
    };
    window.addEventListener('devicemotion', deviceMotionHandler);
}

function resetAccelerometerListener() {
    if (deviceMotionHandler) {
        window.removeEventListener('devicemotion', deviceMotionHandler);
        deviceMotionHandler = null;
    }
    lastZ = null;
    if (currentMode === 'compteur' && isRunning && phase === 'work') initAccelerometerListener();
}

// ========== TIMER (CHRONO SECONDE) ==========
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
                phase = (prepaSeconds > 0) ? 'prepa' : 'work';
                updateDisplay();
                if (currentMode === 'compteur' && phase === 'work') resetAccelerometerListener();
                return;
            }
        }
    }
    updateDisplay();
}

// ========== START / STOP / RESET ==========
async function startTimer() {
    if (isRunning) return;
    updateTimeFromSliders();
    if ((currentMode==='chrono' && prepaSeconds+workSeconds===0) || (currentMode==='compteur' && prepaSeconds===0 && workRepsTarget===0)) return;
    isRunning = true;
    phase = (prepaSeconds > 0) ? 'prepa' : 'work';
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
    repsSlider.disabled = false;
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
    updateTimeFromSliders();
    if (currentMode === 'chrono') currentWork = workSeconds;
    else currentWork = workRepsTarget;
    currentPrepa = prepaSeconds;
    updateBackgroundForCycle();
    resetBtn.disabled = (prepaSeconds===0 || ((currentMode==='chrono' && workSeconds===0)||(currentMode==='compteur' && workRepsTarget===0)));
    updateDisplay();
    timeDisplay.classList.remove('success-active');
}

function updateTimeFromSliders() {
    prepaSeconds = parseInt(prepaSlider.value);
    prepaValue.textContent = prepaSeconds;
    workSeconds = parseInt(secondsSlider.value);
    secondsValue.textContent = workSeconds;
    workRepsTarget = parseInt(repsSlider.value);
    repsValue.textContent = workRepsTarget;
    if (!isRunning) {
        currentPrepa = prepaSeconds;
        if (currentMode === 'chrono') currentWork = workSeconds;
        else currentWork = workRepsTarget;
    }
    updateDisplay();
    resetBtn.disabled = (prepaSeconds===0 || ((currentMode==='chrono' && workSeconds===0)||(currentMode==='compteur' && workRepsTarget===0)));
}

function updateBackgroundForCycle() {
    const config = SERIES[currentSeries] || SERIES.allonge;
    let idx = (cycles % config.maxImages) || config.maxImages;
    if(idx===0) idx=config.maxImages;
    const imgDiv = document.getElementById('series-image-behind');
    if(imgDiv) imgDiv.style.backgroundImage = `url('${config.folder}/serie${idx}.png')`;
    activityTitleSpan.textContent = activitySelect.options[activitySelect.selectedIndex]?.text || "Activité";
}

// ========== WAKE LOCK & ORIENTATION ==========
async function requestWakeLock() { if(wakeLockEnabled && 'wakeLock' in navigator) { try { wakeLockObj = await navigator.wakeLock.request('screen'); } catch(e){} } }
function releaseWakeLock() { if(wakeLockObj) { wakeLockObj.release().then(()=>wakeLockObj=null); } }
function handleScreenLock() {
    if(screenLockCheckbox.checked) {
        if(screen.orientation && screen.orientation.lock) screen.orientation.lock('portrait-primary').catch(e=>console.log);
    } else {
        if(screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
    }
}

// ========== SONNERIES UI ==========
function createRingtoneButtons() {
    const numbers = [1,2,3,4,5,6];
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
    const numbers = [1,2,3,4,5,6];
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

// ========== ÉVÉNEMENTS & INIT ==========
function setupListeners() {
    prepaSlider.addEventListener('input', updateTimeFromSliders);
    secondsSlider.addEventListener('input', updateTimeFromSliders);
    repsSlider.addEventListener('input', updateTimeFromSliders);
    startStopBtn.addEventListener('click', ()=> isRunning ? stopTimer() : startTimer());
    resetBtn.addEventListener('click', resetTimer);
    document.getElementById('burger-btn').addEventListener('click',()=>document.getElementById('burger-menu').classList.toggle('open'));
    document.addEventListener('click',(e)=>{ if(!document.getElementById('burger-menu').contains(e.target) && !document.getElementById('burger-btn').contains(e.target)) document.getElementById('burger-menu').classList.remove('open'); });
    wakeLockCheckbox.addEventListener('change',(e)=>{ wakeLockEnabled=e.target.checked; if(!wakeLockEnabled && wakeLockObj) releaseWakeLock(); else if(wakeLockEnabled && isRunning) requestWakeLock(); });
    vibrateCheckbox.addEventListener('change',(e)=>{ vibrateEnabled=e.target.checked; });
    screenLockCheckbox.addEventListener('change', handleScreenLock);
    modeChronoBtn.addEventListener('click',()=>{ if(currentMode==='compteur'){ currentMode='chrono'; if(isRunning) stopTimer(); updateModeUI(); updateDisplay(); resetAccelerometerListener(); } });
    modeCompteurBtn.addEventListener('click',()=>{ if(currentMode==='chrono'){ currentMode='compteur'; if(isRunning) stopTimer(); updateModeUI(); updateDisplay(); resetAccelerometerListener(); } });
    activitySelect.addEventListener('change',()=>{ currentSeries = activitySelect.value; cycles=0; updateBackgroundForCycle(); if(!isRunning) updateDisplay(); });
    document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible' && isRunning && wakeLockEnabled && 'wakeLock' in navigator) requestWakeLock(); });
    sensitivitySlider.addEventListener('input',()=>{ sensitivity = parseFloat(sensitivitySlider.value); sensitivityValueSpan.textContent = sensitivity.toFixed(1); });
}

function init() {
    createPrepaRingtoneButtons();
    createRingtoneButtons();
    prepaSlider.value = 12; prepaSlider.max=30; prepaSlider.step=1;
    secondsSlider.value = 5; secondsSlider.max=300;
    repsSlider.value = 22; repsSlider.max=60;
    updateTimeFromSliders();
    setupListeners();
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    updateBackgroundForCycle();
    updateModeUI();
    sensitivity = parseFloat(sensitivitySlider.value);
    sensitivityValueSpan.textContent = sensitivity;
    if('wakeLock' in navigator) wakeLockCheckbox.disabled=false;
    else wakeLockCheckbox.disabled=true;
}

init();
