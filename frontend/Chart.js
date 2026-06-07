// Chart.js - Progress Visualization
let completionChart = null;

function initCharts() {
    const canvas = document.getElementById('completionChart');
    if (!canvas) {
        console.log('Chart canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Get last 7 days data
    const last7Days = getLast7DaysData();
    
    completionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days.labels,
            datasets: [{
                label: 'Habits Completed',
                data: last7Days.values,
                borderColor: '#4361ee',
                backgroundColor: 'rgba(67, 97, 238, 0.1)',
                borderWidth: 3,
                pointRadius: 5,
                pointHoverRadius: 8,
                pointBackgroundColor: '#06d6a0',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-primary') || '#1a1a2e',
                        font: { size: 12, weight: 'bold' }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const totalHabits = window.allHabits?.length || 0;
                            return `${context.raw} / ${totalHabits} habits completed`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: Math.max(5, window.allHabits?.length || 5),
                    grid: {
                        color: getComputedStyle(document.body).getPropertyValue('--border') || '#e9ecef'
                    },
                    ticks: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-secondary') || '#6c757d',
                        stepSize: 1
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-secondary') || '#6c757d'
                    }
                }
            }
        }
    });
}

function getLast7DaysData() {
    const labels = [];
    const values = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        labels.push(dayName);
        
        const dayEntries = (window.allEntries || []).filter(e => e.date === dateStr && e.completed === 1);
        values.push(dayEntries.length);
    }
    
    return { labels, values };
}

function updateChart() {
    if (completionChart && typeof window.allHabits !== 'undefined' && typeof window.allEntries !== 'undefined') {
        const last7Days = getLast7DaysData();
        completionChart.data.labels = last7Days.labels;
        completionChart.data.datasets[0].data = last7Days.values;
        completionChart.options.scales.y.max = Math.max(5, window.allHabits?.length || 5);
        completionChart.update();
    }
}

function updateChartTheme() {
    if (completionChart) {
        const textColor = getComputedStyle(document.body).getPropertyValue('--text-primary') || '#1a1a2e';
        const borderColor = getComputedStyle(document.body).getPropertyValue('--border') || '#e9ecef';
        const textSecondary = getComputedStyle(document.body).getPropertyValue('--text-secondary') || '#6c757d';
        
        completionChart.options.plugins.legend.labels.color = textColor;
        completionChart.options.scales.y.grid.color = borderColor;
        completionChart.options.scales.x.ticks.color = textSecondary;
        completionChart.options.scales.y.ticks.color = textSecondary;
        completionChart.update();
    }
}