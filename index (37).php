<?php 
  // File: Carrier/index.php
  // Purpose: Main entry point for the Carrier Book Valuation Tool
  
  // Load the header (contains CSS and meta tags)
  if (file_exists('partials/head-carrier.php')) {
      require_once('partials/head-carrier.php'); 
  } else {
      // Fallback error if paths are wrong
      die("Error: Could not find 'partials/head-carrier.php'. Please check your file structure.");
  }
?>
<body>
    <div id="page-wrapper" class="page-wrapper">
        <?php 
          // Load the main form content
          require_once('partials/main-content-carrier.php'); 
        ?>
        
        <?php 
          // Load the sidebar results panel
          require_once('partials/sidebar-carrier.php'); 
        ?>
    </div>

    <?php 
      // Load popups and modals
      require_once('partials/modals-carrier.php'); 
    ?>

    <?php 
      // Load JavaScript logic
      require_once('partials/scripts-carrier.php'); 
    ?>
</body>
</html>