<?php 
  // This is the index file for the Carrier app
  
  // *** PATH FIX ***
  // Added ../ to go up one level from 'index' to find 'partials'
  require_once('../partials/head-carrier.php'); 
?>
<body>
    <div id="page-wrapper" class="page-wrapper">
        <?php 
          // *** PATH FIX ***
          require_once('../partials/main-content-carrier.php'); 
        ?>
        <?php 
          // *** PATH FIX ***
          require_once('../partials/sidebar-carrier.php'); 
        ?>
    </div>
    <?php 
      // *** PATH FIX ***
      require_once('../partials/modals-carrier.php'); 
    ?>
    <?php 
      // *** PATH FIX ***
      require_once('../partials/scripts-carrier.php'); 
    ?>
</body>
</html>