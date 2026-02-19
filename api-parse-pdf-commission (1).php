<?php
// File: partials/api-parse-pdf-commission.php
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
    $text = $input['text'] ?? '';

    if (empty($text)) {
        throw new Exception('No text provided.');
    }

    // --- AI PROMPT TAILORED FOR HORIZON AGENCY PDFS ---
    $prompt = "Analyze this insurance commission statement text. 
    Extract a JSON array of objects for every policy row found.
    
    The columns in the PDF usually appear in this order:
    Producer | Account Name | Master Company | Policy Number | LOB Code | Premium | Total Commission | Commission Split | Payee
    
    Your goal is to extract the **Commission Split** value for each policy.
    
    For each valid policy row, return an object with these exact keys:
    - 'policy_number': The Policy Number (e.g., 820250387, G01366609300). Remove spaces/dashes.
    - 'commission': The value from the **'Commission Split'** column. (Do NOT use 'Total Commission' unless Split is missing).
    - 'carrier': The Master Company name.
    - 'premium': The Premium Amount.

    CRITICAL INSTRUCTIONS:
    1. Ignore summary rows, totals, or page headers.
    2. Clean all numbers: remove '$', ',', '(', ')'. Treat '(100.00)' as '-100.00'.
    3. Return ONLY valid JSON. No markdown formatting.
    
    TEXT DATA START:
    " . substr($text, 0, 500000) . " 
    TEXT DATA END";

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
    $ai_text = $json_response['candidates'][0]['content']['parts'][0]['text'] ?? '[]';
    
    // Clean Markdown if AI adds it
    $ai_text = str_replace(['```json', '```'], '', $ai_text);

    echo json_encode(['success' => true, 'data' => json_decode($ai_text)]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>