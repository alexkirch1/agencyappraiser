<?php
// 1. START SESSION IMMEDIATELY
if (session_status() === PHP_SESSION_NONE) { session_start(); }

/**
 * AGENCY INTELLIGENCE DASHBOARD (v30.46 - UNIVERSAL PARSER)
 * =================================================================
 * - FIX: Aggressive PDF Parsing (Fixed "Year" vs "Policy" confusion)
 * - FIX: Multi-token Policy Support (Handles spaces in policy #s)
 * - FIX: Reconciliation Logic (Matches PDF <> CSV bidirectionally)
 * - INCLUDES: Slider Save Persistence & Full Deal Logic
 */

ini_set('memory_limit', '512M'); 
ini_set('post_max_size', '64M');
ini_set('upload_max_filesize', '64M');
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE);

// --- LOAD DATABASE CONFIGURATION ---
$config_paths = [
    __DIR__ . '/config_secrets.php',
    __DIR__ . '/../config_secrets.php',
    $_SERVER['DOCUMENT_ROOT'] . '/config_secrets.php'
];

$db_connected = false;
foreach ($config_paths as $path) {
    if (file_exists($path)) { require_once($path); $db_connected = true; break; }
}

if (!defined('ADMIN_USER')) define('ADMIN_USER', 'admin');
if (!defined('ADMIN_PASS')) define('ADMIN_PASS', 'admin');
if ($db_connected && !defined('DB_NAME')) { $db_connected = false; }
if (!defined('DB_HOST') && $db_connected) { $db_connected = false; }

// --- SQL MIGRATION CHECK ---
if ($db_connected) {
    try {
        $pdo = new PDO("mysql:host=".DB_HOST.";dbname=".DB_NAME.";charset=utf8mb4", DB_USER, DB_PASS);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $colCheck = $pdo->query("SHOW COLUMNS FROM valuations LIKE 'status'");
        if ($colCheck->rowCount() == 0) {
            $pdo->query("ALTER TABLE valuations ADD COLUMN status VARCHAR(20) DEFAULT 'active'");
        }

        // Ensure LONGTEXT for large data
        $colDetails = $pdo->query("SHOW COLUMNS FROM valuations LIKE 'details'");
        $row = $colDetails->fetch(PDO::FETCH_ASSOC);
        if ($row && stripos($row['Type'], 'longtext') === false) {
            $pdo->query("ALTER TABLE valuations MODIFY details LONGTEXT");
        }

    } catch (PDOException $e) { /* Ignore */ }
}

// 2. LOGOUT
if (isset($_GET['logout'])) {
    session_destroy();
    header("Location: " . $_SERVER['PHP_SELF']);
    exit;
}

// 3. LOGIN HANDLER
$login_error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'login') {
    $u = trim($_POST['username'] ?? '');
    $p = trim($_POST['password'] ?? '');
    if ($u === ADMIN_USER && $p === ADMIN_PASS) {
        $_SESSION['is_logged_in'] = true;
        header("Location: " . $_SERVER['PHP_SELF']);
        exit;
    } else {
        $login_error = "Invalid credentials.";
    }
}

// 4. AUTH CHECK
$is_logged_in = (isset($_SESSION['is_logged_in']) && $_SESSION['is_logged_in'] === true);

// 5. DB HELPER
function getDB() {
    if (!defined('DB_HOST')) return null;
    try {
        return new PDO("mysql:host=".DB_HOST.";dbname=".DB_NAME.";charset=utf8mb4", DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
    } catch (PDOException $e) { return null; }
}

// 6. API HANDLERS
if ($is_logged_in && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, true);

    // --- SAVE DEAL (UPDATE OR INSERT) ---
    if ($input && !isset($_POST['action'])) {
        $pdo = getDB();
        if ($pdo) {
            try {
                $status = 'active';
                if(isset($input['full_state']['status'])) $status = $input['full_state']['status'];

                $detailsJson = json_encode($input['full_state']);
                if ($detailsJson === false) {
                    echo json_encode(['status' => 'error', 'message' => 'JSON Error: ' . json_last_error_msg()]);
                    exit;
                }

                $dealId = isset($input['id']) ? (int)$input['id'] : null;

                if ($dealId) {
                    // --- UPDATE EXISTING DEAL ---
                    $stmt = $pdo->prepare("UPDATE valuations SET deal_name = :name, deal_type = :type, valuation = :val, premium_base = :prem, details = :details, status = :status, date_saved = NOW() WHERE id = :id");
                    $stmt->execute([
                        ':name' => strip_tags($input['deal_name']),
                        ':type' => strip_tags($input['deal_type']),
                        ':val'  => (float)$input['valuation'],
                        ':prem' => (float)$input['premium_base'],
                        ':details' => $detailsJson,
                        ':status' => $status,
                        ':id' => $dealId
                    ]);
                    echo json_encode(['status' => 'success', 'mode' => 'updated']);
                } else {
                    // --- INSERT NEW DEAL ---
                    $stmt = $pdo->prepare("INSERT INTO valuations (deal_uuid, deal_name, deal_type, valuation, premium_base, source, details, status, date_saved) VALUES (:uuid, :name, :type, :val, :prem, 'admin', :details, :status, NOW())");
                    $stmt->execute([
                        ':uuid' => uniqid('dl_', true),
                        ':name' => strip_tags($input['deal_name']),
                        ':type' => strip_tags($input['deal_type']),
                        ':val'  => (float)$input['valuation'],
                        ':prem' => (float)$input['premium_base'],
                        ':details' => $detailsJson,
                        ':status' => $status
                    ]);
                    echo json_encode(['status' => 'success', 'mode' => 'inserted']);
                }
            } catch (PDOException $e) { 
                echo json_encode(['status' => 'error', 'message' => 'DB Error: ' . $e->getMessage()]); 
            }
        } else {
            echo json_encode(['status' => 'error', 'message' => 'No DB Connection']);
        }
        exit;
    }

    // --- LOAD DEAL ---
    if (isset($_POST['action']) && $_POST['action'] === 'load_deal') {
        $pdo = getDB();
        if($pdo) {
            $stmt = $pdo->prepare("SELECT details, status FROM valuations WHERE id = ?");
            $stmt->execute([$_POST['id']]);
            $row = $stmt->fetch();
            $data = json_decode($row['details'] ?? '{}', true);
            echo json_encode(['status' => 'success', 'data' => $data, 'db_status' => $row['status']]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'No DB']);
        }
        exit;
    }

    // --- TOGGLE STATUS ---
    if (isset($_POST['action']) && $_POST['action'] === 'toggle_status') {
        $pdo = getDB();
        if($pdo) {
            $stmt = $pdo->prepare("UPDATE valuations SET status = ? WHERE id = ?");
            $stmt->execute([$_POST['status'], $_POST['id']]);
            echo json_encode(['status' => 'success']);
        }
        exit;
    }

    // --- DELETE DEAL ---
    if (isset($_POST['action']) && $_POST['action'] === 'delete_deal') {
        $pdo = getDB();
        if($pdo) {
            $stmt = $pdo->prepare("DELETE FROM valuations WHERE id = ?");
            $stmt->execute([$_POST['id']]);
            echo json_encode(['status' => 'success']);
        }
        exit;
    }

    // --- CLEAR DB ---
    if (isset($_POST['action']) && $_POST['action'] === 'clear_db') {
        $pdo = getDB();
        if($pdo) {
            $pdo->query("TRUNCATE TABLE valuations");
            echo json_encode(['status' => 'success']);
        }
        exit;
    }
}

// 7. FETCH LIST
$saved_deals = [];
$stats = ['admin'=>0, 'total_val'=>0];

if ($db_connected && $is_logged_in) {
    $pdo = getDB();
    if ($pdo) {
        try {
            $stmt = $pdo->query("SELECT id, deal_name, deal_type, valuation, premium_base, source, status, date_saved FROM valuations ORDER BY date_saved DESC LIMIT 100");
            $saved_deals = $stmt->fetchAll();
            foreach($saved_deals as $d) {
                if(($d['status'] ?? 'active') === 'active') {
                    $stats['total_val'] += (float)$d['valuation'];
                }
            }
        } catch (PDOException $e) {}
    }
}
$horizon_count = count($saved_deals);
?>

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Agency Dashboard v30.46</title>
<script src="https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
<script>if (typeof pdfjsLib !== 'undefined') pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';</script>

