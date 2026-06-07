// ========== AUTHENTICATION ==========
const API_URL = 'http://localhost:3000/api';

function checkAuth() {
    const token = localStorage.getItem('token');
    console.log('🔐 Checking auth - Token exists:', !!token);
    
    if (!token) {
        console.log('❌ No token found, redirecting to landing.html');
        window.location.href = 'landing.html';
        return false;
    }
    return true;
}

// Add token to all fetch requests
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

// Check if we're on a protected page
const currentFile = window.location.pathname.split('/').pop();
const isProtectedPage = currentFile === 'index.html' || currentFile === '' || currentFile === 'index';

if (isProtectedPage) {
    const token = localStorage.getItem('token');
    console.log('📄 Protected page - Token exists:', !!token);
    
    if (!token) {
        console.log('🚫 No token, redirecting to landing');
        window.location.href = 'landing.html';
    } else {
        console.log('✅ Authenticated, loading app');
    }
}

function logout() {
    console.log('🚪 Logging out');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'landing.html';
}

// Display user info
function displayUserInfo() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            console.log('👤 Logged in as:', user.email || user.username);
        } catch(e) {}
    }
}
displayUserInfo();

// ========== GLOBAL STATE ==========
let currentDate = new Date();
let allHabits = [];
let allEntries = [];

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM Content Loaded - Initializing app');
    setupEventListeners();
    loadAllData();
    setupTheme();
    renderCalendar();
    setupReminderToggle();
    setupCoach();
    setTimeout(() => {
        if (typeof initCharts !== 'undefined') initCharts();
    }, 500);
});

function setupEventListeners() {
    document.getElementById('addHabitBtn').addEventListener('click', addHabit);
    document.getElementById('habitName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addHabit();
    });
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('exportPDFBtn')?.addEventListener('click', exportToPDF);
    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
}

// ========== DATA LOADING ==========
async function loadAllData() {
    await loadHabits();
    await loadEntries();
    updateDashboard();
    if (typeof updateChart !== 'undefined') updateChart();
}

async function loadHabits() {
    try {
        const response = await fetch(`${API_URL}/habits`);
        allHabits = await response.json();
        displayHabits();
    } catch (error) {
        console.error('Error loading habits:', error);
        showNotification('Failed to connect to server', 'error');
    }
}

async function loadEntries() {
    try {
        const response = await fetch(`${API_URL}/entries`);
        allEntries = await response.json();
    } catch (error) {
        console.error('Error loading entries:', error);
    }
}

