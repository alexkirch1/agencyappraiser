<?php
// --- CONFIGURATION ---
$TO_EMAIL = 'mergers@rockyquote.com'; 
$EMAIL_SUBJECT = 'New Agency Valuation Lead';

// --- STANDARD SETUP ---
// Turn off display_errors so they don't break the JSON response to the browser
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

try {
    // 1. Read Incoming Data
    $input_raw = file_get_contents('php://input');
    $input = json_decode($input_raw, true);

    if (!$input) {
        throw new Exception('No data received.');
    }

    // 2. Validate Email (Required for Reply-To)
    $contact_email = filter_var($input['contact_email'] ?? '', FILTER_VALIDATE_EMAIL);
    if (!$contact_email) {
        throw new Exception('A valid email address is required.');
    }
    // Sanitize other inputs for safety in email display
    $contact_name = htmlspecialchars($input['contact_name'] ?? 'Unknown');
    $agency_name = htmlspecialchars($input['agency_name'] ?? 'Unknown');

    // 3. Format the Email Body
    $message = "New Lead Received from Valuation Tool\n\n";
    $message .= "================================\n";
    $message .= "CONTACT DETAILS\n";
    $message .= "================================\n";
    $message .= "Name:   $contact_name\n";
    $message .= "Email:  $contact_email\n";
    $message .= "Agency: $agency_name\n\n";

    $message .= "================================\n";
    $message .= "VALUATION DATA\n";
    $message .= "================================\n";
    
    // Loop through all custom fields and format them nicely for the email
    if (!empty($input['custom_fields']) && is_array($input['custom_fields'])) {
        foreach ($input['custom_fields'] as $key => $value) {
            // Turn "revenue_ltm" into "Revenue Ltm" for readability
            $readable_label = ucwords(str_replace(['_', '-'], ' ', $key));
            
            // If it looks like a number, format it, otherwise leave it as text
            if (is_numeric($value) && $value > 1000) {
                 $display_value = number_format((float)$value);
            } else {
                 $display_value = $value;
            }

            // Pad the label so the values align nicely
            $message .= str_pad($readable_label . ':', 30) . " $display_value\n";
        }
    }

    // 4. Send the Email
    // Setting proper headers ensures it doesn't go to spam and you can hit "Reply"
    $headers = "From: Agency Appraiser <no-reply@agencyappraiser.com>\r\n";
    $headers .= "Reply-To: $contact_name <$contact_email>\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();

    $mail_sent = mail($TO_EMAIL, "$EMAIL_SUBJECT - $agency_name", $message, $headers);

    if (!$mail_sent) {
        // Log the specific error if possible, but generic error for user
        error_log("Mail failed to send to $TO_EMAIL");
        throw new Exception('Server failed to send email notification.');
    }

    // 5. Return Success (This tells the frontend to unblur the results)
    echo json_encode(['success' => true]);

} catch (Exception $e) {
    // Send a 400 Bad Request error back to the browser
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>