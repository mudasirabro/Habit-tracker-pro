// ==========================================================================
// HABIT TRACKER PRO — FULL-STACK PRODUCTIVITY & HCI ENGINE
// ==========================================================================

const API_URL = window.API_URL || (window.location.origin ? window.location.origin + '/api' : '/api');

// Global Application State
window.allHabits = [];
window.allEntries = [];
window.allTasks = [];

let currentTaskFilter = 'all';
let currentPomoTask = null;

// Audio Context Singleton for Web Audio API Soundscapes & Chimes
let audioCtx = null;
function getAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

// ========== 1. AUTHENTICATION & SESSION ==========

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('landing.html');
        return false;
    }
    return true;
}

// Intercept fetch to append Bearer token
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
    const token = localStorage.getItem('token');
    if (token && !url.includes('/auth/')) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
    }
    return originalFetch(url, options);
};

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.replace('landing.html');
}

function displayUserInfo() {
    const userStr = localStorage.getItem('user');
    const greetingEl = document.getElementById('userGreeting');
    if (userStr && greetingEl) {
        try {
            const user = JSON.parse(userStr);
            const name = user.username || (user.email ? user.email.split('@')[0] : 'Hero');
            greetingEl.textContent = `👋 Welcome, ${name}!`;
        } catch(e) {}
    }
}

// ========== 2. TOAST NOTIFICATION SYSTEM ==========

function showToast(message, type = 'info', icon = '💡') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ========== 3. WEB AUDIO SYNTHESIZER (CHIMES & SOUNDSCAPES) ==========

// Victory Pentatonic Chime (Played on task completion)
function playVictoryChime() {
    if (isFocusShieldActive()) return; // Respect DND
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);
            
            gain.gain.setValueAtTime(0, now + i * 0.08);
            gain.gain.linearRampToValueAtTime(0.18, now + i * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.45);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.5);
        });
    } catch(e) {}
}

// Tibetan Bell for Pomodoro Session Completion
function playPomodoroBell() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now); // D5
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(591.33, now); // Subtle beating tone
        
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 3.0);
        osc2.stop(now + 3.0);
    } catch(e) {}
}

// Generative Soundscapes State
const soundGenerators = {
    rain: { node: null, gain: null, playing: false },
    waves: { node: null, gain: null, playing: false },
    binaural: { node: null, gain: null, playing: false },
    forest: { node: null, gain: null, playing: false }
};

function toggleSoundscape(type) {
    const ctx = getAudioContext();
    if (!ctx) return;

    const track = soundGenerators[type];
    const trackEl = document.querySelector(`.sound-track[data-sound="${type}"]`);
    const btn = trackEl?.querySelector('.sound-toggle-btn');
    const slider = trackEl?.querySelector('.volume-slider');

    if (track.playing) {
        // Stop Sound
        if (track.node) {
            try { track.node.stop(); } catch(e) {}
            track.node.disconnect();
        }
        track.playing = false;
        if (trackEl) trackEl.classList.remove('playing');
        if (btn) btn.textContent = 'Play';
        if (slider) slider.disabled = true;
    } else {
        // Start Sound Generator
        track.gain = ctx.createGain();
        track.gain.gain.value = slider ? parseFloat(slider.value) : 0.5;
        track.gain.connect(ctx.destination);

        if (type === 'rain') {
            // Pink Noise Rain
            const bufferSize = ctx.sampleRate * 2;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            let b0 = 0, b1 = 0, b2 = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                data[i] = (b0 + b1 + b2) * 0.2;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            noise.loop = true;
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1200;
            
            noise.connect(filter);
            filter.connect(track.gain);
            noise.start();
            track.node = noise;

        } else if (type === 'waves') {
            // Modulated Ocean Surf
            const bufferSize = ctx.sampleRate * 2;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
            
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            noise.loop = true;
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 400;
            filter.Q.value = 1.0;
            
            // LFO for wave swelling
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();
            lfo.frequency.value = 0.12; // 1 wave every 8 seconds
            lfoGain.gain.value = 300;
            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);
            lfo.start();
            
            noise.connect(filter);
            filter.connect(track.gain);
            noise.start();
            track.node = noise;

        } else if (type === 'binaural') {
            // 40Hz Gamma Flow (200Hz + 240Hz)
            const oscL = ctx.createOscillator();
            const oscR = ctx.createOscillator();
            oscL.frequency.value = 200;
            oscR.frequency.value = 240;
            
            const merger = ctx.createChannelMerger(2);
            oscL.connect(merger, 0, 0);
            oscR.connect(merger, 0, 1);
            
            merger.connect(track.gain);
            oscL.start();
            oscR.start();
            track.node = {
                stop: () => { oscL.stop(); oscR.stop(); },
                disconnect: () => { oscL.disconnect(); oscR.disconnect(); merger.disconnect(); }
            };

        } else if (type === 'forest') {
            // Forest Breeze
            const bufferSize = ctx.sampleRate * 2;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.2;
            
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            noise.loop = true;
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 650;
            
            noise.connect(filter);
            filter.connect(track.gain);
            noise.start();
            track.node = noise;
        }

        track.playing = true;
        if (trackEl) trackEl.classList.add('playing');
        if (btn) btn.textContent = 'Pause';
        if (slider) slider.disabled = false;
    }
}