// ========== DISPLAY FUNCTIONS ==========
function displayHabits() {
    const habitsList = document.getElementById('habitsList');
    if (allHabits.length === 0) {
        habitsList.innerHTML = '<p style="text-align:center; padding:40px;">✨ No habits yet. Add your first habit above!</p>';
        return;
    }
    habitsList.innerHTML = allHabits.map(habit => {
        const habitEntries = allEntries.filter(e => e.habit_id === habit.id);
        const todayEntry = habitEntries.find(e => e.date === getTodayDate());
        const streak = calculateStreak(habit.id, habitEntries);
        return `
            <div class="habit-item" data-habit-id="${habit.id}">
                <div class="habit-info">
                    <div class="habit-name">${escapeHtml(habit.name)}</div>
                    <div class="habit-stats">🔥 <span class="streak">${streak}</span> day streak • 📊 ${habitEntries.length} total completions</div>
                </div>
                <div class="habit-actions">
                    <button class="today-btn ${todayEntry?.completed === 1 ? 'completed' : ''}" onclick="toggleHabitDay(${habit.id})">${todayEntry?.completed === 1 ? '✅' : '📅'}</button>
                    <button class="edit-btn" onclick="editHabit(${habit.id})">✏️</button>
                    <button class="delete-btn" onclick="deleteHabit(${habit.id})">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function calculateStreak(habitId, habitEntries) {
    if (!habitEntries.length) return 0;
    const sortedDates = habitEntries.filter(e => e.completed === 1).map(e => e.date).sort().reverse();
    if (sortedDates.length === 0) return 0;
    let streak = 1;
    let currentDateObj = new Date(sortedDates[0]);
    let prevDate = currentDateObj;
    for (let i = 1; i < sortedDates.length; i++) {
        currentDateObj = new Date(sortedDates[i]);
        const diffDays = Math.floor((prevDate - currentDateObj) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) { streak++; prevDate = currentDateObj; }
        else if (diffDays > 1) break;
    }
    return streak;
}

// ========== DASHBOARD ==========
function updateDashboard() {
    updateStats();
    updateProgress();
}

function updateStats() {
    const totalHabits = allHabits.length;
    const totalCompletions = allEntries.filter(e => e.completed === 1).length;
    const todayCompletions = allEntries.filter(e => e.date === getTodayDate() && e.completed === 1).length;
    const bestStreak = calculateBestStreak();
    document.getElementById('totalHabits').textContent = totalHabits;
    document.getElementById('totalCompletions').textContent = totalCompletions;
    document.getElementById('todayProgress').textContent = `${todayCompletions}/${totalHabits}`;
    document.getElementById('bestStreak').textContent = bestStreak;
}

function calculateBestStreak() {
    let bestStreak = 0;
    allHabits.forEach(habit => {
        const habitEntries = allEntries.filter(e => e.habit_id === habit.id);
        const streak = calculateStreak(habit.id, habitEntries);
        if (streak > bestStreak) bestStreak = streak;
    });
    return bestStreak;
}

function updateProgress() {
    const today = getTodayDate();
    const todayEntries = allEntries.filter(e => e.date === today && e.completed === 1);
    const percentage = allHabits.length > 0 ? (todayEntries.length / allHabits.length) * 100 : 0;
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
        progressFill.textContent = `${Math.round(percentage)}%`;
    }
}

// ========== CRUD OPERATIONS ==========
async function addHabit() {
    const input = document.getElementById('habitName');
    const name = input.value.trim();
    if (!name) { showNotification('Please enter a habit name', 'error'); return; }
    try {
        const response = await fetch(`${API_URL}/habits`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        if (response.ok) {
            input.value = '';
            await loadAllData();
            showNotification(`✅ "${name}" added successfully!`, 'success');
            renderCalendar();
        } else throw new Error('Failed to add habit');
    } catch (error) { showNotification('❌ Failed to add habit', 'error'); }
}

async function toggleHabitDay(habitId) {
    const today = getTodayDate();
    const existingEntry = allEntries.find(e => e.habit_id === habitId && e.date === today);
    const newStatus = existingEntry ? existingEntry.completed !== 1 : true;
    try {
        const response = await fetch(`${API_URL}/habits/${habitId}/toggle`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: today, completed: newStatus })
        });
        if (response.ok) {
            await loadAllData();
            renderCalendar();
            const habit = allHabits.find(h => h.id === habitId);
            showNotification(`${habit?.name}: ${newStatus ? 'completed' : 'unmarked'} for today`, 'success');
        }
    } catch (error) { showNotification('❌ Failed to update', 'error'); }
}

// ========== MODAL FUNCTIONS ==========

// Simple modal with OK button
function showModal(title, message, onOk = null) {
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) existingModal.remove();
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    overlay.innerHTML = `
        <div class="modal-container">
            <div class="modal-header">
                <h3>${escapeHtml(title)}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <p>${escapeHtml(message)}</p>
            </div>
            <div class="modal-footer">
                <button class="modal-btn modal-btn-primary" id="modalOkBtn">OK</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    const closeModal = () => {
        overlay.remove();
        if (onOk) onOk();
    };
    
    overlay.querySelector('#modalOkBtn').addEventListener('click', closeModal);
    overlay.querySelector('.modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
}

// Confirmation modal (Yes/No)
function showConfirm(title, message, onConfirm, onCancel = null) {
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) existingModal.remove();
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    overlay.innerHTML = `
        <div class="modal-container">
            <div class="modal-header">
                <h3>${escapeHtml(title)}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <p>${escapeHtml(message)}</p>
            </div>
            <div class="modal-footer">
                <button class="modal-btn modal-btn-secondary" id="modalCancelBtn">Cancel</button>
                <button class="modal-btn modal-btn-danger" id="modalConfirmBtn">Confirm</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    const closeModal = () => overlay.remove();
    
    overlay.querySelector('#modalCancelBtn').addEventListener('click', () => {
        closeModal();
        if (onCancel) onCancel();
    });
    
    overlay.querySelector('#modalConfirmBtn').addEventListener('click', () => {
        closeModal();
        if (onConfirm) onConfirm();
    });
    
    overlay.querySelector('.modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
}

// Prompt modal with input field
function showPrompt(title, message, defaultValue = '', onConfirm) {
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) existingModal.remove();
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    overlay.innerHTML = `
        <div class="modal-container">
            <div class="modal-header">
                <h3>${escapeHtml(title)}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <p>${escapeHtml(message)}</p>
                <input type="text" id="modalInput" class="modal-input" value="${escapeHtml(defaultValue)}" placeholder="Enter new name...">
            </div>
            <div class="modal-footer">
                <button class="modal-btn modal-btn-secondary" id="modalCancelBtn">Cancel</button>
                <button class="modal-btn modal-btn-primary" id="modalConfirmBtn">Save</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    const input = overlay.querySelector('#modalInput');
    input.focus();
    input.select();
    
    const closeModal = () => overlay.remove();
    
    overlay.querySelector('#modalCancelBtn').addEventListener('click', closeModal);
    overlay.querySelector('#modalConfirmBtn').addEventListener('click', () => {
        const value = input.value.trim();
        closeModal();
        if (value && onConfirm) onConfirm(value);
    });
    
    overlay.querySelector('.modal-close').addEventListener('click', closeModal);
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const value = input.value.trim();
            closeModal();
            if (value && onConfirm) onConfirm(value);
        }
    });
    
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
}

