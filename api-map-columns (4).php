<?php
// File: partials/api-map-columns.php
session_start();
header('Content-Type: application/json');

// --- SECURITY CHECK ENABLED ---
if (!isset($_SESSION['is_logged_in']) || $_SESSION['is_logged_in'] !== true) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}
// ------------------------------

require_once('../config_secrets.php');

try {
    // 1. Get the Raw POST Data
    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, true);
    
    // Debugging: If JSON is invalid, return error
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON received: ' . json_last_error_msg());
    }

    $headers = $input['headers'] ?? [];

    if (empty($headers)) {
        throw new Exception('No headers provided in request.');
    }

    $headers_string = implode(', ', $headers);
    
    // 2. Build the AI Prompt
    $prompt = "I have insurance data headers: [$headers_string]. 
    Map these keys to the exact header string from the list:
    1. 'policy_number' (Policy Number, Policy #, Pol No)
    2. 'premium' (Annualized Premium, Written Premium, Amount, Prem)
    3. 'master_company' (Master Company, Carrier, Company, Writing Company)
    4. 'lob' (Line of Business, LOB, Coverage)
    5. 'policy_type' (Policy Type, Type)
    6. 'account_type' (Account Type, Customer Type)
    
    Return JSON: {\"policy_number\": \"...\", \"premium\": \"...\", \"master_company\": \"...\", \"lob\": \"...\", \"policy_type\": \"...\", \"account_type\": \"...\"}. 
    Set to null if not found.";

    $api_key = defined('GEMINI_API_KEY') ? GEMINI_API_KEY : ''; 
    $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=' . $api_key;

    $data = [
        'contents' => [['parts' => [['text' => $prompt]]]],
        'generationConfig' => ['responseMimeType' => 'application/json']
    ];

    // 3. Send Request to Google Gemini
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    
    $response = curl_exec($ch);
    
    if (curl_errno($ch)) {
        throw new Exception('Curl Error: ' . curl_error($ch));
    }
    curl_close($ch);

    // 4. Process Response
    $json_response = json_decode($response, true);
    
    // Check if Gemini returned an error structure
    if (isset($json_response['error'])) {
        throw new Exception('AI Error: ' . ($json_response['error']['message'] ?? 'Unknown AI error'));
    }

    $ai_text = $json_response['candidates'][0]['content']['parts'][0]['text'] ?? '{}';
    
    // --- FIX: Remove Markdown formatting if AI adds it ---
    $ai_text = str_replace(['```json', '```', "```php"], '', $ai_text);
    // ----------------------------------------------------
    
    // 5. Return clean JSON to frontend
    echo json_encode(['success' => true, 'mapping' => json_decode($ai_text)]);

} catch (Exception $e) {
    // Return 500 Error so the frontend knows something went wrong
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>