function stopAllSoundscapes() {
    Object.keys(soundGenerators).forEach(type => {
        if (soundGenerators[type].playing) {
            toggleSoundscape(type);
        }
    });
    showToast('Soundscapes muted', 'info', '🔇');
}

// ========== 4. CONFETTI CELEBRATION ENGINE ==========

function fireVictoryCelebration() {
    playVictoryChime();
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const colors = ['#4361ee', '#06d6a0', '#ffd166', '#ef476f', '#7209b7', '#4cc9f0'];
    const particles = [];
    const count = 90;
    
    for (let i = 0; i < count; i++) {
        particles.push({
            x: canvas.width / 2,
            y: canvas.height / 2 + 50,
            vx: (Math.random() - 0.5) * 18,
            vy: (Math.random() - 0.75) * 18,
            size: Math.random() * 8 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 12,
            opacity: 1,
            gravity: 0.38
        });
    }
    
    let animId;
    function renderConfetti() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let activeCount = 0;
        
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.rotation += p.rotSpeed;
            p.opacity -= 0.012;
            
            if (p.opacity > 0) {
                activeCount++;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.globalAlpha = Math.max(0, p.opacity);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.4);
                ctx.restore();
            }
        });
        
        if (activeCount > 0) {
            animId = requestAnimationFrame(renderConfetti);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            cancelAnimationFrame(animId);
        }
    }
    renderConfetti();
}

// ========== 5. DAILY TASK MANAGEMENT MODULE ==========

async function loadTasks() {
    try {
        const response = await fetch(`${API_URL}/tasks`);
        if (response.ok) {
            const data = await response.json();
            window.allTasks = data || [];
            localStorage.setItem('cached_tasks', JSON.stringify(window.allTasks));
        } else {
            const cached = localStorage.getItem('cached_tasks');
            if (cached) window.allTasks = JSON.parse(cached);
        }
    } catch (e) {
        const cached = localStorage.getItem('cached_tasks');
        if (cached) window.allTasks = JSON.parse(cached);
    }
    renderTasks();
}

async function handleAddTask(e) {
    e.preventDefault();
    const input = document.getElementById('taskTitleInput');
    const priorityRadios = document.getElementsByName('taskPriority');
    let priority = 'medium';
    for (const r of priorityRadios) {
        if (r.checked) priority = r.value;
    }
    
    const title = input.value.trim();
    if (!title) return;
    
    try {
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, priority })
        });
        if (response.ok) {
            const newTask = await response.json();
            window.allTasks.unshift(newTask);
            input.value = '';
            showToast('Task added successfully', 'success', '✨');
            renderTasks();
        }
    } catch(err) {
        // Optimistic offline add
        const tempTask = { id: Date.now(), title, priority, completed: 0 };
        window.allTasks.unshift(tempTask);
        input.value = '';
        renderTasks();
    }
}