// Day details modal
function showDayDetailsModal(date, completedList, notCompletedList) {
    let content = '';
    
    if (completedList) {
        content += `<strong style="color: var(--success);">✅ Completed:</strong><ul>`;
        completedList.split('\n').forEach(item => {
            if (item.trim()) {
                content += `<li>${escapeHtml(item)}</li>`;
            }
        });
        content += `</ul>`;
    }
    
    if (notCompletedList) {
        content += `<strong style="color: var(--danger);">❌ Not completed:</strong><ul>`;
        notCompletedList.split('\n').forEach(item => {
            if (item.trim()) {
                content += `<li>${escapeHtml(item)}</li>`;
            }
        });
        content += `</ul>`;
    }
    
    if (!completedList && !notCompletedList) {
        content = '<p>No activities recorded for this day.</p>';
    }
    
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) existingModal.remove();
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    overlay.innerHTML = `
        <div class="modal-container">
            <div class="modal-header">
                <h3>📅 ${escapeHtml(date)}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                <button class="modal-btn modal-btn-primary" id="modalOkBtn">OK</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    const closeModal = () => overlay.remove();
    overlay.querySelector('#modalOkBtn').addEventListener('click', closeModal);
    overlay.querySelector('.modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
}

// ========== EDITED FUNCTIONS WITH MODALS ==========

async function editHabit(habitId) {
    const habit = allHabits.find(h => h.id === habitId);
    
    showPrompt('✏️ Edit Habit', `Rename "${habit.name}" to:`, habit.name, async (newName) => {
        try {
            const response = await fetch(`${API_URL}/habits/${habitId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName })
            });
            if (response.ok) {
                await loadAllData();
                renderCalendar();
                showNotification(`✅ Habit renamed to "${newName}"`, 'success');
            } else {
                showNotification('❌ Failed to update habit', 'error');
            }
        } catch (error) {
            showNotification('❌ Failed to update habit', 'error');
        }
    });
}

