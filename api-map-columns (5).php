<?php
// File: partials/api-map-columns.php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit();
}

require_once('../config_secrets.php');

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $headers = $input['headers'] ?? [];

    if (empty($headers)) {
        throw new Exception('No headers provided.');
    }

    $headers_string = implode(', ', $headers);
    
    // Prompt to find specific columns for your new breakdowns + commission
    $prompt = "I have a list of insurance data with these headers: [$headers_string]. 
    Map the following keys to the exact header string from the list:
    1. 'premium' (Annualized Premium, Amount, Price, Annual Prem)
    2. 'master_company' (Master Company, Carrier, Insurer, Company, Parent Company)
    3. 'lob' (Line of Business, LOB, Coverage, Class)
    4. 'policy_type' (Policy Type, Type)
    5. 'account_type' (Account Type, Customer Type - e.g. Commercial/Personal)
    6. 'commission' (Commission Amount, Comm $, Pay, Revenue)
    
    Return a JSON object: {\"premium\": \"...\", \"master_company\": \"...\", \"lob\": \"...\", \"policy_type\": \"...\", \"account_type\": \"...\", \"commission\": \"...\"}. 
    If a column is missing or ambiguous, set the value to null.";

    $api_key = defined('GEMINI_API_KEY') ? GEMINI_API_KEY : ''; 
    $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=' . $api_key;

    $data = [
        'contents' => [['parts' => [['text' => $prompt]]]],
        'generationConfig' => ['responseMimeType' => 'application/json']
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    
    $response = curl_exec($ch);
    
    if (curl_errno($ch)) {
        throw new Exception('Gemini Request Failed: ' . curl_error($ch));
    }
    curl_close($ch);

    $json_response = json_decode($response, true);
    $ai_text = $json_response['candidates'][0]['content']['parts'][0]['text'] ?? '{}';
    
    echo json_encode(['success' => true, 'mapping' => json_decode($ai_text)]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>