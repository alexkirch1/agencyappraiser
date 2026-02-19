<?php
// If you haven't installed the library via composer, this will cause a 500 error.
// Ensure this path is correct based on where your vendor folder is.
require __DIR__ . '/../../vendor/autoload.php'; 

// We must clear any existing data array to ensure we only return what we parse.
$data = [];
    'prog_pl_premium' => '', 'prog_pl_pif' => '', 'prog_pl_loss_ratio' => '',
    'prog_cl_premium' => '', 'prog_cl_pif' => '', 'prog_cl_loss_ratio' => '',
    'prog_bundle_rate' => '', 'prog_ytd_apps' => ''
];'
];

if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_FILES['report'])) {
    $parser = new \Smalot\PdfParser\Parser();
    $pdf = $parser->parseFile($_FILES['report']['tmp_name']);
    $text = $pdf->getText();

    // Section A: Personal Lines Data Extraction
 if (preg_match('/"Total Personal Lines",,"\$([\d,]+)","\$[\d,]+","(\d+)","(\d+)%"/', $text, $matches)) {
    $data['prog_pl_premium'] = str_replace(',', '', $matches[1]);
    $data['prog_pl_pif'] = $matches[2];
    $data['prog_pl_loss_ratio'] = $matches[3];
}

    // Section B: Commercial Lines Data Extraction
    if (preg_match('/"Commercial Lines","\d+","\$([\d,]+)","\$[\d,]+","(\d+)","(\d+)%"/', $text, $matches)) {
        $data['cl_wp'] = str_replace(',', '', $matches[1]); // 359854
        $data['cl_pif'] = $matches[2]; // 53
        $data['cl_lr'] = $matches[3];  // 7
    }

    // Section C: Health & Quality
    if (preg_match('/"PIF Bundle Rate","\d+%","\d+%","\d+%","(\d+)%"/', $text, $matches)) {
        $data['bundle'] = $matches[1]; // 68
    }
    
    if (preg_match('/"Total Personal Lines",".*?","\d+","(\d+)","\d+%"/', $text, $matches)) {
        $data['ytd_apps'] = $matches[1]; // 105
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <style>
        body { background-color: #2c3e50; color: white; font-family: sans-serif; padding: 20px; }
        .section { margin-bottom: 25px; }
        .label { font-weight: bold; display: block; margin-bottom: 5px; font-size: 0.9em; }
        .sub-label { font-style: italic; color: #bdc3c7; font-size: 0.8em; margin-bottom: 10px; display: block; }
        input[type="text"] { width: 100%; padding: 10px; background: #34495e; border: 1px solid #455a64; color: white; border-radius: 4px; box-sizing: border-box; }
        .upload-box { background: #1a252f; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px dashed #7f8c8d; }
    </style>
</head>
<body>

    <div class="upload-box">
        <form method="POST" enctype="multipart/form-data">
            <label class="label">Upload Account Production Report (PDF)</label>
            <input type="file" name="report" accept=".pdf" required>
            <button type="submit">Parse Report</button>
        </form>
    </div>

    <div class="section">
        <h3>Section A: Personal Lines Book</h3>
        <span class="sub-label">Use your `Account Production Report` (T12 Summary)</span>
        
        <label class="label">Total Personal Lines T12 Written Premium</label>
        <input type="text" value="<?= $data['pl_wp'] ?>" placeholder="e.g., 500000">

        <label class="label">Total Personal Lines PIF (Policies in Force)</label>
        <input type="text" value="<?= $data['pl_pif'] ?>" placeholder="e.g., 250">

        <label class="label">Personal Lines T12 Loss Ratio (%)</label>
        <input type="text" value="<?= $data['pl_lr'] ?>" placeholder="e.g., 45.0">
    </div>

    <div class="section">
        <h3>Section B: Commercial Lines Book</h3>
        <span class="sub-label">Use your `Account Production Report` (T12 Summary)</span>

        <label class="label">Total Commercial Lines T12 Written Premium</label>
        <input type="text" value="<?= $data['cl_wp'] ?>" placeholder="e.g., 250000">

        <label class="label">Total Commercial Lines PIF (Policies in Force)</label>
        <input type="text" value="<?= $data['cl_pif'] ?>" placeholder="e.g., 45">

        <label class="label">Commercial Lines T12 Loss Ratio (%)</label>
        <input type="text" value="<?= $data['cl_lr'] ?>" placeholder="e.g., 25.5">
    </div>

    <div class="section">
        <h3>Section C: Overall Book Health & Quality</h3>
        
        <label class="label">T12 PIF Bundle Rate (%)</label>
        <input type="text" value="<?= $data['bundle'] ?>" placeholder="e.g., 65">

        <label class="label">Total Personal Lines YTD Apps (Applications)</label>
        <input type="text" value="<?= $data['ytd_apps'] ?>" placeholder="e.g., 50">

        <label class="label">"Diamond" or Program Status?</label>
        <span class="sub-label">This is from your agency-level info</span>
        <input type="radio" name="diamond" value="yes"> Yes
        <input type="radio" name="diamond" value="no"> No
    </div>
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'data' => $data]);
    exit;
}
</body>
</html>