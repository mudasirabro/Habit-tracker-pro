// Habit Tracker Pro - Dynamic API Configuration
// Supports Localhost Development, Vercel Unified Deployment (/api), and Custom Override

(function() {
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' || 
                        window.location.protocol === 'file:';

    let savedApiUrl = localStorage.getItem('HABIT_API_URL');

    // Automatically purge old stale Render or localhost URLs from localStorage if user is on Vercel
    if (!isLocalhost && savedApiUrl && (savedApiUrl.includes('localhost') || savedApiUrl.includes('onrender.com') || savedApiUrl.includes('YOUR-RENDER'))) {
        console.log('🧹 Purging outdated API_URL from localStorage:', savedApiUrl);
        localStorage.removeItem('HABIT_API_URL');
        savedApiUrl = null;
    }

    if (!savedApiUrl) {
        if (isLocalhost) {
            savedApiUrl = 'http://localhost:3000/api';
        } else {
            // In Production on Vercel, backend API is on the same domain (/api)
            savedApiUrl = window.location.origin ? (window.location.origin + '/api') : '/api';
        }
    }

    // Set globally on window object (without trailing slash)
    window.API_URL = savedApiUrl.replace(/\/+$/, '');
    console.log('🌐 Habit Tracker API URL set to:', window.API_URL);
})();