<style>
    /* --- UNIFIED THEME VARIABLES --- */
    :root {
        --color-background: #f4f6f9;
        --color-surface: #ffffff;
        --color-text-primary: #1e293b;
        --color-text-secondary: #64748b;
        --color-accent: #0f172a; 
        --color-primary-brand: #0f172a; 
        --color-border: #e2e8f0;
        --color-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        --color-risk-low: #22c55e;
        --color-risk-high: #ef4444;
        --color-panel-bg: #f8fafc;
        
        --primary: var(--color-text-primary);
        --bg: var(--color-background);
        --surface: var(--color-surface);
        --border: var(--color-border);

        /* Strategy UI Specific */
        --strat-bg-dark: #1e293b;
        --strat-card-bg: #334155;
        --strat-accent-green: #22c55e;
        --strat-accent-orange: #f59e0b;
        --strat-accent-purple: #a855f7;
    }

    body[data-theme='dark'] {
        --color-background: #1e293b;
        --color-surface: #334155;
        --color-text-primary: #f8fafc;
        --color-text-secondary: #94a3b8;
        --color-accent: #38bdf8; 
        --color-primary-brand: #38bdf8; 
        --color-border: #475569;
        --color-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        --color-panel-bg: #2d3748; 

        --primary: var(--color-text-primary);
        --bg: var(--color-background);
        --surface: var(--color-surface);
        --border: var(--color-border);
    }

    body { background-color: var(--bg); color: var(--primary); font-family: 'Roboto', sans-serif; margin: 0; overflow-x: hidden; transition: 0.3s; }
    * { box-sizing: border-box; }

    /* Login */
    .login-wrapper { display: flex; height: 100vh; justify-content: center; align-items: center; }
    .login-box { background: var(--surface); padding: 40px; border-radius: 12px; border: 1px solid var(--border); box-shadow: var(--color-shadow); width: 100%; max-width: 400px; }
    .login-input { width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--primary); }
    .login-btn { width: 100%; padding: 12px; background: var(--color-primary-brand); color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; }

    /* Layout */
    .page-wrapper { padding: 40px 20px; display: flex; justify-content: center; width: 100%; }
    .container { width: 100%; max-width: 1200px; }
    #header-controls { display: flex; justify-content: space-between; margin-bottom: 30px; align-items: center; }
    
    .admin-tabs { display: flex; gap: 20px; border-bottom: 2px solid var(--border); margin-bottom: 30px; }
    .admin-tab { padding: 12px 0; cursor: pointer; font-weight: 600; color: var(--color-text-secondary); border-bottom: 2px solid transparent; }
    .admin-tab.active { color: var(--color-primary-brand); border-bottom-color: var(--color-primary-brand); }
    .admin-tab-content { display: none; }
    .admin-tab-content.active { display: block; }
    
    .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 30px; }
    .stat-card { background: var(--surface); padding: 25px; border-radius: 12px; border: 1px solid var(--border); box-shadow: var(--color-shadow); }
    .stat-value { font-size: 2.5em; font-weight: 800; color: var(--primary); }
    .stat-label { color: var(--color-text-secondary); text-transform:uppercase; font-size:0.8em; font-weight:bold; letter-spacing:0.5px; }

    .horizon-form-container { background: var(--surface); border-radius: 16px; padding: 40px; border: 1px solid var(--border); box-shadow: var(--color-shadow); }
    .form-section { margin-bottom: 50px; padding-bottom: 40px; border-bottom: 1px solid var(--border); }
    .section-title { font-size: 1.2em; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; color: var(--primary); }
    .step-badge { background: var(--color-primary-brand); color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 0.9em; }

    /* Upload */
    .file-drop-zone { display: block; border: 2px dashed var(--border); padding: 30px; text-align: center; background: var(--color-panel-bg); border-radius: 12px; cursor: pointer; transition: all 0.2s; margin-bottom: 15px; position: relative; color: var(--primary); }
    .file-drop-zone:hover { border-color: var(--color-primary-brand); opacity:0.9; }
    .file-drop-zone.success { border-color: var(--color-risk-low); background: rgba(34, 197, 94, 0.05); }

    /* Tables */
    .table-wrapper { width: 100%; max-height: 500px; overflow: auto; border: 1px solid var(--border); border-radius: 8px; margin-top: 20px; background: var(--surface); position: relative; }
    .data-table { width: 100%; min-width: 900px; border-collapse: collapse; font-size: 0.85em; } /* Smaller font for dense data */
    .data-table th { background: var(--color-panel-bg); padding: 10px; text-align: left; position: sticky; top: 0; z-index: 10; border-bottom: 2px solid var(--border); font-weight: 600; color: var(--color-text-secondary); cursor: pointer; user-select: none; white-space: nowrap; }
    .data-table td { padding: 8px 10px; border-bottom: 1px solid var(--border); color: var(--primary); vertical-align: middle; white-space: nowrap; }
    .data-table tr:hover td { background: var(--color-panel-bg); }
    .data-table tr.row-excluded td { opacity: 0.3; text-decoration: line-through; background: rgba(239, 68, 68, 0.1); color: var(--color-text-secondary); }
    .data-table tr.search-hidden { display: none; }
    
    .data-table tbody tr:nth-child(even) { background-color: rgba(0,0,0,0.02); }
    body[data-theme='dark'] .data-table tbody tr:nth-child(even) { background-color: rgba(255,255,255,0.03); }

    /* Popups */
    #global-carrier-popup { display: none; position: absolute; width: 320px; background: var(--surface); border: 1px solid var(--border); box-shadow: var(--color-shadow); border-radius: 8px; z-index: 9999; padding: 10px; }
    .popup-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 8px; margin-bottom: 8px; font-weight: 700; color: var(--primary); }
    .popup-close { cursor: pointer; color: var(--color-text-secondary); font-size:1.2em; }
    .multi-select-container { max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 5px; }
    .multi-select-item { font-size: 0.85em; display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: 4px; cursor: pointer; color: var(--primary); }
    .multi-select-item:hover { background: var(--color-panel-bg); }

    #policy-upload-stats { display:none; margin-bottom:20px; padding:20px; background:var(--color-panel-bg); border:1px solid var(--border); border-radius:10px; }
    .mini-stat-flex { display:flex; gap:20px; justify-content:space-around; text-align:center; }
    .mini-stat-box small { display:block; color:var(--color-text-secondary); font-weight:700; font-size:0.75em; text-transform:uppercase; margin-bottom:5px; }
    .mini-stat-box div { font-size:1.8em; font-weight:800; color:var(--color-primary-brand); }

    .global-search-container { margin-bottom: 15px; display: flex; gap: 10px; }
    #global-policy-search { width: 100%; padding: 12px 15px; border: 2px solid var(--border); border-radius: 8px; font-size: 1em; background:var(--bg); color:var(--primary); }

    /* Consolidated Report */
    #consolidated-view { display: none; margin-top: 50px; padding-top: 40px; border-top: 2px dashed var(--border); }
    #valuation-section { margin-top: 30px; padding: 30px; background: rgba(34, 197, 94, 0.05); border: 1px solid var(--color-risk-low); border-radius: 12px; }
    .val-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 15px; text-align: center; margin-bottom: 20px; border-bottom: 1px dashed var(--border); padding-bottom: 20px; }
    .val-box span { display: block; font-size: 0.7em; font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 5px; }
    .val-box strong { display: block; font-size: 1.3em; font-weight: 700; color: var(--color-risk-low); }
    
    .ai-insight-box { background: var(--surface); padding: 20px; border-radius: 8px; border: 1px solid var(--color-risk-low); margin-bottom: 25px; display: block; }
    .insight-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9em; }
    .insight-row.total { border-top: 2px solid var(--border); padding-top: 10px; margin-top: 10px; font-weight: 700; font-size: 1.1em; color: var(--color-primary-brand); }
    
    .factors-container { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px; border: 1px solid var(--border); }
    .factor-item label { font-size: 0.8em; font-weight: 700; color: var(--color-text-secondary); }
    .factor-item select { margin-top: 5px; font-size: 0.9em; padding: 8px; width: 100%; background:var(--bg); color:var(--primary); border:1px solid var(--border); }

    .carrier-checklist-container { max-height: 150px; overflow-y: auto; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 10px; margin-bottom: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
    .carrier-check-item { display: flex; align-items: center; font-size: 0.8em; color: var(--primary); }
    
    .final-value-display { text-align: center; margin-top: 25px; padding-top: 20px; border-top: 2px solid var(--color-risk-low); }
    .final-value-display small { font-weight: 600; color: var(--color-risk-low); text-transform: uppercase; letter-spacing: 1px; }
    .final-value-display div { font-size: 3em; font-weight: 800; color: var(--color-risk-low); margin-top: 5px; }

    #comm-status-log { margin-top: 15px; font-size: 0.85em; max-height: 150px; overflow-y: auto; background: #1e293b; color: #fff; padding: 15px; border-radius: 8px; display: block; font-family: monospace; border:2px solid var(--border); }
    .progress-container { height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; margin-top: 15px; display: none; }
    .progress-bar { height: 100%; background: var(--color-primary-brand); width: 0%; transition: width 0.3s ease; }

    .scope-radio-group { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .scope-radio-label { display: flex; flex-direction: column; align-items: center; padding: 30px; border: 2px solid var(--border); border-radius: 12px; cursor: pointer; background: var(--color-panel-bg); transition: all 0.2s; color: var(--primary); }
    .scope-radio-label.selected { border-color: var(--color-primary-brand); background: rgba(15, 23, 42, 0.05); box-shadow: 0 0 0 2px var(--color-primary-brand); }
    
    /* Buttons */
    .btn-primary { background: var(--color-primary-brand); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.3s; }
    .btn-primary:hover { opacity: 0.9; }
    .btn-secondary { background: transparent; color: var(--primary); border: 1px solid var(--border); padding: 8px 16px; border-radius: 6px; font-weight: 700; cursor: pointer; transition:0.2s; }
    .btn-secondary:hover { background: var(--color-panel-bg); border-color: var(--color-text-secondary); }
    
    /* Status Badges */
    .status-badge-btn { padding: 5px 12px; border-radius: 20px; font-size: 0.7em; font-weight: bold; cursor: pointer; border: 1px solid transparent; text-transform: uppercase; margin-right: 8px; transition:0.2s; }
    .status-active { background: #e2e8f0; color: #475569; }
    .status-completed { background: #dcfce7; color: #166534; border-color: #22c55e; }
    .status-declined { background: #fee2e2; color: #991b1b; border-color: #ef4444; }
    .status-inactive { background: #ffedd5; color: #9a3412; border-color: #f97316; }

    #rest-of-form { display: none; } 
    
    #monthly-breakdown-container { margin-top:30px; background:var(--surface); padding:20px; border-radius:12px; border:1px solid var(--border); }
    .monthly-table { width:100%; border-collapse:collapse; font-size:0.9em; }
    .monthly-table th { text-align:left; background:var(--color-panel-bg); padding:10px; border-bottom:2px solid var(--border); color:var(--color-text-secondary); }
    .monthly-table td { padding:10px; border-bottom:1px solid var(--border); color:var(--primary); }
    .stat-missing { color: var(--color-risk-high); font-weight: 700; }
    .stat-good { color: var(--color-risk-low); font-weight: 700; }
    
    #on-screen-missing-list { margin-top: 20px; max-height: 250px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; display: none; padding: 10px; }
    #missing-table { width: 100%; border-collapse: collapse; font-size: 0.85em; }
    #missing-table th { position: sticky; top: 0; background: var(--color-panel-bg); z-index: 5; text-align: left; padding: 5px; }
    #missing-table td { padding: 5px; border-bottom: 1px solid var(--border); color:var(--primary); }
    
    #files-list-container { margin-top:15px; padding:10px; background:var(--color-panel-bg); border-radius:8px; border:1px solid var(--border); max-height:150px; overflow-y:auto; display:none; }
    .file-item { display:flex; justify-content:space-between; align-items:center; padding:5px; border-bottom:1px solid var(--border); font-size:0.85em; cursor: pointer; transition: background 0.2s; color:var(--primary); }
    .file-item:hover { background: var(--border); }
    .date-badge { background:rgba(56, 189, 248, 0.1); color:var(--color-primary-brand); padding:4px 10px; border-radius:12px; font-size:0.85em; font-weight:700; border:1px solid var(--color-primary-brand); min-width:80px; text-align:center; }
    .date-badge.error { background:rgba(239, 68, 68, 0.1); color:var(--color-risk-high); border-color:var(--color-risk-high); }
    .file-warning { background:rgba(239, 68, 68, 0.1); border:1px solid var(--color-risk-high); padding:2px 6px; border-radius:4px; color:var(--color-risk-high); font-weight:bold; font-size:0.8em; margin-right:5px; display:none; }
    
    .financial-grid { display:grid; grid-template-columns: 1fr 1fr 1fr; gap:15px; margin-bottom:15px; }
    .fin-input { width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; font-size:0.95em; background:var(--bg); color:var(--primary); }
    
    /* Total Box */
    .total-structure-box { margin-top: 20px; text-align: center; padding: 15px; background: var(--color-primary-brand); color: white; border-radius: 8px; }

    #debug-log-container { display: none; margin-top: 20px; padding: 15px; background: #1e293b; color: #00ff00; font-family: monospace; max-height: 300px; overflow: auto; border-radius: 8px; }
    .log-neg { color: #ff4444; font-weight: bold; }

    .upload-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; }
    .version-badge { position: fixed; bottom: 10px; right: 10px; background: var(--color-primary-brand); color: white; padding: 5px 10px; border-radius: 20px; font-size: 0.7em; font-weight: bold; opacity: 0.8; z-index: 9999; }

    /* Loading Overlay */
    #loading-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 20000; justify-content: center; align-items: center; flex-direction: column; backdrop-filter:blur(3px); }
    .spinner { border: 4px solid #f3f3f3; border-top: 4px solid var(--color-primary-brand); border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    /* --- NEW DEAL STRATEGY STYLES (v30.43) --- */
    #deal-strategy-ui { 
        background: var(--strat-bg-dark); 
        color: #fff; 
        border-radius: 12px; 
        padding: 30px; 
        margin-top: 30px; 
        font-family: 'Roboto', sans-serif;
    }
    
    .strategy-warning {
        background: rgba(245, 158, 11, 0.15);
        border-left: 4px solid var(--strat-accent-orange);
        padding: 15px;
        border-radius: 4px;
        margin-bottom: 25px;
        font-size: 0.9em;
        color: #fcd34d;
    }

    /* Strategy Cards */
    .strategy-cards-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 15px;
        margin-bottom: 30px;
    }
    .strategy-card {
        background: var(--strat-card-bg);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.2s;
        position: relative;
        overflow: hidden;
    }
    .strategy-card:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
    
    .strategy-card.active-quick { border-color: var(--strat-accent-green); box-shadow: 0 0 0 1px var(--strat-accent-green); }
    .strategy-card.active-balanced { border-color: var(--strat-accent-orange); box-shadow: 0 0 0 1px var(--strat-accent-orange); }
    .strategy-card.active-growth { border-color: var(--strat-accent-purple); box-shadow: 0 0 0 1px var(--strat-accent-purple); }

    .card-icon { font-size: 1.2em; margin-bottom: 10px; display: block; }
    .card-title { font-weight: 700; margin-bottom: 5px; font-size: 1.1em; }
    .card-desc { font-size: 0.85em; color: #cbd5e1; line-height: 1.4; }

    /* Gross Valuation Display */
    .gross-val-display {
        background: rgba(0,0,0,0.2);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        text-align: center;
        padding: 25px;
        margin-bottom: 30px;
    }
    .gross-val-label { font-size: 0.8em; letter-spacing: 1px; text-transform: uppercase; color: #94a3b8; margin-bottom: 5px; }
    .gross-val-number { font-size: 2.8em; font-weight: 800; color: #38bdf8; text-shadow: 0 2px 10px rgba(56, 189, 248, 0.3); }

    /* Visualization Buttons */
    .viz-btn-group { display: flex; gap: 10px; margin-bottom: 25px; }
    .viz-btn {
        flex: 1;
        padding: 12px;
        background: var(--strat-card-bg);
        border: 1px solid rgba(255,255,255,0.1);
        color: #fff;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        transition: 0.2s;
        text-align: center;
    }
    .viz-btn:hover { background: rgba(255,255,255,0.1); }
    .viz-btn.active-quick { background: var(--strat-accent-green); border-color: var(--strat-accent-green); color: #000; }
    .viz-btn.active-balanced { background: var(--strat-accent-orange); border-color: var(--strat-accent-orange); color: #000; }
    .viz-btn.active-growth { background: var(--strat-accent-purple); border-color: var(--strat-accent-purple); color: #fff; }

    /* Fine Tune Box */
    .fine-tune-box {
        background: rgba(59, 130, 246, 0.1);
        border-left: 4px solid #3b82f6;
        padding: 15px;
        margin-bottom: 20px;
        font-size: 0.9em;
        color: #bfdbfe;
    }
    
    /* Custom Range Slider */
    .slider-row { margin-bottom: 20px; }
    .slider-header { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9em; font-weight: 600; }
    .custom-range {
        -webkit-appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 5px;
        outline: none;
        transition: 0.2s;
    }
    .custom-range::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        cursor: pointer;
        border: 2px solid #fff;
    }
    
    /* Specific Slider Colors */
    .range-cash { background: #334155; }
    .range-cash::-webkit-slider-thumb { background: var(--strat-accent-green); }
    
    /* Waterfall Viz */
    .scenario-viz-box {
        background: var(--strat-card-bg);
        border-radius: 8px;
        padding: 25px;
        margin-top: 25px;
        border: 1px solid rgba(255,255,255,0.05);
    }
    .viz-title { color: #38bdf8; margin-bottom: 10px; font-size: 1.1em; font-weight: 700; }
    .liquid-cash-display { font-size: 2.2em; font-weight: 800; color: var(--strat-accent-green); margin-bottom: 20px; }
    
    .waterfall-container {
        height: 35px;
        width: 100%;
        background: #1e293b;
        border-radius: 6px;
        display: flex;
        overflow: hidden;
        margin-bottom: 15px;
    }
    .wf-bar-cash { height: 100%; background: var(--strat-accent-green); transition: width 0.3s; }
    .wf-bar-earnout { height: 100%; background: var(--strat-accent-purple); transition: width 0.3s; }
    
    .wf-legend { display: flex; justify-content: space-between; font-size: 0.85em; color: #cbd5e1; padding-top: 10px; border-top: 1px dashed rgba(255,255,255,0.1); }
    .legend-item { display: flex; align-items: center; gap: 8px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; display: block; }
    
    /* Hidden Manual Inputs (still need them for form submission) */
    .manual-inputs-hidden { display: none; }
    
    /* PDF Print */
    .pdf-mode {
        background-color: white !important;
        color: black !important;
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
    }
    .pdf-mode .table-wrapper, 
    .pdf-mode #audit-table-wrapper, 
    .pdf-mode #on-screen-missing-list, 
    .pdf-mode .carrier-checklist-container,
    .pdf-mode #deal-strategy-ui {
        max-height: none !important; 
        overflow: visible !important;
        border: 1px solid #ccc !important;
        background: #1e293b !important; /* Force dark background for this specific section in PDF */
        color: white !important;
    }
    .pdf-mode button, 
    .pdf-mode .btn-secondary, 
    .pdf-mode .btn-primary, 
    .pdf-mode input[type="range"] {
        display: none !important;
    }
</style>
</head>

<body>

<div id="loading-overlay">
    <div class="spinner"></div>
    <div style="margin-top:15px; font-weight:bold; color:white;">Processing Data...</div>
</div>

<div class="version-badge">v30.46 (UNIVERSAL PARSER)</div>

<div id="global-carrier-popup">
    <div class="popup-header">
        <span>Filter Carriers</span>
        <span class="popup-close" onclick="closeCarrierFilter()">×</span>
    </div>
    <input type="text" class="popup-search-box" placeholder="Search carriers..." onkeyup="filterCarrierList(this.value)">
    <div id="carrier-multi-select" class="multi-select-container"></div>
</div>

<div id="file-detail-modal" class="modal-backdrop" onclick="closeFileModal()" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:3000; justify-content:center; align-items:center;">
    <div class="modal-content" onclick="event.stopPropagation()" style="background:var(--surface); width:95%; height:90%; overflow:hidden; padding:0; border-radius:12px; display:flex; flex-direction:column;">
        
        <div class="modal-header" style="padding:20px; border-bottom:1px solid var(--border); background:var(--color-panel-bg); display:flex; justify-content:space-between; align-items:center;">
            <div>
                <h3 id="modal-file-title" style="margin:0; color:var(--color-primary-brand);">File Details</h3>
                <small style="color:var(--color-text-secondary);">Full line-item breakdown. Scroll right for more columns if needed.</small>
            </div>
            <span class="modal-close" onclick="closeFileModal()" style="cursor:pointer; font-size:2em; line-height:0.5;">×</span>
        </div>

        <div class="modal-body" style="flex:1; overflow:auto; padding:20px;">
            <button class="btn-secondary" style="font-size:0.8em; margin-bottom:10px;" onclick="toggleRawText()">👁️ View Raw File Dump (Advanced)</button>
            <div id="modal-raw-text" class="raw-text-view" style="display:none; white-space:pre-wrap; background:#1e293b; color:#fff; padding:15px; font-family:monospace; margin-bottom:15px; border-radius:8px;"></div>
            
            <table class="data-table" id="modal-file-table">
                <thead></thead>
                <tbody></tbody>
            </table>
        </div>
    </div>
</div>

<?php if (!$is_logged_in): ?>
    <div class="login-wrapper">
        <div class="login-box">
            <h1 style="margin-top:0; color:var(--color-primary-brand); text-align:center;">🔒 Admin Login</h1>
            <?php if($login_error) echo "<div style='color:var(--color-risk-high); margin-bottom:10px; text-align:center;'>$login_error</div>"; ?>
            <form method="POST">
                <input type="hidden" name="action" value="login">
                <label style="display:block; margin-bottom:5px; font-weight:bold; color:var(--color-text-secondary);">Username</label>
                <input type="text" name="username" class="login-input" required autofocus>
                <label style="display:block; margin-bottom:5px; font-weight:bold; color:var(--color-text-secondary);">Password</label>
                <input type="password" name="password" class="login-input" required>
                <button type="submit" class="login-btn">Sign In</button>
            </form>
        </div>
    </div>
<?php else: ?>

    <div class="page-wrapper">
        <div class="container">
            <div id="header-controls">
                <h1 style="color:var(--color-primary-brand); margin:0;">🚀 Agency Dashboard</h1>
                <div style="display: flex; gap: 10px;">
                    <button id="theme-toggle" onclick="toggleTheme()" class="btn-secondary">🌙 Toggle Theme</button>
                    <a href="?logout=1"><button class="btn-secondary">Logout</button></a>
                </div>
            </div>
            
            <div class="admin-tabs">
                <div class="admin-tab active" onclick="openAdminTab('tab-stats', this)">Overview</div>
                <div class="admin-tab" onclick="openAdminTab('tab-horizon', this)">Horizon Pipeline</div>
                <div class="admin-tab" onclick="openAdminTab('tab-settings', this)">Settings</div>
            </div>

            <div id="tab-stats" class="admin-tab-content active">
                <div class="stat-grid">
                    <div class="stat-card"><span class="stat-label">Saved Valuations</span><div class="stat-value"><?php echo $horizon_count; ?></div></div>
                    <div class="stat-card"><span class="stat-label">Active Pipeline</span><div class="stat-value" style="color:var(--color-risk-low);">$<?php echo number_format($stats['total_val']); ?></div></div>
                </div>
                
                <div class="stat-card" style="padding:0; overflow:hidden;">
                    <div style="padding:20px; border-bottom:1px solid var(--border); background:var(--color-panel-bg);">
                        <h3 style="margin:0; color:var(--color-text-primary);">Saved Deal History (Recent 100)</h3>
                    </div>
                    <div style="max-height:400px; overflow-y:auto;">
                        <?php if(empty($saved_deals)): ?>
                            <div style="padding:20px; text-align:center; color:var(--color-text-secondary);">No saved valuations yet.</div>
                        <?php else: ?>
                            <?php foreach($saved_deals as $deal): ?>
                                <?php 
                                    // Status Logic for Display
                                    $status = $deal['status'] ?? 'active';
                                    $daysOld = floor((time() - strtotime($deal['date_saved'])) / 86400);
                                    
                                    // If active but old, show inactive visual
                                    $btnClass = 'status-active';
                                    $btnText = '○ ACTIVE';

                                    if($status === 'completed') {
                                        $btnClass = 'status-completed';
                                        $btnText = '✔ COMPLETED';
                                    } elseif($status === 'declined') {
                                        $btnClass = 'status-declined';
                                        $btnText = '✖ DECLINED';
                                    } elseif($status === 'active' && $daysOld > 30) {
                                        $btnClass = 'status-inactive';
                                        $btnText = '⚠ INACTIVE';
                                    }
                                ?>
                                <div class="deal-list-item" style="padding:15px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                                    <div>
                                        <div style="font-weight:700; font-size:1.1em; color:var(--color-text-primary);"><?php echo htmlspecialchars($deal['deal_name']); ?></div>
                                        <div style="font-size:0.85em; color:var(--color-text-secondary);">
                                            Saved: <?php echo date('M d, Y', strtotime($deal['date_saved'])); ?> | 
                                            Type: <span class="tag" style="font-weight:bold;"><?php echo strtoupper($deal['deal_type']); ?></span>
                                        </div>
                                    </div>
                                    <div style="text-align:right; display:flex; gap:10px; align-items:center;">
                                        <button id="status-btn-<?php echo $deal['id']; ?>" 
                                            class="status-badge-btn <?php echo $btnClass; ?>" 
                                            onclick="toggleStatus(<?php echo $deal['id']; ?>, '<?php echo $status; ?>')"
                                            data-status="<?php echo $status; ?>">
                                            <?php echo $btnText; ?>
                                        </button>

                                        <div>
                                            <div style="font-weight:800; font-size:1.2em; color:var(--color-risk-low);">$<?php echo number_format($deal['valuation']); ?></div>
                                            <div style="font-size:0.8em; color:var(--color-text-secondary);">Base: $<?php echo number_format($deal['premium_base']); ?></div>
                                        </div>
                                        <button class="btn-secondary" onclick="loadDeal(<?php echo $deal['id']; ?>)">📂 Open</button>
                                        <button class="btn-secondary" style="border-color:var(--color-risk-high); color:var(--color-risk-high);" onclick="deleteDeal(<?php echo $deal['id']; ?>)">🗑️</button>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </div>
            </div>

            <div id="tab-settings" class="admin-tab-content">
                <div class="stat-grid">
                    <div class="stat-card">
                        <span class="stat-label">System Health</span>
                        <div style="margin-top:15px; font-size:0.9em; line-height:1.6; color:var(--primary);">
                            <div><strong>Connection:</strong> <?php echo $db_connected ? '<span style="color:var(--color-risk-low);">MySQL Connected</span>' : '<span style="color:var(--color-risk-high);">File Mode (Backup)</span>'; ?></div>
                            <div><strong>PHP Version:</strong> <?php echo phpversion(); ?></div>
                            <div><strong>Max File Upload:</strong> <?php echo ini_get('upload_max_filesize'); ?></div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Database Tools</span>
                        <div style="margin-top:15px; display:flex; gap:10px; flex-wrap:wrap;">
                            <button onclick="confirmClearDB()" class="btn-secondary" style="border-color:var(--color-risk-high); color:var(--color-risk-high);">⚠️ Wipe All Table Data</button>
                        </div>
                    </div>
                </div>
            </div>

            <div id="tab-horizon" class="admin-tab-content">
                <div id="horizon-list-view">
                    <div class="stat-card" style="text-align: center; padding: 80px;">
                        <button onclick="startNewDeal()" class="btn-primary" style="font-size: 1.2em; padding: 15px 40px;">+ Start New Deal</button>
                    </div>
                </div>

                <div id="horizon-upload-view" style="display: none;">
                    <button onclick="hideHorizonForm()" class="btn-secondary" style="margin-bottom: 20px;">← Back to List</button>

                    <div class="horizon-form-container">
                        <form id="horizonDealForm" onsubmit="event.preventDefault();">
                            <div class="form-section">
                                <div class="section-title"><span class="step-badge">1</span> Deal Structure</div>
                                <div class="scope-radio-group">
                                    <label class="scope-radio-label selected" onclick="selectCard(this, 'full')">
                                        <input type="radio" id="radio-full" name="deal_type" value="full" checked onchange="toggleDealQuestions(this.value)"> 
                                        <span style="font-weight:600; margin-top:10px;">Full Agency Acquisition</span>
                                    </label>
                                    <label class="scope-radio-label" onclick="selectCard(this, 'book')">
                                        <input type="radio" id="radio-book" name="deal_type" value="book" onchange="toggleDealQuestions(this.value)"> 
                                        <span style="font-weight:600; margin-top:10px;">Book Purchase</span>
                                    </label>
                                </div>
                            </div>

                            <div id="rest-of-form">
                                <div class="form-section">
                                    <div class="section-title"><span class="step-badge">2</span> Identification</div>
                                    <input type="text" id="input-deal-name" name="deal_name" placeholder="Deal Name (e.g. Smith Agency)" style="width:100%; padding:15px; border-radius:8px; border:1px solid var(--border);" required>
                                </div>

                                <div class="form-section">
                                    <div class="section-title"><span class="step-badge">3</span> Data Analysis</div>
                                    
                                    <label class="file-drop-zone" id="zone-policy" for="policy-file-input">
                                        <p style="font-weight:600;">📄 1. Upload Master Policy List (Excel)</p>
                                        <p id="policy-file-info" style="font-size:0.8em; color:var(--color-primary-brand); margin-top:5px;"></p>
                                        <input type="file" id="policy-file-input" accept=".xlsx,.csv" style="display: none;">
                                        <div id="ai-status-policy" style="display:none; color:var(--color-primary-brand);">Analyzing headers...</div>
                                    </label>

                                    <div id="policy-upload-stats">
                                        <div class="mini-stat-flex">
                                             <div class="mini-stat-box"><small>Total Visible Policies</small><div id="p-stat-total">0</div></div>
                                             <div class="mini-stat-box"><small>Selected Count</small><div id="p-stat-selected">0</div></div>
                                             <div class="mini-stat-box"><small>Projected Premium</small><div id="p-stat-premium">$0.00</div></div>
                                        </div>
                                    </div>

                                    <div id="mapping-hidden-container" style="display: none !important;">
                                        <div style="font-size:0.9em; font-weight:700; margin-bottom:5px;">Data Mapping</div>
                                        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
                                            <div><label>Policy #</label><select id="map-pol-num" onchange="reMapColumns()"></select></div>
                                            <div><label>Carrier</label><select id="map-carrier" onchange="reMapColumns()"></select></div>
                                            <div><label>Premium</label><select id="map-premium" onchange="reMapColumns()"></select></div>
                                            <div><label>Effective Date</label><select id="map-effective" onchange="reMapColumns()"></select></div>
                                            <div><label>Expiration Date</label><select id="map-expiration" onchange="reMapColumns()"></select></div>
                                            <div><label>Client Name</label><select id="map-account"></select></div>
                                            <div><label>Transaction Type / Status</label><select id="map-type" onchange="reMapColumns()"></select></div>
                                        </div>
                                        <div style="margin-top:10px; display:flex; gap:15px;">
                                            <label><input type="checkbox" id="chk-6mo-default" checked onchange="reMapColumns()"> Force 6-Month Term Default</label>
                                            <label><input type="checkbox" id="chk-past-terms" checked onchange="reMapColumns()"> Project Past Terms (Unless New Business)</label>
                                        </div>
                                    </div>
                                    
                                    <div id="policy-selector-container" style="display:none; margin-bottom: 30px;">
                                        <div class="global-search-container">
                                            <input type="text" id="global-policy-search" placeholder="🔍 Search Policy Number or Client Name..." onkeyup="filterTableBySearch(this.value)">
                                        </div>

                                        <div class="table-wrapper" style="position:relative;">
                                            <table id="policy-table" class="data-table"><thead></thead><tbody></tbody></table>
                                        </div>
                                        <div style="text-align:right; margin-top:5px; font-size:0.8em; color:var(--color-text-secondary);">*Click 'Carrier' text to sort. Click '🔍' icon to filter.</div>
                                    </div>
                                    
                                    <div class="file-drop-zone" id="zone-comm" onclick="document.getElementById('comm-file-input').click()">
                                        <p style="font-weight:600;">💰 2. Upload Commission Statements (PDF/Excel)</p>
                                        <p style="font-size:0.8em; color:var(--color-text-secondary);">(System scans PDFs + Auto-detects Dates)</p>
                                        <p id="file-counter" style="font-weight:700; color:var(--color-primary-brand); font-size:0.9em; margin-top:5px;"></p>
                                        <input type="file" id="comm-file-input" accept=".pdf,.xlsx,.csv" multiple style="display: none;">
                                        <div style="margin-top:10px;">
                                            <button type="button" class="btn-secondary" onclick="event.stopPropagation(); clearCommData();" style="font-size:0.8em; padding:4px 8px;">Clear All Comm Data</button>
                                        </div>
                                    </div>
                                    
                                    <div id="files-list-container">
                                        <strong style="color:var(--color-text-primary); display:block; margin-bottom:5px;">Uploaded Commission Files: <small style="font-weight:400; color:var(--color-text-secondary);">(Dates auto-detected)</small></strong>
                                        <div id="files-list-items"></div>
                                    </div>

                                    <div class="file-drop-zone" id="zone-claims" onclick="document.getElementById('claims-file-input').click()" style="margin-top:15px;">
                                        <p style="font-weight:600;">⚠️ 3. Upload Claims Report (CSV)</p>
                                        <p style="font-size:0.8em; color:var(--color-text-secondary);">(Analyzes Loss Ratio & Recency)</p>
                                        <input type="file" id="claims-file-input" accept=".csv" multiple style="display: none;">
                                        <div id="claims-sum-debug" style="font-size:0.8em; font-weight:bold; color:var(--color-primary-brand); margin-top:5px; display:none;"></div>
                                    </div>

                                    <div id="comm-progress" class="progress-container"><div id="comm-bar" class="progress-bar"></div></div>
                                    <div style="margin-top:10px; font-weight:bold; color:var(--color-text-secondary);">System Log:</div>
                                    <div id="comm-status-log">Waiting for files...</div>
                                </div>
                                
                                <div class="form-section" id="section-financials" style="display:none;">
                                    <div class="section-title"><span class="step-badge">4</span> Financials & EBITDA</div>
                                    <p style="color:var(--color-text-secondary); margin-bottom:15px;">Since this is a full agency acquisition, please enter T12 financial data to calculate EBITDA. <strong>Revenue field auto-fills from verified data.</strong></p>
                                    
                                    <div class="financial-grid">
                                        <div>
                                            <label style="font-weight:600; display:block; margin-bottom:5px;">Base Revenue ($)</label>
                                            <input type="number" id="fin-revenue" class="fin-input" placeholder="0.00" onchange="calcFinancials()">
                                            <small style="color:var(--color-text-secondary);">Auto-filled from files, can edit.</small>
                                        </div>
                                        <div>
                                            <label style="font-weight:600; display:block; margin-bottom:5px;">Annual Operating Expenses</label>
                                            <input type="number" id="fin-opex" class="fin-input" placeholder="0.00" onchange="calcFinancials()">
                                            <small style="color:var(--color-text-secondary);">Rent, Staff, Tech, Marketing (Excl. Owner Pay)</small>
                                        </div>
                                        <div>
                                            <label style="font-weight:600; display:block; margin-bottom:5px;">Owner's Compensation (Add-back)</label>
                                            <input type="number" id="fin-owner-comp" class="fin-input" placeholder="0.00" onchange="calcFinancials()">
                                            <small style="color:var(--color-text-secondary);">Salary + Benefits paid to owner</small>
                                        </div>
                                        <div>
                                            <label style="font-weight:600; display:block; margin-bottom:5px;">One-Time / Non-Recurring (Add-back)</label>
                                            <input type="number" id="fin-addbacks" class="fin-input" placeholder="0.00" onchange="calcFinancials()">
                                            <small style="color:var(--color-text-secondary);">Legal fees, one-time purchases, etc.</small>
                                        </div>
                                    </div>
                                    
                                    <div style="background:rgba(34, 197, 94, 0.05); padding:15px; border-radius:8px; border:1px solid var(--color-risk-low); text-align:center;">
                                        <span style="font-size:0.9em; font-weight:700; color:var(--color-risk-low); text-transform:uppercase;">Adjusted EBITDA (T12)</span>
                                        <div id="calc-ebitda-display" style="font-size:2em; font-weight:800; color:var(--color-risk-low);">$0.00</div>
                                    </div>
                                </div>

                                <div id="consolidated-view">
                                    <div class="final-header" style="display:flex; justify-content:space-between; margin-bottom:20px;">
                                        <h3 style="margin:0;">📊 5. Consolidated Report</h3>
                                        <button type="button" class="btn-secondary" onclick="downloadValuationPDF()">⬇️ Download PDF Report</button>
                                    </div>
                                    
                                    <div id="valuation-section">
                                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                                            <h4 style="margin:0; color:var(--color-risk-low);">Valuation Summary (Hybrid Model)</h4>
                                        </div>

                                        <div style="margin-bottom:20px; padding:10px; background:var(--surface); border:1px solid var(--border); border-radius:8px;">
                                            <label style="display:flex; align-items:center; cursor:pointer;">
                                                <input type="checkbox" id="chk-include-projection" checked onchange="renderConsolidated()">
                                                <span style="margin-left:10px; font-weight:600;">Include Projected Revenue (10% for Unmatched)</span>
                                            </label>
                                            <div id="debug-excluded-count" style="margin-left:25px; font-size:0.8em; color:var(--color-risk-high); font-weight:bold;"></div>
                                        </div>

                                        <div class="val-grid">
                                            <div class="val-box"><span>Master Policies</span><strong id="stat-count">0</strong></div>
                                            <div class="val-box"><span>Matched Cash (T12)</span><strong id="stat-matched-cash">$0.00</strong></div>
                                            <div class="val-box"><span>Total Comm. (Uploaded)</span><strong id="stat-total-split" style="color: #ea580c;">$0.00</strong></div>
                                            <div class="val-box"><span>Unmatched Proj. (10%)</span><strong id="stat-unmatched-proj">$0.00</strong></div>
                                            <div class="val-box" style="border:2px solid var(--color-primary-brand); background:var(--surface); border-radius:8px;">
                                                <span>Total Base Revenue</span><strong id="stat-base-rev" style="color:var(--color-primary-brand);">$0.00</strong>
                                            </div>
                                        </div>
                                        
                                        <button type="button" class="btn-secondary" style="font-size:0.8em; width:100%; margin-bottom:10px;" onclick="toggleDebugLog()">🔍 View Raw Transaction Log (Debug)</button>
                                        <div id="debug-log-container"></div>

                                        <div style="display:none;"><strong id="stat-matched-count"></strong><strong id="stat-matched-percent"></strong></div> 

                                        <div id="monthly-breakdown-container">
                                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                                <h4 style="margin:0 0 15px 0; color:var(--color-risk-low); font-size:0.9em;">Missing Payment Audit (Last 12 Months)</h4>
                                            </div>
                                            
                                            <table class="monthly-table" id="monthly-stats-table">
                                                <thead>
                                                    <tr>
                                                        <th>Month</th>
                                                        <th>Expected (Renewal/Start)</th>
                                                        <th>Payments Received</th>
                                                        <th>Missing %</th>
                                                    </tr>
                                                </thead>
                                                <tbody></tbody>
                                            </table>
                                            <div style="width:100%; height:300px; margin-top:20px;">
                                                <canvas id="missingTrendChart"></canvas>
                                            </div>
                                            
                                            <div id="on-screen-missing-list">
                                                <h5 style="margin:5px 0 10px 0; color:var(--color-risk-high);">Items Missing Payments (Last 12mo)</h5>
                                                <table id="missing-table">
                                                    <thead><tr><th>Policy</th><th>Client</th><th>Prem</th></tr></thead>
                                                    <tbody id="missing-list-body"></tbody>
                                                </table>
                                            </div>
                                        </div>

                                        <div style="margin:15px 0; background:var(--surface); padding:15px; border-radius:8px; border:1px solid var(--border);">
                                            <h5 style="margin:0 0 5px 0; font-size:0.9em; color:var(--color-risk-low);">Appointed Carriers Checklist</h5>
                                            <small style="display:block; margin-bottom:10px; color:var(--color-text-secondary);">Uncheck any carrier you are <strong>NOT</strong> appointed with. This applies a risk penalty.</small>
                                            <div id="carrier-checklist" class="carrier-checklist-container"></div>
                                        </div>

                                        <div id="claims-stats-container" style="display:none; margin-bottom:20px; border-top:1px dashed var(--border); padding-top:20px;">
                                            <h4 style="margin:0 0 15px 0; color:var(--color-risk-low); font-size:0.9em;">Claims & Loss Analysis</h4>
                                            <div class="val-grid">
                                                <div class="val-box"><span>Total Claims (T12)</span><strong id="claim-total">0</strong></div>
                                                <div class="val-box"><span>Open Claims</span><strong id="claim-open" style="color:var(--color-risk-high);">0</strong></div>
                                                <div class="val-box" style="display:none;"><span>Recent (T12)</span><strong id="claim-recent" style="color:var(--color-risk-high);">0</strong></div>
                                                <div class="val-box"><span>Loss Ratio (T12)</span><strong id="claim-ratio">-%</strong></div>
                                            </div>
                                        </div>

                                        <div id="ai-logic-box" class="ai-insight-box">
                                            <h4 style="margin:0 0 10px 0; color:var(--color-risk-low);">Valuation Logic (AI Suggested)</h4>
                                            <div class="insight-row"><span>Base Multiple</span><strong id="logic-base-val">1.50x</strong></div>
                                            <div class="insight-row"><span>Risk Profile Adjustment</span><strong id="logic-risk">0.00x</strong></div>
                                            <div class="insight-row"><span>Unappointed Penalty</span><strong id="logic-appointment" style="color:var(--color-risk-high);">0.00x</strong></div>
                                            <div class="insight-row total"><span>Suggested Multiple</span><strong id="logic-total">1.50x</strong></div>
                                        </div>

                                        <div style="margin-top:20px;">
                                            <h4 style="margin:0 0 10px 0; color:var(--color-risk-low);">Valuation Multipliers</h4>
                                            <div class="factors-container">
                                                <div class="factor-item">
                                                    <label>Loss Ratio / Risk</label>
                                                    <select id="factor-loss" onchange="runAIMasterCalc()">
                                                        <option value="0">Standard</option>
                                                        <option value="0.1">Excellent / Improving [+0.1x]</option>
                                                        <option value="-0.4">Trend: Deteriorating [-0.4x]</option>
                                                        <option value="-0.3">High Loss Ratio [-0.3x]</option>
                                                    </select>
                                                </div>
                                                <div class="factor-item">
                                                    <label>Carrier Mix</label>
                                                    <select id="factor-carrier" onchange="runAIMasterCalc()">
                                                        <option value="0">Balanced</option>
                                                        <option value="0.1">Preferred Carriers [+0.1x]</option>
                                                        <option value="-0.1">Non-Standard [-0.1x]</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="slider-wrapper" data-html2canvas-ignore="true">
                                            <div class="slider-label" style="display:flex; justify-content:space-between;">
                                                <span id="slider-title">Revenue Multiple</span>
                                                <span id="slider-val-display" style="color:var(--color-primary-brand); font-size:1.2em;">1.5x</span>
                                            </div>
                                            <input type="range" id="valuation-slider" min="0.5" max="5.0" step="0.05" value="1.5" oninput="manualSliderUpdate()" style="width:100%;">
                                            <small style="color:var(--color-text-secondary);" id="slider-subtext">Applied to Total Base Revenue</small>
                                        </div>

                                        <div class="final-value-display">
                                            <small>Estimated Valuation</small>
                                            <div id="final-valuation-display">$0.00</div>
                                        </div>
                                        
                                        <div id="deal-strategy-ui">
                                            <div style="color:white; margin-bottom:15px; font-size:1.1em; font-weight:700;">6. Proposed Deal Terms</div>
                                            
                                            <div class="strategy-warning">
                                                <strong>⚠️ Preliminary Estimate Only</strong><br>
                                                This simulator is a learning tool. These figures are not binding offers. Final deal structure depends on due diligence.
                                            </div>

                                            <div class="gross-val-display">
                                                <div class="gross-val-label">EST. GROSS VALUATION</div>
                                                <div class="gross-val-number" id="strat-gross-val">$0.00</div>
                                            </div>

                                            <div style="margin-bottom:10px; font-weight:700; color:#94a3b8;">1. Visualize Strategy</div>
                                            <div class="strategy-cards-container">
                                                <div class="strategy-card" id="card-quick" onclick="applyStrategy('quick')">
                                                    <span class="card-icon" style="color:var(--strat-accent-green)">⚡</span>
                                                    <div class="card-title" style="color:var(--strat-accent-green)">Quick Exit (Cash)</div>
                                                    <div class="card-desc">100% cash at closing. Best for clean breaks, though total valuation may be lower to account for buyer risk.</div>
                                                </div>
                                                <div class="strategy-card" id="card-balanced" onclick="applyStrategy('balanced')">
                                                    <span class="card-icon" style="color:var(--strat-accent-orange)">⚖️</span>
                                                    <div class="card-title" style="color:var(--strat-accent-orange)">Balanced (Hybrid)</div>
                                                    <div class="card-desc">Industry Standard. 80-85% Cash + small holdback to ensure retention stays stable during transition.</div>
                                                </div>
                                                <div class="strategy-card" id="card-growth" onclick="applyStrategy('growth')">
                                                    <span class="card-icon" style="color:var(--strat-accent-purple)">📈</span>
                                                    <div class="card-title" style="color:var(--strat-accent-purple)">Growth (Earnout)</div>
                                                    <div class="card-desc">Maximize price. Less cash now (50-60%) in exchange for large potential upside if book grows.</div>
                                                </div>
                                            </div>

                                            <div class="viz-btn-group">
                                                <div class="viz-btn" id="btn-quick" onclick="applyStrategy('quick')">⚡ Quick</div>
                                                <div class="viz-btn" id="btn-balanced" onclick="applyStrategy('balanced')">⚖️ Balanced</div>
                                                <div class="viz-btn" id="btn-growth" onclick="applyStrategy('growth')">📈 Earnout</div>
                                            </div>

                                            <div style="margin-bottom:10px; font-weight:700; color:#94a3b8;">2. Fine Tune Split</div>
                                            <div class="fine-tune-box" id="fine-tune-text">
                                                Select a strategy above to see details.
                                            </div>

                                            <div class="slider-row">
                                                <div class="slider-header">
                                                    <span>Cash Up Front</span>
                                                    <span id="disp-cash-pct">0%</span>
                                                </div>
                                                <input type="range" class="custom-range range-cash" id="range-cash-pct" min="0" max="100" step="1" value="0" oninput="manualSplitUpdate()">
                                            </div>
                                            
                                            <div class="financial-grid manual-inputs-hidden">
                                                <input type="number" id="struct-cash" value="0">
                                                <input type="number" id="struct-note" value="0">
                                                <input type="number" id="struct-earnout" value="0">
                                                <input type="number" id="struct-equity" value="0">
                                            </div>

                                            <div class="scenario-viz-box">
                                                <div class="viz-title">3. Scenario Visualization</div>
                                                <div style="font-size:0.8em; color:#94a3b8; margin-bottom:5px;">EST. LIQUID CASH AT CLOSE</div>
                                                <div class="liquid-cash-display" id="viz-liquid-cash">$0.00</div>
                                                
                                                <div style="font-size:0.8em; color:#fff; margin-bottom:5px;">Payout Waterfall</div>
                                                <div class="waterfall-container">
                                                    <div class="wf-bar-cash" id="bar-cash" style="width:0%"></div>
                                                    <div class="wf-bar-earnout" id="bar-earnout" style="width:0%"></div>
                                                </div>
                                                
                                                <div class="wf-legend">
                                                    <div class="legend-item"><span class="dot" style="background:var(--strat-accent-green)"></span> Cash at Close: <strong id="leg-cash" style="color:#fff; margin-left:5px;">$0</strong></div>
                                                    <div class="legend-item"><span class="dot" style="background:var(--strat-accent-purple)"></span> Potential Earnout: <strong id="leg-earn" style="color:#fff; margin-left:5px;">$0</strong></div>
                                                </div>
                                            </div>

                                        </div>

                                    </div>
                                    
                                    <div id="audit-table-wrapper">
                                        <div style="padding:15px; background:var(--color-panel-bg); border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                                            <div>
                                                <h4 style="margin:0; color:var(--color-risk-low);">Commission Reconciliation</h4>
                                                <small style="color:var(--color-text-secondary);">Combine Statements with Master List Audit</small>
                                            </div>
                                            <button class="btn-secondary" onclick="exportCommTable()">📥 Export to Excel</button>
                                        </div>
                                        <div style="max-height:600px; overflow:auto;">
                                            <table class="data-table" id="comm-detail-table">
                                                <thead>
                                                    <tr>
                                                        <th>Date/File</th>
                                                        <th>Policy #</th>
                                                        <th>Amount</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody></tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div style="text-align:right; margin-top:40px;">
                                        <button type="button" class="btn-primary" id="btn-save-deal" onclick="handleFormSubmit(event)">Save Valuation</button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // --- THEME TOGGLE LOGIC ---
        function toggleTheme() {
            const body = document.body;
            const toggleButton = document.getElementById('theme-toggle');
            if (body.getAttribute('data-theme') === 'light') {
                body.setAttribute('data-theme', 'dark');
                if(toggleButton) toggleButton.innerHTML = '🌙 Toggle to Light Mode';
                localStorage.setItem('theme', 'dark');
            } else {
                body.setAttribute('data-theme', 'light');
                if(toggleButton) toggleButton.innerHTML = '☀️ Toggle to Dark Mode';
                localStorage.setItem('theme', 'light');
            }
        }
        (function applyTheme() {
            const savedTheme = localStorage.getItem('theme') || 'light'; 
            document.body.setAttribute('data-theme', savedTheme);
            const toggleButton = document.getElementById('theme-toggle');
            if (toggleButton) {
                if (savedTheme === 'dark') toggleButton.innerHTML = '🌙 Toggle to Light Mode';
                else toggleButton.innerHTML = '☀️ Toggle to Dark Mode';
            }
        })();

        console.log("System Loaded: v30.46 (UNIVERSAL PARSER)");

        function showLoading() { document.getElementById('loading-overlay').style.display = 'flex'; }
        function hideLoading() { document.getElementById('loading-overlay').style.display = 'none'; }

        // --- STATE ---
        let state = { 
            policy: { loaded: false, headers: [], data: [], map: new Map(), excludedIndices: new Set(), visibleIndices: [], sortCol: -1, sortAsc: true, stats: { totalPrem: 0, carriers: {} } }, 
            comm: { loaded: false, data: [], seen: new Set(), files: {}, rawText: {}, sortCol: 'date', sortAsc: false }, 
            claims: { loaded: false, stats: { totalLoss: 0, totalClaims: 0, openClaims: 0, recentClaims: 0 } }, 
            allCarriers: {}, 
            excludedCarriers: new Set(), 
            dealType: 'full', 
            structure: { cash: 0, note: 0, earnout: 0, equity: 0 }
        };
        let globalBaseRevenue = 0; 
        let currentValuation = 0; 
        let appointmentPenalty = 0; 
        let chartInstance = null; 
        let globalPolicySet = new Set();
        let loadedDealStatus = 'active'; 
        let currentStrategy = 'balanced';
        
        document.addEventListener('DOMContentLoaded', function() {
            const checkedRadio = document.querySelector('input[name="deal_type"]:checked');
            if(checkedRadio) toggleDealQuestions(checkedRadio.value);
            const polInput = document.getElementById('policy-file-input'); if(polInput) polInput.addEventListener('change', handlePolicyUpload);
            const commInput = document.getElementById('comm-file-input'); if(commInput) commInput.addEventListener('change', handleCommUpload);
            const claimInput = document.getElementById('claims-file-input'); if(claimInput) claimInput.addEventListener('change', handleClaimUpload);
        });

        // --- GLOBAL FUNCTIONS ---
        function openAdminTab(id, el) {
            document.querySelectorAll('.admin-tab').forEach(t=>t.classList.remove('active'));
            document.querySelectorAll('.admin-tab-content').forEach(c=>c.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            el.classList.add('active');
        }
        
        function resetHorizonForm() {
            state = { 
                policy: { loaded: false, headers: [], data: [], map: new Map(), excludedIndices: new Set(), visibleIndices: [], sortCol: -1, sortAsc: true, stats: { totalPrem: 0, carriers: {} } }, 
                comm: { loaded: false, data: [], seen: new Set(), files: {}, rawText: {}, sortCol: 'date', sortAsc: false }, 
                claims: { loaded: false, stats: { totalLoss: 0, totalClaims: 0, openClaims: 0, recentClaims: 0 } }, 
                allCarriers: {}, 
                excludedCarriers: new Set(), 
                dealType: 'full', 
                structure: { cash: 0, note: 0, earnout: 0, equity: 0 }
            };
            globalBaseRevenue = 0;
            currentValuation = 0;
            appointmentPenalty = 0;
            globalPolicySet = new Set();
            loadedDealStatus = 'active';

            document.getElementById('horizonDealForm').reset();
            document.getElementById('files-list-items').innerHTML = '';
            document.getElementById('files-list-container').style.display = 'none';
            document.getElementById('policy-table').innerHTML = '<thead></thead><tbody></tbody>';
            document.querySelector('#comm-detail-table tbody').innerHTML = '';
            document.querySelector('#monthly-stats-table tbody').innerHTML = '';
            
            document.getElementById('policy-selector-container').style.display = 'none';
            document.getElementById('policy-upload-stats').style.display = 'none';
            document.getElementById('consolidated-view').style.display = 'none';
            document.getElementById('claims-stats-container').style.display = 'none';
            document.getElementById('on-screen-missing-list').style.display = 'none';
            
            document.querySelectorAll('.file-drop-zone').forEach(el => el.classList.remove('success'));
            document.getElementById('policy-file-info').innerText = '';
            document.getElementById('comm-status-log').innerHTML = 'Waiting for files...';
            document.getElementById('comm-bar').style.width = '0%';
            
            if(document.getElementById('calc-ebitda-display')) document.getElementById('calc-ebitda-display').innerText = '$0.00';
            if(document.getElementById('final-valuation-display')) document.getElementById('final-valuation-display').innerText = '$0.00';
            
            selectCard(document.querySelector('.scope-radio-label'), 'full');
        }

        function startNewDeal() { resetHorizonForm(); showHorizonForm(); }
        function showHorizonForm() { document.getElementById('horizon-list-view').style.display='none'; document.getElementById('horizon-upload-view').style.display='block'; }
        function hideHorizonForm() { document.getElementById('horizon-upload-view').style.display='none'; document.getElementById('horizon-list-view').style.display='block'; }
        
        function selectCard(label, type) { 
            document.querySelectorAll('.scope-radio-label').forEach(l => l.classList.remove('selected')); 
            if(label) label.classList.add('selected'); 
            const radio = document.getElementById('radio-' + type);
            if(radio) { radio.checked = true; toggleDealQuestions(type); }
        }
        
        function toggleDealQuestions(type) { 
            state.dealType = type;
            document.getElementById('rest-of-form').style.display = 'block'; 
            const finSec = document.getElementById('section-financials');
            if(type === 'full') {
                finSec.style.display = 'block';
                document.getElementById('consolidated-view').style.display = state.comm.loaded ? 'block' : 'none';
                calcFinancials(); 
            } else {
                finSec.style.display = 'none';
            }
            if(globalBaseRevenue > 0) runAIMasterCalc();
        }
        
        function toggleDebugLog() {
            const div = document.getElementById('debug-log-container');
            div.style.display = (div.style.display === 'none' || div.style.display === '') ? 'block' : 'none';
            if(div.style.display === 'block') renderDebugLog();
        }
        
        function toggleRawText() {
             const div = document.getElementById('modal-raw-text');
             div.style.display = (div.style.display === 'none' || div.style.display === '') ? 'block' : 'none';
        }
        
        async function toggleStatus(id, currentStatus) {
            const btn = document.getElementById('status-btn-' + id);
            let nextStatus = 'active'; let nextClass = 'status-active'; let nextText = '○ ACTIVE';
            if(currentStatus === 'active') { nextStatus = 'completed'; nextClass = 'status-completed'; nextText = '✔ COMPLETED'; } 
            else if(currentStatus === 'completed') { nextStatus = 'declined'; nextClass = 'status-declined'; nextText = '✖ DECLINED'; } 
            btn.className = 'status-badge-btn ' + nextClass; btn.innerText = nextText;
            btn.onclick = function() { toggleStatus(id, nextStatus); };
            let fd = new FormData(); fd.append('action', 'toggle_status'); fd.append('id', id); fd.append('status', nextStatus);
            await fetch(window.location.href, { method: 'POST', body: fd });
        }

        // --- HELPER FUNCTIONS (AGGRESSIVE MATCHING) ---
        function cleanNum(val) {
            if (typeof val === 'number') return val;
            let s = String(val || '').trim(); if (!s) return 0;
            let isNeg = false; if (s.indexOf('(') > -1 && s.indexOf(')') > -1) isNeg = true; if (s.endsWith('-')) isNeg = true; if (s.startsWith('-')) isNeg = true; 
            s = s.replace(/\s+/g, ''); s = s.replace(/[^0-9.]/g, ""); 
            let num = parseFloat(s); if (isNaN(num)) return 0; if (num > 500000) return 0; 
            return isNeg ? -num : num;
        }
        function getNum(id) { let el = document.getElementById(id); return el ? (parseFloat(el.value) || 0) : 0; }
        
        function normalizePolicy(val) { 
            let s = String(val || '').trim().toUpperCase(); 
            // AGGRESSIVE: Remove ALL dashes, dots, spaces, and special chars.
            s = s.replace(/[^A-Z0-9]/g, ''); 
            // Remove leading zeros
            s = s.replace(/^0+/, ''); 
            return s; 
        }

        function levenshtein(a, b) { 
            if (a.length === 0) return b.length; 
            if (b.length === 0) return a.length; 
            const matrix = []; 
            for (let i = 0; i <= b.length; i++) matrix[i] = [i]; 
            for (let j = 0; j <= a.length; j++) matrix[0][j] = j; 
            for (let i = 1; i <= b.length; i++) { 
                for (let j = 1; j <= a.length; j++) { 
                    const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1; 
                    matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost); 
                } 
            } 
            return matrix[b.length][a.length]; 
        }

        function isFuzzyMatch(masterPol, commPol) { 
            if(!masterPol || !commPol) return false; 
            
            // 1. Exact Match (normalized)
            if(masterPol === commPol) return true; 
            
            // 2. Substring Match
            if(masterPol.length > 3 && commPol.length > 3) {
                if(masterPol.includes(commPol) || commPol.includes(masterPol)) return true;
            }

            // 3. Levenshtein Distance
            if(Math.abs(masterPol.length - commPol.length) <= 1) {
                if(masterPol.length > 5) {
                    return levenshtein(masterPol, commPol) <= 1; 
                }
            }
            return false; 
        }

        function toTitleCase(str) { return str ? str.toString().replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()) : ''; }
        function formatCurrency(num) { return '$' + num.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}); }
        function logStatus(msg) { const log = document.getElementById('comm-status-log'); if(log) { log.style.display = 'block'; log.innerHTML += `<div style="color:#cbd5e1; margin:2px 0;">${msg}</div>`; log.scrollTop = log.scrollHeight; } }
        function getMonthKey(d) { if (!d || !(d instanceof Date) || isNaN(d.getTime())) return 'Unknown'; let y = d.getUTCFullYear(); let m = d.getUTCMonth() + 1; return `${y}-${String(m).padStart(2, '0')}`; }
        function safeParseDate(val) { if (!val) return null; let dateObj = null; if(typeof val === 'number' && val > 36000 && val < 60000) { let totalDays = Math.floor(val - 25569); dateObj = new Date(totalDays * 86400 * 1000); } else { let s = String(val).trim(); if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(s)) dateObj = new Date(s); else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) dateObj = new Date(s + "T12:00:00Z"); else dateObj = new Date(s); } if(!dateObj || isNaN(dateObj.getTime())) return null; return dateObj; }
        
        function dateHitsMonth(d, monthKey) { if(!d || !monthKey) return false; return getMonthKey(d) === monthKey; }
        
        function extractDateFromFilename(filename) { const match = filename.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-_]*20[2-3][0-9]|20[2-3][0-9][\s\-_]*(?:0[1-9]|1[0-2])/i); if(match) { let d = new Date(match[0]); if(!isNaN(d.getTime())) return getMonthKey(d); } const yearFirst = filename.match(/(20[2-3][0-9])[\.\-_](0[1-9]|1[0-2])/); if(yearFirst) return `${yearFirst[1]}-${yearFirst[2]}`; const simpleMatch = filename.match(/(0[1-9]|1[0-2])[\.\-_](20[2-3][0-9])/); if(simpleMatch) return `${simpleMatch[2]}-${simpleMatch[1]}`; const shortYear = filename.match(/(0[1-9]|1[0-2])[\.\-_](([2-3][0-9]))/); if(shortYear) return `20${shortYear[2]}-${shortYear[1]}`; return null; }

        // --- IMPROVED PARSERS ---
        async function parsePDFLocally(file) {
            console.log("Starting Advanced Parsing for: " + file.name);
            const ab = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(new Uint8Array(ab)).promise;
            
            let fileDate = extractDateFromFilename(file.name) || 'Unknown';
            const IGNORE_STARTS = ["TOTAL", "SUBTOTAL", "PAGE", "SUMMARY", "GRAND", "PREMIUM", "Code", "Agent", "Producer", "Report", "Date"];
            const INVALID_POLICIES = ["POLICY", "NUMBER", "NAME", "GROSS", "NET", "COMM", "RATE", "BASIS", "TRANS", "DATE", "EFF", "EXP", "AMT", "DUE", "BAL", "FWD", "INV", "PAYMENT"];
            
            let fileTotal = 0;
            let rawTextBuffer = "";
            let collectedDates = [];

            for(let i=1; i<=pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const rows = {};

                // 1. Group text items by Y-coordinate (8px tolerance)
                textContent.items.forEach(item => {
                    const y = Math.floor(item.transform[5]);
                    let foundKey = Object.keys(rows).find(key => Math.abs(key - y) <= 8);
                    if(foundKey) rows[foundKey].push(item);
                    else rows[y] = [item];
                });

                Object.values(rows).forEach(rowItems => {
                    rowItems.sort((a, b) => a.transform[4] - b.transform[4]);
                    
                    // Construct Full Line
                    let lineStr = rowItems.map(item => item.str).join(' ').trim();
                    const lineUpper = lineStr.toUpperCase();
                    rawTextBuffer += lineStr + "\n"; 

                    if (IGNORE_STARTS.some(start => lineUpper.startsWith(start))) return;

                    // A. DATE DETECTION
                    let dateMatch = lineStr.match(/(0[1-9]|1[0-2])[\/\-](0[1-9]|[1-2][0-9]|3[0-1])[\/\-](20[2-3][0-9]|\d{2})/);
                    if(dateMatch) {
                        let y = dateMatch[3];
                        if(y.length === 2) y = "20" + y;
                        let validDate = `${y}-${dateMatch[1]}`;
                        if(lineStr.match(/Statement|Bill|Period|Run Date/i)) { 
                            collectedDates.push(validDate); collectedDates.push(validDate); 
                        } else { 
                            collectedDates.push(validDate); 
                        }
                    }

                    // B. FIND MONEY (Regex Scan)
                    let moneyPattern = /[\(\-]?\$?\s*([0-9]{1,3}(?:[,\s]?[0-9]{3})*)\s*\.\s*([0-9]{2})\s*[\)\-CR]*/gi;
                    let moneyMatches = [...lineStr.matchAll(moneyPattern)];
                    
                    let moneyCandidates = [];
                    moneyMatches.forEach(match => {
                        let raw = match[0];
                        let val = cleanNum(raw);
                        if(val !== 0 && Math.abs(val) < 500000) {
                            moneyCandidates.push({val: val, raw: raw, abs: Math.abs(val)});
                        }
                    });

                    // Pick Smallest Money as Commission
                    let foundMoney = 0;
                    if(moneyCandidates.length > 0) {
                        moneyCandidates.sort((a,b) => a.abs - b.abs);
                        foundMoney = moneyCandidates[0].val;
                    }

                    // C. FIND POLICY NUMBER
                    if (foundMoney !== 0) {
                        // Mask out money from the line string so we don't parse it as a policy
                        let cleanLine = lineStr;
                        moneyCandidates.forEach(m => { cleanLine = cleanLine.replace(m.raw, " "); });

                        let tokens = cleanLine.split(/\s+/);
                        let foundPol = null;
                        let bestCandidate = "";
                        let maxLen = 0;

                        // Strategy 1: Look for explicit tokens
                        for(let idx = 0; idx < tokens.length; idx++) {
                            let t = tokens[idx];
                            // Check "Stitched" token (Current + Next) for split policies like "ABC 123"
                            let stitched = (idx < tokens.length - 1) ? t + tokens[idx+1] : t;
                            
                            // 1. Evaluate Single Token
                            let tClean = t.replace(/^[\.\,\-\:\(\)]+|[\.\,\-\:\(\)]+$/g, '');
                            let tUp = tClean.toUpperCase();
                            
                            const isKeyword = INVALID_POLICIES.includes(tUp);
                            const hasDigit = /\d/.test(tClean);
                            // Only reject date if it actually has format like 10/2023 or YYYY-MM
                            const isDate = tClean.includes('/') || (tClean.includes('-') && tClean.length >= 8); 
                            
                            // Relaxed Rule: Length >= 4
                            if (tClean.length >= 4 && hasDigit && !isKeyword && !isDate) {
                                foundPol = normalizePolicy(tClean);
                                break; 
                            }
                            
                            // 2. Evaluate Stitched Token (if single failed)
                            let sClean = stitched.replace(/^[\.\,\-\:\(\)]+|[\.\,\-\:\(\)]+$/g, '');
                            if(sClean.length >= 6 && /\d/.test(sClean) && !isDate) {
                                // If the combined string looks like a policy (e.g. CAP123456)
                                foundPol = normalizePolicy(sClean);
                                break;
                            }

                            // Track "Best Guess" (longest alphanumeric that isn't a date)
                            if(!isKeyword && !isDate && tClean.length > maxLen && /\d/.test(tClean)) {
                                maxLen = tClean.length;
                                bestCandidate = normalizePolicy(tClean);
                            }
                        }

                        // Fallback: If we didn't find a "Perfect" match, use the Best Guess
                        if(!foundPol && bestCandidate.length >= 4) {
                            foundPol = bestCandidate;
                        }

                        // D. SAVE ROW
                        if (foundPol) {
                            // Extract Name (Remove Policy match parts and Money)
                            let nameTokens = tokens.filter(t => {
                                let tNorm = normalizePolicy(t);
                                if (tNorm === foundPol) return false; 
                                if (foundPol.includes(tNorm) && tNorm.length > 3) return false; // Stitched parts
                                if (t.match(/\d+\/\d+/)) return false; 
                                if (t.length < 2) return false; 
                                return true;
                            });
                            
                            let capturedName = nameTokens.join(" ");
                            let uID = `${foundPol}_${foundMoney}_${i}`; 

                            if(!state.comm.seen.has(uID)) { 
                                state.comm.data.push({ 
                                    id: uID, 
                                    policy_number: foundPol, 
                                    commission: foundMoney, 
                                    month: 'PENDING', 
                                    file: file.name, 
                                    client_name: toTitleCase(capturedName),
                                    raw_line: lineStr,
                                    producer: '-', carrier: '-', lob: '-', trans_type: '-', premium: 0 
                                }); 
                                state.comm.seen.add(uID); 
                                fileTotal += foundMoney; 
                            } 
                        }
                    }
                });
            }

            if(fileDate === 'Unknown' && collectedDates.length > 0) { 
                let counts = {}; let maxCount = 0; let bestDate = 'Unknown'; 
                collectedDates.forEach(d => { counts[d] = (counts[d] || 0) + 1; if(counts[d] > maxCount) { maxCount = counts[d]; bestDate = d; } }); 
                if(bestDate !== 'Unknown') fileDate = bestDate; 
            }

            state.comm.data.forEach(item => { 
                if(item.file === file.name && item.month === 'PENDING') item.month = fileDate; 
            }); 
            
            state.comm.files[file.name] = fileTotal; 
            state.comm.rawText[file.name] = rawTextBuffer; 
            logStatus(`Scanned ${file.name}: Items Found. Date Set: ${fileDate}`);
        }

        async function parseExcelComm(file) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    const wb = XLSX.read(evt.target.result, {type:'array'}); const firstSheet = wb.Sheets[wb.SheetNames[0]];
                    const rawRows = XLSX.utils.sheet_to_json(firstSheet, {header: 1, range: 0, raw: false}); let sniffedHeaderDate = 'Unknown';
                    for(let i=0; i<Math.min(10, rawRows.length); i++) { let rowStr = rawRows[i].join(" "); if(rowStr.match(/Statement Date|Bill Date|Period/i)) { let m = safeParseDate(rowStr.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)); if(m) { sniffedHeaderDate = getMonthKey(m); break; } } }
                    const d = XLSX.utils.sheet_to_json(firstSheet); let fileTotal = 0; let fileDate = extractDateFromFilename(file.name) || sniffedHeaderDate;
                    d.forEach((row, i) => {
                        let kPol = Object.keys(row).find(k=>k.match(/pol/i) && !k.match(/type/i)); 
                        let kAmt = Object.keys(row).find(k => { let s = k.toLowerCase(); if(s.match(/commission|comm|split|net|revenue/)) return true; if(s.match(/amount|amt|pay|bonus/) && !s.includes("premium") && !s.includes("basis")) return true; return false; }); 
                        let kName = Object.keys(row).find(k=>k.match(/name|insured|client|account|customer/i)); 
                        
                        let kProd = Object.keys(row).find(k=>k.match(/producer/i));
                        let kCarr = Object.keys(row).find(k=>k.match(/master company|carrier|company/i));
                        let kLOB = Object.keys(row).find(k=>k.match(/lob|line/i));
                        let kTrans = Object.keys(row).find(k=>k.match(/trans|type/i));
                        let kPrem = Object.keys(row).find(k=>k.match(/premium|written/i));

                        if(kPol && kAmt) { 
                            let p = normalizePolicy(row[kPol]); 
                            let val = cleanNum(row[kAmt]); 
                            if(Math.abs(val) > 50000) val = 0; 
                            let nameStr = kName ? row[kName] : ""; 
                            
                            let uID = `${p}_${val}_${i}`; 
                            let rowString = Object.values(row).join(" | ");
                            
                            if(!state.comm.seen.has(uID) && val !== 0) { 
                                state.comm.data.push({ 
                                    id: uID, 
                                    policy_number: p, 
                                    commission: val, 
                                    month: 'PENDING', 
                                    file: file.name, 
                                    client_name: toTitleCase(nameStr),
                                    raw_line: rowString,
                                    producer: kProd ? row[kProd] : '-',
                                    carrier: kCarr ? row[kCarr] : '-',
                                    lob: kLOB ? row[kLOB] : '-',
                                    trans_type: kTrans ? row[kTrans] : '-',
                                    premium: kPrem ? cleanNum(row[kPrem]) : 0
                                }); 
                                state.comm.seen.add(uID); 
                                fileTotal += val; 
                            } 
                        }
                    });
                    state.comm.data.forEach(item => { if(item.file === file.name && item.month === 'PENDING') item.month = fileDate; }); state.comm.files[file.name] = fileTotal; state.comm.rawText[file.name] = "Excel File (Structured Data)"; resolve();
                };
                reader.readAsArrayBuffer(file);
            });
        }

        // --- HANDLERS ---
        async function handlePolicyUpload(e) {
            const file = e.target.files[0]; if(!file) return;
            showLoading(); document.getElementById('ai-status-policy').style.display='block'; logStatus(`Reading Client List: ${file.name}...`);
            const reader = new FileReader();
            reader.onload = function(evt) {
                try {
                    const wb = XLSX.read(evt.target.result, {type:'array'}); let json = [];
                    for(let i=0; i<wb.SheetNames.length; i++) { const ws = wb.Sheets[wb.SheetNames[i]]; const tempJson = XLSX.utils.sheet_to_json(ws, {header:1, defval: ""}); if(tempJson.length > 5) { json = tempJson; break; } }
                    if(json.length === 0) { alert("Empty File"); hideLoading(); return; }
                    let headerIdx = 0; for(let i=0; i<Math.min(30, json.length); i++) { const rowStr = JSON.stringify(json[i]).toLowerCase(); if(rowStr.includes("policy") || rowStr.includes("prem")) { headerIdx = i; break; } }
                    state.policy.headers = json[headerIdx]; state.policy.data = json.slice(headerIdx + 1); state.policy.loaded = true; state.policy.excludedIndices = new Set();
                    document.getElementById('policy-file-info').innerText = `✅ Loaded ${state.policy.data.length} policies.`;
                    document.getElementById('policy-selector-container').style.display = 'block'; 
                    const mappers = ['map-pol-num','map-premium','map-carrier','map-account','map-effective', 'map-expiration', 'map-type'];
                    mappers.forEach(id => { const el = document.getElementById(id); if(el) { el.innerHTML = '<option value="-1">-- Select Column --</option>' + state.policy.headers.map((h,i) => `<option value="${i}">${h}</option>`).join(''); } });
                    autoMapColumns(state.policy.headers); finishPolicyLoad();
                } catch (err) { alert("Error: " + err.message); } finally { hideLoading(); }
            };
            reader.readAsArrayBuffer(file);
        }

        async function handleCommUpload(e) {
            const files = Array.from(e.target.files); if(files.length === 0) return;
            showLoading(); document.getElementById('comm-progress').style.display = 'block';
            for(let f of files) { try { logStatus(`Scanning ${f.name}...`); if(f.name.endsWith('.pdf')) await parsePDFLocally(f); else await parseExcelComm(f); } catch(err) { console.error(err); } }
            document.getElementById('zone-comm').classList.add('success'); document.getElementById('comm-bar').style.width = '100%'; state.comm.loaded = true;
            document.getElementById('consolidated-view').style.display = 'block'; updateFilesList(); renderConsolidated(); hideLoading();
        }

        function handleClaimUpload(e) {
            const file = e.target.files[0]; if(!file) return; showLoading();
            const reader = new FileReader();
            reader.onload = function(evt) {
                try {
                    const wb = XLSX.read(evt.target.result, {type:'array'}); const ws = wb.Sheets[wb.SheetNames[0]];
                    const json = XLSX.utils.sheet_to_json(ws, {defval:""}); if(json.length === 0) return;
                    const keys = Object.keys(json[0]);
                    let keyClaimNum = keys.find(k => k.match(/claim\s*number|claim\s*#/i)); let keyLoss = keys.find(k => k.match(/incurred/i)); if(!keyLoss) keyLoss = keys.find(k => k.match(/total\s*paid|amount\s*paid/i)); if(!keyLoss) keyLoss = keys.find(k => k.match(/loss/i) && !k.match(/date/i));
                    let keyDate = keys.find(k => k.match(/loss\s*date|date\s*of\s*loss/i)); if(!keyDate) keyDate = keys.find(k => k.match(/occ/i)); if(!keyDate) keyDate = keys.find(k => k.match(/reported/i));
                    const keyStatus = keys.find(k => k.match(/status/i)); let maxDate = new Date(0); 
                    json.forEach(row => { if(keyDate && row[keyDate]) { let dStr = typeof row[keyDate] === 'string' ? row[keyDate].replace(/['"]/g, '').trim() : row[keyDate]; let d = safeParseDate(dStr); if(d && d > maxDate) maxDate = d; } });
                    if(maxDate.getTime() === new Date(0).getTime()) maxDate = new Date(); const cutoffDate = new Date(maxDate); cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
                    let uniqueClaimsMap = new Map(); 
                    json.forEach(row => {
                        let cNum = keyClaimNum ? row[keyClaimNum] : "UNKNOWN-" + Math.random(); if(!cNum) return;
                        let rowDate = null; if(keyDate && row[keyDate]) { let dStr = typeof row[keyDate] === 'string' ? row[keyDate].replace(/['"]/g, '').trim() : row[keyDate]; rowDate = safeParseDate(dStr); }
                        if(rowDate && rowDate >= cutoffDate) { let valStr = ""; if(row["Claim Incurred Loss"]) valStr = row["Claim Incurred Loss"]; else if(keyLoss) valStr = row[keyLoss]; let val = cleanNum(valStr); let status = "Closed"; if(row["Claim Status"]) status = row["Claim Status"]; else if(keyStatus) status = row[keyStatus]; if(!uniqueClaimsMap.has(cNum)) { uniqueClaimsMap.set(cNum, { loss: val, status: status }); } else { let existing = uniqueClaimsMap.get(cNum); if(val > existing.loss) existing.loss = val; uniqueClaimsMap.set(cNum, existing); } }
                    });
                    let totalClaimsT12 = 0; let openClaimsT12 = 0; let totalLossT12 = 0;
                    uniqueClaimsMap.forEach(item => { totalClaimsT12++; totalLossT12 += item.loss; if(item.status && String(item.status).toLowerCase().includes("open")) openClaimsT12++; });
                    document.getElementById('zone-claims').classList.add('success'); document.getElementById('claims-stats-container').style.display='block';
                    if(document.getElementById('claim-total')) document.getElementById('claim-total').innerText = totalClaimsT12; if(document.getElementById('claim-open')) document.getElementById('claim-open').innerText = openClaimsT12; if(document.getElementById('claim-recent')) document.getElementById('claim-recent').innerText = totalClaimsT12; 
                    const sumBox = document.getElementById('claims-sum-debug'); if(sumBox) { sumBox.innerText = "T12 Incurred Loss: " + formatCurrency(totalLossT12); sumBox.style.display = 'block'; }
                    let ratio = 0; if(state.policy.stats.totalPrem > 0) ratio = (totalLossT12 / state.policy.stats.totalPrem) * 100; if(document.getElementById('claim-ratio')) document.getElementById('claim-ratio').innerText = ratio.toFixed(1) + "%";
                    const lossSelect = document.getElementById('factor-loss'); lossSelect.value = "0"; if (ratio > 60) lossSelect.value = "-0.3"; else if (ratio < 30 && totalClaimsT12 < 5) lossSelect.value = "0.1"; 
                    runAIMasterCalc(); logStatus(`Claims Analysis (T12): ${totalClaimsT12} unique claims found. Loss: ${formatCurrency(totalLossT12)}`);
                } catch(err) { console.error(err); alert("Error parsing Claims file: " + err.message); } finally { hideLoading(); }
            };
            reader.readAsArrayBuffer(file);
        }

        async function handleFormSubmit(e) {
            e.preventDefault();
            const btn = document.getElementById('btn-save-deal'); 
            btn.innerText = "Saving...";
            btn.disabled = true;

            try {
                const checkedRadio = document.querySelector('input[name="deal_type"]:checked');
                const dType = checkedRadio ? checkedRadio.value : 'full';
                
                state.structure.cash = parseFloat(document.getElementById('struct-cash').value) || 0;
                state.structure.note = parseFloat(document.getElementById('struct-note').value) || 0;
                state.structure.earnout = parseFloat(document.getElementById('struct-earnout').value) || 0;
                state.structure.equity = parseFloat(document.getElementById('struct-equity').value) || 0;

                const mappings = {
                    pol: document.getElementById('map-pol-num').value,
                    carrier: document.getElementById('map-carrier').value,
                    prem: document.getElementById('map-premium').value,
                    eff: document.getElementById('map-effective').value,
                    exp: document.getElementById('map-expiration').value,
                    acc: document.getElementById('map-account').value,
                    type: document.getElementById('map-type').value,
                    force6mo: document.getElementById('chk-6mo-default').checked,
                    pastTerms: document.getElementById('chk-past-terms').checked,
                    incProj: document.getElementById('chk-include-projection').checked
                };
                
                const unappointed = [];
                document.querySelectorAll('.carrier-appointment-chk').forEach(chk => {
                    if(!chk.checked) unappointed.push(chk.parentElement.textContent.trim());
                });

                let mapEntries = [];
                if(state.policy.map && typeof state.policy.map.entries === 'function') {
                    mapEntries = Array.from(state.policy.map.entries());
                }

                const leanCommData = (state.comm.data || []).map(item => {
                    const { raw_line, ...rest } = item; 
                    return rest;
                });

                const serializableState = {
                    ...state,
                    policy: {
                        ...state.policy,
                        map: mapEntries,
                        excludedIndices: Array.from(state.policy.excludedIndices)
                    },
                    comm: {
                        ...state.comm,
                        data: leanCommData, 
                        seen: Array.from(state.comm.seen)
                    },
                    excludedCarriers: Array.from(state.excludedCarriers)
                };

                const response = await fetch(window.location.href, { 
                    method:'POST',
                    headers:{'Content-Type':'application/json'},
                    body: JSON.stringify({
                        deal_name: document.getElementById('input-deal-name').value, 
                        deal_type: dType, 
                        valuation: currentValuation, 
                        premium_base: globalBaseRevenue,
                        id: loadedDealStatus === 'active' ? new URLSearchParams(window.location.search).get('id') : null, 
                        full_state: { 
                            state: serializableState, 
                            status: loadedDealStatus,
                            inputs: { 
                                name: document.getElementById('input-deal-name').value, 
                                type: dType, 
                                revenue: getNum('fin-revenue'), 
                                opex: getNum('fin-opex'), 
                                addbacks: getNum('fin-addbacks'), 
                                ownerComp: getNum('fin-owner-comp'), 
                                mult: document.getElementById('valuation-slider').value, 
                                lossFactor: document.getElementById('factor-loss').value,
                                carrierFactor: document.getElementById('factor-carrier').value,
                                struct: state.structure,
                                mappings: mappings,        
                                unappointed: unappointed
                            } 
                        }
                    })
                });
                
                const res = await response.json();
                
                if(res.status === 'success') { 
                    alert("Saved successfully!"); 
                    window.location.reload(); 
                } else { 
                    throw new Error(res.message || 'Unknown Server Error'); 
                }
            } catch(err) { 
                alert("CRITICAL SAVE ERROR:\n" + err.message + "\n\nTip: If the error says 'JSON' or 'Limit', your file might be too large for the database."); 
                btn.innerText = "Save Valuation"; 
                btn.disabled = false;
                console.error(err);
            }
        }

        // --- NEW: STRATEGY LOGIC ---
        function applyStrategy(strat) {
            currentStrategy = strat;
            
            document.querySelectorAll('.strategy-card').forEach(c => c.className = 'strategy-card');
            document.querySelectorAll('.viz-btn').forEach(b => b.className = 'viz-btn');
            
            const card = document.getElementById('card-'+strat);
            if(card) card.classList.add('active-'+strat);
            const btn = document.getElementById('btn-'+strat);
            if(btn) btn.classList.add('active-'+strat);
            
            const slider = document.getElementById('range-cash-pct');
            const infoBox = document.getElementById('fine-tune-text');
            
            if(strat === 'quick') {
                slider.value = 100;
                infoBox.innerHTML = "<strong>Quick Exit:</strong> 100% Cash at Close. Cleanest deal structure.";
            } else if (strat === 'balanced') {
                slider.value = 85;
                infoBox.innerHTML = "<strong>Balanced:</strong> 85% Cash / 15% Holdback. Standard structure.";
            } else if (strat === 'growth') {
                slider.value = 60;
                infoBox.innerHTML = "<strong>Growth:</strong> 60% Cash / 40% Earnout. Maximize total potential.";
            }
            
            manualSplitUpdate();
        }

        function manualSplitUpdate() {
            const cashPct = parseInt(document.getElementById('range-cash-pct').value);
            document.getElementById('disp-cash-pct').innerText = cashPct + "%";
            
            const total = currentValuation;
            const cashAmt = total * (cashPct / 100);
            const remainder = total - cashAmt;
            
            document.getElementById('struct-cash').value = cashAmt.toFixed(2);
            
            if(currentStrategy === 'quick') {
                document.getElementById('struct-note').value = 0;
                document.getElementById('struct-earnout').value = 0;
            } else if(currentStrategy === 'balanced') {
                document.getElementById('struct-note').value = remainder.toFixed(2);
                document.getElementById('struct-earnout').value = 0;
            } else {
                document.getElementById('struct-note').value = 0;
                document.getElementById('struct-earnout').value = remainder.toFixed(2);
            }
            
            updateWaterfallViz(cashAmt, remainder);
        }

        function updateWaterfallViz(cash, deferred) {
            const total = cash + deferred;
            if(total <= 0) return;
            
            const cashPct = (cash / total) * 100;
            const defPct = (deferred / total) * 100;
            
            document.getElementById('viz-liquid-cash').innerText = formatCurrency(cash);
            document.getElementById('strat-gross-val').innerText = formatCurrency(total);
            
            document.getElementById('bar-cash').style.width = cashPct + "%";
            document.getElementById('bar-earnout').style.width = defPct + "%";
            
            document.getElementById('leg-cash').innerText = formatCurrency(cash);
            document.getElementById('leg-earn').innerText = formatCurrency(deferred);
            
            state.structure.cash = cash;
            state.structure.note = parseFloat(document.getElementById('struct-note').value) || 0;
            state.structure.earnout = parseFloat(document.getElementById('struct-earnout').value) || 0;
            state.structure.equity = 0;
        }

        // --- CALCS ---
        function manualSliderUpdate() {
            const m = parseFloat(document.getElementById('valuation-slider').value);
            document.getElementById('slider-val-display').innerText = m.toFixed(2) + 'x';
            
            let base = parseFloat(document.getElementById('fin-revenue').value);
            if(isNaN(base) || base === 0) {
                base = globalBaseRevenue;
            }

            const val = base * m; 
            currentValuation = val;
            
            document.getElementById('final-valuation-display').innerText = formatCurrency(val);
            manualSplitUpdate();
        }

        function calcFinancials() {
            const rev = getNum('fin-revenue');
            const opex = getNum('fin-opex');
            const ownerComp = getNum('fin-owner-comp');
            const addbacks = getNum('fin-addbacks');
            
            let ebitda = (rev - opex) + ownerComp + addbacks;
            
            const displayEl = document.getElementById('calc-ebitda-display');
            displayEl.innerText = formatCurrency(ebitda);
            
            if(ebitda < 0) displayEl.style.color = "var(--color-risk-high)";
            else displayEl.style.color = "var(--color-risk-low)";

            runAIMasterCalc();
        }
        
        function downloadValuationPDF() {
            const element = document.getElementById('consolidated-view');
            const dealName = document.getElementById('input-deal-name').value || "Deal";
            document.body.classList.add('pdf-mode');
            const opt = { margin: 0.2, filename: `${dealName}_Valuation_Report.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } };
            html2pdf().set(opt).from(element).save().then(() => { document.body.classList.remove('pdf-mode'); });
        }

        function showFileDetails(fname) {
            const modal = document.getElementById('file-detail-modal');
            document.getElementById('modal-file-title').innerText = fname;
            const rawDiv = document.getElementById('modal-raw-text');
            rawDiv.innerText = state.comm.rawText[fname] || "No raw text captured (Excel file or empty).";
            
            const tbody = document.querySelector('#modal-file-table tbody');
            const thead = document.querySelector('#modal-file-table thead');
            
            thead.innerHTML = `<tr>
                <th>Date</th>
                <th>Producer</th>
                <th>Account Name</th>
                <th>Master Company</th>
                <th>Policy Number</th>
                <th>LOB Code</th>
                <th>Trans Type</th>
                <th>Prem Written</th>
                <th>Comm Split</th>
                <th>Matched Status</th>
            </tr>`;
            tbody.innerHTML = "";
            const fileData = state.comm.data.filter(d => d.file === fname);
            
            if(fileData.length === 0) { tbody.innerHTML = "<tr><td colspan='10' style='text-align:center; padding:30px;'>No transactions found for this file.</td></tr>"; } 
            else {
                fileData.forEach(c => {
                    let matchedPolicy = '<span style="color:var(--color-text-secondary); font-style:italic;">--</span>';
                    let isMatched = false;
                    let commPol = normalizePolicy(c.policy_number);
                    if(state.policy.loaded && state.policy.map.has(commPol)) { matchedPolicy = commPol; isMatched = true; } 
                    else if(state.policy.loaded) { for(let [masterPol, rowData] of state.policy.map) { if(isFuzzyMatch(masterPol, commPol)) { matchedPolicy = masterPol; isMatched = true; break; } } }
                    
                    let status = isMatched ? '<span class="status-badge status-matched">Matched</span>' : '<span class="status-badge status-orphan">Statement Only</span>';
                    
                    let producer = c.producer || '-';
                    let client = c.client_name || '-';
                    let carrier = c.carrier || '-';
                    let lob = c.lob || '-';
                    let trans = c.trans_type || '-';
                    let prem = c.premium ? formatCurrency(c.premium) : '-';

                    tbody.innerHTML += `<tr>
                        <td>${c.month}</td>
                        <td>${producer}</td>
                        <td style="font-weight:600;">${client}</td>
                        <td>${carrier}</td>
                        <td>${c.policy_number}</td>
                        <td>${lob}</td>
                        <td>${trans}</td>
                        <td>${prem}</td>
                        <td style="text-align:right; font-weight:bold;">${formatCurrency(c.commission)}</td>
                        <td>${status}</td>
                    </tr>`;
                });
            }
            modal.style.display = 'flex';
        }
        function closeFileModal() { document.getElementById('file-detail-modal').style.display = 'none'; }

        function restoreDropdownOptions() {
            if(state.policy.headers && state.policy.headers.length > 0) {
                const mappers = ['map-pol-num','map-premium','map-carrier','map-account','map-effective', 'map-expiration', 'map-type'];
                mappers.forEach(id => {
                    const el = document.getElementById(id);
                    if(el) {
                        el.innerHTML = '<option value="-1">-- Select Column --</option>' + 
                        state.policy.headers.map((h,i) => `<option value="${i}">${h}</option>`).join('');
                    }
                });
            }
        }

        function autoMapColumns(headers) {
            const mapRules = {
                'map-pol-num': ['Policy Data Policy Number', 'policy', 'pol#', 'number', 'ref'],
                'map-premium': ['Policy Data Premium - Annualized', 'premium', 'annualized', 'prem'],
                'map-carrier': ['Policy Data Master Company', 'carrier', 'company', 'insurer'],
                'map-account': ['Applicant Data Account Name', 'insured', 'account', 'name', 'client'],
                'map-effective': ['Policy Data Effective Date', 'eff', 'start', 'inception'],
                'map-expiration': ['Policy Expiration Date', 'exp', 'end', 'term'],
                'map-type': ['Policy Type', 'status', 'trans', 'type']
            };
            for (const [selectId, keywords] of Object.entries(mapRules)) {
                const el = document.getElementById(selectId); let foundIndex = -1;
                for(let k of keywords) { const idx = headers.findIndex(h => h && h.toString().toLowerCase().includes(k.toLowerCase())); if(idx !== -1) { foundIndex = idx; break; } }
                if(foundIndex !== -1) el.value = foundIndex;
            }
        }
        function reMapColumns() { populateCarrierDropdowns(); renderPolicyTable(); if(state.comm.loaded) renderConsolidated(); }
        
        function finishPolicyLoad() {
            document.getElementById('ai-status-policy').style.display='none'; document.getElementById('zone-policy').classList.add('success');
            document.getElementById('policy-selector-container').style.display='block'; document.getElementById('policy-upload-stats').style.display = 'block';
            const pIdx = parseInt(document.getElementById('map-pol-num').value);
            state.policy.map.clear();
            if(pIdx > -1) { state.policy.data.forEach(row => { const pNorm = normalizePolicy(row[pIdx]); if(pNorm) state.policy.map.set(pNorm, row); }); }
            populateCarrierDropdowns(); renderPolicyTable();
        }
        
        function populateCarrierDropdowns() {
            const idx = parseInt(document.getElementById('map-carrier').value);
            const div = document.getElementById('carrier-multi-select'); div.innerHTML = ""; state.allCarriers = {};
            if (idx > -1) {
                state.policy.data.forEach(r => { const c = r[idx]; if(c) state.allCarriers[c] = (state.allCarriers[c]||0) + 1; });
                const sorted = Object.keys(state.allCarriers).sort();
                div.innerHTML += `<label class="multi-select-item all-option"><input type="checkbox" id="chk-carrier-all" checked onchange="toggleCarrierExclusion('ALL')"> SELECT ALL CARRIERS</label>`;
                sorted.forEach(c => {
                    const checked = state.excludedCarriers.has(c) ? "" : "checked";
                    div.innerHTML += `<label class="multi-select-item"><input type="checkbox" class="chk-carrier-item" ${checked} onchange="toggleCarrierExclusion('${c}')"> ${c} <span style="color:var(--color-text-secondary); font-size:0.9em;">(${state.allCarriers[c]})</span></label>`;
                });
            } else { div.innerHTML = "<div style='padding:10px; color:var(--color-text-secondary);'>Map carrier column first...</div>"; }
        }
        
        function toggleCarrierExclusion(cVal) {
             if(cVal === 'ALL') { const chk = document.getElementById('chk-carrier-all'); state.excludedCarriers.clear(); if(!chk.checked) { Object.keys(state.allCarriers).forEach(c => state.excludedCarriers.add(c)); } } 
             else { if(state.excludedCarriers.has(cVal)) state.excludedCarriers.delete(cVal); else state.excludedCarriers.add(cVal); }
             const inputs = document.querySelectorAll('.chk-carrier-item'); inputs.forEach(inp => { const lbl = inp.parentElement.textContent.trim().split(' (')[0]; inp.checked = !state.excludedCarriers.has(lbl); });
             updatePolicyExclusionsFromCarriers();
        }
        
        function updatePolicyExclusionsFromCarriers() {
            const carrierIdx = parseInt(document.getElementById('map-carrier').value);
            if(carrierIdx > -1) {
                state.policy.data.forEach((r, i) => { const c = r[carrierIdx]; if(state.excludedCarriers.has(c)) state.policy.excludedIndices.add(i); else state.policy.excludedIndices.delete(i); });
                renderPolicyTable(); if(state.comm.loaded) renderConsolidated();
            }
        }
        function showCarrierFilter(e) { e.stopPropagation(); const p = document.getElementById('global-carrier-popup'); p.style.display = 'block'; p.style.left = e.pageX + 'px'; p.style.top = e.pageY + 'px'; }
        function closeCarrierFilter() { document.getElementById('global-carrier-popup').style.display = 'none'; }
        function filterCarrierList(txt) {
            const val = txt.toLowerCase(); const items = document.querySelectorAll('.multi-select-item');
            items.forEach(item => { if(item.textContent.toLowerCase().includes(val)) item.style.display = 'flex'; else item.style.display = 'none'; });
        }
        function toggleRowExclusion(idx) {
            if(state.policy.excludedIndices.has(idx)) state.policy.excludedIndices.delete(idx); else state.policy.excludedIndices.add(idx);
            const tr = document.getElementById('row-'+idx);
            if(tr) { if(state.policy.excludedIndices.has(idx)) { tr.classList.add('row-excluded'); tr.querySelector('input').checked = false; } else { tr.classList.remove('row-excluded'); tr.querySelector('input').checked = true; } }
            updateTopStats(); if(state.comm.loaded) renderConsolidated();
        }
        function toggleSort(colIdx) {
            if(state.policy.sortCol === colIdx) state.policy.sortAsc = !state.policy.sortAsc; else { state.policy.sortCol = colIdx; state.policy.sortAsc = true; }
            state.policy.data.sort((a,b) => {
                let vA = a[colIdx] || ''; let vB = b[colIdx] || '';
                if(!isNaN(parseFloat(vA)) && !isNaN(parseFloat(vB))) { vA = parseFloat(vA); vB = parseFloat(vB); } else { vA = vA.toString().toLowerCase(); vB = vB.toString().toLowerCase(); }
                if(vA < vB) return state.policy.sortAsc ? -1 : 1; if(vA > vB) return state.policy.sortAsc ? 1 : -1; return 0;
            });
            renderPolicyTable();
        }
        function filterTableBySearch(val) {
            const v = val.toLowerCase(); const rows = document.querySelectorAll('#policy-table tbody tr');
            rows.forEach(r => { if(r.innerText.toLowerCase().includes(v)) r.classList.remove('search-hidden'); else r.classList.add('search-hidden'); });
        }
        function updateTopStats() {
            const premIdx = parseInt(document.getElementById('map-premium').value); let total = 0; let cnt = 0;
            state.policy.data.forEach((r, i) => { if(!state.policy.excludedIndices.has(i)) { if(premIdx > -1) total += cleanNum(r[premIdx]); cnt++; } });
            state.policy.stats.totalPrem = total; document.getElementById('p-stat-premium').innerText = formatCurrency(total); document.getElementById('p-stat-selected').innerText = cnt;
        }
        function renderPolicyTable(fullRender = true) {
            if(!fullRender) return;
            const tbody = document.querySelector('#policy-table tbody'); const thead = document.querySelector('#policy-table thead');
            const carrierIdx = parseInt(document.getElementById('map-carrier').value);
            let headerHtml = `<tr><th style="width:40px;">Use</th>`;
            state.policy.headers.forEach((h, i) => {
                let sortMark = ""; if(state.policy.sortCol === i) sortMark = state.policy.sortAsc ? " ▲" : " ▼";
                if(i === carrierIdx) headerHtml += `<th onclick="showCarrierFilter(event)" style="background:var(--color-panel-bg); color:var(--color-primary-brand);">🔍 ${h}${sortMark}</th>`;
                else headerHtml += `<th onclick="toggleSort(${i})">${h}${sortMark}</th>`;
            });
            headerHtml += "</tr>"; thead.innerHTML = headerHtml;
            let rowsHtml = "";
            state.policy.data.slice(0, 100).forEach((row, idx) => {
                const isExcluded = state.policy.excludedIndices.has(idx);
                const trClass = isExcluded ? 'row-excluded' : ''; const checked = isExcluded ? '' : 'checked';
                let cells = ""; row.forEach(val => cells += `<td>${val || ''}</td>`);
                rowsHtml += `<tr id="row-${idx}" class="${trClass}"><td><input type="checkbox" ${checked} onchange="toggleRowExclusion(${idx})"></td>${cells}</tr>`;
            });
            if(state.policy.data.length > 100) rowsHtml += `<tr><td colspan="100" style="text-align:center; padding:10px; color:var(--color-text-secondary);">... Showing first 100 of ${state.policy.data.length} rows ...</td></tr>`;
            tbody.innerHTML = rowsHtml; updateTopStats(); document.getElementById('p-stat-total').innerText = state.policy.data.length;
        }
        function clearCommData() { state.comm.data = []; state.comm.seen = new Set(); state.comm.files = {}; document.getElementById('file-counter').innerText = ""; document.getElementById('files-list-container').style.display = 'none'; renderConsolidated(); alert("Commission data cleared."); }
        function updateFilesList() {
            const container = document.getElementById('files-list-container'); const items = document.getElementById('files-list-items');
            if(container && items) {
                container.style.display = 'block'; items.innerHTML = '';
                Object.keys(state.comm.files).forEach(fname => {
                    let fTotal = state.comm.files[fname]; let fileItems = state.comm.data.filter(d => d.file === fname); let fDate = (fileItems.length > 0) ? fileItems[0].month : 'Unknown';
                    let dateClass = fDate === 'Unknown' ? 'error' : ''; let warnBadge = (fileItems.length === 0) ? '<span class="file-warning">⚠️ 0 Items</span>' : '';
                    items.innerHTML += `<div class="file-item"><span onclick="showFileDetails('${fname}')" style="flex:1;">${warnBadge}📄 ${fname} <strong>${formatCurrency(fTotal)}</strong></span><span class="date-badge ${dateClass}" onclick="promptForDate('${fname}')" title="Click to fix date">📅 ${fDate}</span></div>`;
                });
            }
        }
        function promptForDate(fname) { let newDate = prompt(`Manually set date for ${fname} (Format YYYY-MM):`, "2024-11"); if(newDate && newDate.match(/^\d{4}-\d{2}$/)) overrideFileDate(fname, newDate); }
        function overrideFileDate(fname, newDate) {
            let count = 0; state.comm.data.forEach(item => { if(item.file === fname) { item.month = newDate; count++; } });
            if(count > 0) { renderConsolidated(); updateFilesList(); }
        }
        function runAIMasterCalc() {
            let m = 1.5; let fLoss = parseFloat(document.getElementById('factor-loss').value); let fMix = parseFloat(document.getElementById('factor-carrier').value);
            appointmentPenalty = 0; const carrierCheckboxes = document.querySelectorAll('.carrier-appointment-chk');
            if(carrierCheckboxes.length > 0) { let uncheckedCount = 0; carrierCheckboxes.forEach(chk => { if(!chk.checked) uncheckedCount++; }); if(uncheckedCount > 0) appointmentPenalty = -(uncheckedCount * 0.05); }
            document.getElementById('logic-risk').innerText = (fLoss > 0 ? '+' : '') + fLoss.toFixed(2) + 'x'; document.getElementById('logic-appointment').innerText = (appointmentPenalty.toFixed(2)) + 'x';
            m += fLoss + fMix + appointmentPenalty; if(m < 0) m = 0;
            document.getElementById('logic-total').innerText = m.toFixed(2) + 'x'; document.getElementById('valuation-slider').value = m.toFixed(2);
            manualSliderUpdate();
        }
        function generateCarrierChecklist() {
             const div = document.getElementById('carrier-checklist'); if(!div) return; div.innerHTML = "";
             const sorted = Object.keys(state.allCarriers).sort((a,b) => state.allCarriers[b] - state.allCarriers[a]);
             sorted.slice(0, 20).forEach(c => { div.innerHTML += `<label class="carrier-check-item"><input type="checkbox" class="carrier-appointment-chk" checked onchange="runAIMasterCalc()"> ${c}</label>`; });
             runAIMasterCalc();
        }
        function renderDebugLog() {
            const div = document.getElementById('debug-log-container');
            let html = `<strong>RAW PARSED TRANSACTIONS:</strong><br><small>Copy this to verify sums.</small><br><br>`;
            state.comm.data.forEach(item => { let colorClass = item.commission < 0 ? 'log-neg' : ''; html += `<div class="${colorClass}">${item.month} | ${item.policy_number} | $${item.commission.toFixed(2)}</div>`; });
            div.innerHTML = html;
        }

        // --- RECONCILED VIEW LOGIC (UPDATED) ---
        function getReconciledData() {
            // 1. Matched / Comm Only
            let combined = state.comm.data.map(c => {
                const pNorm = normalizePolicy(c.policy_number);
                let stat = globalPolicySet.has(pNorm) ? 'Matched' : 'Commission Only';
                return { ...c, _status: stat, _origin: 'comm' };
            });

            // 2. Active List Only (Ghost Rows)
            let paidPolicies = new Set();
            state.comm.data.forEach(c => paidPolicies.add(normalizePolicy(c.policy_number)));

            const pIdx = parseInt(document.getElementById('map-pol-num').value);
            const nameIdx = parseInt(document.getElementById('map-account').value);
            const premIdx = parseInt(document.getElementById('map-premium').value);
            
            if (pIdx > -1) {
                state.policy.data.forEach((row, i) => {
                    if(state.policy.excludedIndices.has(i)) return; 
                    
                    let pRaw = row[pIdx];
                    let pNorm = normalizePolicy(pRaw);
                    
                    if(!paidPolicies.has(pNorm)) {
                        let client = nameIdx > -1 ? row[nameIdx] : 'Unknown';
                        let prem = premIdx > -1 ? cleanNum(row[premIdx]) : 0;
                        
                        combined.push({
                            id: `missing_${i}`,
                            month: 'Missing',
                            file: 'Master List',
                            policy_number: pRaw,
                            client_name: client,
                            premium: prem,
                            commission: 0,
                            _status: 'Active List Only',
                            _origin: 'master'
                        });
                    }
                });
            }
            return combined;
        }

        function sortComm(col) {
            if (!state.comm.sortCol) { state.comm.sortCol = 'date'; state.comm.sortAsc = false; }
            if (state.comm.sortCol === col) state.comm.sortAsc = !state.comm.sortAsc;
            else { state.comm.sortCol = col; state.comm.sortAsc = true; }
            renderCommDetailTable(); 
        }

        function renderCommDetailTable() {
            const tbody = document.querySelector('#comm-detail-table tbody'); 
            const thead = document.querySelector('#comm-detail-table thead');
            
            let displayData = getReconciledData();

            displayData.sort((a, b) => {
                let valA, valB;
                let col = state.comm.sortCol || 'date';
                
                if (col === 'date') { valA = a.month; valB = b.month; }
                else if (col === 'client') { valA = (a.client_name || '').toLowerCase(); valB = (b.client_name || '').toLowerCase(); }
                else if (col === 'pol') { valA = (a.policy_number || '').toLowerCase(); valB = (b.policy_number || '').toLowerCase(); }
                else if (col === 'prem') { valA = a.premium || 0; valB = b.premium || 0; }
                else if (col === 'comm') { valA = a.commission || 0; valB = b.commission || 0; }
                else if (col === 'status') { valA = a._status; valB = b._status; }
                
                if (valA < valB) return state.comm.sortAsc ? -1 : 1;
                if (valA > valB) return state.comm.sortAsc ? 1 : -1;
                return 0;
            });

            const getArrow = (col) => (state.comm.sortCol === col) ? (state.comm.sortAsc ? ' ▲' : ' ▼') : ' <span style="opacity:0.3;">▼</span>';
            thead.innerHTML = `
                <tr>
                    <th style="width:15%; cursor:pointer;" onclick="sortComm('date')">Date / File ${getArrow('date')}</th>
                    <th style="width:25%; cursor:pointer;" onclick="sortComm('client')">Client Name ${getArrow('client')}</th>
                    <th style="width:20%; cursor:pointer;" onclick="sortComm('pol')">Policy # ${getArrow('pol')}</th>
                    <th style="width:15%; cursor:pointer;" onclick="sortComm('prem')">Premium ${getArrow('prem')}</th>
                    <th style="width:15%; cursor:pointer;" onclick="sortComm('comm')">Commission ${getArrow('comm')}</th>
                    <th style="width:10%; cursor:pointer;" onclick="sortComm('status')">Status ${getArrow('status')}</th>
                </tr>`;
            
            tbody.innerHTML = '';
            
            displayData.slice(0, 500).forEach(c => {
                let badgeStyle = "background:#e2e8f0; color:#475569;";
                if(c._status === 'Matched') badgeStyle = "background:#dcfce7; color:#166534; border:1px solid #bbf7d0;";
                if(c._status === 'Commission Only') badgeStyle = "background:#f1f5f9; color:#64748b; border:1px dashed #cbd5e1;";
                if(c._status === 'Active List Only') badgeStyle = "background:#fee2e2; color:#991b1b; border:1px solid #fca5a5;";

                let commDisplay = formatCurrency(c.commission);
                let dateDisplay = `<div style="font-weight:700;">${c.month}</div><small style="color:var(--color-text-secondary); font-size:0.8em;">${c.file}</small>`;
                
                if(c._status === 'Active List Only') {
                    commDisplay = '<span style="color:#ef4444; font-weight:bold; font-size:0.9em;">MISSING</span>';
                    dateDisplay = `<div style="color:#ef4444; font-weight:bold;">No Payment</div><small style="color:var(--color-text-secondary); font-size:0.8em;">Master List</small>`;
                }

                let premDisplay = (c.premium && c.premium !== 0) ? formatCurrency(c.premium) : '<span style="color:#cbd5e1">-</span>';
                let client = c.client_name || '-';
                if(client.length > 30) client = client.substring(0, 30) + "...";

                tbody.innerHTML += `
                    <tr>
                        <td>${dateDisplay}</td>
                        <td style="font-size:0.9em;">${toTitleCase(client)}</td>
                        <td style="font-family:monospace; font-size:1.1em;">${c.policy_number}</td>
                        <td>${premDisplay}</td>
                        <td style="font-weight:800; color:var(--color-text-primary);">${commDisplay}</td>
                        <td><span style="padding:2px 8px; border-radius:12px; font-size:0.75em; font-weight:700; display:inline-block; width:100%; text-align:center; ${badgeStyle}">${c._status}</span></td>
                    </tr>`;
            });
            
            if(displayData.length === 0) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--color-text-secondary);">No data found.</td></tr>`;
        }

        function exportCommTable() {
            const data = getReconciledData().map(c => ({ 
                "File Source": c.file, 
                "Month": c.month, 
                "Client": c.client_name, 
                "Policy": c.policy_number, 
                "Premium": c.premium, 
                "Commission": c.commission, 
                "Status": c._status 
            }));
            const ws = XLSX.utils.json_to_sheet(data); 
            const wb = XLSX.utils.book_new(); 
            XLSX.utils.book_append_sheet(wb, ws, "Reconciliation"); 
            XLSX.writeFile(wb, "Reconciliation_Report.xlsx");
        }

        function renderConsolidated() {
            showLoading();
            setTimeout(() => {
                if(!document.getElementById('stat-matched-cash')) { hideLoading(); return; }
                const pIdx = parseInt(document.getElementById('map-pol-num').value);
                const premIdx = parseInt(document.getElementById('map-premium').value);
                const typeIdx = parseInt(document.getElementById('map-type').value); 
                const includeProj = document.getElementById('chk-include-projection').checked;
                
                let aggregatedComms = {}; 
                let totalCommSplit = 0; 

                state.comm.data.forEach(c => {
                    totalCommSplit += c.commission;
                    let p = normalizePolicy(c.policy_number);
                    if (!aggregatedComms[p]) aggregatedComms[p] = { total: 0, claimed: false };
                    aggregatedComms[p].total += c.commission;
                });

                document.getElementById('stat-total-split').innerText = formatCurrency(totalCommSplit);

                globalPolicySet.clear();
                let matchedPolicyCount = 0;
                let totalVerifiedCash = 0;
                let totalUnmatchedProjected = 0;
                let activeCount = 0;
                let excludedCount = 0;

                if (pIdx > -1) {
                    state.policy.data.forEach((row, i) => {
                        if(state.policy.excludedIndices.has(i)) return; 
                        
                        let isActive = true;
                        if(typeIdx > -1 && row[typeIdx]) {
                            let status = String(row[typeIdx]).toLowerCase();
                            if(status.match(/cancel|dead|term|quote|lead/i)) isActive = false;
                        }
                        if(!isActive) { excludedCount++; return; } 

                        activeCount++;
                        let pRaw = row[pIdx];
                        let pNorm = normalizePolicy(pRaw);
                        globalPolicySet.add(pNorm);
                        let premium = (premIdx > -1) ? cleanNum(row[premIdx]) : 0;
                        
                        let matchedCash = 0;
                        let foundMatch = false;

                        if(aggregatedComms[pNorm]) {
                            matchedCash = aggregatedComms[pNorm].total;
                            foundMatch = true;
                            aggregatedComms[pNorm].claimed = true;
                        } 
                        else {
                            for (let commKey in aggregatedComms) {
                                if(!aggregatedComms[commKey].claimed && isFuzzyMatch(pNorm, commKey)) {
                                    matchedCash = aggregatedComms[commKey].total;
                                    foundMatch = true;
                                    aggregatedComms[commKey].claimed = true;
                                    break; 
                                }
                            }
                        }

                        if(foundMatch) {
                            totalVerifiedCash += matchedCash;
                            matchedPolicyCount++;
                        } else {
                            totalUnmatchedProjected += (premium * 0.10);
                        }
                    });
                    
                    if(includeProj) { globalBaseRevenue = totalVerifiedCash + totalUnmatchedProjected; } 
                    else { globalBaseRevenue = totalVerifiedCash; }
                } else {
                    globalBaseRevenue = totalCommSplit;
                }

                const finRevInput = document.getElementById('fin-revenue');
                if(finRevInput && finRevInput.value === "") {
                    finRevInput.value = globalBaseRevenue.toFixed(2);
                    calcFinancials(); 
                }

                document.getElementById('stat-count').innerText = activeCount;
                document.getElementById('stat-matched-cash').innerText = formatCurrency(totalVerifiedCash);
                
                const projEl = document.getElementById('stat-unmatched-proj');
                projEl.innerText = formatCurrency(totalUnmatchedProjected);
                if(includeProj) { projEl.style.textDecoration = "none"; projEl.style.opacity = "1"; } 
                else { projEl.style.textDecoration = "line-through"; projEl.style.opacity = "0.5"; }

                document.getElementById('stat-base-rev').innerText = formatCurrency(globalBaseRevenue);
                document.getElementById('debug-excluded-count').innerText = `Excluded by Status Filter: ${excludedCount}`;
                
                const elPct = document.getElementById('stat-matched-percent');
                if(elPct) {
                    let coverage = 0;
                    if(activeCount > 0) coverage = (matchedPolicyCount / activeCount) * 100;
                    elPct.innerText = coverage.toFixed(1) + "%";
                }
                generateCarrierChecklist();
                renderMonthlyStats();
                renderCommDetailTable(); 
                manualSliderUpdate();
                
                applyStrategy('balanced');
                
                hideLoading();
            }, 100);
        }
        
        function renderMonthlyStats() {
            let buckets = {}; let today = new Date(); for(let i=0; i<12; i++) { let d = new Date(today.getFullYear(), today.getMonth() - i, 1); let k = getMonthKey(d); buckets[k] = { expected: 0, received: 0 }; }
            const effIdx = parseInt(document.getElementById('map-effective').value); const typeIdx = parseInt(document.getElementById('map-type').value);
            const force6mo = document.getElementById('chk-6mo-default').checked; const projectPast = document.getElementById('chk-past-terms').checked;
            if(effIdx > -1) {
                Object.keys(buckets).forEach(monthKey => {
                    let expectedCount = 0;
                    state.policy.data.forEach((row, i) => {
                        if(state.policy.excludedIndices.has(i)) return;
                        let effVal = row[effIdx]; let effDate = safeParseDate(effVal);
                        let isNewBiz = false; if(typeIdx > -1) { let typeStr = String(row[typeIdx]).toLowerCase(); if(typeStr.includes("new") || typeStr.includes("nb")) isNewBiz = true; }
                        if(effDate) {
                            if (dateHitsMonth(effDate, monthKey)) { expectedCount++; }
                            else if (projectPast && !isNewBiz) {
                                let pastEff = new Date(effDate); if(force6mo) pastEff.setMonth(pastEff.getMonth() - 6); else pastEff.setFullYear(pastEff.getFullYear() - 1);
                                if (dateHitsMonth(pastEff, monthKey)) expectedCount++;
                                if(force6mo) { let pastEff2 = new Date(effDate); pastEff2.setMonth(pastEff2.getMonth() - 12); if (dateHitsMonth(pastEff2, monthKey)) expectedCount++; }
                            }
                        } 
                    });
                    buckets[monthKey].expected = expectedCount;
                });
            }
            let monthSets = {};
            state.comm.data.forEach(c => {
                let m = c.month; if(m === 'Unknown') return; if(!monthSets[m]) monthSets[m] = new Set();
                let p = normalizePolicy(c.policy_number);
                if(globalPolicySet.has(p)) monthSets[m].add(p);
                else { for(let gp of globalPolicySet) { if(isFuzzyMatch(gp, p)) { monthSets[m].add(gp); break; } } }
            });
            Object.keys(buckets).forEach(monthKey => {
                let setA = monthSets[monthKey] || new Set();
                let [y, m] = monthKey.split('-').map(Number);
                let nextM = m + 1; let nextY = y; if (nextM > 12) { nextM = 1; nextY++; }
                let nextKey = `${nextY}-${String(nextM).padStart(2, '0')}`;
                let setB = monthSets[nextKey] || new Set();
                let combined = new Set([...setA, ...setB]);
                buckets[monthKey].received = combined.size; 
            });
            const tbody = document.querySelector('#monthly-stats-table tbody'); tbody.innerHTML = '';
            let lbls=[], data=[]; let sortedKeys = Object.keys(buckets).sort();
            sortedKeys.forEach(m => {
                let b = buckets[m]; let miss = 0; if(b.expected > 0) miss = ((b.expected - b.received) / b.expected) * 100; if(miss < 0) miss = 0; 
                lbls.push(m); data.push(miss); const pctClass = miss > 50 ? 'stat-missing' : 'stat-good';
                tbody.innerHTML += `<tr><td>${m}</td><td>${b.expected}</td><td>${b.received}</td><td class="${pctClass}">${miss.toFixed(1)}%</td></tr>`;
            });
            if(chartInstance) chartInstance.destroy();
            chartInstance = new Chart(document.getElementById('missingTrendChart'), { type: 'line', data: { labels: lbls, datasets: [{ label: 'Policies Missing Payment (%)', data: data, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } } });
            renderOnScreenMissingList();
        }
        function renderOnScreenMissingList() {
             let oneYearAgo = new Date(); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
             let paidPolicies = new Set(); state.comm.data.forEach(c => { let d = new Date(c.month + "-01"); if(d >= oneYearAgo || c.month === 'Unknown') paidPolicies.add(normalizePolicy(c.policy_number)); });
             const pIdx = parseInt(document.getElementById('map-pol-num').value); const nameIdx = parseInt(document.getElementById('map-account').value); const premIdx = parseInt(document.getElementById('map-premium').value);
             let tbody = document.getElementById('missing-list-body'); if (!tbody) return; tbody.innerHTML = "";
             let count = 0;
             state.policy.data.forEach((row, i) => {
                 if(state.policy.excludedIndices.has(i)) return; 
                 let pRaw = row[pIdx]; let pNorm = normalizePolicy(pRaw);
                 let clientName = nameIdx > -1 ? row[nameIdx] : 'Unknown'; let prem = premIdx > -1 ? formatCurrency(cleanNum(row[premIdx])) : '-';
                 let matched = false; if(paidPolicies.has(pNorm)) matched = true; else { for(let paidP of paidPolicies) { if(isFuzzyMatch(pNorm, paidP)) { matched = true; break; } } }
                 if(!matched) { count++; if(count < 100) { tbody.innerHTML += `<tr><td style="color:var(--color-risk-high);">${pRaw}</td><td>${toTitleCase(clientName)}</td><td>${prem}</td></tr>`; } }
             });
             if(count > 0) document.getElementById('on-screen-missing-list').style.display = 'block';
        }
        function confirmClearDB() { if(confirm("DANGER: This will delete ALL saved valuations forever. Are you sure?")) { fetch(window.location.href, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body: 'action=clear_db' }).then(res => res.json()).then(data => { if(data.status === 'success') { alert("Database cleared."); window.location.reload(); } else { alert("Error: " + data.message); } }); } }
        
        async function loadDeal(id) {
            showLoading();
            try {
                let fd = new FormData(); fd.append('action', 'load_deal'); fd.append('id', id);
                let res = await fetch(window.location.href, { method:'POST', body:fd });
                let d = await res.json();
                
                if(d.status === 'success') {
                     let data = d.data;
                     if(data.inputs) {
                         document.getElementById('input-deal-name').value = data.inputs.name || '';
                         if(data.inputs.type) { 
                             document.querySelector(`input[name="deal_type"][value="${data.inputs.type}"]`).checked = true; 
                             toggleDealQuestions(data.inputs.type); 
                         }
                         
                         if(data.inputs.revenue) document.getElementById('fin-revenue').value = data.inputs.revenue;
                         if(data.inputs.opex) document.getElementById('fin-opex').value = data.inputs.opex;
                         if(data.inputs.addbacks) document.getElementById('fin-addbacks').value = data.inputs.addbacks;
                         if(data.inputs.ownerComp) document.getElementById('fin-owner-comp').value = data.inputs.ownerComp;

                         document.getElementById('factor-loss').value = data.inputs.lossFactor || 0;
                         document.getElementById('factor-carrier').value = data.inputs.carrierFactor || 0;

                         if(data.inputs.struct) {
                             state.structure = data.inputs.struct;
                             document.getElementById('struct-cash').value = state.structure.cash || 0;
                             document.getElementById('struct-note').value = state.structure.note || 0;
                             document.getElementById('struct-earnout').value = state.structure.earnout || 0;
                             document.getElementById('struct-equity').value = state.structure.equity || 0;
                         } else {
                             state.structure = { cash: 0, note: 0, earnout: 0, equity: 0 };
                         }

                         if(data.state) {
                             state = data.state;
                             state.policy.map = new Map(state.policy.map); 
                             state.policy.excludedIndices = new Set(state.policy.excludedIndices); 
                             state.comm.seen = new Set(state.comm.seen); 
                             state.excludedCarriers = new Set(state.excludedCarriers);
                             
                             restoreDropdownOptions();

                             if(data.inputs.mappings) {
                                 const m = data.inputs.mappings;
                                 if(m.pol) document.getElementById('map-pol-num').value = m.pol;
                                 if(m.carrier) document.getElementById('map-carrier').value = m.carrier;
                                 if(m.prem) document.getElementById('map-premium').value = m.prem;
                                 if(m.eff) document.getElementById('map-effective').value = m.eff;
                                 if(m.exp) document.getElementById('map-expiration').value = m.exp;
                                 if(m.acc) document.getElementById('map-account').value = m.acc;
                                 if(m.type) document.getElementById('map-type').value = m.type;
                                 document.getElementById('chk-6mo-default').checked = m.force6mo;
                                 document.getElementById('chk-past-terms').checked = m.pastTerms;
                                 document.getElementById('chk-include-projection').checked = m.incProj;
                             }

                             if(state.policy.loaded) { document.getElementById('policy-selector-container').style.display='block'; reMapColumns(); }
                             if(state.comm.loaded) { document.getElementById('consolidated-view').style.display='block'; updateFilesList(); renderConsolidated(); }
                         }

                         calcFinancials();

                         setTimeout(() => {
                             if(data.inputs.unappointed) {
                                 const checkboxes = document.querySelectorAll('.carrier-appointment-chk');
                                 checkboxes.forEach(chk => {
                                     const name = chk.parentElement.textContent.trim();
                                     if(data.inputs.unappointed.includes(name)) chk.checked = false;
                                 });
                                 runAIMasterCalc();
                             }

                             if(data.inputs.mult) {
                                 const slider = document.getElementById('valuation-slider');
                                 slider.value = data.inputs.mult;
                                 const display = document.getElementById('slider-val-display');
                                 if(display) display.innerText = parseFloat(data.inputs.mult).toFixed(2) + 'x';
                                 manualSliderUpdate();
                             }

                             if(state.structure) {
                                 const total = (state.structure.cash || 0) + (state.structure.note || 0) + (state.structure.earnout || 0) + (state.structure.equity || 0);
                                 if(total > 0) {
                                     const cashPct = Math.round((state.structure.cash / total) * 100);
                                     const cashSlider = document.getElementById('range-cash-pct');
                                     if(cashSlider) cashSlider.value = cashPct;
                                     const cashDisp = document.getElementById('disp-cash-pct');
                                     if(cashDisp) cashDisp.innerText = cashPct + "%";
                                     updateWaterfallViz(state.structure.cash, (total - state.structure.cash));
                                 }
                             }
                         }, 500);

                         loadedDealStatus = d.db_status || 'active'; 
                         const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?id=' + id;
                         window.history.pushState({path:newUrl},'',newUrl);

                         openAdminTab('tab-horizon', document.querySelectorAll('.admin-tab')[1]); hideHorizonForm(); showHorizonForm();
                     }
                } else { alert("Could not load deal."); }
            } catch(e) { console.error(e); alert("Error loading."); }
            hideLoading();
        }

        async function deleteDeal(id) { if(!confirm("Are you sure?")) return; let fd = new FormData(); fd.append('action', 'delete_deal'); fd.append('id', id); await fetch(window.location.href, { method:'POST', body:fd }); location.reload(); }
    </script>
<?php endif; ?>
</body>
</html>