<?php
// This is the sidebar for the "Carrier Book Purchase" tab.
// It is now displayed by default and its content is updated via JavaScript.
?>
<div id="carrier-results-panel" style="display:none;">
    <div id="results-content">
        
        <h3>Real-Time Book Valuation</h3>
        
        <div id="carrier-gated-results">
            
            <div id="carrier-sidebar-summary">
                 <div class="result-line carrier-metric-line" id="line-pl-premium" style="display:none;">
                    <span>PL Premium:</span>
                    <strong id="sidebar-pl-premium">---</strong>
                </div>
                 <div class="result-line carrier-metric-line" id="line-pl-pif" style="display:none;">
                    <span>PL PIF:</span>
                    <strong id="sidebar-pl-pif">---</strong>
                </div>
                 <div class="result-line carrier-metric-line" id="line-pl-loss-ratio" style="display:none;">
                    <span>PL Loss Ratio:</span>
                    <strong id="sidebar-pl-loss-ratio">---</strong>
                </div>
                 <div class="result-line carrier-metric-line" id="line-cl-premium" style="display:none;">
                    <span>CL Premium:</span>
                    <strong id="sidebar-cl-premium">---</strong>
                </div>
                 <div class="result-line carrier-metric-line" id="line-cl-pif" style="display:none;">
                    <span>CL PIF:</span>
                    <strong id="sidebar-cl-pif">---</strong>
                </div>
                <div class="result-line carrier-metric-line" id="line-cl-loss-ratio" style="display:none;">
                    <span>CL Loss Ratio:</span>
                    <strong id="sidebar-cl-loss-ratio">---</strong>
                </div>
                <div class="result-line carrier-metric-line" id="line-bundle-rate" style="display:none;">
                    <span>Bundle Rate:</span>
                    <strong id="sidebar-bundle-rate">---</strong>
                </div>
                <div class="result-line carrier-metric-line" id="line-ytd-apps" style="display:none;">
                    <span>YTD Apps:</span>
                    <strong id="sidebar-ytd-apps">---</strong>
                </div>
                <div class="result-line carrier-metric-line" id="line-diamond-status" style="display:none;">
                    <span>Diamond Status:</span>
                    <strong id="sidebar-diamond-status">---</strong>
                </div>

                <div class="result-line carrier-metric-line" id="line-safeco-dwp" style="display:none;">
                    <span>Total DWP (YTD):</span>
                    <strong id="sidebar-safeco-dwp">---</strong>
                </div>
                <div class="result-line carrier-metric-line" id="line-safeco-pif" style="display:none;">
                    <span>PIF (YTD):</span>
                    <strong id="sidebar-safeco-pif">---</strong>
                </div>
                <div class="result-line carrier-metric-line" id="line-safeco-loss-ratio" style="display:none;">
                    <span>Loss Ratio (YTD):</span>
                    <strong id="sidebar-safeco-loss-ratio">---</strong>
                </div>
                <div class="result-line carrier-metric-line" id="line-safeco-retention" style="display:none;">
                    <span>Retention (YTD):</span>
                    <strong id="sidebar-safeco-retention">---</strong>
                </div>
                <div class="result-line carrier-metric-line" id="line-safeco-nb-count" style="display:none;">
                    <span>NB Count (YTD):</span>
                    <strong id="sidebar-safeco-nb-count">---</strong>
                </div>

                <div class="result-line carrier-metric-line" id="line-hartford-pl-twp" style="display:none;"><span>PL TWP ($k):</span><strong id="sidebar-hartford-pl-twp">---</strong></div>
                <div class="result-line carrier-metric-line" id="line-hartford-pl-lr" style="display:none;"><span>PL Loss Ratio:</span><strong id="sidebar-hartford-pl-lr">---</strong></div>
                <div class="result-line carrier-metric-line" id="line-hartford-pl-retention" style="display:none;"><span>PL Retention:</span><strong id="sidebar-hartford-pl-retention">---</strong></div>
                <div class="result-line carrier-metric-line" id="line-hartford-cl-twp" style="display:none;"><span>CL TWP ($k):</span><strong id="sidebar-hartford-cl-twp">---</strong></div>
                <div class="result-line carrier-metric-line" id="line-hartford-cl-lr" style="display:none;"><span>CL Loss Ratio:</span><strong id="sidebar-hartford-cl-lr">---</strong></div>
                <div class="result-line carrier-metric-line" id="line-hartford-cl-retention" style="display:none;"><span>CL Retention:</span><strong id="sidebar-hartford-cl-retention">---</strong></div>




<div class="result-line carrier-metric-line" id="line-travelers-auto-wp" style="display:none;"><span>Auto WP (,000):</span><strong id="sidebar-travelers-auto-wp">---</strong></div>
                <div class="result-line carrier-metric-line" id="line-travelers-auto-lr" style="display:none;"><span>Auto Loss Ratio:</span><strong id="sidebar-travelers-auto-lr">---</strong></div>
                <div class="result-line carrier-metric-line" id="line-travelers-auto-retention" style="display:none;"><span>Auto Retention:</span><strong id="sidebar-travelers-auto-retention">---</strong></div>
            
            
            
            
           <div class="result-line carrier-metric-line" id="line-travelers-home-wp" style="display:none;"><span>Home WP (,000):</span><strong id="sidebar-travelers-home-wp">---</strong></div>
                
                
                
                <div class="result-line carrier-metric-line" id="line-travelers-home-lr" style="display:none;"><span>Home Loss Ratio:</span><strong id="sidebar-travelers-home-lr">---</strong></div>
                <div class="result-line carrier-metric-line" id="line-travelers-home-retention" style="display:none;"><span>Home Retention:</span><strong id="sidebar-travelers-home-retention">---</strong></div>



                <div class="result-line carrier-metric-line" id="line-msa-dwp" style="display:none;"><span>MSA Total DWP:</span><strong id="sidebar-msa-dwp">---</strong></div>
                <div class="result-line carrier-metric-line" id="line-msa-pif" style="display:none;"><span>MSA PIF:</span><strong id="sidebar-msa-pif">---</strong></div>
                <div class="result-line carrier-metric-line" id="line-msa-loss-ratio" style="display:none;"><span>MSA Loss Ratio:</span><strong id="sidebar-msa-loss-ratio">---</strong></div>
                <div class="result-line carrier-metric-line" id="line-msa-retention" style="display:none;"><span>MSA Retention:</span><strong id="sidebar-msa-retention">---</strong></div>
                <div class="result-line carrier-metric-line" id="line-msa-nb-premium" style="display:none;"><span>MSA NB Premium:</span><strong id="sidebar-msa-nb-premium">---</strong></div>
            </div>


            <hr style="border-top: 1px solid var(--color-border); margin: 10px 0;">
            
            <div class="result-line adjusted-offer"><span>LOW OFFER:</span><strong id="carrierLowOffer">---</strong></div>
            <div class="result-line adjusted-offer"><span>HIGH OFFER:</span><strong id="carrierHighOffer">---</strong></div>
        </div>
        
        <div class="action-buttons">
            <button id="carrier-notify-btn">View Valuation</button>
            <button id="carrier-pdf-btn">Print/Produce PDF Report</button>
        </div>
        
        <a id="methodology-link" onclick="openMethodologyModal('carrier')">View Valuation Methodology</a>
        
        <div id="carrier-email-status" class="email-status" style="display:none;"></div>

    </div>
</div>