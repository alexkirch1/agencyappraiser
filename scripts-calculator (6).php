<script>
    // ==================================================================
    // 1. GLOBAL VARIABLES
    // ==================================================================
    let currentValuationResults = { lowOffer: 0, highOffer: 0, coreScore: 0, calculatedMultiple: 0 };
    
    const formatter = new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD', 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
    });
    
    const EXCLUDE_FLAG = "Unknown/Excluded";
    const API_ENDPOINT = 'partials/submit_deal-calculator.php'; 
    
    // ==================================================================
    // 2. TAB SWITCHING & LOCKING LOGIC
    // ==================================================================
    function switchTab(tabName) {
        document.getElementById('valuation-tab').style.display = 'none';
        document.getElementById('structure-tab').style.display = 'none';
        document.getElementById('risk-tab').style.display = 'none';
        document.getElementById('summary-tab').style.display = 'none';
        
        if(tabName === 'valuation') {
            document.getElementById('valuation-tab').style.display = 'block';
        } else if (tabName === 'structure') {
            document.getElementById('structure-tab').style.display = 'block';
            initStructureSim(); 
        } else if (tabName === 'risk') {
            document.getElementById('risk-tab').style.display = 'block';
            runRiskAudit();
        } else if (tabName === 'summary') {
            document.getElementById('summary-tab').style.display = 'block';
        }
    }

    function toggleInputs(shouldLock) {
        const container = document.getElementById('valuation-tab');
        const inputs = container.querySelectorAll('input, select, button.unknown-btn');
        
        inputs.forEach(el => {
            el.disabled = shouldLock;
        });

        if(shouldLock) {
            container.classList.add('inputs-locked');
            container.style.opacity = "0.7";
        } else {
            container.classList.remove('inputs-locked');
            container.style.opacity = "1";
        }
    }

    function enableEditMode() {
        switchTab('valuation');
        toggleInputs(false); // Unlock form
        
        document.getElementById('gated-results').classList.add('blurred-results');
        
        // Hide sidebar buttons that shouldn't be clicked during edit
        const editBtn = document.getElementById('btn-edit-mode');
        const printBtn = document.getElementById('pdf-btn-2');
        if(editBtn) editBtn.style.display = 'none';
        if(printBtn) printBtn.style.display = 'none';
        
        ensureUpdateButtonExists();
        document.getElementById('btn-update-val').style.display = 'block';
    }

    function ensureUpdateButtonExists() {
        const sidebar = document.getElementById('post-submission-buttons');
        if (sidebar && !document.getElementById('btn-update-val')) {
            const btn = document.createElement('button');
            btn.id = 'btn-update-val';
            btn.innerHTML = '✅ Update & Re-Calculate';
            btn.style.cssText = 'width:100%; padding:12px; background:#22c55e; color:white; border:none; border-radius:6px; cursor:pointer; margin-top:10px; font-weight:bold; display:none;';
            btn.onclick = updateValuationManual;
            sidebar.appendChild(btn);
        }
    }

    function updateValuationManual() {
        const validation = validateValuationForm();
        if(validation.isValid) {
            // TRIGGER LOADING SCREEN ON UPDATE
            document.getElementById('btn-update-val').style.display = 'none';
            
            runAnalysisSimulation(() => {
                calculateValuation();
                populateSummaryPage(); // Update summary data
                toggleInputs(true); // Re-lock
                
                document.getElementById('gated-results').classList.remove('blurred-results');
                
                const editBtn = document.getElementById('btn-edit-mode');
                const printBtn = document.getElementById('pdf-btn-2');
                if(editBtn) editBtn.style.display = 'block';
                if(printBtn) printBtn.style.display = 'block';
                
                // Go to summary on update
                switchTab('summary');
            });
        } else {
            alert(validation.message);
        }
    }

    // ==================================================================
    // 3. REPORT GENERATOR (PDF)
    // ==================================================================
    function showPrintOptions() {
        const existing = document.getElementById('print-options-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'print-options-modal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:99999;';
        
        modal.innerHTML = `
            <div style="background:var(--bg-card); padding:25px; border-radius:12px; width:400px; max-width:90%; border:1px solid var(--border); box-shadow:0 20px 50px rgba(0,0,0,0.5);">
                <h3 style="margin-top:0; color:var(--text-main);">🖨️ Customize Report</h3>
                <p style="color:var(--text-sub); font-size:0.9em;">Select sections to print:</p>
                <div style="display:flex; flex-direction:column; gap:10px; margin:20px 0;">
                    <label style="display:flex; align-items:center; gap:10px; padding:10px; background:rgba(255,255,255,0.05); border-radius:6px; cursor:pointer;">
                        <input type="checkbox" id="print-opt-main" class="print-opt" checked> <span>Executive Summary</span>
                    </label>
                    <label style="display:flex; align-items:center; gap:10px; padding:10px; background:rgba(255,255,255,0.05); border-radius:6px; cursor:pointer;">
                        <input type="checkbox" id="print-opt-sim" class="print-opt" checked> <span>Deal Structure</span>
                    </label>
                    <label style="display:flex; align-items:center; gap:10px; padding:10px; background:rgba(255,255,255,0.05); border-radius:6px; cursor:pointer;">
                        <input type="checkbox" id="print-opt-risk" class="print-opt" checked> <span>Risk Audit</span>
                    </label>
                    <label style="display:flex; align-items:center; gap:10px; padding:10px; background:rgba(255,255,255,0.05); border-radius:6px; cursor:pointer;">
                        <input type="checkbox" id="print-opt-inputs" class="print-opt" checked> <span>Include Your Inputs</span>
                    </label>
                    
                    <div style="border-top: 1px dashed var(--border); margin: 5px 0;"></div>
                    
                    <label style="display:flex; align-items:center; gap:10px; padding:10px; border-radius:6px; cursor:pointer;">
                        <input type="checkbox" id="print-opt-all" checked> <span style="font-weight:bold; color:var(--accent);">Select All</span>
                    </label>
                </div>
                <div style="display:flex; gap:10px;">
                    <button id="cancel-print-btn" style="flex:1; padding:10px; background:transparent; border:1px solid var(--text-sub); color:var(--text-sub); border-radius:6px; cursor:pointer;">Cancel</button>
                    <button id="confirm-print-btn" style="flex:2; padding:10px; background:#3b82f6; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">Generate PDF</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Bind Select All Logic
        const allBtn = document.getElementById('print-opt-all');
        const options = document.querySelectorAll('.print-opt');
        
        // Toggle all when 'Select All' is clicked
        allBtn.onchange = function() {
            options.forEach(opt => opt.checked = allBtn.checked);
        };

        // If an individual option is unchecked, uncheck 'Select All'
        options.forEach(opt => {
            opt.onchange = function() {
                const allChecked = Array.from(options).every(o => o.checked);
                allBtn.checked = allChecked;
            };
        });

        document.getElementById('cancel-print-btn').onclick = function() { modal.remove(); };
        document.getElementById('confirm-print-btn').onclick = function() { runPrintJob(); };
    }

    function runPrintJob() {
        document.getElementById('print-options-modal').style.display = 'none';
        const showMain = document.getElementById('print-opt-main').checked;
        const showSim = document.getElementById('print-opt-sim').checked;
        const showRisk = document.getElementById('print-opt-risk').checked;
        const showInputs = document.getElementById('print-opt-inputs').checked;
        
        generatePrintReport(showMain, showSim, showRisk, showInputs);
    }

    function generatePrintReport(showMain, showSim, showRisk, showInputs) {
        const data = collectAllInputData();
        const low = document.getElementById('lowOffer').textContent;
        const high = document.getElementById('highOffer').textContent;
        const score = document.getElementById('coreScoreDisplay').textContent;
        const grade = document.getElementById('risk-grade').textContent;
        const riskContent = document.getElementById('risk-audit-container').innerHTML;
        const cash = document.getElementById('valCash').textContent;
        const earnout = document.getElementById('valEarnout').textContent;
        const strategyName = document.getElementById('sim-explain-title').textContent;
        const simVal = document.getElementById('simStartValue').textContent;

        let report = document.getElementById('printable-report-content');
        if(!report) {
            report = document.createElement('div');
            report.id = 'printable-report-content';
            document.body.appendChild(report);
        }
        
        // --- HEADER ---
        let html = `
            <div style="font-family: sans-serif; max-width: 800px; margin: 0 auto; color:black;">
            <div class="report-header" style="margin-bottom:30px; border-bottom:2px solid #ccc; padding-bottom:20px;">
                <h1 style="margin:0; font-size:24px; color:black;">Agency Valuation Report</h1>
                <p style="margin:5px 0 0; color:#666;">Generated on ${new Date().toLocaleDateString()}</p>
                <p style="margin:5px 0 0; color:#666;"><strong>Agency:</strong> ${document.getElementById('agencyName').value || 'N/A'}</p>
            </div>`;

        // --- SUMMARY SECTION ---
        if(showMain) {
            html += `
            <div class="report-section" style="margin-bottom:40px;">
                <table style="width:100%; border-collapse: separate; border-spacing: 15px 0;">
                    <tr>
                        <td style="width:50%; background:#f8fafc; border:1px solid #e2e8f0; padding:20px; vertical-align:top; border-radius:8px;">
                            <h3 style="margin-top:0; color:#333; font-size:16px;">Estimated Value Range</h3>
                            <div style="font-size:28px; font-weight:bold; color:#22c55e; margin:10px 0;">${low} - ${high}</div>
                            <p style="margin:0; font-size:0.9em; color:#666;">
                                Core Multiple: ${score}<br>
                                Revenue: ${formatter.format(data.revenue_ltm)}
                            </p>
                        </td>
                        <td style="width:50%; background:#f8fafc; border:1px solid #e2e8f0; padding:20px; vertical-align:top; border-radius:8px;">
                            <h3 style="margin-top:0; color:#333; font-size:16px;">Asset Quality</h3>
                            <div style="font-size:28px; font-weight:bold; color:#333; margin:10px 0;">Grade: ${grade}</div>
                            <p style="margin:0; font-size:0.9em; color:#666;">Based on ${data.retention}% Retention</p>
                        </td>
                    </tr>
                </table>
            </div>`;
        }

        // --- DEAL STRUCTURE SECTION ---
        if(showSim) {
            html += `
            <div class="report-section" style="margin-bottom:40px; page-break-inside: avoid; border-top:1px solid #eee; padding-top:20px;">
                <h2 style="font-size:18px; margin-bottom:15px; color:#333;">Selected Deal Structure: ${strategyName}</h2>
                <p style="margin:0 0 15px 0; color:#666;">Based on a Gross Valuation of <strong>${simVal}</strong></p>
                <table style="width:100%; border-collapse:collapse; border:1px solid #ddd;">
                    <tr style="background:#f0fdf4;">
                        <td style="padding:12px; border:1px solid #ddd; color:#333;"><strong>Est. Cash at Closing:</strong></td>
                        <td style="padding:12px; border:1px solid #ddd; font-weight:bold; color:#333;">${cash}</td>
                    </tr>
                    <tr style="background:#f5f3ff;">
                        <td style="padding:12px; border:1px solid #ddd; color:#333;"><strong>Potential Earn-out:</strong></td>
                        <td style="padding:12px; border:1px solid #ddd; font-weight:bold; color:#333;">${earnout}</td>
                    </tr>
                </table>
                <p style="font-size:0.8em; color:#666; margin-top:5px;">*Figures are preliminary estimates for educational purposes.</p>
            </div>`;
        }

        // --- RISK AUDIT SECTION ---
        if(showRisk) {
            html += `
            <div class="report-section" style="margin-bottom:30px; border-top:1px solid #eee; padding-top:20px;">
                <h2 style="font-size:18px; margin-bottom:15px; color:#333;">Risk & Strength Audit</h2>
                <div class="risk-print-view" style="font-size:0.9em; color:#333;">
                    ${riskContent}
                </div>
            </div>`;
        }

        // --- USER INPUTS SECTION ---
        if(showInputs) {
            html += `
            <div class="report-section" style="margin-bottom:30px; border-top:1px solid #eee; padding-top:20px; page-break-before: always;">
                <h2 style="font-size:18px; margin-bottom:15px; color:#333;">Submitted Data</h2>
                <table style="width:100%; border-collapse:collapse; font-size:0.9em;">`;
            
            for (const [key, value] of Object.entries(data)) {
                if(value && value !== 'Unknown' && !key.includes('calculated')) {
                    let label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    let valDisplay = value;
                    if(typeof value === 'number' && value > 1000) valDisplay = formatter.format(value);
                    html += `<tr style="border-bottom:1px solid #eee;">
                        <td style="padding:8px; font-weight:bold; color:#555; width:60%;">${label}</td>
                        <td style="padding:8px; text-align:right; color:#333;">${valDisplay}</td>
                    </tr>`;
                }
            }
            html += `</table></div>`;
        }
        
        html += `
            <div class="report-footer" style="margin-top:50px; padding-top:20px; border-top:1px solid #ccc; font-size:0.8em; color:#666; text-align:center;">
                <p>This report is a preliminary estimate generated by the Agency Appraiser tool. It is not a binding offer.</p>
            </div>
            </div>`; // Close main wrapper

        report.innerHTML = html;
        window.print();
    }

    // ==================================================================
    // 4. NEW SUCCESS MODAL
    // ==================================================================
    function showSuccessModal() {
        const existing = document.getElementById('success-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'success-modal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); display:flex; align-items:center; justify-content:center; z-index:10001;';
        
        modal.innerHTML = `
            <div class="modal-content" id="success-modal-content" style="max-width:550px;">
                <span id="success-checkmark">✅</span>
                <h2 style="color:var(--text-main); margin-top:0;">Valuation Unlocked!</h2>
                
                <div style="background:rgba(255,255,255,0.05); padding:20px; margin:25px 0; border-radius:8px; border:1px solid var(--border); text-align:left;">
                    <p style="color:var(--text-sub); font-size:0.95em; margin:0 0 15px 0; line-height:1.5;">
                        <strong>Please Note:</strong> This figure is a preliminary estimate for educational purposes only. It is not a binding offer.
                    </p>
                    <p style="color:var(--text-sub); font-size:0.95em; margin:0; line-height:1.5;">
                        A member of our team may review this data to discuss a formal valuation based on these details.
                    </p>
                </div>

                <div style="margin-bottom:15px; color:var(--text-sub); font-size:0.9em; font-style:italic;">
                    By clicking this you understand
                </div>
                
                <button id="success-btn">Proceed to Valuation</button>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('success-btn').onclick = function() { 
            modal.remove();
            populateSummaryPage();
            switchTab('summary');
        };
    }

    // ==================================================================
    // 5. LOADING SCREEN LOGIC
    // ==================================================================
    function createLoader() {
        if (document.getElementById('analysis-loader')) return;
        
        const loader = document.createElement('div');
        loader.id = 'analysis-loader';
        loader.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.98); z-index:10000; flex-direction:column; align-items:center; justify-content:center; color:white; font-family:sans-serif; text-align:center;';
        
        loader.innerHTML = `
            <div class="mountain-loader">
                <div class="goat-spinner">🐐</div>
                <div class="mountain-base">⛰️</div>
            </div>
            <h2 style="font-size: 24px; font-weight: 600; margin: 20px 0 10px 0; color: #f8fafc;">Crunching the Numbers</h2>
            <p id="loader-status" style="font-size: 16px; color: #94a3b8; margin: 0; font-style:italic;">Initializing...</p>
        `;
        document.body.appendChild(loader);
    }

    function runAnalysisSimulation(onComplete) {
        createLoader();
        const loader = document.getElementById('analysis-loader');
        const statusText = document.getElementById('loader-status');
        const steps = [
            "Consulting the Oracle of the Rockies...",
            "Hiking up the EBITDA mountain...",
            "Spotting Yetis in your data...",
            "Brewing some local craft valuations...",
            "Checking altitude adjustments...",
            "Feeding the goats...",
            "Polishing the final offer..."
        ];
        
        loader.style.display = 'flex';
        
        const duration = Math.floor(Math.random() * (8000 - 4000 + 1) + 4000);
        let stepIndex = 0;
        const interval = setInterval(() => {
            if (stepIndex < steps.length) {
                statusText.textContent = steps[stepIndex];
                stepIndex++;
            }
        }, stepTime = duration / steps.length);

        setTimeout(() => {
            clearInterval(interval);
            loader.style.display = 'none';
            if (onComplete) onComplete();
        }, duration);
    }

    // ==================================================================
    // 6. SMART DEAL SIMULATOR (FORCED BLEND DEFAULT)
    // ==================================================================
    function getSafeValuation() {
        if (currentValuationResults.highOffer > 0) return currentValuationResults.highOffer;
        const uiText = document.getElementById('highOffer').textContent;
        const clean = parseFloat(uiText.replace(/[^0-9.-]+/g,""));
        return clean || 0;
    }

    function initStructureSim() {
        if(currentValuationResults.highOffer === 0) { calculateValuation(); }
        const startVal = getSafeValuation();
        const score = currentValuationResults.coreScore || 0;
        document.getElementById('simStartValue').textContent = formatter.format(startVal);
        
        // FORCE DEFAULT TO BLEND (BALANCED) ALWAYS
        setSimulationStrategy('blend');
    }

    function explainTerm(term) {
        const title = document.getElementById('sim-explain-title');
        const text = document.getElementById('sim-explain-text');
        const box = document.getElementById('sim-explanation-box');
        
        box.style.backgroundColor = 'rgba(56, 189, 248, 0.2)'; 
        setTimeout(() => { box.style.backgroundColor = 'rgba(14, 165, 233, 0.1)'; }, 300);

        if (term === 'cash') {
            title.textContent = "Cash Up Front";
            text.textContent = "Guaranteed liquid capital. Higher cash reduces risk but often caps the total valuation.";
        } else if (term === 'earnout') {
            title.textContent = "Earn-out Potential";
            text.textContent = "Future performance payments. Allows you to bridge the valuation gap by betting on your own book.";
        }
    }

    function setSimulationStrategy(strategy) {
        const cashInput = document.getElementById('simCashRange');
        const earnInput = document.getElementById('simEarnoutRange');

        if(strategy === 'quick') {
            cashInput.value = 100; earnInput.value = 0;
        } else if (strategy === 'blend') {
            cashInput.value = 85; earnInput.value = 15;
        } else {
            cashInput.value = 70; earnInput.value = 30;
        }
        
        updateSimSliders('cash');
    }

    function detectStrategyState() {
        const cash = parseInt(document.getElementById('simCashRange').value);
        
        const explainTitle = document.getElementById('sim-explain-title');
        const explainText = document.getElementById('sim-explain-text');
        const btnQuick = document.getElementById('btn-strat-quick');
        const btnBlend = document.getElementById('btn-strat-blend');
        const btnStruct = document.getElementById('btn-strat-structured');

        // Reset All Buttons
        [btnQuick, btnBlend, btnStruct].forEach(btn => {
            if(btn) {
                btn.style.borderColor = 'var(--border)';
                btn.style.backgroundColor = 'var(--bg-card)';
            }
        });

        if (cash === 100) {
            btnQuick.style.borderColor = 'var(--btn-green)';
            btnQuick.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
            explainTitle.textContent = "Quick Payout";
            explainText.textContent = "100% Cash at Close. Best for clean exits.";
        } else if (cash === 85) {
            btnBlend.style.borderColor = 'var(--btn-orange)';
            btnBlend.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
            explainTitle.textContent = "Balanced";
            explainText.textContent = "85% Cash / 15% Holdback. Standard structure.";
        } else if (cash === 70) {
            btnStruct.style.borderColor = 'var(--btn-blue)';
            btnStruct.style.backgroundColor = 'rgba(14, 165, 233, 0.1)';
            explainTitle.textContent = "Growth";
            explainText.textContent = "70% Cash / 30% Earnout. Maximizes total value.";
        } else {
            explainTitle.textContent = "Customized Structure";
            explainText.textContent = `You have selected a custom ${cash}% Cash / ${100-cash}% Earnout split.`;
        }
    }

    function updateSimSliders(changedSlider) {
        let cash = parseInt(document.getElementById('simCashRange').value);
        let earnout = parseInt(document.getElementById('simEarnoutRange').value);

        if (changedSlider === 'cash') {
            earnout = 100 - cash;
        } else {
            cash = 100 - earnout;
        }

        document.getElementById('simCashRange').value = cash;
        document.getElementById('simEarnoutRange').value = earnout;

        document.getElementById('dispCashPct').textContent = cash + '%';
        document.getElementById('dispEarnoutPct').textContent = earnout + '%';

        detectStrategyState();
        calculateNetProceeds();
    }

    function calculateNetProceeds() {
        let startVal = getSafeValuation();
        
        const adjDisp = document.getElementById('simValAdjustment');
        const startValEl = document.getElementById('simStartValue');
        
        const cashPctVal = parseInt(document.getElementById('simCashRange').value);
        const earnoutPctVal = parseInt(document.getElementById('simEarnoutRange').value);

        // Incremental Logic
        const adjustmentFactor = 1 + ((earnoutPctVal - 20) * 0.0025);
        startVal = startVal * adjustmentFactor;

        // Visual Feedback
        const percentChange = ((adjustmentFactor - 1) * 100).toFixed(1);
        
        if (parseFloat(percentChange) > 0) {
             if(adjDisp) {
                 adjDisp.textContent = `(+${percentChange}% Potential Upside)`;
                 adjDisp.style.color = "var(--btn-green)";
             }
             if(startValEl) startValEl.style.color = "var(--btn-green)";
        } else if (parseFloat(percentChange) < 0) {
             if(adjDisp) {
                 adjDisp.textContent = `(${percentChange}% Liquidity Trade-off)`;
                 adjDisp.style.color = "var(--text-sub)";
             }
             if(startValEl) startValEl.style.color = "var(--accent)";
        } else {
             if(adjDisp) {
                 adjDisp.textContent = "(Standard Market Value)";
                 adjDisp.style.color = "var(--text-sub)";
             }
             if(startValEl) startValEl.style.color = "var(--accent)";
        }

        if(startValEl) startValEl.textContent = formatter.format(startVal);

        const amtCash = startVal * (cashPctVal / 100);
        const amtEarnout = startVal * (earnoutPctVal / 100);

        if(document.getElementById('simCashAtClose')) document.getElementById('simCashAtClose').textContent = formatter.format(amtCash);
        
        if(document.getElementById('valCash')) document.getElementById('valCash').textContent = formatter.format(amtCash);
        if(document.getElementById('valEarnout')) document.getElementById('valEarnout').textContent = formatter.format(amtEarnout);

        if(startVal > 0) {
            if(document.getElementById('barCash')) document.getElementById('barCash').style.width = cashPctVal + "%";
            if(document.getElementById('barEarnout')) document.getElementById('barEarnout').style.width = earnoutPctVal + "%";
        }
    }

    // ==================================================================
    // 7. RISK ASSESSMENT LOGIC
    // ==================================================================
    function analyzeRevenueTrend(revLTM, revY2, revY3) {
        if (!revY2 || !revY3) return 'Stable';
        if (revLTM > revY2 && revY2 > revY3) return 'Growth';
        if (revLTM < revY2 && revY2 < revY3) return 'Decline';
        if (revY2 < revY3 && revLTM > revY2) return 'Recovery'; 
        if (revY2 > revY3 && revLTM < revY2) return 'Dip';
        return 'Stable';
    }

    function runRiskAudit() {
        const data = collectAllInputData(); 
        const container = document.getElementById('risk-audit-container');
        if(!container) return;
        
        let html = '';
        let severeCount = 0; let highCount = 0; let moderateCount = 0; let strengthCount = 0;

        // 1. RETENTION
        const retention = parseFloat(data.retention);
        if (retention < 80) {
            html += createRiskCard('High Risk', 'Critical Retention Issue (<80%)', 
                'Buyers view low retention as a "Leaky Bucket." It signals unhappy clients or poor service.',
                'The buyer fears that if they buy the book, 20% of the value will evaporate in year one.',
                'Implement a proactive 90-day renewal call program immediately.');
            severeCount++;
        } else if (retention < 90) {
            html += createRiskCard('Moderate Risk', 'Average Retention (80-89%)', 
                'Your retention is stable but average. Top-tier valuations (3.0x+) are reserved for agencies with 92%+ retention.',
                'Buyers see "Average" retention as "Average" value.',
                'Conduct a "Lost Business Audit" to identify why clients leave.');
            moderateCount++;
        } else {
            html += createRiskCard('Strength', '💎 Elite Retention (90%+)', 
                'Your client loyalty is exceptional. This is the primary driver for "Premium" valuations.',
                'Buyers are willing to pay more for predictable, recurring revenue.', null);
            strengthCount++;
        }

        // 2. REVENUE TREND
        const revLTM = parseFloat(data.revenue_ltm);
        const revY2 = parseFloat(data.revenue_y2);
        const revY3 = parseFloat(data.revenue_y3);
        const trend = analyzeRevenueTrend(revLTM, revY2, revY3);

        if (trend === 'Decline') {
            html += createRiskCard('High Risk', 'Consistent Revenue Decline', 
            'Revenue has dropped for 3 consecutive periods. ', 
            'Buyers view this as a distressed asset ("Falling Knife").', 
            'Identify root cause of churn immediately.'); 
            severeCount++;
        } else if (trend === 'Recovery') {
            html += createRiskCard('Moderate Risk', 'V-Shape Recovery', 
            'Revenue dipped in Y-2 but is recovering now. ', 
            'Buyers see this as "Stabilizing" rather than "Declining".', 
            'Highlight the recent operational fixes that caused the rebound.'); 
            moderateCount++;
        } else if (trend === 'Growth') {
            html += createRiskCard('Strength', '📈 Consistent Growth', 'Revenue has increased year-over-year.', 'Buyers pay a premium for organic growth engines.', null); strengthCount++;
        }

        // 3. PROFIT MARGINS
        const sde = parseFloat(data.sde_ebitda);
        if(revLTM > 0 && sde > 0) {
            const margin = sde / revLTM;
            if(margin < 0.20) {
                 html += createRiskCard('Moderate Risk', 'Low Margins (<20%)', 
                     `Your SDE margin is ${(margin*100).toFixed(1)}%. Buyers want cash flow (25-40%).`, 
                     'Low margins suggest high overhead. A buyer will aggressively cut costs post-close.',
                     'Review your P&L for "Lifestyle Expenses" (cars, travel) that can be added back.');
                 moderateCount++;
            } else if (margin >= 0.40) {
                 html += createRiskCard('Strength', '🚀 High Efficiency (40%+ Margins)', 
                     `Your SDE margin is ${(margin*100).toFixed(1)}%. This is best-in-class profitability.`,
                     'Buyers love this because the debt service is easy to cover.', null);
                 strengthCount++;
            }
        }

        // 4. SOLO RISK
        const employees = parseFloat(data.employee_count);
        if (employees === 1) {
            html += createRiskCard('High Risk', 'Key Man / Solo Risk', 
                'As a solo operator, YOU are the business. If you leave, do the clients stay?',
                'Buyers worry that client loyalty is tied to you personally, not the brand.',
                'A thorough transition plan (staying on for 6-12 months) is critical to getting full value.');
            highCount++;
        }

        // 5. COMMERCIAL MIX
        const mix = parseFloat(data.policy_mix);
        if (mix > 60) {
             html += createRiskCard('Strength', '🏢 Commercial Heavy', 
                 `Your book is ${mix}% Commercial Lines. This is a highly sought-after asset class.`,
                 'Commercial policies have higher premiums and stickier retention than Personal Lines.', null);
             strengthCount++;
        } else if (mix < 20) {
             html += createRiskCard('Info', 'Personal Lines Focus', 
                 `Your book is primarily Personal Lines.`,
                 'Personal lines are stable but can be labor-intensive. Buyers may discount slightly for the service load.',
                 'Cross-sell commercial policies to existing homeowners.');
        }

        // 6. OFFICE STRUCTURE
        if(data.office_structure === 'Virtual' || data.office_structure === 'Hybrid') {
             html += createRiskCard('Strength', '💻 Modern Infrastructure', 
                 'Operating Virtual/Hybrid makes your agency highly transferable and lowers overhead.',
                 'Buyers see this as a "Plug & Play" acquisition with no lease liabilities.', null);
             strengthCount++;
        } else if (data.office_structure === 'BrickAndMortar') {
             html += createRiskCard('Moderate Risk', 'Lease Liability', 
                 'Physical offices often come with long-term leases that buyers do not want to assume.',
                 'Buyers view rent as "wasted profit" if they already have a central office.',
                 'Check your lease terms. Are you personally guaranteed? Can you sub-lease?');
             moderateCount++;
        }

        // 7. COMPLIANCE (E&O)
        const claims = parseFloat(data.eo_claims);
        if (claims === 0) {
             html += createRiskCard('Strength', '🛡️ Clean Compliance Record', 
                 'Zero E&O claims in 3 years indicates strong operational controls.',
                 'This removes a major "Fear Factor" during due diligence.', null);
             strengthCount++;
        } else {
             html += createRiskCard('Moderate Risk', 'E&O Claims History', 
                 'Past claims raise red flags about compliance and staff training.', 
                 'Buyers worry about "Tail Liability" and future lawsuits.',
                 'Document exactly what processes changed to prevent recurrence.');
             moderateCount++;
        }

        // 8. CLIENT CONCENTRATION
        const concentration = parseFloat(data.client_concentration);
        if (concentration > 25) {
            html += createRiskCard('High Risk', 'Whale Client Risk (>25%)', 
                `Top 10 clients = ${concentration}% of revenue. Highly dangerous leverage. `,
                'If one key client leaves, value crashes.',
                'Focus marketing on smaller accounts to dilute risk.');
            highCount++;
        }

        // 9. CARRIER DEPENDENCY
        const carrierDiv = parseFloat(data.carrier_diversification);
        if (carrierDiv > 75) {
            html += createRiskCard('High Risk', 'Carrier Dependence (>75%)', 
                'Heavily reliant on very few carriers.', 
                'If your top carrier changes their commission schedule or terminates you, your revenue collapses.',
                'Actively quote new business with secondary carriers.');
            highCount++;
        }

        // 10. EFFICIENCY (RPE)
        const rpe = parseFloat(data.rpe);
        if (rpe > 0 && rpe < 125000) {
             html += createRiskCard('Moderate Risk', 'Low Efficiency (RPE)', 
                 `Revenue Per Employee: ${formatter.format(rpe)}. Standard is $150k+.`,
                 'Suggests manual workflows or overstaffing.',
                 'Audit your tech stack for automation opportunities.');
             moderateCount++;
        } else if (rpe > 200000) {
             html += createRiskCard('Strength', '⚡ High Efficiency Team', 
                 `RPE is ${formatter.format(rpe)}. Your team is highly productive.`,
                 'Buyers see a well-oiled machine that generates profit.', null);
             strengthCount++;
        }

        // 11. LEGAL (Contracts)
        if (data.producer_agreements.includes('None') || data.producer_agreements.includes('Weak')) {
             html += createRiskCard('Severe Risk', 'No Producer Agreements', 
                 'Producers legally "own" the relationship without contracts.',
                 'Buyer cannot pay full price for unsecured assets.',
                 'Consult an attorney immediately.');
             severeCount++;
        }

        // 12. GROWTH (CAGR)
        const revY3_G = parseFloat(data.revenue_y3);
        const cagr = calculateCAGR(revLTM, revY3_G);
        if (cagr > 15) {
             html += createRiskCard('Strength', '📈 High Growth Asset', 
                 `Growing at ${cagr.toFixed(1)}% annually.`,
                 'Buyers pay a premium for organic growth engines.', null);
             strengthCount++;
        } else if (cagr < 0 && trend !== 'Recovery') { 
             html += createRiskCard('High Risk', 'Shrinking Revenue', 
                 `Shrinking at ${cagr.toFixed(1)}% per year.`,
                 'Buyers view this as a "Turnaround Project."',
                 'Identify the source of the bleed.');
             highCount++;
        }

        // 13. TIMELINE
        if (data.closing_timeline === 'urgent') {
            html += createRiskCard('Moderate Risk', 'Urgent Sale Timeline', 
                'Selling in <60 days signals distress.',
                'Buyers may low-ball offers expecting desperation.',
                'Extend your runway if possible.');
            moderateCount++;
        }

        // 14. NEW BUSINESS
        const newBiz = parseFloat(data.new_business_value);
        if (newBiz > 0 && revLTM > 0) {
            const velocity = (newBiz * 12) / revLTM; // Annualized
            if (velocity > 0.15) {
                html += createRiskCard('Strength', '🚀 Strong Sales Pipeline', 
                    'You are adding new business at a healthy rate.',
                    'Proves the business isn\'t just "resting on renewals."', null);
                strengthCount++;
            }
        }

        // EMPTY STATE
        if(html === '') {
            html = `<p>Complete the form to see your risk audit.</p>`;
        }
        container.innerHTML = html;

        // GRADE CALCULATION
        const gradeEl = document.getElementById('risk-grade');
        const textEl = document.getElementById('risk-summary-text');
        const headerContainer = document.getElementById('risk-header-container');
        
        if(headerContainer) {
            headerContainer.style.display = 'flex';
            if (severeCount > 0) {
                gradeEl.textContent = 'D'; gradeEl.style.color = '#ef4444';
                textEl.textContent = "Critical structural risks identified.";
            } else if (highCount > 0) {
                gradeEl.textContent = 'C'; gradeEl.style.color = '#f97316';
                textEl.textContent = "Meaningful risks exist.";
            } else if (moderateCount > 2) {
                gradeEl.textContent = 'B'; gradeEl.style.color = '#eab308';
                textEl.textContent = "Solid foundation with some operational drag.";
            } else {
                gradeEl.textContent = 'A'; gradeEl.style.color = '#22c55e';
                textEl.textContent = `Prime Target! ${strengthCount} Strengths detected.`;
            }
        }
    }

    function createRiskCard(level, title, problem, psychology, mitigation) {
        let color = '#22c55e'; let icon = '✅';
        let badge = 'Strength';
        let bgStyle = 'background: rgba(34, 197, 94, 0.05); border-left: 5px solid #22c55e;';
        
        if (level.includes('High') || level.includes('Severe')) { 
            color = '#ef4444'; icon = '⚠️'; badge = level;
            bgStyle = 'background: var(--bg-card); border-left: 5px solid #ef4444;';
        } else if (level.includes('Moderate')) { 
            color = '#f59e0b'; icon = '🔸'; badge = level;
            bgStyle = 'background: var(--bg-card); border-left: 5px solid #f59e0b;';
        } else if (level.includes('Info')) {
            color = '#3b82f6'; icon = 'ℹ️'; badge = "Observation";
            bgStyle = 'background: var(--bg-card); border-left: 5px solid #3b82f6;';
        } else if (level.includes('Strength')) {
            color = '#22c55e'; icon = '💎'; badge = "Key Strength";
            bgStyle = 'background: rgba(34, 197, 94, 0.08); border-left: 5px solid #22c55e; border: 1px solid rgba(34,197,94,0.3);';
        }

        let html = `<div style="${bgStyle} padding: 20px; margin-bottom: 20px; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <h4 style="margin:0; color: ${color}; font-size: 1.15em; display:flex; align-items:center; gap:8px;">${icon} ${title}</h4>
                <span style="font-size:0.7em; text-transform:uppercase; font-weight:800; color:${color}; border:1px solid ${color}; padding: 3px 8px; border-radius:4px; letter-spacing:0.5px; background:var(--bg-card);">${badge}</span>
            </div>
            <p style="font-size: 0.95em; margin: 0 0 15px 0; color: var(--text-main); line-height:1.6;">${problem}</p>`;
        
        if(psychology) {
            let psyColor = (level === 'Strength') ? '#4ade80' : '#60a5fa';
            let psyTitle = (level === 'Strength') ? '💰 Why Buyers Pay More' : '🧠 Buyer\'s Perspective';
            let psyBg = (level === 'Strength') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)';
            
            html += `<div style="margin-bottom:12px; padding:12px; background:${psyBg}; border-radius:6px;">
                <strong style="color:${psyColor}; font-size:0.8em; text-transform:uppercase; display:block; margin-bottom:4px;">${psyTitle}</strong>
                <p style="font-size: 0.9em; margin: 0; color: var(--text-sub); line-height: 1.4;">${psychology}</p>
            </div>`;
        }

        if(mitigation) {
            html += `<div style="padding:12px; background:rgba(245, 158, 11, 0.1); border-radius:6px;">
                <strong style="color:#fbbf24; font-size:0.8em; text-transform:uppercase; display:block; margin-bottom:4px;">🛠 How to Fix It</strong>
                <p style="font-size: 0.9em; margin: 0; color: var(--text-sub); line-height: 1.4;">${mitigation}</p>
            </div>`;
        }
        html += `</div>`;
        return html;
    }

    // ==================================================================
    // 8. CORE CALCULATION & VALIDATION (FULL)
    // ==================================================================
    function getRiskLevel(calculatedMultiple) {
        if (calculatedMultiple === 'OUT OF RANGE (Bad Deal)') return { text: 'EXTREME', color: 'var(--btn-red)' };
        if (calculatedMultiple >= 2.8) return { text: 'VERY LOW', color: 'var(--btn-green)' };
        if (calculatedMultiple >= 2.0) return { text: 'LOW', color: 'var(--btn-green)' };
        if (calculatedMultiple >= 1.2) return { text: 'MODERATE', color: 'var(--btn-orange)' }; 
        return { text: 'HIGH', color: 'var(--btn-red)' }; 
    }

    function calculateCAGR(ltm, y3) {
        if (ltm <= 0 || y3 <= 0 || isNaN(ltm) || isNaN(y3)) return 0;
        return (Math.pow(ltm / y3, 1 / 2) - 1) * 100; 
    }

    function toggleUnknown(id) {
        const input = document.getElementById(id);
        const button = document.getElementById(id + '-btn');
        const estimateCheckbox = input.closest('.input-row').querySelector(`#${id}Estimate`);
        const isCurrentlyExcluded = button.classList.contains('active');
        
        if (isCurrentlyExcluded) {
            input.value = ''; input.disabled = false;
            if (estimateCheckbox) estimateCheckbox.disabled = false;
            button.classList.remove('active');
        } else {
            input.value = EXCLUDE_FLAG; input.disabled = true;
            if (estimateCheckbox) { estimateCheckbox.checked = false; estimateCheckbox.disabled = true; }
            button.classList.add('active');
        }
    }
    
    function showValuationQuestions() {
        const q = document.getElementById('valuation-questions-wrapper');
        if(q) q.style.display = 'block';
    }

    function calculateValuation() {
        const emailStatusEl = document.getElementById('email-status');
        if (emailStatusEl) { emailStatusEl.style.display = 'none'; }
        
        const scopeFactorElement = document.querySelector('input[name="scopeOfSale"]:checked');
        if (!scopeFactorElement) { return; }
        
        const TRANSACTION_MULTIPLIER = parseFloat(scopeFactorElement.value); 
        const isFullAgency = TRANSACTION_MULTIPLIER === 1.0;

        const dueDiligencePanel = document.getElementById('full-agency-due-diligence');
        if (dueDiligencePanel) {
            dueDiligencePanel.style.display = isFullAgency ? 'block' : 'none';
        }

        const getVal = (id) => {
            const el = document.getElementById(id);
            if (!el) return null;
            if (el.value === EXCLUDE_FLAG) return null;
            if (el.value.trim() === '') return null;
            return parseFloat(el.value);
        };

        const revLTM = getVal('annualRevenueLTM');
        const sde = getVal('sdeEBITDA');

        if (revLTM === null || sde === null) {
            currentValuationResults = { lowOffer: 0, highOffer: 0, coreScore: 0 };
            return;
        }

        // --- FETCH ALL INPUTS ---
        const yearEstablished = getVal('yearEstablished');
        const revY2 = getVal('annualRevenueY2');
        const revY3 = getVal('annualRevenueY3');
        const retention = getVal('retentionRate');
        const mix = getVal('policyMix');
        const concentration = getVal('clientConcentration');
        const rpe = getVal('revenuePerEmployee');
        const carrierDiv = getVal('carrierDiversification');
        const eoClaims = getVal('eoClaims') || 0;
        
        const officeStructureElement = document.querySelector('input[name="officeStructure"]:checked');
        const officeStructure = officeStructureElement ? officeStructureElement.value : 'Unknown';
        const producerAgreementsElement = document.querySelector('input[name="producerAgreements"]:checked');
        const producerAgreements = producerAgreementsElement ? producerAgreementsElement.value : 'Unknown';

        let closingTimeline = 'Unknown';
        let staffRetentionRisk = 'Unknown';
        let newBusinessValue = null;
        let avgClientTenure = null;
        let annualPayrollCost = null;

        if (isFullAgency) {
            newBusinessValue = getVal('newBusinessValue');
            avgClientTenure = getVal('avgClientTenure');
            annualPayrollCost = getVal('annualPayrollCost');
            const timelineElement = document.querySelector('input[name="closingTimeline"]:checked');
            if (timelineElement) closingTimeline = timelineElement.value;
            const retentionElement = document.querySelector('input[name="staffRetentionRisk"]:checked');
            if (retentionElement) staffRetentionRisk = retentionElement.value;
        }

        const CAGR = calculateCAGR(revLTM, revY3);
        const sdeMargin = (sde !== null && revLTM !== null && revLTM > 0) ? (sde / revLTM) : 0;
        
        let totalRawScore = 0;
        
        // 1. LONGEVITY
        let longevityScore = 0.05; 
        if (yearEstablished !== null) {
            const age = new Date().getFullYear() - yearEstablished;
            if (age >= 20) { longevityScore = 0.10; } 
            else if (age >= 5) { longevityScore = 0.08; }
        }
        totalRawScore += longevityScore;
        document.getElementById('ageFactorDisplay').textContent = `${longevityScore.toFixed(2)}x`;

        // 2. DEMOGRAPHIC
        let demographicScore = 0.08;
        if (officeStructure === 'Virtual') { demographicScore = 0.10; } 
        else if (officeStructure === 'BrickAndMortar') { demographicScore = 0.05; }
        totalRawScore += demographicScore;

        // 3. LEGAL
        let legalScore = 0.12;
        if (producerAgreements === 'strong') { legalScore += 0.08; } 
        else if (producerAgreements === 'none') { legalScore -= 0.07; }
        if (eoClaims > 0) { legalScore -= Math.min(0.15, eoClaims * 0.05); }
        legalScore = Math.max(0.05, Math.min(0.20, legalScore)); 
        totalRawScore += legalScore;

        // 4. FINANCIAL (FIXED: V-SHAPE RECOVERY)
        let financialScore = 0.10; 
        if (CAGR >= 10) { financialScore += 0.15; } 
        else if (CAGR > 0) { financialScore += 0.05; }
        
        if (sdeMargin >= 0.40) { financialScore += 0.15; } 
        else if (sdeMargin >= 0.20) { financialScore += 0.10; } 
        else if (sdeMargin > 0) { financialScore += 0.05; }
        
        if (isFullAgency && sde !== null && annualPayrollCost !== null && sde < annualPayrollCost && annualPayrollCost > 0) { financialScore -= 0.10; }
        
        // BONUS: Check V-Shape
        if (revY2 && revY3 && revY2 < revY3 && revLTM > revY2) {
            financialScore += 0.08; 
        }

        financialScore = Math.max(0.05, Math.min(0.45, financialScore)); 
        totalRawScore += financialScore;
        document.getElementById('cagrDisplay').textContent = isNaN(CAGR) ? '---' : `${CAGR.toFixed(2)}%`;

        // 5. BOOK QUALITY
        let bookScore = 0.10; 
        if (retention !== null) {
             if (retention >= 75) { 
                 const retBonus = (retention - 75) * 0.022; 
                 bookScore = 0.10 + retBonus;
             } 
             else if (retention >= 50) { bookScore = 0.05; }
        }
        let concentrationScore = 0; 
        if (concentration !== null) {
            if (concentration <= 10) { concentrationScore = 0.10; } 
            else if (concentration <= 30) { concentrationScore = 0.05; }
        }
        let mixScore = 0; 
        if (mix !== null) {
            if (mix >= 75) { mixScore = 0.05; } 
            else if (mix >= 50) { mixScore = 0.02; }
        }
        bookScore += concentrationScore + mixScore;
        bookScore = Math.max(0.10, Math.min(0.75, bookScore)); 
        totalRawScore += bookScore;
        
        // 6. OPS
        let opsScore = 0.05; 
        if (rpe !== null && rpe >= 200000) { opsScore += 0.05; }
        if (carrierDiv !== null) {
            if (carrierDiv < 40) { opsScore += 0.05; } 
            else if (carrierDiv <= 70) { opsScore += 0.02; }
        }
        opsScore = Math.min(0.15, opsScore); 
        totalRawScore += opsScore;

        // 7. CONDITIONAL
        let conditionalScore = 0.00;
        if (isFullAgency) {
            if (closingTimeline === 'urgent') { conditionalScore += 0.07; } 
            else if (closingTimeline === 'long') { conditionalScore -= 0.03; }
            if (staffRetentionRisk === 'secure') { conditionalScore += 0.05; } 
            else if (staffRetentionRisk === 'high') { conditionalScore -= 0.10; }
            if (avgClientTenure !== null) {
                if (avgClientTenure > 7) { conditionalScore += 0.05; } 
                else if (avgClientTenure < 3) { conditionalScore -= 0.03; }
            }
            if (newBusinessValue !== null && revLTM > 0) {
                if (newBusinessValue / revLTM >= 0.15) { conditionalScore += 0.07; }
            }
            conditionalScore = Math.max(-0.13, Math.min(0.25, conditionalScore));
            totalRawScore += conditionalScore;
        }

        // --- FINAL RESULTS ---
        let scaledCoreScore = 0.75;
        const desiredMin = 0.75;
        const desiredMax = 3.0;
        
        if (totalRawScore > 0) {
             scaledCoreScore = desiredMin + (totalRawScore * 1.5);
        }

        if (scaledCoreScore < desiredMin) { scaledCoreScore = desiredMin; }
        if (scaledCoreScore > desiredMax) { scaledCoreScore = desiredMax; }

        const finalMultiple = scaledCoreScore * TRANSACTION_MULTIPLIER;

        let lowOffer = 0; let highOffer = 0;
        highOffer = revLTM * finalMultiple;
        lowOffer = revLTM * (finalMultiple - 0.25);
        lowOffer = Math.max(0, lowOffer); 
        if (lowOffer > highOffer) { lowOffer = highOffer * 0.9; }

        document.getElementById('coreScoreDisplay').textContent = `${scaledCoreScore.toFixed(2)}x`;
        document.getElementById('transactionMultiplierDisplay').textContent = `${TRANSACTION_MULTIPLIER.toFixed(2)}x`;
        document.getElementById('finalMultiplierDisplay').textContent = `${finalMultiple.toFixed(2)}x`;
        
        document.getElementById('revVal').textContent = formatter.format(revLTM * 0.75) + ' - ' + formatter.format(revLTM * 3.0);
        document.getElementById('sdeVal').textContent = formatter.format(sde * 5.0) + ' - ' + formatter.format(sde * 9.0);
        
        const risk = getRiskLevel(finalMultiple); 
        document.getElementById('lowOffer').textContent = formatter.format(lowOffer);
        document.getElementById('highOffer').textContent = formatter.format(highOffer);
        document.getElementById('riskDisplay').textContent = risk.text;
        document.getElementById('riskDisplay').style.color = risk.color;
        
        currentValuationResults = { lowOffer: lowOffer, highOffer: highOffer, coreScore: scaledCoreScore, calculatedMultiple: finalMultiple };
    }
    
    // ==================================================================
    // 8. FORM HANDLERS (METHODOLOGY EXPANDED)
    // ==================================================================
    function openMethodologyModal() {
        const modal = document.getElementById('methodologyModal');
        const content = document.getElementById('methodologyContent'); 
        
        if(content) {
            content.innerHTML = `
                <div style="line-height:1.6; color:var(--text-main);">
                    <h2 style="margin-top:0; color:var(--accent);">Valuation Methodology Explained</h2>
                    <p>Our proprietary valuation model uses a <strong>Weighted Average Scorecard</strong> approach. Unlike simple "2x Revenue" calculators, we analyze 7 specific risk categories to determine the quality of the asset.</p>
                    
                    <hr style="margin:20px 0; border:0; border-top:1px solid var(--border);">
                    
                    <h3 style="color:#3b82f6;">1. Financial Performance (45% Weight)</h3>
                    <ul style="padding-left:20px; color:var(--text-sub);">
                        <li><strong>SDE/EBITDA:</strong> Buyers purchase future cash flow. High margins (>40%) command a premium because they can easily service acquisition debt. Margins <20% suggest operational bloat.</li>
                        <li><strong>Revenue Trend:</strong> We analyze the trajectory. A 3-year decline is penalized heavily ("Falling Knife"). However, a recent recovery (LTM > Y2) is treated as "Stabilizing" rather than purely distressed.</li>
                    </ul>

                    <h3 style="color:#3b82f6;">2. Book Quality (35% Weight)</h3>
                    <ul style="padding-left:20px; color:var(--text-sub);">
                        <li><strong>Retention Rate:</strong> This is the single most critical metric. <80% retention destroys value because the asset is evaporating. >92% retention commands a massive premium.</li>
                        <li><strong>Concentration:</strong> If one client represents >25% of revenue, the risk is existential. This typically caps the multiple at 1.5x-2.0x regardless of other factors.</li>
                        <li><strong>Policy Mix:</strong> Commercial lines are stickier and have higher premiums than Personal lines, usually justifying a higher multiple.</li>
                    </ul>

                    <h3 style="color:#3b82f6;">3. Legal & Transferability (20% Weight)</h3>
                    <ul style="padding-left:20px; color:var(--text-sub);">
                        <li><strong>Producer Agreements:</strong> If your staff do not have Non-Solicitation agreements, they legally "own" the relationship. This is a massive risk for a buyer and lowers the valuation significantly.</li>
                        <li><strong>Carrier Dependency:</strong> Relying on 1 carrier (>75% of book) creates "Termination Risk." Diversified books are safer and more valuable.</li>
                    </ul>
                    
                    <div style="background:rgba(34, 197, 94, 0.1); padding:15px; border-radius:6px; margin-top:20px; border-left:4px solid #22c55e;">
                        <strong>Pro Tip:</strong> The Deal Simulator allows you to see how accepting an "Earn-out" can bridge the gap between a standard valuation and a premium one.
                    </div>
                </div>
            `;
        }
        document.getElementById('valuationMethodology').style.display = 'block';
        if(modal) modal.style.display = 'block';
    }

    function collectAllInputData() {
        const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
        const getRadio = (name) => { const el = document.querySelector(`input[name="${name}"]:checked`); return el ? el.value : 'Unknown'; };
        const getCheck = (id) => { const el = document.getElementById(id); return el ? el.checked : false; };

        return {
            scope_of_sale: getRadio('scopeOfSale'),
            year_established: getVal('yearEstablished'),
            year_est_estimate: getCheck('yearEstEstimate'),
            primary_state: getVal('primaryState'),
            employee_count: getVal('employeeCount'),
            office_structure: getRadio('officeStructure'),
            agency_description: getVal('agencyDescription'),
            eo_claims: getVal('eoClaims'),
            eo_estimate: getCheck('eoEstimate'),
            producer_agreements: getRadio('producerAgreements'),
            revenue_ltm: getVal('annualRevenueLTM'),
            revenue_y2: getVal('annualRevenueY2'),
            revenue_y3: getVal('annualRevenueY3'),
            sde_ebitda: getVal('sdeEBITDA'),
            retention: getVal('retentionRate'),
            policy_mix: getVal('policyMix'),
            client_concentration: getVal('clientConcentration'),
            carrier_diversification: getVal('carrierDiversification'),
            rpe: getVal('revenuePerEmployee'),
            top_5_carriers: getVal('top5Carriers'),
            closing_timeline: getRadio('closingTimeline'),
            annual_payroll_cost: getVal('annualPayrollCost'),
            owner_comp_actual: getVal('ownerCompActual'),
            staff_retention_risk: getRadio('staffRetentionRisk'),
            new_business_value: getVal('newBusinessValue'),
            avg_client_tenure: getVal('avgClientTenure'),
            // Results
            calculated_low: currentValuationResults.lowOffer,
            calculated_high: currentValuationResults.highOffer,
            calculated_multiple: currentValuationResults.calculatedMultiple
        };
    }
    
    function populateSummaryPage() {
        const data = collectAllInputData();
        const low = document.getElementById('lowOffer').textContent;
        const high = document.getElementById('highOffer').textContent;
        const score = document.getElementById('coreScoreDisplay').textContent;
        const gradeText = document.getElementById('riskDisplay').textContent;
        
        // Calculate SDE Margin
        let margin = "---";
        if(data.sde_ebitda && data.revenue_ltm) {
            margin = ((data.sde_ebitda / data.revenue_ltm) * 100).toFixed(1) + "%";
        }

        // Fill Data
        document.getElementById('summaryRange').textContent = `${low} - ${high}`;
        document.getElementById('summaryScore').textContent = score;
        document.getElementById('summaryGrade').textContent = gradeText;
        document.getElementById('summaryMargin').textContent = margin;
        document.getElementById('summaryRetention').textContent = data.retention ? data.retention + "%" : "---";

        // Color grade
        const gradeEl = document.getElementById('summaryGrade');
        if(gradeText === 'VERY LOW' || gradeText === 'LOW') { gradeEl.style.color = 'var(--btn-green)'; }
        else if(gradeText === 'MODERATE') { gradeEl.style.color = 'var(--btn-orange)'; }
        else { gradeEl.style.color = 'var(--btn-red)'; }
    }

    function validateValuationForm() {
        let isValid = true;
        let missingFields = [];

        // STRICT LIST OF REQUIRED INPUTS
        const requiredInputs = [
            {id: 'annualRevenueLTM', label: 'Annual Revenue (LTM)'}, 
            {id: 'sdeEBITDA', label: 'SDE/EBITDA'}, 
            {id: 'retentionRate', label: 'Retention Rate'},
            {id: 'policyMix', label: 'Policy Mix'},
            {id: 'clientConcentration', label: 'Client Concentration'},
            {id: 'eoClaims', label: 'E&O Claims'}
        ];
        
        requiredInputs.forEach(item => {
            const el = document.getElementById(item.id);
            if(el) {
                const val = el.value.trim();
                const isExclude = (val === EXCLUDE_FLAG);
                
                // Map to estimate checkbox ID
                let estimateId = '';
                if(item.id === 'annualRevenueLTM') estimateId = 'revLtmEstimate';
                else if(item.id === 'sdeEBITDA') estimateId = 'sdeEstimate';
                else if(item.id === 'retentionRate') estimateId = 'retentionEstimate';
                else if(item.id === 'policyMix') estimateId = 'mixEstimate';
                else if(item.id === 'clientConcentration') estimateId = 'concentrationEstimate';
                else if(item.id === 'eoClaims') estimateId = 'eoEstimate';

                const estimateBox = document.getElementById(estimateId);
                const isEstimated = estimateBox ? estimateBox.checked : false;
                
                // Rule: Must have value OR be estimated. Cannot be empty or excluded.
                if((val === '' || isExclude) && !isEstimated) {
                    el.classList.add('input-error');
                    isValid = false;
                    missingFields.push(item.label);
                } else {
                    el.classList.remove('input-error');
                }
            }
        });

        // Check Radio: Scope (ALWAYS REQUIRED)
        const scopeGroup = document.querySelector('input[name="scopeOfSale"]');
        if(scopeGroup) {
            const container = scopeGroup.closest('.scope-options');
            const checked = document.querySelector('input[name="scopeOfSale"]:checked');
            if(!checked) {
                container.classList.add('radio-error');
                isValid = false;
                missingFields.push("Scope of Sale");
            } else {
                container.classList.remove('radio-error');
            }
        }
        
        // Check Radio: Office Structure (ALWAYS REQUIRED)
        const officeChecked = document.querySelector('input[name="officeStructure"]:checked');
        if(!officeChecked) {
             const officeLabel = document.querySelector('input[name="officeStructure"]').closest('.scope-options');
             officeLabel.classList.add('radio-error');
             isValid = false;
             missingFields.push("Office Structure");
        } else {
             const officeLabel = document.querySelector('input[name="officeStructure"]').closest('.scope-options');
             officeLabel.classList.remove('radio-error');
        }
        
        // Check Radio: Producer Agreements (ALWAYS REQUIRED)
        const prodChecked = document.querySelector('input[name="producerAgreements"]:checked');
        if(!prodChecked) {
             const prodLabel = document.querySelector('input[name="producerAgreements"]').closest('.scope-options');
             prodLabel.classList.add('radio-error');
             isValid = false;
             missingFields.push("Producer Agreements");
        } else {
             const prodLabel = document.querySelector('input[name="producerAgreements"]').closest('.scope-options');
             prodLabel.classList.remove('radio-error');
        }

        // Conditional Check for Full Agency
        const scopeChecked = document.querySelector('input[name="scopeOfSale"]:checked');
        const isFullAgency = (scopeChecked && scopeChecked.value === '1.0');
        
        if(isFullAgency) {
             const timeline = document.querySelector('input[name="closingTimeline"]:checked');
             if(!timeline) {
                 isValid = false;
                 missingFields.push("Closing Timeline");
                 const timelineEl = document.querySelector('input[name="closingTimeline"]').closest('.scope-options');
                 timelineEl.classList.add('radio-error');
             }
        }

        if (!isValid) {
            return { isValid: false, message: 'Please complete the required fields marked in red:\n• ' + missingFields.join('\n• ') };
        }

        return { isValid: true, message: '' };
    }

    function showValidationError(elementId, message) {
        const statusEl = document.getElementById(elementId);
        if (statusEl) { statusEl.textContent = message; statusEl.style.display = 'block'; }
    }
    
    function toggleUnknown(id) {
        const input = document.getElementById(id);
        const button = document.getElementById(id + '-btn');
        if (button.classList.contains('active')) {
            input.value = ''; input.disabled = false; button.classList.remove('active');
        } else {
            input.value = EXCLUDE_FLAG; input.disabled = true; button.classList.add('active');
        }
    }

    function showValuationQuestions() {
        const q = document.getElementById('valuation-questions-wrapper');
        if(q) q.style.display = 'block';
    }

    document.addEventListener('DOMContentLoaded', function() {
        const results = document.getElementById('gated-results');
        if (results) results.classList.add('blurred-results');

        const followUpForm = document.getElementById('followUpForm');
        if (followUpForm) {
            followUpForm.addEventListener('submit', async function(event) {
                event.preventDefault(); 
                const submitBtn = document.getElementById('modalSubmitBtn');
                submitBtn.disabled = true; submitBtn.textContent = 'Submitting...';

                try {
                    calculateValuation();
                    
                    // NEW LOADING LOGIC
                    runAnalysisSimulation(() => {
                        const fullPayload = {
                            title: `Agency Valuation Lead`,
                            contact_name: document.getElementById('sellerName').value,
                            contact_email: document.getElementById('sellerEmail').value,
                            agency_name: document.getElementById('agencyName').value, 
                            custom_fields: collectAllInputData()
                        };

                        // Still send data, but do it inside the flow
                        fetch(API_ENDPOINT, {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
                            body: JSON.stringify(fullPayload)
                        });

                        // UI UPDATES
                        document.getElementById('gated-results').classList.remove('blurred-results');
                        document.getElementById('leadModal').style.display = 'none'; 
                        document.getElementById('pre-submission-buttons').style.display = 'none';
                        document.getElementById('post-submission-buttons').style.display = 'flex';
                        toggleInputs(true);
                        
                        // SHOW CUSTOM SUCCESS MODAL (Instead of alert)
                        showSuccessModal();
                        
                        submitBtn.disabled = false; submitBtn.textContent = 'Submit';
                    });

                } catch (error) {
                    console.error('Submission Error', error);
                    submitBtn.disabled = false; submitBtn.textContent = 'Submit';
                }
            });
        }
        
        const notifyBtn = document.getElementById('notify-btn');
        if(notifyBtn) {
            notifyBtn.addEventListener('click', function() {
                const check = validateValuationForm();
                if(check.isValid) {
                    calculateValuation();
                    document.getElementById('leadModal').style.display = 'block';
                } else {
                    alert('Action Required:\n' + check.message);
                }
            });
        }
    });
</script>