<style>
    #gateModal { display: none; position: fixed; z-index: 9999; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.85); backdrop-filter: blur(5px); }
    .gate-content { 
        background-color: #ffffff; 
        margin: 15% auto; 
        padding: 40px; 
        border: 1px solid #888; 
        width: 100%; 
        max-width: 400px; 
        border-radius: 12px; 
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        text-align: center;
        font-family: 'Roboto', sans-serif;
        position: relative;
    }
    .gate-close { position: absolute; top: 15px; right: 20px; color: #aaa; font-size: 28px; font-weight: bold; cursor: pointer; }
    .gate-close:hover { color: #000; }
    
    .gate-input {
        width: 100%; padding: 12px; margin: 10px 0; display: block; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box; font-size: 16px;
    }
    .gate-btn {
        width: 100%; background-color: #0f172a; color: white; padding: 14px 20px; margin: 20px 0 0; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 500; transition: background 0.3s;
    }
    .gate-btn:hover { background-color: #334155; }
    #gate-message { color: #ef4444; margin-bottom: 15px; font-size: 0.9em; display: none; }
</style>

<div id="gateModal">
    <div class="gate-content">
        <span class="gate-close" onclick="closeGate()">&times;</span>
        <h2 style="margin-top: 0; color: #0f172a;">Admin Access</h2>
        <p style="color: #64748b; margin-bottom: 20px;">Please verify your credentials.</p>
        
        <div id="gate-message"></div>

        <form id="gateForm" method="POST" action="index.php">
            <input type="hidden" name="action" value="login">
            <input type="text" id="gateUser" name="username" class="gate-input" placeholder="Username" required>
            <input type="password" id="gatePass" name="password" class="gate-input" placeholder="Password" required>
            <button type="submit" class="gate-btn">Unlock Dashboard</button>
        </form>
    </div>
</div>

<script>
    // This function is GLOBAL so the button can always find it
  
  
  
  
// This function is GLOBAL so the button can always find it
    function openLoginModal() {
        const modal = document.getElementById('gateModal');
        if(modal) {
            modal.style.display = 'block';
            // Auto-focus the username field
            setTimeout(() => document.getElementById('gateUser').focus(), 100);
        } else {
            alert("Error: Gate Modal not loaded.");
        }
    }




    function closeGate() {
        document.getElementById('gateModal').style.display = 'none';
    }

    // Standard Form Submission Handling
    document.addEventListener('DOMContentLoaded', function() {
        // No JS password check needed. The form posts directly to index.php
        // Close on outside click
        window.onclick = function(event) {
            const modal = document.getElementById('gateModal');
            if (event.target == modal) {
                modal.style.display = "none";
            }
        }
    });
</script>