<div class="container">
    <div id="theme-toggle-container">
        <button id="theme-toggle" onclick="toggleTheme()">🌙 Toggle to Light Mode</button>
    </div>

    <h1>Agency Appraiser Valuation</h1>
    <p class="subtitle">Carrier book purchase and valuation portal.</p>
    
    <nav id="main-nav">
        <a class="nav-item" href="/">❮ Back to Homepage</a>
        <a class="nav-item" href="/Calculator/">Valuation Calculator</a>
        <a class="nav-item active" href="/Carrier/index/index-carrier.php">Carrier Book Purchase</a>
    </nav>

    <div id="document-upload-tab" class="tab-content" style="display: block;">
        
        <form id="documentUploadForm">

            <div class="metric-group">
                <h3>1. Select Carrier</h3>
                <p style="color: var(--color-text-secondary); margin-top: -10px; font-size: 0.9em;">
                    Select the carrier book you wish to submit for review.
                </p>
                <label for="carrier-select">Select Carrier:</label>
                <select id="carrier-select" name="carrier_name" required>
                    <option value="">-- Please select a carrier --</option>
                    <option value="progressive">Progressive</option>
               
               
               
               
                 <option value="safeco">Safeco</option>
                    <option value="hartford">Hartford</option>
                    <option value="travelers">Travelers</option>
                    <option value="msa">Main Street America</option>
                </select>
          
          
          
          
            </div>

            <div id="entry-method-selector" class="metric-group" style="display:none;">
                <h3 id="report-availability-heading">2. Are your reports available right now?</h3>
                <div class="entry-method-buttons">
                    <button type="button" id="btn-report-yes">Yes, I have them</button>
                    <button type="button" id="btn-report-no">No, I'll enter data manually</button>
                </div>
            </div>
            
            <div id="upload-report-section" class="metric-group" style="display:none;">
                <h3>3. Upload Reports</h3>
                <p>Please upload your reports. The system will scan them and fill in your valuation automatically.</p>
                
                <label for="report-file-upload">Select Reports (PDF only):</label>
                <input type="file" id="report-file-upload" name="report_files[]" accept=".pdf" style="margin-top: 10px;" multiple>
                
                <button type="button" id="btn-submit-report-upload" class="upload-button" style="margin-top: 20px;">Upload & Analyze</button>
                
                <button type="button" id="btn-manual-entry-fallback" class="upload-button" style="margin-top: 10px; background-color: #f97316 !important; display: none;">
                    Upload Failed? Click for Manual Entry
                </button>
            </div>

            
            <div id="book-type-selector-progressive" class="metric-group book-type-selector" style="display:none;">
                <h3><span class="step-number">3.</span> Which book are you valuing?</h3>
                <div class="scope-options">
                    <label><input type="radio" name="book_type_progressive" value="personal"> Personal Lines Only</label>
                    <label><input type="radio" name="book_type_progressive" value="commercial"> Commercial Lines Only</label>
                    <label><input type="radio" name="book_type_progressive" value="both"> Both Personal & Commercial</label>
                </div>
            </div>
            
            <div id="book-type-selector-hartford" class="metric-group book-type-selector" style="display:none;">
                <h3><span class="step-number">3.</span> Which book are you valuing?</h3>
                <p class="section-instructions">Based on your Hartford Partner Breakdown Report.</p>
                <div class="scope-options">
                    <label><input type="radio" name="book_type_hartford" value="personal"> Personal Lines Only</label>
                    <label><input type="radio" name="book_type_hartford" value="commercial"> Small Commercial Only</label>
                    <label><input type="radio" name="book_type_hartford" value="both"> Both Personal & Small Commercial</label>
                </div>
            </div>

            <div id="book-type-selector-travelers" class="metric-group book-type-selector" style="display:none;">
                <h3><span class="step-number">3.</span> Which book are you valuing?</h3>
                <p class="section-instructions">Based on your Travelers PI Production Report.</p>
                <div class="scope-options">
                    <label><input type="radio" name="book_type_travelers" value="auto"> Auto Only</label>
                    <label><input type="radio" name="book_type_travelers" value="home"> Home Only</label>
                    <label><input type="radio" name="book_type_travelers" value="both"> Both Auto & Home</label>
                </div>
            </div>
            
            <div id="carrier-questions-progressive-manual" class="carrier-question-set" style="display:none;">
                
                <div id="progressive-ai-helper" style="display:none;">
                    <div class="instructions-box" style="background-color: var(--color-panel-bg); border: 1px solid var(--color-border); border-radius: 6px; padding: 5px 20px; margin-bottom: 20px;">
                        <p style="font-weight: 500; color: var(--color-accent);">Want to save time?</p>
                        <p style="font-size: 0.9em; color: var(--color-text-secondary);">Upload your T12 and YTD reports, and our AI will auto-fill this form.</p>
                        <label for="progressive-report-upload" style="font-size: 0.9em; font-weight: 500;">Select Progressive Reports (PDF):</label>
                        <input type="file" id="progressive-report-upload" name="report_files[]" accept=".pdf" style="margin-top: 10px;" multiple>
                        <button type="button" id="btn-progressive-ai-upload" class="upload-button" style="margin-top: 15px; margin-bottom: 10px;">
                            Upload & Auto-fill
                        </button>
                    </div>
                </div>

                <h3><span class="step-number">4.</span> Progressive Book Details</h3>
                
                <div class="instructions-box">
                    <p>Use your <strong>`Account Production Report`</strong> (T12) and <strong>`Account Production Report YTD`</strong>.</p>
                </div>

                <div class="prog-book-section" id="prog-personal-section">
                    <h4>Section A: Personal Lines Book</h4>
                    <p class="section-instructions">Use your <strong>`Account Production Report`</strong> (T12 Summary)</p>
                    <label>Total Personal Lines T12 Written Premium</label>
                    <input type="number" name="prog_pl_premium" placeholder="e.g., 500000" class="carrier-metric-input" data-sidebar-target="sidebar-pl-premium">
                    <label>Total Personal Lines PIF (Policies in Force)</label>
                    <input type="number" name="prog_pl_pif" placeholder="e.g., 250" class="carrier-metric-input" data-sidebar-target="sidebar-pl-pif">
                    <label>Personal Lines T12 Loss Ratio (%)</label>
                    <input type="number" name="prog_pl_loss_ratio" placeholder="e.g., 45.0" class="carrier-metric-input" data-sidebar-target="sidebar-pl-loss-ratio">
                </div>

                <div class="prog-book-section" id="prog-commercial-section">
                    <h4>Section B: Commercial Lines Book</h4>
                    <p class="section-instructions">Use your <strong>`Account Production Report`</strong> (T12 Summary)</p>
                    <label>Total Commercial Lines T12 Written Premium</label>
                    <input type="number" name="prog_cl_premium" placeholder="e.g., 250000" class="carrier-metric-input" data-sidebar-target="sidebar-cl-premium">
                    <label>Total Commercial Lines PIF (Policies in Force)</label>
                    <input type="number" name="prog_cl_pif" placeholder="e.g., 45" class="carrier-metric-input" data-sidebar-target="sidebar-cl-pif">
                    <label>Commercial Lines T12 Loss Ratio (%)</label>
                    <input type="number" name="prog_cl_loss_ratio" placeholder="e.g., 25.5" class="carrier-metric-input" data-sidebar-target="sidebar-cl-loss-ratio">
                </div>

                <div class="prog-book-section" id="prog-health-section">
                    <h4>Section C: Overall Book Health & Quality</h4>
                    <label>T12 PIF Bundle Rate (%)</label>
                    <p class="section-instructions">Use your <strong>`Account Production Report`</strong> (T12 Summary)</p>
                    <input type="number" name="prog_bundle_rate" placeholder="e.g., 65" class="carrier-metric-input" data-sidebar-target="sidebar-bundle-rate">
                    <label>Total Personal Lines YTD Apps (Applications)</label>
                    <p class="section-instructions">Use your <strong>`Account Production Report YTD`</strong></p>
                    <input type="number" name="prog_ytd_apps" placeholder="e.g., 50" class="carrier-metric-input" data-sidebar-target="sidebar-ytd-apps">
                    <label>"Diamond" or Program Status?</label>
                    <p class="section-instructions">This is from your agency-level info</p>
                    <div class="scope-options">
                        <label><input type="radio" name="prog_diamond_status" value="yes" class="carrier-metric-input" data-sidebar-target="sidebar-diamond-status"> Yes</label>
                        <label><input type="radio" name="prog_diamond_status" value="no" class="carrier-metric-input" data-sidebar-target="sidebar-diamond-status"> No</label>
                    </div>
                </div>
            </div>
            
            <div id="carrier-questions-safeco-manual" class="carrier-question-set" style="display:none;">
                
                <div id="safeco-ai-helper" style="display:none;">
                    <div class="instructions-box" style="background-color: var(--color-panel-bg); border: 1px solid var(--color-border); border-radius: 6px; padding: 5px 20px; margin-bottom: 20px;">
                        <p style="font-weight: 500; color: var(--color-accent);">Want to save time?</p>
                        <p style="font-size: 0.9em; color: var(--color-text-secondary);">Upload your Safeco ADP Summary, and our AI will auto-fill this form.</p>
                        <label for="safeco-report-upload" style="font-size: 0.9em; font-weight: 500;">Select Safeco Report (PDF):</label>
                        <input type="file" id="safeco-report-upload" name="report_files[]" accept=".pdf" style="margin-top: 10px;" multiple>
                        <button type="button" id="btn-safeco-ai-upload" class="upload-button" style="margin-top: 15px; margin-bottom: 10px;">
                            Upload & Auto-fill
                        </button>
                    </div>
                </div>

                <h3><span class="step-number">3.</span> Safeco Book Details (Manual Entry)</h3>
                <div class="instructions-box">
                    <p>Please use your <strong>`Safeco ADP Summary`</strong> to fill in the key YTD (Year-to-Date) metrics below.</p>
                </div>
                <div class="prog-book-section">
                    <label>Total DWP (YTD)</label>
                    <p class="section-instructions">Found in the "DWP" box (e.g., $10.5M would be 10500000)</p>
                    <input type="number" name="safeco_total_dwp" placeholder="e.g., 5000000" class="carrier-metric-input" data-sidebar-target="sidebar-safeco-dwp">
                    <label>PIF (YTD)</label>
                    <p class="section-instructions">Found in the "PIF" box</p>
                    <input type="number" name="safeco_pif" placeholder="e.g., 2500" class="carrier-metric-input" data-sidebar-target="sidebar-safeco-pif">
                    <label>Loss Ratio (YTD)</label>
                    <p class="section-instructions">Found in the "Loss Ratio" box</p>
                    <input type="number" name="safeco_loss_ratio" placeholder="e.g., 45.5" class="carrier-metric-input" data-sidebar-target="sidebar-safeco-loss-ratio">
                    <label>Retention (YTD)</label>
                    <p class="section-instructions">Found in the "Retention" box</p>
                    <input type="number" name="safeco_retention" placeholder="e.g., 85.0" class="carrier-metric-input" data-sidebar-target="sidebar-safeco-retention">
                    <label>New Business (NB) Count (YTD)</label>
                    <p class="section-instructions">Found in the "NB Count" box</p>
                    <input type="number" name="safeco_nb_count" placeholder="e.g., 1200" class="carrier-metric-input" data-sidebar-target="sidebar-safeco-nb-count">
                </div>
            </div>
            
            <div id="carrier-questions-hartford-manual" class="carrier-question-set" style="display:none;">
                
                <div id="hartford-ai-helper" style="display:none;">
                    <div class="instructions-box" style="background-color: var(--color-panel-bg); border: 1px solid var(--color-border); border-radius: 6px; padding: 5px 20px; margin-bottom: 20px;">
                        <p style="font-weight: 500; color: var(--color-accent);">Want to save time?</p>
                        <p style="font-size: 0.9em; color: var(--color-text-secondary);">Upload your Hartford Partner Breakdown Report, and our AI will auto-fill this form.</p>
                        <label for="hartford-report-upload" style="font-size: 0.9em; font-weight: 500;">Select Hartford Report (PDF):</label>
                        <input type="file" id="hartford-report-upload" name="report_files[]" accept=".pdf" style="margin-top: 10px;" multiple>
                        <button type="button" id="btn-hartford-ai-upload" class="upload-button" style="margin-top: 15px; margin-bottom: 10px;">
                            Upload & Auto-fill
                        </button>
                    </div>
                </div>

                <h3><span class="step-number">4.</span> Hartford Book Details</h3>
                <div class="instructions-box">
                    <p>Use your <strong>`Partner Breakdown Report`</strong> (YTD) to fill in the fields below.</p>
                </div>

                <div class="prog-book-section" id="hartford-personal-section">
                    <h4>Section A: Personal Lines Book</h4>
                    <label>Personal Lines TWP ($k)</label>
                    <p class="section-instructions">Total Written Premium (e.g., enter 5000 for $5M)</p>
                    <input type="number" name="hartford_pl_twp" placeholder="e.g., 5000" class="carrier-metric-input" data-sidebar-target="sidebar-hartford-pl-twp">
                    <label>Personal Lines Loss Ratio (CYLR %)</label>
                    <p class="section-instructions">e.g., 45.0</p>
                    <input type="number" name="hartford_pl_lr" placeholder="e.g., 45.0" class="carrier-metric-input" data-sidebar-target="sidebar-hartford-pl-lr">
                    <label>Personal Lines Policy Retention (%)</label>
                    <p class="section-instructions">e.g., 88.5</p>
                    <input type="number" name="hartford_pl_retention" placeholder="e.g., 88.5" class="carrier-metric-input" data-sidebar-target="sidebar-hartford-pl-retention">
                </div>

                <div class="prog-book-section" id="hartford-commercial-section">
                    <h4>Section B: Small Commercial Book</h4>
                    <label>Small Commercial TWP ($k)</label>
                    <p class="section-instructions">Total Written Premium (e.g., enter 1500 for $1.5M)</p>
                    <input type="number" name="hartford_cl_twp" placeholder="e.g., 1500" class="carrier-metric-input" data-sidebar-target="sidebar-hartford-cl-twp">
                    <label>Small Commercial Loss Ratio (CYLR %)</label>
                    <p class="section-instructions">e.g., 30.0</p>
                    <input type="number" name="hartford_cl_lr" placeholder="e.g., 30.0" class="carrier-metric-input" data-sidebar-target="sidebar-hartford-cl-lr">
                    <label>Small Commercial Policy Retention (PCR %)</label>
                    <p class="section-instructions">e.g., 85.0</p>
                    <input type="number" name="hartford_cl_retention" placeholder="e.g., 85.0" class="carrier-metric-input" data-sidebar-target="sidebar-hartford-cl-retention">
                </div>
            </div>
            
            <div id="carrier-questions-travelers-manual" class="carrier-question-set" style="display:none;">
                
                <div id="travelers-ai-helper" style="display:none;">
                    <div class="instructions-box" style="background-color: var(--color-panel-bg); border: 1px solid var(--color-border); border-radius: 6px; padding: 5px 20px; margin-bottom: 20px;">
                        <p style="font-weight: 500; color: var(--color-accent);">Want to save time?</p>
                        <p style="font-size: 0.9em; color: var(--color-text-secondary);">Upload your Travelers Production Data Summary, and our AI will auto-fill this form.</p>
                        <label for="travelers-report-upload" style="font-size: 0.9em; font-weight: 500;">Select Travelers Report (PDF):</label>
                        <input type="file" id="travelers-report-upload" name="report_files[]" accept=".pdf" style="margin-top: 10px;" multiple>
                        <button type="button" id="btn-travelers-ai-upload" class="upload-button" style="margin-top: 15px; margin-bottom: 10px;">
                            Upload & Auto-fill
                        </button>
                    </div>
                </div>

                <h3><span class="step-number">4.</span> Travelers Book Details</h3>
                <div class="instructions-box">
                    <p>Use your <strong>`Production Data Summary`</strong> (YTD) to fill in the fields below.</p>
                </div>

                <div class="prog-book-section" id="travelers-auto-section">
                    <h4>Section A: Auto Book</h4>
                    <label>Auto WP (,000)</label>
                    <p class="section-instructions">Written Premium from 13 Month Trend (e.g., 5000)</p>
                    <input type="number" name="travelers_auto_wp" placeholder="e.g., 5000" class="carrier-metric-input" data-sidebar-target="sidebar-travelers-auto-wp">
                    <label>Auto Loss Ratio (YTD %)</label>
                    <p class="section-instructions">From Booked New Business table (e.g., 55.0)</p>
                    <input type="number" name="travelers_auto_lr" placeholder="e.g., 55.0" class="carrier-metric-input" data-sidebar-target="sidebar-travelers-auto-lr">
                    <label>Auto Retention Ratio (YTD %)</label>
                    <p class="section-instructions">From Booked New Business table (e.g., 85.0)</p>
                    <input type="number" name="travelers_auto_retention" placeholder="e.g., 85.0" class="carrier-metric-input" data-sidebar-target="sidebar-travelers-auto-retention">
                </div>

                <div class="prog-book-section" id="travelers-home-section">
                    <h4>Section B: Home Book</h4>
                    <label>Home WP (,000)</label>
                    <p class="section-instructions">Written Premium from 13 Month Trend (e.g., 4500)</p>
                    <input type="number" name="travelers_home_wp" placeholder="e.g., 4500" class="carrier-metric-input" data-sidebar-target="sidebar-travelers-home-wp">
                    <label>Home Loss Ratio (YTD %)</label>
                    <p class="section-instructions">From Booked New Business table (e.g., 40.0)</p>
                    <input type="number" name="travelers_home_lr" placeholder="e.g., 40.0" class="carrier-metric-input" data-sidebar-target="sidebar-travelers-home-lr">
                    <label>Home Retention Ratio (YTD %)</label>
                    <p class="section-instructions">From Booked New Business table (e.g., 88.0)</p>
                    <input type="number" name="travelers_home_retention" placeholder="e.g., 88.0" class="carrier-metric-input" data-sidebar-target="sidebar-travelers-home-retention">
              </div>
            </div>

            <div id="carrier-questions-msa-manual" class="carrier-question-set" style="display:none;">
                
                <div id="msa-ai-helper" style="display:none;">
                    <div class="instructions-box" style="background-color: var(--color-panel-bg); border: 1px solid var(--color-border); border-radius: 6px; padding: 5px 20px; margin-bottom: 20px;">
                        <p style="font-weight: 500; color: var(--color-accent);">Want to save time?</p>
                        <p style="font-size: 0.9em; color: var(--color-text-secondary);">Upload your MSA Agency Performance Report, and our AI will auto-fill this form.</p>
                        <label for="msa-report-upload" style="font-size: 0.9em; font-weight: 500;">Select MSA Report (PDF):</label>
                        <input type="file" id="msa-report-upload" name="report_files[]" accept=".pdf" style="margin-top: 10px;" multiple>
                        <button type="button" id="btn-msa-ai-upload" class="upload-button" style="margin-top: 15px; margin-bottom: 10px;">
                            Upload & Auto-fill
                        </button>
                    </div>
                </div>

                <h3><span class="step-number">3.</span> MSA Book Details (Manual Entry)</h3>
                <div class="instructions-box">
                    <p>Please use your <strong>`MSA Agency Performance Report`</strong> to fill in the key metrics below.</p>
                </div>
                <div class="prog-book-section">
                    <label>Total DWP (YTD)</label>
                    <p class="section-instructions">Total Written Premium (e.g., 2500000)</p>
                    <input type="number" name="msa_total_dwp" placeholder="e.g., 2500000" class="carrier-metric-input" data-sidebar-target="sidebar-msa-dwp">
                    <label>PIF (YTD)</label>
                    <p class="section-instructions">Policies in Force total</p>
                    <input type="number" name="msa_pif" placeholder="e.g., 1200" class="carrier-metric-input" data-sidebar-target="sidebar-msa-pif">
                    <label>Loss Ratio (YTD)</label>
                    <p class="section-instructions">Incurred Loss Ratio % (e.g., 42.5)</p>
                    <input type="number" name="msa_loss_ratio" placeholder="e.g., 42.5" class="carrier-metric-input" data-sidebar-target="sidebar-msa-loss-ratio">
                    <label>Retention (%)</label>
                    <p class="section-instructions">Found under Retention section (e.g., 88.0)</p>
                    <input type="number" name="msa_retention" placeholder="e.g., 88.0" class="carrier-metric-input" data-sidebar-target="sidebar-msa-retention">
                    <label>New Business Premium (YTD)</label>
                    <p class="section-instructions">Total NB Premium (e.g., 450000)</p>
                    <input type="number" name="msa_nb_premium" placeholder="e.g., 450000" class="carrier-metric-input" data-sidebar-target="sidebar-msa-nb-premium">
                </div>
            </div>
            
        </form>

    </div>
</div>