<script>
    // --- 1. THEME TOGGLE LOGIC ---
    function toggleTheme() {
        const body = document.body;
        const toggleButton = document.getElementById('theme-toggle');
        const currentTheme = body.getAttribute('data-theme');

        if (currentTheme === 'light') {
            body.setAttribute('data-theme', 'dark');
            toggleButton.innerHTML = '🌙 Toggle to Light Mode';
            localStorage.setItem('theme', 'dark');
        } else {
            body.setAttribute('data-theme', 'light');
            toggleButton.innerHTML = '☀️ Toggle to Dark Mode';
            localStorage.setItem('theme', 'light');
        }
    }
    
    (function applyTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.body.setAttribute('data-theme', savedTheme);
        const toggleButton = document.getElementById('theme-toggle');
        if (toggleButton) {
            if (savedTheme === 'dark') {
                toggleButton.innerHTML = '🌙 Toggle to Light Mode';
            } else {
                toggleButton.innerHTML = '☀️ Toggle to Dark Mode';
            }
        }
    })();





// --- 2. POPUP LOGIC (This was missing) ---
    function openLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'block';
        } else {
            console.error("Error: Modal HTML not found.");
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        // Handle the simple form submission
        const form = document.getElementById('simpleTestForm');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                const color = document.getElementById('favColor').value;
                alert("Success! You typed: " + color);
                document.getElementById('loginModal').style.display = 'none';
            });
        }

        // Close modal if clicking outside of it
        window.onclick = function(event) {
            const modal = document.getElementById('loginModal');
            if (event.target == modal) {
                modal.style.display = "none";
            }
        }
    });
</script>