async function toggleTask(taskId, currentCompleted) {
    const nextCompleted = currentCompleted ? 0 : 1;
    const task = window.allTasks.find(t => t.id === taskId);
    if (task) task.completed = nextCompleted;
    
    renderTasks();
    
    if (nextCompleted === 1) {
        fireVictoryCelebration();
        showToast('Task completed! Great victory! 🎉', 'success', '🏆');
    }
    
    try {
        await fetch(`${API_URL}/tasks/${taskId}/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed: nextCompleted })
        });
    } catch(err) {}
}

async function deleteTask(taskId) {
    window.allTasks = window.allTasks.filter(t => t.id !== taskId);
    renderTasks();
    showToast('Task removed', 'info', '🗑️');
    
    try {
        await fetch(`${API_URL}/tasks/${taskId}`, { method: 'DELETE' });
    } catch(e) {}
}

function sendTaskToPomodoro(taskId) {
    const task = window.allTasks.find(t => t.id === taskId);
    if (!task) return;
    
    currentPomoTask = task;
    document.getElementById('pomoLinkedTaskTitle').textContent = `Working on: ${task.title}`;
    
    // Switch to Pomodoro tab
    switchTab('pomodoro');
    showToast(`Timer focused on: "${task.title}"`, 'info', '🎯');
}

function renderTasks() {
    const listEl = document.getElementById('tasksList');
    if (!listEl) return;
    
    const tasks = window.allTasks || [];
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed === 1).length;
    const active = total - completed;
    const highPriority = tasks.filter(t => t.priority === 'high' && !t.completed).length;
    
    // Update badge counters
    document.getElementById('countAllTasks').textContent = total;
    document.getElementById('countActiveTasks').textContent = active;
    document.getElementById('countHighTasks').textContent = highPriority;
    document.getElementById('countCompletedTasks').textContent = completed;
    document.getElementById('taskPendingBadge').textContent = active;
    document.getElementById('taskHeaderStats').textContent = `${completed}/${total} Completed`;
    
    // All Tasks Done Victory Banner
    const doneBanner = document.getElementById('allTasksDoneBanner');
    if (doneBanner) {
        doneBanner.style.display = (total > 0 && completed === total) ? 'flex' : 'none';
    }
    
    // Filter tasks
    let filtered = tasks;
    if (currentTaskFilter === 'active') filtered = tasks.filter(t => t.completed === 0);
    else if (currentTaskFilter === 'high') filtered = tasks.filter(t => t.priority === 'high');
    else if (currentTaskFilter === 'completed') filtered = tasks.filter(t => t.completed === 1);
    
    if (filtered.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">✨</div>
                <p>No tasks match this filter. Everything is clean!</p>
            </div>
        `;
        return;
    }
    
    listEl.innerHTML = filtered.map(t => {
        const isDone = t.completed === 1;
        const priorityLabel = t.priority === 'high' ? '🔴 High' : t.priority === 'medium' ? '🟡 Med' : '🟢 Low';
        
        return `
            <div class="task-item ${isDone ? 'completed' : ''}" data-id="${t.id}">
                <div class="task-left">
                    <div class="task-check-circle" onclick="toggleTask(${t.id}, ${t.completed})" title="Toggle completion">
                        ${isDone ? '✓' : ''}
                    </div>
                    <span class="task-title-text">${escapeHtml(t.title)}</span>
                    <span class="task-priority-tag ${t.priority || 'medium'}">${priorityLabel}</span>
                </div>
                <div class="task-right">
                    ${!isDone ? `<button class="btn-pomo-link" onclick="sendTaskToPomodoro(${t.id})">⏱️ Focus</button>` : ''}
                    <button class="btn-icon-action delete-action" onclick="deleteTask(${t.id})" title="Delete task">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

// ========== 6. POMODORO FOCUS STUDIO ENGINE ==========

let pomoState = {
    mode: 'focus', // focus, shortBreak, longBreak
    timeLeft: 25 * 60,
    totalTime: 25 * 60,
    timerId: null,
    isRunning: false,
    completedSessions: parseInt(localStorage.getItem('pomo_sessions') || '0', 10),
    totalMinutes: parseInt(localStorage.getItem('pomo_minutes') || '0', 10)
};

function initPomodoro() {
    updatePomodoroDisplay();
    updatePomodoroStats();
    
    // Mode Buttons
    document.querySelectorAll('.pomo-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.pomo-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const mode = btn.dataset.mode;
            const minutes = parseInt(btn.dataset.time, 10);
            setPomoMode(mode, minutes);
        });
    });
    
    // Control Buttons
    document.getElementById('pomoPlayPauseBtn')?.addEventListener('click', togglePomodoroTimer);
    document.getElementById('pomoResetBtn')?.addEventListener('click', resetPomodoroTimer);
    document.getElementById('pomoSkipBtn')?.addEventListener('click', skipPomodoroPhase);
    document.getElementById('pomoChangeTaskBtn')?.addEventListener('click', () => {
        switchTab('tasks');
    });
}

function setPomoMode(mode, minutes) {
    clearInterval(pomoState.timerId);
    pomoState.timerId = null;
    pomoState.isRunning = false;
    pomoState.mode = mode;
    pomoState.totalTime = minutes * 60;
    pomoState.timeLeft = minutes * 60;
    
    const playBtnText = document.getElementById('pomoPlayText');
    const playBtnIcon = document.getElementById('pomoPlayIcon');
    if (playBtnText) playBtnText.textContent = 'Start Session';
    if (playBtnIcon) playBtnIcon.textContent = '▶';
    
    const statusLabel = document.getElementById('pomoStatusLabel');
    if (statusLabel) {
        statusLabel.textContent = mode === 'focus' ? 'Ready to Focus' : mode === 'shortBreak' ? 'Short Rest Time' : 'Long Recharge Time';
    }
    
    updatePomodoroDisplay();
}

function togglePomodoroTimer() {
    if (pomoState.isRunning) {
        // Pause
        clearInterval(pomoState.timerId);
        pomoState.timerId = null;
        pomoState.isRunning = false;
        document.getElementById('pomoPlayText').textContent = 'Resume';
        document.getElementById('pomoPlayIcon').textContent = '▶';
        document.getElementById('pomoStatusLabel').textContent = 'Session Paused';
    } else {
        // Start
        getAudioContext(); // Pre-warm audio
        pomoState.isRunning = true;
        document.getElementById('pomoPlayText').textContent = 'Pause Session';
        document.getElementById('pomoPlayIcon').textContent = '⏸';
        document.getElementById('pomoStatusLabel').textContent = pomoState.mode === 'focus' ? '🎯 Focusing Deeply...' : '☕ Resting...';
        
        pomoState.timerId = setInterval(() => {
            if (pomoState.timeLeft > 0) {
                pomoState.timeLeft--;
                updatePomodoroDisplay();
            } else {
                handlePomodoroComplete();
            }
        }, 1000);
    }
}

function resetPomodoroTimer() {
    clearInterval(pomoState.timerId);
    pomoState.timerId = null;
    pomoState.isRunning = false;
    pomoState.timeLeft = pomoState.totalTime;
    document.getElementById('pomoPlayText').textContent = 'Start Session';
    document.getElementById('pomoPlayIcon').textContent = '▶';
    document.getElementById('pomoStatusLabel').textContent = 'Timer Reset';
    updatePomodoroDisplay();
}

function skipPomodoroPhase() {
    clearInterval(pomoState.timerId);
    pomoState.timerId = null;
    pomoState.isRunning = false;
    
    if (pomoState.mode === 'focus') {
        setPomoMode('shortBreak', 5);
        document.querySelector('[data-mode="shortBreak"]')?.click();
    } else {
        setPomoMode('focus', 25);
        document.querySelector('[data-mode="focus"]')?.click();
    }
    showToast('Skipped to next Pomodoro phase', 'info', '⏭');
}

function handlePomodoroComplete() {
    clearInterval(pomoState.timerId);
    pomoState.timerId = null;
    pomoState.isRunning = false;
    
    playPomodoroBell();
    fireVictoryCelebration();
    
    if (pomoState.mode === 'focus') {
        pomoState.completedSessions++;
        pomoState.totalMinutes += Math.round(pomoState.totalTime / 60);
        localStorage.setItem('pomo_sessions', pomoState.completedSessions);
        localStorage.setItem('pomo_minutes', pomoState.totalMinutes);
        
        showToast('🍅 Pomodoro Focus Complete! Time for a well-earned rest.', 'success', '🎉');
        updatePomodoroStats();
        
        // Auto transition to break
        const nextMode = pomoState.completedSessions % 4 === 0 ? 'longBreak' : 'shortBreak';
        const nextTime = nextMode === 'longBreak' ? 15 : 5;
        document.querySelector(`[data-mode="${nextMode}"]`)?.click();
    } else {
        showToast('Break finished! Ready for the next deep work sprint?', 'info', '⚡');
        document.querySelector('[data-mode="focus"]')?.click();
    }
}

function updatePomodoroDisplay() {
    const minutes = Math.floor(pomoState.timeLeft / 60);
    const seconds = pomoState.timeLeft % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    const displayEl = document.getElementById('pomoTimeDisplay');
    if (displayEl) displayEl.textContent = timeStr;
    
    // Update SVG Ring (circumference = 2 * PI * 120 = 754)
    const ring = document.getElementById('pomoProgressRing');
    if (ring && pomoState.totalTime > 0) {
        const progress = (pomoState.totalTime - pomoState.timeLeft) / pomoState.totalTime;
        const offset = 754 - (754 * progress);
        ring.style.strokeDashoffset = offset;
        ring.style.stroke = pomoState.mode === 'focus' ? 'var(--accent)' : 'var(--success)';
    }
}

function updatePomodoroStats() {
    const sessionCountEl = document.getElementById('pomoCompletedCount');
    const totalMinutesEl = document.getElementById('pomoTotalMinutes');
    const cycleIndicatorEl = document.getElementById('pomoCycleIndicator');
    
    if (sessionCountEl) sessionCountEl.textContent = pomoState.completedSessions;
    if (totalMinutesEl) totalMinutesEl.textContent = `${pomoState.totalMinutes}m`;
    
    if (cycleIndicatorEl) {
        const inCycle = pomoState.completedSessions % 4;
        let dots = '';
        for (let i = 0; i < 4; i++) {
            dots += i < inCycle ? '🍅' : '⚪';
        }
        cycleIndicatorEl.textContent = dots;
    }
}

// ========== 7. ZEN FLOW & 4-7-8 BREATHING ENGINE ==========

let breathingInterval = null;
let isBreathingActive = false;

function initBreathingExercise() {
    const startBtn = document.getElementById('startBreathingBtn');
    const stopBtn = document.getElementById('stopBreathingBtn');
    
    startBtn?.addEventListener('click', startBreathing);
    stopBtn?.addEventListener('click', stopBreathing);
}

function startBreathing() {
    isBreathingActive = true;
    document.getElementById('startBreathingBtn').style.display = 'none';
    document.getElementById('stopBreathingBtn').style.display = 'inline-flex';
    
    const orb = document.getElementById('breathingOrb');
    const actionText = document.getElementById('breathingActionText');
    const countdownEl = document.getElementById('breathingCountdown');
    
    const phaseInhale = document.getElementById('phaseInhale');
    const phaseHold = document.getElementById('phaseHold');
    const phaseExhale = document.getElementById('phaseExhale');
    
    let phase = 'inhale'; // inhale (4s), hold (7s), exhale (8s)
    let secondsLeft = 4;
    
    function setPhase(newPhase, dur) {
        phase = newPhase;
        secondsLeft = dur;
        
        phaseInhale?.classList.toggle('active', phase === 'inhale');
        phaseHold?.classList.toggle('active', phase === 'hold');
        phaseExhale?.classList.toggle('active', phase === 'exhale');
        
        orb.className = `breathing-orb ${phase}`;
        actionText.textContent = phase === 'inhale' ? 'Inhale...' : phase === 'hold' ? 'Hold breath...' : 'Exhale slowly...';
    }
    
    setPhase('inhale', 4);
    countdownEl.textContent = `${secondsLeft}s`;
    
    breathingInterval = setInterval(() => {
        if (!isBreathingActive) return;
        secondsLeft--;
        
        if (secondsLeft > 0) {
            countdownEl.textContent = `${secondsLeft}s`;
        } else {
            if (phase === 'inhale') {
                setPhase('hold', 7);
            } else if (phase === 'hold') {
                setPhase('exhale', 8);
            } else {
                setPhase('inhale', 4);
            }
            countdownEl.textContent = `${secondsLeft}s`;
        }
    }, 1000);
}

function stopBreathing() {
    isBreathingActive = false;
    clearInterval(breathingInterval);
    breathingInterval = null;
    
    document.getElementById('startBreathingBtn').style.display = 'inline-flex';
    document.getElementById('stopBreathingBtn').style.display = 'none';
    
    const orb = document.getElementById('breathingOrb');
    if (orb) orb.className = 'breathing-orb';
    
    document.getElementById('breathingActionText').textContent = 'Ready';
    document.getElementById('breathingCountdown').textContent = '4s';
    
    document.getElementById('phaseInhale')?.classList.remove('active');
    document.getElementById('phaseHold')?.classList.remove('active');
    document.getElementById('phaseExhale')?.classList.remove('active');
}

// ========== 8. FOCUS SHIELD (DO NOT DISTURB & SCREEN WAKELOCK) ==========

let wakeLockSentinel = null;
let focusShieldEnabled = false;

function isFocusShieldActive() {
    return focusShieldEnabled;
}

async function toggleFocusShield() {
    focusShieldEnabled = !focusShieldEnabled;
    const btn = document.getElementById('focusShieldToggle');
    const badge = document.getElementById('shieldBadge');
    const banner = document.getElementById('focusBanner');
    
    if (focusShieldEnabled) {
        btn?.classList.add('active');
        if (badge) badge.textContent = 'ON';
        if (banner) banner.style.display = 'flex';
        
        // Request Screen WakeLock
        if ('wakeLock' in navigator) {
            try {
                wakeLockSentinel = await navigator.wakeLock.request('screen');
            } catch(e) {}
        }
        showToast('🛡️ Focus Shield Active: Screen sleep locked & distractions muted!', 'success', '🛡️');
    } else {
        btn?.classList.remove('active');
        if (badge) badge.textContent = 'OFF';
        if (banner) banner.style.display = 'none';
        
        if (wakeLockSentinel) {
            try { await wakeLockSentinel.release(); } catch(e) {}
            wakeLockSentinel = null;
        }
        showToast('Focus Shield deactivated', 'info', '🔓');
    }
}

// Fullscreen Focus Mode
function toggleFullscreenZen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {});
        showToast('Entered Fullscreen Focus Mode', 'info', '⛶');
    } else {
        document.exitFullscreen().catch(err => {});
    }
}

// ========== 9. HABITS ENGINE (FULL CRUD & METRICS) ==========

async function loadHabits() {
    try {
        const response = await fetch(`${API_URL}/habits`);
        if (response.ok) {
            window.allHabits = await response.json();
            localStorage.setItem('cached_habits', JSON.stringify(window.allHabits));
        }
    } catch(e) {
        const cached = localStorage.getItem('cached_habits');
        if (cached) window.allHabits = JSON.parse(cached);
    }
    await loadEntries();
    renderHabits();
    updateStats();
}

async function loadEntries() {
    try {
        const response = await fetch(`${API_URL}/entries`);
        if (response.ok) {
            window.allEntries = await response.json();
            localStorage.setItem('cached_entries', JSON.stringify(window.allEntries));
        }
    } catch(e) {
        const cached = localStorage.getItem('cached_entries');
        if (cached) window.allEntries = JSON.parse(cached);
    }
}

async function addHabit() {
    const input = document.getElementById('habitName');
    const name = input?.value.trim();
    if (!name) return;
    
    try {
        const response = await fetch(`${API_URL}/habits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        if (response.ok) {
            const newHabit = await response.json();
            window.allHabits.unshift(newHabit);
            input.value = '';
            showToast(`Habit "${name}" created!`, 'success', '🌱');
            renderHabits();
            updateStats();
        }
    } catch(e) {}
}

async function toggleHabitDay(habitId, dateStr, currentVal) {
    const nextVal = currentVal ? 0 : 1;
    
    // Update local state optimistically
    const existing = window.allEntries.find(e => e.habit_id === habitId && e.date === dateStr);
    if (existing) {
        existing.completed = nextVal;
    } else {
        window.allEntries.push({ habit_id: habitId, date: dateStr, completed: nextVal });
    }
    
    renderHabits();
    updateStats();
    if (typeof updateChart === 'function') updateChart();
    
    if (nextVal === 1) {
        fireVictoryCelebration();
        showToast('Habit checked off! Consistency wins! 🔥', 'success', '✅');
    }
    
    try {
        await fetch(`${API_URL}/habits/${habitId}/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: dateStr, completed: nextVal })
        });
    } catch(e) {}
}

async function deleteHabit(habitId) {
    if (!confirm('Are you sure you want to delete this habit?')) return;
    
    window.allHabits = window.allHabits.filter(h => h.id !== habitId);
    window.allEntries = window.allEntries.filter(e => e.habit_id !== habitId);
    
    renderHabits();
    updateStats();
    if (typeof updateChart === 'function') updateChart();
    showToast('Habit deleted', 'info', '🗑️');
    
    try {
        await fetch(`${API_URL}/habits/${habitId}`, { method: 'DELETE' });
    } catch(e) {}
}

function calculateHabitStreak(habitId) {
    const entries = window.allEntries
        .filter(e => e.habit_id === habitId && e.completed === 1)
        .map(e => e.date)
        .sort()
        .reverse();
    
    if (entries.length === 0) return 0;
    
    let streak = 0;
    let checkDate = new Date();
    
    // Allow today or yesterday as start of streak
    const todayStr = checkDate.toISOString().split('T')[0];
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayStr = checkDate.toISOString().split('T')[0];
    
    if (!entries.includes(todayStr) && !entries.includes(yesterdayStr)) {
        return 0;
    }
    
    let currentCheck = entries.includes(todayStr) ? new Date() : checkDate;
    
    while (true) {
        const dateStr = currentCheck.toISOString().split('T')[0];
        if (entries.includes(dateStr)) {
            streak++;
            currentCheck.setDate(currentCheck.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

function renderHabits() {
    const listEl = document.getElementById('habitsList');
    if (!listEl) return;
    
    const habits = window.allHabits || [];
    if (habits.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🌱</div>
                <p>No habits yet. Add your first habit above to begin your transformation!</p>
            </div>
        `;
        return;
    }
    
    // Last 7 days dates
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7Days.push({
            dateStr: d.toISOString().split('T')[0],
            dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
            dayNum: d.getDate()
        });
    }
    
    listEl.innerHTML = habits.map(h => {
        const streak = calculateHabitStreak(h.id);
        
        const daysHtml = last7Days.map(day => {
            const entry = window.allEntries.find(e => e.habit_id === h.id && e.date === day.dateStr);
            const isDone = entry && entry.completed === 1;
            
            return `
                <div class="day-box ${isDone ? 'completed' : ''}" onclick="toggleHabitDay(${h.id}, '${day.dateStr}', ${isDone ? 1 : 0})" title="${day.dayName}, ${day.dateStr}">
                    <span class="day-name">${day.dayName[0]}</span>
                    <div class="day-check">${isDone ? '✓' : ''}</div>
                </div>
            `;
        }).join('');
        
        return `
            <div class="habit-item">
                <div class="habit-header-row">
                    <div class="habit-title-area">
                        <span class="habit-title">${escapeHtml(h.name)}</span>
                        <span class="habit-streak-badge">🔥 ${streak}d streak</span>
                    </div>
                    <div class="habit-actions-area">
                        <button class="btn-icon-action delete-action" onclick="deleteHabit(${h.id})" title="Delete habit">🗑️</button>
                    </div>
                </div>
                <div class="habit-days-row">
                    ${daysHtml}
                </div>
            </div>
        `;
    }).join('');
}

function updateStats() {
    const habits = window.allHabits || [];
    const entries = window.allEntries || [];
    
    const todayStr = new Date().toISOString().split('T')[0];
    const todayCompleted = entries.filter(e => e.date === todayStr && e.completed === 1).length;
    const totalHabits = habits.length;
    const totalCompletions = entries.filter(e => e.completed === 1).length;
    
    let bestStreak = 0;
    habits.forEach(h => {
        const s = calculateHabitStreak(h.id);
        if (s > bestStreak) bestStreak = s;
    });
    
    // UI Elements
    document.getElementById('totalHabits').textContent = totalHabits;
    document.getElementById('totalCompletions').textContent = totalCompletions;
    document.getElementById('todayProgress').textContent = `${todayCompleted}/${totalHabits}`;
    document.getElementById('bestStreak').textContent = bestStreak;
    
    const percent = totalHabits > 0 ? Math.round((todayCompleted / totalHabits) * 100) : 0;
    const progressFill = document.getElementById('progressFill');
    const progressLabel = document.getElementById('progressPercentLabel');
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressLabel) progressLabel.textContent = `${percent}%`;
}

// ========== 10. AI HABIT COACH ==========

function setupAICoach() {
    const sendBtn = document.getElementById('sendCoachBtn');
    const input = document.getElementById('coachInput');
    
    if (sendBtn && input) {
        sendBtn.addEventListener('click', () => {
            const msg = input.value.trim();
            if (msg) {
                askAICoach(msg);
                input.value = '';
            }
        });
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendBtn.click();
        });
    }
    
    document.querySelectorAll('.coach-quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            if (type === 'motivation') askAICoach("Give me powerful motivation to stay focused on my habits today!");
            else if (type === 'suggestion') askAICoach("Suggest a simple 2-minute habit that builds huge momentum.");
            else if (type === 'explain') askAICoach("Why do people drop habits after a week, and how can I prevent it?");
            else if (type === 'recovery') askAICoach("I missed a few habit days. How do I restart without feeling guilty?");
        });
    });
}