async function deleteHabit(habitId) {
    const habit = allHabits.find(h => h.id === habitId);
    
    showConfirm('⚠️ Delete Habit', `Are you sure you want to delete "${habit.name}"?\n\nThis will delete ALL history for this habit. This cannot be undone!`, async () => {
        try {
            const response = await fetch(`${API_URL}/habits/${habitId}`, { method: 'DELETE' });
            if (response.ok) {
                await loadAllData();
                renderCalendar();
                showNotification(`🗑️ "${habit.name}" deleted successfully!`, 'success');
            } else {
                showNotification('❌ Failed to delete habit', 'error');
            }
        } catch (error) {
            showNotification('❌ Failed to delete habit', 'error');
        }
    });
}

function viewDayDetails(date) {
    const dayEntries = allEntries.filter(e => e.date === date);
    if (dayEntries.length === 0) {
        showModal(`📅 ${date}`, 'No activities recorded for this day.');
        return;
    }
    
    const completedList = dayEntries.filter(e => e.completed === 1).map(e => `  ✅ ${e.habit_name}`).join('\n');
    const notCompletedList = dayEntries.filter(e => e.completed !== 1).map(e => `  ❌ ${e.habit_name}`).join('\n');
    
    showDayDetailsModal(date, completedList, notCompletedList);
}

