<?php
// File: partials/api-create-user.php
session_start();
header('Content-Type: application/json');

// 1. Security Check: Only logged-in admins can create new users
if (!isset($_SESSION['user_id'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

// 2. Load Database Credentials
require_once('../config_secrets.php'); // Adjust path if config is in root

try {
    // 3. Connect to the Database
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // 4. Get Input Data
    $input = json_decode(file_get_contents('php://input'), true);
    $new_user = trim($input['username'] ?? '');
    $new_pass = trim($input['password'] ?? '');

    if (empty($new_user) || empty($new_pass)) {
        throw new Exception('Username and password are required.');
    }

    // 5. Check if user already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$new_user]);
    if ($stmt->fetch()) {
        throw new Exception('Username already exists.');
    }

    // 6. Hash the Password (Security Best Practice)
    $hashed_password = password_hash($new_pass, PASSWORD_DEFAULT);

    // 7. Insert the New Admin
    $insert = $pdo->prepare("INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, NOW())");
    $insert->execute([$new_user, $hashed_password]);

    echo json_encode(['success' => true, 'message' => "User '$new_user' created successfully."]);

} catch (PDOException $e) {
    // Database connection failed
    error_log("Database Error: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Database connection failed. Check config_secrets.php.']);
} catch (Exception $e) {
    // General error
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>