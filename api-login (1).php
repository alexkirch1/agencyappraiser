<?php
// File: partials/api-login.php

// 1. Start the session
session_start();

// 2. Set headers for JSON response
header('Content-Type: application/json');

try {
    // 3. Get the incoming JSON data
    $input = json_decode(file_get_contents('php://input'), true);
    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';

    // 4. Verify Credentials
    // (Matching your hardcoded logic: admin / secretpassword123)
    if ($username === 'admin' && $password === 'secretpassword123') {
        
        // 5. Create the Session Variables
        $_SESSION['user_id'] = 1;
        $_SESSION['username'] = $username;
        $_SESSION['role'] = 'admin';
        
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Invalid username or password.']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error occurred.']);
}
?>