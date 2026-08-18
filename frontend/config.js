// Habit Tracker Pro - Dynamic API Configuration
// Supports Localhost Development, Vercel Unified Deployment (/api), and Custom Override

(function() {
    // 1. Check for user-defined custom override in localStorage
    let savedApiUrl = localStorage.getItem('HABIT_API_URL');

    // 2. Localhost development URL
    const LOCAL_API_URL = 'http://localhost:3000/api';

    if (!savedApiUrl) {
        const isLocalhost = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1';
        if (isLocalhost) {
            savedApiUrl = LOCAL_API_URL;
        } else {
            // In Production on Vercel, backend API is on the same domain (/api)
            savedApiUrl = window.location.origin ? (window.location.origin + '/api') : '/api';
        }
    }

    // Set globally on window object (without trailing slash)
    window.API_URL = savedApiUrl.replace(/\/+$/, '');
    console.log('🌐 Habit Tracker API URL set to:', window.API_URL);
})();
