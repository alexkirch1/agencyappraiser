<div id="loginModal" class="modal">
    <div class="modal-content" style="margin-top: 15vh; max-width: 350px;">
        <span onclick="document.getElementById('loginModal').style.display='none'" class="close-btn">&times;</span>
        <h3 style="color: var(--color-primary-brand); border-bottom: none; text-align: center; margin-top: 0;">Access Restricted Area</h3>
     
        <form id="adminLoginForm">
            <div id="login-status-message" style="display:none; margin-bottom: 15px;" class="upload-error"></div>
            
            <label for="adminUsername">Username:</label>
            <input type="text" id="adminUsername" name="adminUsername" placeholder="Enter Username" required>
            
            <label for="adminPassword">Password:</label>
            <input type="password" id="adminPassword" name="adminPassword" placeholder="Enter Password" required style="margin-bottom: 20px;">
            
            <button type="submit" id="adminLoginBtn" style="background-color: var(--color-primary-brand); color: white; padding: 10px 15px; border: none; border-radius: 5px; cursor: pointer; width: 100%;">Log In</button>
        </form>
    </div>
</div>