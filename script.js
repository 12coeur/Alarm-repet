const timerDisplay = document.getElementById('timer');
const progressBar = document.getElementById('progress');
const startBtn = document.getElementById('start-btn');
const audio = document.getElementById('alarm-sound');

const hoursSlider = document.getElementById('hours');
const minutesSlider = document.getElementById('minutes');
const secondsSlider = document.getElementById('seconds');

const hoursValue = document.getElementById('hours-value');
const minutesValue = document.getElementById('minutes-value');
const secondsValue = document.getElementById('seconds-value');

const soundButtons = document.querySelectorAll('.sound-btn');

let totalSeconds = 5;
let remainingSeconds = 5;
let interval = null;
let selectedSound = 1;

// Mise à jour affichage des sliders
function updateSliderDisplays() {
    hoursValue.textContent = hoursSlider.value.padStart(2, '0');
    minutesValue.textContent = minutesSlider.value.padStart(2, '0');
    secondsValue.textContent = secondsSlider.value.padStart(2, '0');
}

// Calcul du temps total à partir des sliders
function calculateTotalSeconds() {
    const h = parseInt(hoursSlider.value);
    const m = parseInt(minutesSlider.value);
    const s = parseInt(secondsSlider.value);
    return h * 3600 + m * 60 + s;
}

// Formatage du temps pour affichage
function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Mise à jour de la barre de progression
function updateProgress() {
    const percentage = ((totalSeconds - remainingSeconds) / totalSeconds) * 100;
    progressBar.style.width = percentage + '%';
}

// Lancer le son
function playAlarm() {
    audio.src = `Sonneries/sonnerie${selectedSound}.wav`;
    audio.play();
}

// Démarrage / Arrêt
function toggleTimer() {
    if (interval) {
        // Arrêt
        clearInterval(interval);
        interval = null;
        startBtn.textContent = 'Start';
        startBtn.classList.remove('running');
    } else {
        // Démarrage
        totalSeconds = calculateTotalSeconds();
        if (totalSeconds === 0) {
            alert("Veuillez définir une durée supérieure à 0");
            return;
        }
        remainingSeconds = totalSeconds;
        updateDisplay();
        updateProgress();

        interval = setInterval(() => {
            remainingSeconds--;
            updateDisplay();
            updateProgress();

            if (remainingSeconds <= 0) {
                playAlarm();
                // Redémarrage immédiat pour répétition
                remainingSeconds = totalSeconds;
                updateProgress(); // reset à 0
            }
        }, 1000);

        startBtn.textContent = 'Stop';
        startBtn.classList.add('running');
    }
}

// Mise à jour affichage temps
function updateDisplay() {
    timerDisplay.textContent = formatTime(remainingSeconds);
}

// Événements sliders
hoursSlider.addEventListener('input', updateSliderDisplays);
minutesSlider.addEventListener('input', updateSliderDisplays);
secondsSlider.addEventListener('input', updateSliderDisplays);

// Si on change les sliders pendant que le timer tourne, on peut recalculer (optionnel)
// Ici on ne le fait pas pour éviter des comportements étranges, mais tu peux ajouter si tu veux

// Sélection sonnerie
soundButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        soundButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedSound = btn.dataset.sound;
        // Optionnel : jouer un aperçu court
        audio.src = `Sonneries/sonnerie${selectedSound}.wav`;
        audio.play();
    });
});

// Bouton Start/Stop
startBtn.addEventListener('click', toggleTimer);

// Initialisation
updateSliderDisplays();
updateDisplay();