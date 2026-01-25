/* ========================================== */
/* 1. STATE MANAGEMENT                        */
/* ========================================== */
const STORAGE_KEY = "moodmap_data";
let moods = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let moodChart = null;
let selectedMood = null;

/* ========================================== */
/* 2. UTILITIES                               */
/* ========================================== */

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString([], {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
};

const getMoodTheme = (mood) => {
    const themes = {
        'Happy': '#ffcc00', 'Neutral': '#4ade80', 'Sad': '#5fa8d3', 'Angry': '#f85149', 'Tired': '#8b949e'
    };
    return themes[mood] || '#7c7cff';
};

function getAdvice(mood) {
    if (!mood) return "Keep tracking to get personalized advice!";
    if (mood.includes("Happy")) return "You're on a roll! Take this energy to tackle your hardest task today.";
    if (mood.includes("Sad")) return "Energy seems low lately. Remember that it's okay to rest and reset.";
    if (mood.includes("Angry")) return "High intensity detected. Try a 5-minute breathing exercise.";
    if (mood.includes("Tired")) return "Burnout warning. Your body is asking for a real break.";
    return "Consistency is key! You're building a great habit of self-awareness.";
}

/* ========================================== */
/* 3. CHARTING & GREETING                     */
/* ========================================== */

const updateGreeting = () => {
    const greetingEl = document.getElementById("dayGreeting");
    if (!greetingEl) return;
    const hour = new Date().getHours();
    let welcome;
    if (hour < 5) welcome = "Burning the midnight oil? 🌙";
    else if (hour < 12) welcome = "Good Morning ☀️";
    else if (hour < 17) welcome = "Good Afternoon 🌤️";
    else if (hour < 22) welcome = "Good Evening 🌙";
    else welcome = "Night Owl Vibes 🦉";
    greetingEl.innerText = welcome;
};

const renderChart = () => {
    const canvas = document.getElementById('moodChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (moodChart) moodChart.destroy();
    if (moods.length === 0) return;

    const counts = {};
    moods.forEach(m => counts[m.mood] = (counts[m.mood] || 0) + 1);

    moodChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(counts),
            datasets: [{
                data: Object.values(counts),
                backgroundColor: Object.keys(counts).map(m => getMoodTheme(m)),
                borderColor: '#161b22',
                borderWidth: 3,
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '70%',
            plugins: { legend: { position: 'bottom', labels: { color: '#8b949e', usePointStyle: true } } }
        }
    });
};

/* ========================================== */
/* 4. FORECAST LOGIC                          */
/* ========================================== */

const generateForecast = () => {
    const card = document.getElementById("aiInsight");
    const container = document.getElementById("forecastContent");
    if (!container || !card) return;

    const threshold = 5;
    if (moods.length < threshold) {
        card.classList.add("thinking");
        const remaining = threshold - moods.length;
        container.innerHTML = `<p class="muted">Analyzing patterns... Log <strong>${remaining}</strong> more entries to unlock.</p>`;
        return;
    }

    card.classList.remove("thinking");
    const morningMoods = moods.filter(m => { const hr = new Date(m.time).getHours(); return hr >= 5 && hr < 12; });
    const nightMoods = moods.filter(m => { const hr = new Date(m.time).getHours(); return hr >= 18 || hr < 5; });
    const weekendMoods = moods.filter(m => { const day = new Date(m.time).getDay(); return day === 0 || day === 6; });

    const getTopMood = (arr) => {
        if (arr.length === 0) return "N/A";
        const counts = {};
        arr.forEach(m => counts[m.mood] = (counts[m.mood] || 0) + 1);
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    };

    const timeVibe = morningMoods.length >= nightMoods.length ? "Early Bird 🌅" : "Night Owl 🦉";
    const weekendVibe = getTopMood(weekendMoods);
    const overallVibe = getTopMood(moods);

    container.innerHTML = `
        <div class="forecast-grid">
            <div class="forecast-item"><strong>Schedule Type</strong><p>${timeVibe}</p></div>
            <div class="forecast-item"><strong>Weekend Vibe</strong><p>${weekendVibe}</p></div>
            <div class="forecast-item" style="grid-column: span 2;"><strong>Pro Advice</strong><p>${getAdvice(overallVibe)}</p></div>
        </div>`;
};

/* ========================================== */
/* 5. UI UPDATES                              */
/* ========================================== */

const updateUI = () => {
    const historyList = document.getElementById("historyList");
    const subtitle = document.querySelector(".subtitle");

    generateForecast();
    renderChart();
    updateGreeting();

    if (moods.length > 0) {
        const lastMood = moods[0].mood;
        subtitle.innerHTML = `Last vibe: <strong>${lastMood}</strong> • Total moments: ${moods.length}`;
    }

    if (moods.length === 0) {
        historyList.innerHTML = `<p class="muted">No entries yet. How are you feeling?</p>`;
    } else {
        historyList.innerHTML = moods.map(entry => `
            <div class="entry-item" style="border-left-color: ${getMoodTheme(entry.mood)}">
                <div class="entry-header">
                    <span class="entry-mood">${entry.mood} <small>(Int: ${entry.intensity})</small></span>
                    <span class="entry-time">${formatDate(entry.time)}</span>
                </div>
                <p class="entry-note">${entry.note || "<em>No notes recorded.</em>"}</p>
            </div>`).join("");
    }
};

/* ========================================== */
/* 6. EVENT LISTENERS                         */
/* ========================================== */

document.addEventListener("DOMContentLoaded", () => {
    const moodItems = document.querySelectorAll('.mood-item');
    const intensitySlider = document.getElementById('moodIntensity');
    const intensityVal = document.getElementById('intensityVal');
    const moodNote = document.getElementById('moodNote');
    const saveBtn = document.getElementById('saveBtn');
    const clearBtn = document.getElementById('clearData');

    // SMOOTH SLIDER LOGIC
    const updateSliderFill = (val) => {
        const min = intensitySlider.min || 1;
        const max = intensitySlider.max || 10;
        const pct = ((val - min) / (max - min)) * 100;
        intensitySlider.style.backgroundSize = pct + '% 100%';
    };

    intensitySlider.addEventListener('input', (e) => {
        const val = e.target.value;
        intensityVal.innerText = val;
        updateSliderFill(val);
    });

    // Mood Selection
    moodItems.forEach(item => {
        item.addEventListener('click', () => {
            moodItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            selectedMood = item.dataset.mood;
        });
    });

    // Save Entry
    saveBtn.onclick = () => {
        if (!selectedMood) {
            alert("Please pick a mood emoji!");
            return;
        }

        const newEntry = {
            mood: selectedMood, // Fixed the 'selectxedMood' typo
            intensity: intensitySlider.value,
            note: moodNote.value.trim(),
            time: new Date().toISOString()
        };

        moods.unshift(newEntry);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(moods));

        // Reset Form
        selectedMood = null;
        moodItems.forEach(i => i.classList.remove('active'));
        moodNote.value = "";
        intensitySlider.value = 5;
        intensityVal.innerText = 5;
        updateSliderFill(5); // Reset the slider's smooth fill

        updateUI();
    };

    clearBtn.onclick = () => {
        if (confirm("Delete all history?")) {
            moods = [];
            localStorage.removeItem(STORAGE_KEY);
            updateUI();
        }
    };

    // Initialize slider visual on load
    updateSliderFill(intensitySlider.value);
    updateUI();
});