// ========== PDF EXPORT ==========
// ========== PDF EXPORT - IMPROVED VERSION ==========
async function exportToPDF() {
    showNotification('📄 Generating PDF report...', 'success');
    
    // Create a temporary container for PDF content
    const pdfContent = document.createElement('div');
    pdfContent.style.cssText = `
        padding: 40px;
        background: white;
        font-family: 'Segoe UI', Arial, sans-serif;
        max-width: 800px;
        margin: 0 auto;
        color: #333;
    `;
    
    // Get current date
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    // Calculate statistics
    const totalHabits = allHabits.length;
    const totalCompletions = allEntries.filter(e => e.completed === 1).length;
    const bestStreak = calculateBestStreak();
    const successRate = totalHabits > 0 && allEntries.length > 0 
        ? Math.round((totalCompletions / allEntries.length) * 100) 
        : 0;
    
    // Calculate completion by day of week
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCompletions = [0, 0, 0, 0, 0, 0, 0];
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];
    
    allEntries.forEach(entry => {
        const date = new Date(entry.date);
        const dayIndex = date.getDay();
        dayTotals[dayIndex]++;
        if (entry.completed === 1) dayCompletions[dayIndex]++;
    });
    
    // Build habit breakdown HTML
    let habitsBreakdown = '';
    if (allHabits.length > 0) {
        allHabits.forEach(habit => {
            const habitEntries = allEntries.filter(e => e.habit_id === habit.id);
            const completed = habitEntries.filter(e => e.completed === 1).length;
            const total = habitEntries.length;
            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
            const barWidth = percentage;
            
            habitsBreakdown += `
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-weight: 600;">${escapeHtml(habit.name)}</span>
                        <span>${completed}/${total} days (${percentage}%)</span>
                    </div>
                    <div style="background: #e8e8e8; border-radius: 12px; height: 24px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, #4361ee, #06d6a0); width: ${barWidth}%; height: 100%; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: 600;">${percentage}%</div>
                    </div>
                </div>
            `;
        });
    } else {
        habitsBreakdown = '<p style="color: #999;">No habits added yet. Start by adding your first habit!</p>';
    }
    
    // Build day of week analysis
    let dayAnalysis = '';
    for (let i = 0; i < 7; i++) {
        const rate = dayTotals[i] > 0 ? Math.round((dayCompletions[i] / dayTotals[i]) * 100) : 0;
        dayAnalysis += `
            <div style="margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>${dayNames[i]}</span>
                    <span>${rate}%</span>
                </div>
                <div style="background: #e8e8e8; border-radius: 8px; height: 8px; overflow: hidden;">
                    <div style="background: #4361ee; width: ${rate}%; height: 100%; border-radius: 8px;"></div>
                </div>
            </div>
        `;
    }
    
    // Build recent activity (last 14 days - cleaner and more readable)
    let recentActivity = '';
    const last14Days = [];
    for (let i = 13; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStrLog = date.toISOString().split('T')[0];
        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        last14Days.push({ date: dateStrLog, formatted: formattedDate });
    }
    
    recentActivity = '<table style="width: 100%; border-collapse: collapse; font-size: 11px;">';
    recentActivity += '<thead>';
    recentActivity += '<tr style="background: #4361ee; color: white;">';
    recentActivity += '<th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Date</th>';
    recentActivity += '<th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Habits Completed</th>';
    recentActivity += '<th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Details</th>';
    recentActivity += '</tr>';
    recentActivity += '</thead><tbody>';
    
    for (const day of last14Days) {
        const dayEntries = allEntries.filter(e => e.date === day.date);
        const completedHabits = dayEntries.filter(e => e.completed === 1);
        const completedCount = completedHabits.length;
        const completedNames = completedHabits.map(e => e.habit_name).join(', ');
        
        let statusColor = '#ef476f';
        let statusText = '❌';
        if (completedCount === totalHabits && totalHabits > 0) {
            statusColor = '#06d6a0';
            statusText = '✅ Perfect day!';
        } else if (completedCount > 0) {
            statusColor = '#ffd166';
            statusText = `🟡 ${completedCount}/${totalHabits} completed`;
        } else {
            statusText = '❌ No habits completed';
        }
        
        recentActivity += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: 500;">${day.formatted}</td>
                <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">
                    <span style="background: ${statusColor}; color: white; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;">${completedCount}/${totalHabits}</span>
                </td>
                <td style="padding: 8px; border: 1px solid #ddd; color: #555;">${completedNames || '—'}</td>
            </tr>
        `;
    }
    recentActivity += '</tbody></table>';
    
    // Calculate month summary
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthEntries = allEntries.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const monthCompletions = monthEntries.filter(e => e.completed === 1).length;
    const monthTotal = monthEntries.length;
    const monthRate = monthTotal > 0 ? Math.round((monthCompletions / monthTotal) * 100) : 0;
    
    // Build full PDF content
    pdfContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 40px;">
            <div style="font-size: 48px; margin-bottom: 10px;">📊</div>
            <h1 style="color: #4361ee; margin-bottom: 5px; font-size: 28px;">Habit Tracker Pro</h1>
            <p style="color: #666; margin-bottom: 5px;">Monthly Progress Report</p>
            <p style="color: #999; font-size: 12px;">Generated on ${dateStr}</p>
        </div>
        
        <!-- Summary Cards -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 40px;">
            <div style="background: linear-gradient(135deg, #4361ee, #3a56d4); padding: 20px; border-radius: 16px; text-align: center; color: white;">
                <div style="font-size: 32px; font-weight: bold;">${totalHabits}</div>
                <div style="font-size: 12px; opacity: 0.9;">Total Habits</div>
            </div>
            <div style="background: linear-gradient(135deg, #06d6a0, #05b888); padding: 20px; border-radius: 16px; text-align: center; color: white;">
                <div style="font-size: 32px; font-weight: bold;">${totalCompletions}</div>
                <div style="font-size: 12px; opacity: 0.9;">Total Completions</div>
            </div>
            <div style="background: linear-gradient(135deg, #ffd166, #e6b800); padding: 20px; border-radius: 16px; text-align: center; color: #333;">
                <div style="font-size: 32px; font-weight: bold;">${bestStreak}</div>
                <div style="font-size: 12px; opacity: 0.9;">Best Streak</div>
            </div>
            <div style="background: linear-gradient(135deg, #ef476f, #d43f64); padding: 20px; border-radius: 16px; text-align: center; color: white;">
                <div style="font-size: 32px; font-weight: bold;">${successRate}%</div>
                <div style="font-size: 12px; opacity: 0.9;">Success Rate</div>
            </div>
        </div>
        
        <!-- Monthly Summary -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 16px; margin-bottom: 30px;">
            <h2 style="color: #4361ee; margin-top: 0; margin-bottom: 15px; font-size: 18px;">📅 This Month's Progress</h2>
            <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
                <div style="flex: 1; text-align: center;">
                    <div style="font-size: 36px; font-weight: bold; color: #4361ee;">${monthCompletions}</div>
                    <div style="color: #666;">Habits Completed</div>
                </div>
                <div style="flex: 1; text-align: center;">
                    <div style="font-size: 36px; font-weight: bold; color: #06d6a0;">${monthRate}%</div>
                    <div style="color: #666;">Completion Rate</div>
                </div>
                <div style="flex: 2;">
                    <div style="background: #e8e8e8; border-radius: 12px; height: 30px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, #4361ee, #06d6a0); width: ${monthRate}%; height: 100%; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: 600;">${monthRate}%</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Habit Breakdown -->
        <div style="margin-bottom: 30px;">
            <h2 style="color: #4361ee; margin-bottom: 15px; font-size: 18px;">🎯 Habit Performance</h2>
            ${habitsBreakdown}
        </div>
        
        <!-- Best Day Analysis -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 16px; margin-bottom: 30px;">
            <h2 style="color: #4361ee; margin-top: 0; margin-bottom: 15px; font-size: 18px;">📊 Best Performing Days</h2>
            ${dayAnalysis}
        </div>
        
        <!-- Recent Activity -->
        <div style="margin-bottom: 30px;">
            <h2 style="color: #4361ee; margin-bottom: 15px; font-size: 18px;">📋 Recent Activity (Last 14 Days)</h2>
            ${recentActivity}
        </div>
        
        <!-- Insights -->
        <div style="background: linear-gradient(135deg, #e8f4f8, #f0f7f4); padding: 20px; border-radius: 16px; margin-bottom: 20px;">
            <h2 style="color: #4361ee; margin-top: 0; margin-bottom: 15px; font-size: 18px;">💡 Insights & Recommendations</h2>
            <ul style="margin: 0; padding-left: 20px;">
                ${getInsights()}
            </ul>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 10px;">
            Generated by Habit Tracker Pro — Build better habits, one day at a time
        </div>
    `;
    
    document.body.appendChild(pdfContent);
    
    try {
        const { jsPDF } = window.jspdf;
        
        const canvas = await html2canvas(pdfContent, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`habit-tracker-report-${getTodayDate()}.pdf`);
        
        showNotification('✅ PDF report generated successfully!', 'success');
    } catch (error) {
        console.error('PDF generation error:', error);
        showNotification('❌ Failed to generate PDF', 'error');
    } finally {
        pdfContent.remove();
    }
}

