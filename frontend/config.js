// Habit Tracker Pro - Dynamic Configuration
// Automatically detects environment (Localhost vs Production)
// Allows runtime override via localStorage.setItem('HABIT_API_URL', 'https://your-backend.onrender.com/api')

(function() {
    // 1. Check for user-defined custom override in localStorage
    let savedApiUrl = localStorage.getItem('HABIT_API_URL');

    // 2. Production Render backend default URL (Update this with your deployed Render URL)
    const PRODUCTION_API_URL = 'https://habit-tracker-backend.onrender.com/api';

    // 3. Localhost development URL
    const LOCAL_API_URL = 'http://localhost:3000/api';

    if (!savedApiUrl) {
        const isLocalhost = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1' || 
                            window.location.protocol === 'file:';
        savedApiUrl = isLocalhost ? LOCAL_API_URL : PRODUCTION_API_URL;
    }

    // Set globally on window object (without trailing slash)
    window.API_URL = savedApiUrl.replace(/\/+$/, '');
    console.log('🌐 Habit Tracker API initialized with URL:', window.API_URL);
})();
