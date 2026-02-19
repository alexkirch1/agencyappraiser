<?php
// File: Admin Dashboard/api-pdf.php
session_start();
session_write_close();
set_time_limit(300);
header('Content-Type: application/json');

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $text = $input['text'] ?? '';
    if (empty($text)) { echo json_encode(['success' => true, 'data' => []]); exit; }

    $lines = explode("\n", $text);
    $extracted = [];

    foreach ($lines as $line) {
        $line = trim($line);
        
        // 1. FILTER JUNK
        if (stripos($line, 'MVR') !== false || stripos($line, 'Chargeback') !== false || stripos($line, 'Total') !== false) continue;
        if (strpos($line, '$') === false) continue; 

        // 2. FIND POLICY ANCHOR
        // Matches: "820250387", "7205J 088665"
        if (preg_match('/(?<!\d)(?<!\/)([A-Z0-9]{3,10}[\s\-]?[A-Z0-9]{4,15})(?!\/)/', $line, $match)) {
            
            $policy_raw = $match[1];
            $policy_clean = preg_replace('/[^A-Z0-9]/', '', $policy_raw);

            // Safety Checks
            if (strlen($policy_clean) < 5) continue; 
            if (strpos($policy_raw, '/') !== false) continue;
            if (is_numeric($policy_raw) && strlen($policy_raw) == 4) continue; 

            // 3. FIND MONEY
            preg_match_all('/\$?([\d,]+\.\d{2})/', $line, $money_matches);
            $amounts = $money_matches[1] ?? [];

            if (count($amounts) > 0) {
                // Commission is LAST amount
                $comm = str_replace(',', '', end($amounts));
                // Premium is PREV amount
                $prem = (count($amounts) > 1) ? str_replace(',', '', prev($amounts)) : 0;

                // 4. EXTRACT NAME
                $parts = explode($policy_raw, $line);
                $left_side = trim($parts[0]);
                
                $words = preg_split('/\s+/', $left_side);
                $carrier = array_pop($words) ?? '-';
                
                if (in_array(strtoupper($carrier), ['INSURANCE','CO','COMPANY','WEST','GENERAL','CASUALTY','GROUP','MUTUAL'])) {
                    $carrier = (array_pop($words) ?? '') . ' ' . $carrier;
                }
                $name = implode(' ', $words);

                $extracted[] = [
                    'policy_number' => $policy_clean,
                    'display_policy' => $policy_raw,
                    'account_name' => $name,
                    'carrier' => $carrier,
                    'premium' => (float)$prem,
                    'commission' => (float)$comm
                ];
            }
        }
    }

    echo json_encode(['success' => true, 'data' => $extracted]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'data' => []]);
}
?>