<script>
    // File: homepage_partials/scripts-base.php
    // Purpose: Handles Theme Toggling ONLY. 
    // (Login logic has been moved to index.php to prevent conflicts)

    // --- THEME TOGGLE ---
    function toggleTheme() {
        const body = document.body;
        const toggleButton = document.getElementById('theme-toggle');
        const currentTheme = body.getAttribute('data-theme');

        if (currentTheme === 'light') {
            body.setAttribute('data-theme', 'dark');
            if(toggleButton) toggleButton.innerHTML = '🌙 Toggle to Light Mode';
            localStorage.setItem('theme', 'dark');
        } else {
            body.setAttribute('data-theme', 'light');
            if(toggleButton) toggleButton.innerHTML = '☀️ Toggle to Dark Mode';
            localStorage.setItem('theme', 'light');
        }
    }
    
    // Apply saved theme on load
    (function applyTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.body.setAttribute('data-theme', savedTheme);
        const toggleButton = document.getElementById('theme-toggle');
        if (toggleButton) {
            toggleButton.innerHTML = savedTheme === 'dark' ? '🌙 Toggle to Light Mode' : '☀️ Toggle to Dark Mode';
        }
    })();
</script>