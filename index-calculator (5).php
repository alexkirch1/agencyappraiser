<?php
// File: public_html/Calculator/index.php

// Define path to partials relative to this file
$partials = 'partials/';

// 1. Load Head (Styles)
if (file_exists($partials . 'head-calculator.php')) {
    require_once($partials . 'head-calculator.php');
} else {
    echo "Error: head-calculator.php not found.";
}
?>
<body>
    <div id="page-wrapper" class="page-wrapper">
        <?php 
            // 2. Load Main Content (Form + Tabs)
            if (file_exists($partials . 'main-content-calculator.php')) {
                require_once($partials . 'main-content-calculator.php'); 
            }

            // 3. Load Sidebar (Results)
            if (file_exists($partials . 'sidebar-calculator.php')) {
                require_once($partials . 'sidebar-calculator.php'); 
            }
        ?>
    </div>

    <?php 
        // 4. Load Modals
        if (file_exists($partials . 'modals-calculator.php')) {
            require_once($partials . 'modals-calculator.php'); 
        }

        // 5. Load Scripts
        if (file_exists($partials . 'scripts-calculator.php')) {
            require_once($partials . 'scripts-calculator.php'); 
        }
    ?>
</body>
</html>