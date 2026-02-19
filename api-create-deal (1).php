<?php
// File: partials/api-create-deal.php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

require_once('../config_secrets.php');

try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    $file_paths = [];
    if (!empty($_FILES['deal_files']['name'][0])) {
        foreach ($_FILES['deal_files']['name'] as $name) {
            $file_paths[] = $name; 
        }
    }

    $stmt = $pdo->prepare("INSERT INTO horizon_deals (
        deal_name, deal_type, carrier, seller_notes, asking_price,
        fa_revenue, fa_sde, fa_staff, fa_state,
        bk_premium, bk_loss_ratio, bk_pif,
        file_paths
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    $stmt->execute([
        $_POST['deal_name'] ?? 'Untitled',
        $_POST['deal_type'] ?? '',
        $_POST['bk_carrier'] ?? null,
        $_POST['seller_notes'] ?? '',
        $_POST['asking_price'] ?? '',
        !empty($_POST['fa_revenue']) ? $_POST['fa_revenue'] : null,
        !empty($_POST['fa_sde']) ? $_POST['fa_sde'] : null,
        !empty($_POST['fa_staff']) ? $_POST['fa_staff'] : null,
        $_POST['fa_state'] ?? null,
        !empty($_POST['bk_premium']) ? $_POST['bk_premium'] : null,
        !empty($_POST['bk_loss_ratio']) ? $_POST['bk_loss_ratio'] : null,
        !empty($_POST['bk_pif']) ? $_POST['bk_pif'] : null,
        json_encode($file_paths)
    ]);

    echo json_encode(['success' => true, 'message' => 'Deal saved successfully!']);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>