<?php
// partials/db.php
// Connects to the database using credentials from config_secrets.php

// Go up one level to find config_secrets.php
require_once(__DIR__ . '/../config_secrets.php');

try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS);
    // Set error mode to exception for debugging
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    // In production, don't echo the detailed error to the user
    error_log("Database Connection Error: " . $e->getMessage());
    die("Database Connection Failed. Check error_log for details.");
}
?>