<style>
    /* SIDEBAR SPECIFIC STYLES */
    #results-content h3 {
        text-align: center; color: var(--accent); 
        border-bottom: 2px solid var(--accent); 
        padding-bottom: 10px; margin-bottom: 20px;
    }

    .result-line { 
        display: flex; justify-content: space-between; 
        padding: 10px 0; border-bottom: 1px solid var(--border);
        font-size: 0.95em; color: var(--text-sub);
    }
    .result-line strong { color: var(--text-main); font-weight: 700; }
    
    .adjusted-offer { font-size: 1.1em; padding-top: 15px; border-bottom: none; }
    
    /* BUTTON STYLING */
    .action-buttons { display: flex; flex-direction: column; gap: 10px; margin-top: 25px; }
    
    .sidebar-btn {
        width: 100%; padding: 12px; border: none; border-radius: 6px;
        font-size: 0.95em; font-weight: 600; cursor: pointer;
        color: white !important; transition: transform 0.2s;
        text-align: center; display: flex; justify-content: center; align-items: center; gap: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .sidebar-btn:hover { opacity: 0.9; transform: translateY(-1px); }

    /* Colors */
    #notify-btn { background-color: var(--btn-green) !important; }
    
    /* Post Submission Area */
    #post-submission-buttons {
        display: none; flex-direction: column; gap: 10px;
        margin-top: 25px; padding-top: 20px; border-top: 1px dashed var(--border);
    }
    
    .btn-sim { background-color: var(--btn-blue) !important; } 
    .btn-risk { background-color: var(--btn-orange) !important; } 
    
    /* Edit Button (Standard) */
    #btn-edit-mode { 
        background-color: transparent !important; 
        border: 1px solid var(--border) !important;
        color: var(--text-sub) !important;
    }
    #btn-edit-mode:hover { border-color: var(--accent) !important; color: var(--accent) !important; }

    /* Resubmit Button (Hidden Default) */
    #btn-resubmit {
        display: none; /* Hidden until Edit is clicked */
        background-color: var(--btn-green) !important;
        border: 1px solid var(--btn-green) !important;
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
        70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
        100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
    }
</style>

<div id="results-panel">
    <div id="results-content">
        <h3>Real-Time Valuation</h3>
        
        <div id="gated-results">
            <div id="riskDisplayContainer" class="result-line"><span>Calculated Risk:</span><strong id="riskDisplay">---</strong></div>
            <div class="result-line"><span>Core Score:</span><strong id="coreScoreDisplay">---</strong></div>
            <div class="result-line"><span>Transaction Multiplier:</span><strong id="transactionMultiplierDisplay">---</strong></div>
            <div id="multiplierDisplayContainer" class="result-line"><span>**Final Multiplier:**</span><strong id="finalMultiplierDisplay">---</strong></div>

            <div id="revValContainer" class="result-line"><span>Revenue Range:</span><strong id="revVal">---</strong></div>
            <div id="sdeValContainer" class="result-line"><span>SDE Range:</span><strong id="sdeVal">---</strong></div>
            
            <div id="cagrDisplayContainer" class="result-line"><span>Calculated CAGR (3yr):</span><strong id="cagrDisplay">---</strong></div>
            <div id="ageFactorDisplayContainer" class="result-line"><span>Longevity Adj.:</span><strong id="ageFactorDisplay">---</strong></div>

            <hr style="border-top: 1px solid var(--border); margin: 15px 0;">
            
            <div class="result-line adjusted-offer"><span>LOW OFFER:</span><strong id="lowOffer" style="color:var(--btn-red);">---</strong></div>
            <div class="result-line adjusted-offer"><span>HIGH OFFER:</span><strong id="highOffer" style="color:var(--btn-green);">---</strong></div>
        </div>

        <div class="action-buttons" id="pre-submission-buttons">
            <button id="notify-btn" class="sidebar-btn">View Valuation</button>
        </div>
        
        <div id="post-submission-buttons">
             <div style="text-align:center; margin-bottom: 8px;">
                 <span style="background: rgba(34, 197, 94, 0.15); color: #4ade80; padding: 4px 12px; border-radius: 12px; font-size: 0.75em; font-weight: bold; border: 1px solid #22c55e;">VALUATION UNLOCKED</span>
             </div>
             
             <button id="btn-structure-sim" class="sidebar-btn btn-sim" onclick="switchTab('structure')">💰 Deal Simulator</button>
             <button id="btn-risk-sim" class="sidebar-btn btn-risk" onclick="switchTab('risk')">🛡️ Risk Assessment</button>
             
             <button id="btn-edit-mode" class="sidebar-btn" onclick="enableEditMode()">✏️ Edit Inputs</button>
             <button id="btn-resubmit" class="sidebar-btn" onclick="updateValuationManual()">🔄 Update & Recalculate</button>
             
             <button class="sidebar-btn" id="pdf-btn-2" style="background-color: var(--btn-red) !important;" onclick="showPrintOptions()">📄 Print Report</button>
        </div>
        
        <a id="methodology-link" onclick="openMethodologyModal('valuation')" style="display:block; text-align:center; margin-top:20px; font-size:0.85em; color:var(--text-sub); cursor:pointer; text-decoration:underline;">View Valuation Methodology</a>
        
        <div id="email-status" class="email-status" style="display:none; margin-top:15px; padding:10px; border-radius:6px; font-size:0.9em; text-align:center; background:rgba(34, 197, 94, 0.1); border:1px solid var(--btn-green); color:var(--text-main);"></div>
    </div>
</div>