// Helper function to generate insights
function getInsights() {
    const insights = [];
    const totalCompletions = allEntries.filter(e => e.completed === 1).length;
    const bestStreak = calculateBestStreak();
    
    if (bestStreak >= 7) {
        insights.push('<li>🔥 Amazing! You\'ve maintained a streak of <strong>' + bestStreak + ' days</strong>. Keep up the momentum!</li>');
    } else if (bestStreak > 0) {
        insights.push('<li>🌟 You\'re building consistency with a <strong>' + bestStreak + ' day streak</strong>. Try to extend it further!</li>');
    } else {
        insights.push('<li>💪 Start small — even one habit completed today is a victory!</li>');
    }
    
    if (totalCompletions > 50) {
        insights.push('<li>🏆 Incredible progress! You\'ve completed <strong>' + totalCompletions + ' habits</strong> in total. You\'re crushing it!</li>');
    } else if (totalCompletions > 20) {
        insights.push('<li>📈 Great job! You\'ve completed <strong>' + totalCompletions + ' habits</strong>. Every step counts!</li>');
    }
    
    // Find best habit
    let bestHabit = null;
    let bestRate = 0;
    allHabits.forEach(habit => {
        const entries = allEntries.filter(e => e.habit_id === habit.id);
        const completed = entries.filter(e => e.completed === 1).length;
        const rate = entries.length > 0 ? (completed / entries.length) * 100 : 0;
        if (rate > bestRate && entries.length > 0) {
            bestRate = rate;
            bestHabit = habit;
        }
    });
    
    if (bestHabit) {
        insights.push('<li>🎯 Your strongest habit is <strong>"' + bestHabit.name + '"</strong> with ' + Math.round(bestRate) + '% consistency!</li>');
    }
    
    if (insights.length === 0) {
        insights.push('<li>✨ Start tracking your habits to see personalized insights here!</li>');
    }
    
    return insights.join('');
}// ========== NOTIFICATIONS ==========
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed; bottom: 20px; right: 20px;
        background: ${type === 'success' ? '#06d6a0' : '#ef476f'};
        color: white; padding: 12px 24px; border-radius: 12px;
        font-weight: 600; z-index: 10000;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
