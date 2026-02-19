<?php
// File: Admin Dashboard/api-mapper.php
session_start();
session_write_close();
header('Content-Type: application/json');

// Load Config
$paths = ['../config_secrets.php', 'config_secrets.php'];
foreach ($paths as $path) { if(file_exists($path)) require_once($path); }

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $headers = $input['headers'] ?? [];

    if (empty($headers)) { echo json_encode(['success' => false, 'error' => 'No headers']); exit; }

    // FIX: Don't shift the array, just filter out empty strings for the prompt
    // We keep the original array indices valid for the frontend
    $clean_headers = array_filter($headers, function($h) { return !empty(trim($h)); });
    $headers_string = implode(', ', $clean_headers);

    $prompt = "Map these Excel headers to standard keys.
    Headers: [$headers_string]
    
    REQUIRED KEYS:
    - 'policy_number' (Policy Number, Policy #)
    - 'premium' (Premium - Written, Annualized Premium, Amount)
    - 'master_company' (Master Company, Carrier, Company)
    - 'account_name' (Account Name, Insured, Client)
    - 'lob' (Line of Business, LOB)
    - 'effective_date' (Effective)
    - 'term' (Policy Term)
    
    Return JSON: {\"policy_number\": \"ExactHeaderName\", ...}";

    $api_key = defined('GEMINI_API_KEY') ? GEMINI_API_KEY : ''; 
    $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=' . $api_key;
    
    $data = ['contents' => [['parts' => [['text' => $prompt]]]]];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    
    $response = curl_exec($ch);
    curl_close($ch);

    $json = json_decode($response, true);
    $text = $json['candidates'][0]['content']['parts'][0]['text'] ?? '{}';
    $text = str_replace(['```json', '```'], '', $text);
    
    echo json_encode(['success' => true, 'mapping' => json_decode($text)]);
} catch (Exception $e) {
    echo json_encode(['success' => false]);
}
?>