async function askAICoach(userMessage) {
    addCoachMessage(userMessage, true);
    const container = document.getElementById('coachMessages');
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'coach-message-bot';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = '<div>🧠 Thinking...</div>';
    container.appendChild(typingDiv);
    container.scrollTop = container.scrollHeight;
    
    try {
        const response = await fetch(`${API_URL}/coach/mindfulness`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userMessage })
        });
        const data = await response.json();
        document.getElementById('typingIndicator')?.remove();
        addCoachMessage(data.advice || data.message || "💪 Keep showing up! Small steps lead to big transformations.");
    } catch (e) {
        document.getElementById('typingIndicator')?.remove();
        addCoachMessage("💪 Small consistent steps every day compound into extraordinary results. Keep going!");
    }
}

function addCoachMessage(text, isUser = false) {
    const container = document.getElementById('coachMessages');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = isUser ? 'coach-message-user' : 'coach-message-bot';
    div.innerHTML = `<div>${escapeHtml(text)}</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// ========== 11. CALENDAR HEATMAP & DATA EXPORTS ==========

let currentCalendarDate = new Date();

function renderCalendar() {
    const gridEl = document.getElementById('calendarGrid');
    const titleEl = document.getElementById('currentMonth');
    if (!gridEl || !titleEl) return;
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    titleEl.textContent = currentCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    let html = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        .map(d => `<div class="calendar-day-header">${d}</div>`)
        .join('');
    
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day-cell empty"></div>';
    }
    
    const totalHabits = (window.allHabits || []).length;
    
    for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayCompletions = (window.allEntries || []).filter(e => e.date === dateStr && e.completed === 1).length;
        
        let levelClass = '';
        if (totalHabits > 0 && dayCompletions > 0) {
            const ratio = dayCompletions / totalHabits;
            levelClass = ratio >= 0.8 ? 'active-level-3' : ratio >= 0.4 ? 'active-level-2' : 'active-level-1';
        }
        
        html += `
            <div class="calendar-day-cell ${levelClass}" onclick="inspectDayDetails('${dateStr}')" title="${dateStr}: ${dayCompletions} completed">
                <span>${day}</span>
            </div>
        `;
    }
    
    gridEl.innerHTML = html;
}

function inspectDayDetails(dateStr) {
    const dayEntries = (window.allEntries || []).filter(e => e.date === dateStr && e.completed === 1);
    showToast(`${dateStr}: ${dayEntries.length} habit(s) completed`, 'info', '📅');
}

function exportDataJSON() {
    const data = {
        exportedAt: new Date().toISOString(),
        habits: window.allHabits,
        entries: window.allEntries,
        tasks: window.allTasks,
        pomodoro: pomoState
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habit-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON backup exported successfully', 'success', '💾');
}

function exportDataPDF() {
    if (typeof window.jspdf === 'undefined') {
        showToast('PDF generator loading...', 'info', '⏳');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.setTextColor(67, 97, 238);
    doc.text('Habit Tracker Pro — Progress Report', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    doc.setFontSize(14);
    doc.setTextColor(25, 28, 43);
    doc.text('Daily Habits Summary:', 14, 42);
    
    let y = 50;
    (window.allHabits || []).forEach((h, i) => {
        const streak = calculateHabitStreak(h.id);
        doc.setFontSize(11);
        doc.text(`${i + 1}. ${h.name} — Current Streak: ${streak} days`, 18, y);
        y += 8;
    });
    
    doc.text('Daily Tasks Overview:', 14, y + 10);
    y += 18;
    (window.allTasks || []).forEach((t, i) => {
        const status = t.completed ? '[Completed]' : '[Pending]';
        doc.text(`${i + 1}. ${t.title} (${t.priority}) — ${status}`, 18, y);
        y += 8;
    });
    
    doc.save(`habit-report-${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('PDF Progress Report downloaded', 'success', '📄');
}

// ========== 12. TAB SWITCHER & HCI NAVIGATION ==========

function switchTab(targetTab) {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        const isMatch = tab.dataset.tab === targetTab;
        tab.classList.toggle('active', isMatch);
        tab.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${targetTab}`);
    });
    
    if (targetTab === 'analytics') {
        renderCalendar();
    } else if (targetTab === 'habits' && typeof updateChart === 'function') {
        setTimeout(updateChart, 50);
    }
}

// ========== 13. GLOBAL INITIALIZATION ==========

document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;
    
    displayUserInfo();
    
    // Segmented Navigation Tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            switchTab(tab.dataset.tab);
        });
    });
    
    // Focus Shield & Theme Buttons
    document.getElementById('focusShieldToggle')?.addEventListener('click', toggleFocusShield);
    document.getElementById('disableFocusBannerBtn')?.addEventListener('click', toggleFocusShield);
    
    const themeBtn = document.getElementById('themeToggle');
    const isDark = localStorage.getItem('theme') === 'dark';
    if (isDark) document.body.classList.add('dark');
    if (themeBtn) {
        themeBtn.textContent = isDark ? '☀️' : '🌙';
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark');
            const nowDark = document.body.classList.contains('dark');
            localStorage.setItem('theme', nowDark ? 'dark' : 'light');
            themeBtn.textContent = nowDark ? '☀️' : '🌙';
            if (typeof updateChartTheme === 'function') updateChartTheme();
        });
    }
    
    // Task Master Setup
    document.getElementById('addTaskForm')?.addEventListener('submit', handleAddTask);
    
    document.querySelectorAll('#taskFilterGroup .filter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#taskFilterGroup .filter-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTaskFilter = btn.dataset.filter;
            renderTasks();
        });
    });
    
    document.getElementById('clearCompletedTasksBtn')?.addEventListener('click', async () => {
        const completedIds = window.allTasks.filter(t => t.completed === 1).map(t => t.id);
        for (const id of completedIds) {
            await deleteTask(id);
        }
        showToast('Cleared all finished tasks', 'info', '🧹');
    });
    
    // Habit Form Setup
    document.getElementById('addHabitBtn')?.addEventListener('click', addHabit);
    document.getElementById('habitName')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addHabit();
    });
    
    // Soundscape Mixer Buttons
    document.querySelectorAll('.sound-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            toggleSoundscape(btn.dataset.sound);
        });
    });
    
    document.querySelectorAll('.volume-slider').forEach(slider => {
        slider.addEventListener('input', () => {
            const type = slider.closest('.sound-track')?.dataset.sound;
            if (type && soundGenerators[type]?.gain) {
                soundGenerators[type].gain.gain.value = parseFloat(slider.value);
            }
        });
    });
    
    document.getElementById('stopAllAudioBtn')?.addEventListener('click', stopAllSoundscapes);
    document.getElementById('fullscreenZenBtn')?.addEventListener('click', toggleFullscreenZen);
    
    // Pomodoro & Breathing
    initPomodoro();
    initBreathingExercise();
    setupAICoach();
    
    // Calendar Navigation
    document.getElementById('prevMonth')?.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });
    document.getElementById('nextMonth')?.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });
    
    // Exports
    document.getElementById('exportBtn')?.addEventListener('click', exportDataJSON);
    document.getElementById('exportPDFBtn')?.addEventListener('click', exportDataPDF);
    
    // Keyboard Shortcuts (Space for Pomo, Z for Zen, 1-6 for Tabs)
    window.addEventListener('keydown', (e) => {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        
        if (e.code === 'Space') {
            e.preventDefault();
            togglePomodoroTimer();
        } else if (e.key === 'z' || e.key === 'Z') {
            toggleFullscreenZen();
        }
    });
    
    // Initialize Data & Charts
    if (typeof initCharts === 'function') initCharts();
    await loadHabits();
    await loadTasks();
    renderCalendar();
});

// Helper
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Global functions for inline onclick handlers
window.toggleHabitDay = toggleHabitDay;
window.deleteHabit = deleteHabit;
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;
window.sendTaskToPomodoro = sendTaskToPomodoro;
window.inspectDayDetails = inspectDayDetails;
window.logout = logout;