`;
document.head.appendChild(style);

// ========== CALENDAR ==========
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthDisplay = document.getElementById('currentMonth');
    if (monthDisplay) monthDisplay.textContent = `${currentDate.toLocaleString('default', { month: 'long' })} ${year}`;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;
    calendarGrid.innerHTML = '';
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => { calendarGrid.innerHTML += `<div class="calendar-day" style="font-weight: bold; color: var(--accent);">${day}</div>`; });
    for (let i = 0; i < startDay; i++) calendarGrid.innerHTML += '<div class="calendar-day empty"></div>';
    for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEntries = allEntries.filter(e => e.date === dateStr);
        const completedCount = dayEntries.filter(e => e.completed === 1).length;
        const totalHabitsCount = allHabits.length;
        let statusClass = '';
        let statusText = '';
        if (totalHabitsCount > 0) {
            if (completedCount === totalHabitsCount) { statusClass = 'completed'; statusText = '✓'; }
            else if (completedCount > 0) { statusClass = 'partial'; statusText = `${completedCount}/${totalHabitsCount}`; }
        }
        calendarGrid.innerHTML += `<div class="calendar-day ${statusClass}" onclick="viewDayDetails('${dateStr}')"><div style="font-weight: 500;">${day}</div>${statusText ? `<small style="font-size: 10px;">${statusText}</small>` : ''}</div>`;
    }
}

function changeMonth(delta) { currentDate.setMonth(currentDate.getMonth() + delta); renderCalendar(); }
function getTodayDate() { return new Date().toISOString().split('T')[0]; }

// ========== THEME ==========
function setupTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') { document.body.classList.add('dark'); document.getElementById('themeToggle').textContent = '☀️'; }
}

function toggleTheme() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.getElementById('themeToggle').textContent = isDark ? '☀️' : '🌙';
    if (typeof updateChartTheme !== 'undefined') updateChartTheme();
}

// ========== EXPORT ==========
function exportData() {
    const data = { habits: allHabits, entries: allEntries, exportDate: new Date().toISOString(), version: '1.0' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habit-tracker-backup-${getTodayDate()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('📁 Data exported successfully!', 'success');
}

// ========== REMINDERS ==========
function setupReminderToggle() {
    const reminderToggle = document.getElementById('reminderToggle');
    if (!reminderToggle) return;
    const saved = localStorage.getItem('reminderEnabled');
    if (saved === 'true') { reminderToggle.checked = true; requestNotificationPermission(); }
    reminderToggle.addEventListener('change', (e) => {
        if (e.target.checked) { localStorage.setItem('reminderEnabled', 'true'); requestNotificationPermission(); }
        else { localStorage.setItem('reminderEnabled', 'false'); showNotification('Reminders disabled', 'success'); }
    });
}

function requestNotificationPermission() {
    if ('Notification' in window) {
        if (Notification.permission === 'granted') { showNotification('✅ Reminders enabled!', 'success'); setupDailyReminder(); }
        else if (Notification.permission !== 'denied') { Notification.requestPermission().then(permission => { if (permission === 'granted') { showNotification('✅ Reminders enabled!', 'success'); setupDailyReminder(); } }); }
    }
}

function setupDailyReminder() {
    if (window.reminderScheduled) return;
    window.reminderScheduled = true;
    const now = new Date();
    const reminderTime = new Date();
    reminderTime.setHours(20, 0, 0);
    let timeUntilReminder = reminderTime - now;
    if (timeUntilReminder < 0) timeUntilReminder += 24 * 60 * 60 * 1000;
    setTimeout(() => { sendReminder(); setInterval(sendReminder, 24 * 60 * 60 * 1000); }, timeUntilReminder);
}

function sendReminder() {
    if (localStorage.getItem('reminderEnabled') !== 'true') return;
    if (Notification.permission !== 'granted') return;
    const incompleteHabits = allHabits.filter(habit => {
        const todayEntry = allEntries.find(e => e.habit_id === habit.id && e.date === getTodayDate());
        return !todayEntry || todayEntry.completed !== 1;
    });
    if (incompleteHabits.length > 0) {
        new Notification('🌙 Habit Tracker Reminder', { body: `Don't forget: ${incompleteHabits.map(h => h.name).join(', ')}`, tag: 'habit-reminder' });
    }
}

// ========== AI COACH ==========
function addCoachMessage(message, isUser = false) {
    const coachContainer = document.getElementById('coachMessages');
    if (!coachContainer) return;
    if (coachContainer.children.length === 1 && coachContainer.children[0].innerText.includes('Hi there')) coachContainer.innerHTML = '';
    const messageDiv = document.createElement('div');
    messageDiv.className = isUser ? 'coach-message-user' : 'coach-message-bot';
    messageDiv.innerHTML = `<div>${escapeHtml(message)}</div>`;
    coachContainer.appendChild(messageDiv);
    coachContainer.scrollTop = coachContainer.scrollHeight;
}

async function askAICoach(userMessage) {
    addCoachMessage(userMessage, true);
    const coachContainer = document.getElementById('coachMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'coach-message-bot';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = '<div>🤔 Thinking...</div>';
    coachContainer.appendChild(typingDiv);
    coachContainer.scrollTop = coachContainer.scrollHeight;
    try {
        const response = await fetch('http://localhost:3000/api/coach/mindfulness', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userMessage })
        });
        const data = await response.json();
        document.getElementById('typingIndicator')?.remove();
        const advice = data.advice || data.suggestions || data.response || "💪 Keep going! Every small step counts.";
        addCoachMessage(advice);
    } catch (error) {
        document.getElementById('typingIndicator')?.remove();
        addCoachMessage("💪 Keep showing up! Small steps every day lead to big changes.");
    }
}

function setupCoach() {
    const sendBtn = document.getElementById('sendCoachBtn');
    const coachInput = document.getElementById('coachInput');
    if (!sendBtn || !coachInput) return;
    sendBtn.addEventListener('click', () => { const message = coachInput.value.trim(); if (message) { askAICoach(message); coachInput.value = ''; } });
    coachInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendBtn.click(); });
    document.querySelectorAll('.coach-quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            if (type === 'motivation') askAICoach("Give me motivation to keep building good habits!");
            else if (type === 'suggestion') askAICoach("Suggest a new, easy habit for me to start.");
            else if (type === 'explain') askAICoach("Why is it important to build consistent daily habits? Explain the science.");
            else if (type === 'recovery') askAICoach("I missed my habits for a few days. Help me restart without guilt.");
        });
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ========== GLOBAL FUNCTIONS ==========
window.toggleHabitDay = toggleHabitDay;
window.editHabit = editHabit;
window.deleteHabit = deleteHabit;
window.viewDayDetails = viewDayDetails;
window.logout = logout;