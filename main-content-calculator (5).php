<div class="container">
    <div id="theme-toggle-container">
        <button id="theme-toggle" onclick="toggleTheme()">🌙 Toggle to Light Mode</button>
    </div>

    <h1>Agency Appraiser Valuation</h1>
    <p class="subtitle">Expert M&A analysis for strategic insurance agency acquisitions.</p>
    
    <nav id="main-nav">
        <a class="nav-item" href="/">❮ Back to Homepage</a>
        <a class="nav-item active" href="/Calculator/">Valuation Calculator</a>
        <a class="nav-item" href="/Carrier/">Carrier Book Purchase</a>
    </nav>

    <div id="summary-tab" class="tab-content" style="display: none;">
        <div class="summary-hero">
            <span style="background: rgba(34, 197, 94, 0.2); color: #4ade80; padding: 4px 12px; border-radius: 12px; font-size: 0.75em; font-weight: bold; border: 1px solid #22c55e; margin-bottom: 15px; display: inline-block;">VALUATION UNLOCKED</span>
            <h2 id="summaryRange">$0 - $0</h2>
            <p>Estimated Market Value Range</p>
        </div>

        <div class="stat-grid">
            <div class="stat-card">
                <span>Core Quality Score</span>
                <strong id="summaryScore" style="color: var(--accent);">---</strong>
            </div>
            <div class="stat-card">
                <span>Asset Grade</span>
                <strong id="summaryGrade">---</strong>
            </div>
            <div class="stat-card">
                <span>SDE Margin</span>
                <strong id="summaryMargin">---</strong>
            </div>
            <div class="stat-card">
                <span>Retention Rate</span>
                <strong id="summaryRetention">---</strong>
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; font-size: 0.9em; color: var(--text-sub); font-style: italic;">
            Select an option from the menu to proceed with your analysis.
        </div>
    </div>

    <div id="valuation-tab" class="tab-content" style="display: block;">
        
        <div class="metric-group">
            <h3>1. Transaction Structure & Risk</h3>
            <label>Scope of Sale (Determines Transaction Multiplier) <span class="tooltip-icon" data-tooltip="What exactly are you selling? A full entity sale includes liabilities, while a book purchase is just the assets (policies).">ⓘ</span> <span class="req">*</span>:</label>
            <div class="scope-options">
                <label><input type="radio" name="scopeOfSale" value="1.0" onchange="showValuationQuestions(); calculateValuation();"> **Full Agency Purchase (Multiplier: 1.0x):** Assets, liabilities, entity, and all books included.</label>
                <label><input type="radio" name="scopeOfSale" value="0.95" onchange="showValuationQuestions(); calculateValuation();"> **Complete Book Purchase (Multiplier: 0.95x):** All policies/accounts, seller retains entity/some carrier appointments.</label>
                <label><input type="radio" name="scopeOfSale" value="0.9" onchange="showValuationQuestions(); calculateValuation();"> **Fragmented Customer Only Purchase (Multiplier: 0.9x):** Segmented list of policies/accounts across various carriers.</label>
            </div>
        </div>
        
        <div id="valuation-questions-wrapper" style="display:none;">
        
            <div class="metric-group">
                <h3>2. Book Longevity Risk</h3>
                <label for="yearEstablished">Year Agency Established <span class="tooltip-icon" data-tooltip="Older agencies typically have deeper client roots and lower churn, commanding a longevity premium.">ⓘ</span> <span class="opt">(Optional)</span></label>
                <div class="input-row">
                    <input type="number" id="yearEstablished" placeholder="e.g., 2005" min="1900" max="2025" oninput="calculateValuation()">
                    <div class="estimate-option"><input type="checkbox" id="yearEstEstimate"> Estimate</div>
                    <button class="unknown-btn" id="yearEstablished-btn" onclick="toggleUnknown('yearEstablished');">Exclude</button>
                </div>
            </div>
            
            <div class="metric-group">
                <h3>3. Agency Demographic & Operational Profile</h3>
                <label for="primaryState">Primary State of Operation <span class="tooltip-icon" data-tooltip="Some states (like FL or CA) have higher risk profiles due to CAT exposure, which can impact carrier appetite.">ⓘ</span> <span class="opt">(Optional)</span></label>
                <div class="input-row">
                    <input type="text" id="primaryState" placeholder="e.g., California (CA)" oninput="calculateValuation()">
                </div>
                <label for="employeeCount">Total Number of Employees (FTEs) <span class="tooltip-icon" data-tooltip="Used to calculate Revenue Per Employee. Helps us detect if you are overstaffed (low margin) or efficient.">ⓘ</span> <span class="opt">(Optional)</span></label>
                <div class="input-row">
                    <input type="number" id="employeeCount" placeholder="e.g., 5" min="1" oninput="calculateValuation()">
                </div>
                <label>Office Structure <span class="tooltip-icon" data-tooltip="Virtual/Hybrid agencies are easier to acquire because there are no lease liabilities to assume.">ⓘ</span> <span class="req">*</span>:</label>
                <div class="scope-options">
                    <label><input type="radio" name="officeStructure" value="BrickAndMortar" onchange="calculateValuation()"> Brick and Mortar (Traditional Office)</label>
                    <label><input type="radio" name="officeStructure" value="Virtual" onchange="calculateValuation()"> Virtual (Fully Remote)</label>
                    <label><input type="radio" name="officeStructure" value="Hybrid" onchange="calculateValuation()"> Hybrid (Home Office + Shared Space)</label>
                </div>
                <label for="agencyDescription">Agency Description <span class="tooltip-icon" data-tooltip="Niche agencies (e.g., 'Contractors Only') often command higher multiples due to specialized expertise.">ⓘ</span> <span class="opt">(Optional)</span></label>
                <div class="input-row">
                    <input type="text" id="agencyDescription" placeholder="e.g., High-Net-Worth P&C or Commercial Contractors" oninput="calculateValuation()">
                </div>
            </div>
            
            <div class="metric-group">
                <h3>4. Legal & Compliance Metrics</h3>
                <label for="eoClaims">E&O Claims Filed (Last 3 Years) <span class="tooltip-icon" data-tooltip="Past claims indicate operational weakness and potential future liability. Clean records get a premium.">ⓘ</span> <span class="req">*</span></label>
                <div class="input-row">
                    <input type="number" id="eoClaims" placeholder="e.g., 0 or 1" min="0" oninput="calculateValuation()">
                    <div class="estimate-option"><input type="checkbox" id="eoEstimate"> Estimate</div>
                    <button class="unknown-btn" id="eoClaims-btn" onclick="toggleUnknown('eoClaims');">Exclude</button>
                </div>
                <label>Producer Non-Compete/Non-Solicit Agreements <span class="tooltip-icon" data-tooltip="If producers don't have contracts, they own the relationship, not you. This is a massive flight risk for buyers.">ⓘ</span> <span class="req">*</span>:</label>
                <div class="scope-options">
                    <label><input type="radio" name="producerAgreements" value="strong" onchange="calculateValuation()"> **Strong:** Enforceable NC/NS for all producers.</label>
                    <label><input type="radio" name="producerAgreements" value="moderate" onchange="calculateValuation()"> **Moderate:** Contracts exist, but may be weak or untested.</label>
                    <label><input type="radio" name="producerAgreements" value="none" onchange="calculateValuation()"> **None/Weak:** Producers could walk with clients easily.</label>
                </div>
            </div>

            <div class="metric-group">
                <h3>5. Financial & Valuation Benchmarks</h3>
                <label for="annualRevenueLTM">Total Annual Commissions/Revenue (LTM) <span class="tooltip-icon" data-tooltip="Last Twelve Months of commission income. Do not include premium volume, only your commission cut.">ⓘ</span> <span class="req">*</span></label>
                <div class="input-row">
                    <input type="number" id="annualRevenueLTM" placeholder="e.g., 1250000" required oninput="calculateValuation()">
                    <div class="estimate-option"><input type="checkbox" id="revLtmEstimate"> Estimate</div>
                </div>
                <label for="annualRevenueY2">Annual Commissions/Revenue (Y-2) <span class="tooltip-icon" data-tooltip="Revenue from 2 years ago. Used to calculate growth trends and stability.">ⓘ</span> <span class="opt">(Optional)</span></label>
                <div class="input-row">
                    <input type="number" id="annualRevenueY2" placeholder="e.g., 1000000" oninput="calculateValuation()">
                    <div class="estimate-option"><input type="checkbox" id="revY2Estimate"> Estimate</div>
                    <button class="unknown-btn" id="annualRevenueY2-btn" onclick="toggleUnknown('annualRevenueY2');">Exclude</button>
                </div>
                <label for="annualRevenueY3">Annual Commissions/Revenue (Y-3) <span class="tooltip-icon" data-tooltip="Revenue from 3 years ago. Used to spot long-term decline or growth patterns.">ⓘ</span> <span class="opt">(Optional)</span></label>
                <div class="input-row">
                    <input type="number" id="annualRevenueY3" placeholder="e.g., 850000" oninput="calculateValuation()">
                    <div class="estimate-option"><input type="checkbox" id="revY3Estimate"> Estimate</div>
                    <button class="unknown-btn" id="annualRevenueY3-btn" onclick="toggleUnknown('annualRevenueY3');">Exclude</button>
                </div>
                
                <label for="sdeEBITDA">Seller's Discretionary Earnings (SDE) <span class="tooltip-icon" data-tooltip="Net Profit + Owner Salary + Personal Expenses + One-time Costs. This is the true cash flow.">ⓘ</span> <span class="req">*</span></label>
                
                

                <div style="background: rgba(14, 165, 233, 0.1); border-left: 3px solid var(--accent); padding: 10px; margin: 5px 0 10px 0; border-radius: 4px; font-size: 0.85em; color: var(--text-sub);">
                    <strong style="color:var(--accent);">📉 How to Calculate SDE:</strong>
                    <div style="display:flex; flex-direction:column; gap:4px; margin-top:5px;">
                        <div>1. Start with <strong>Net Profit</strong> (Tax Return)</div>
                        <div>2. <span style="color:var(--btn-green); font-weight:bold;">+ Add Back</span> Owner's Salary/Draw</div>
                        <div>3. <span style="color:var(--btn-green); font-weight:bold;">+ Add Back</span> Personal Auto/Health/Travel</div>
                        <div>4. <span style="color:var(--btn-green); font-weight:bold;">+ Add Back</span> One-time Legal/Move Costs</div>
                        <div style="border-top:1px solid var(--border); padding-top:4px;"><strong>= Enter this Total Below</strong></div>
                    </div>
                </div>

                <div class="input-row">
                    <input type="number" id="sdeEBITDA" placeholder="e.g., 400000" required oninput="calculateValuation()">
                    <div class="estimate-option"><input type="checkbox" id="sdeEstimate"> Estimate</div>
                </div>
            </div>

            <div class="metric-group">
                <h3>6. Book of Business Quality</h3>
                <label for="retentionRate">Client/Policy Retention Rate (%) <span class="tooltip-icon" data-tooltip="The % of clients who renew each year. <85% is dangerous. >92% is premium.">ⓘ</span> <span class="req">*</span></label>
                <div class="input-row">
                    <input type="number" id="retentionRate" placeholder="e.g., 90 (75+ is ideal)" min="0" max="100" required oninput="if(this.value > 100) this.value = 100; if(this.value < 0) this.value = 0; calculateValuation()">
                    <div class="estimate-option"><input type="checkbox" id="retentionEstimate"> Estimate</div>
                </div>
                <label for="policyMix">Policy Mix (Revenue % Commercial) <span class="tooltip-icon" data-tooltip="Commercial lines typically have higher premiums and lower service costs than personal lines.">ⓘ</span> <span class="req">*</span></label>
                <div class="input-row">
                    <input type="number" id="policyMix" placeholder="e.g., 60 (Enter 0 - 100)" min="0" max="100" required oninput="if(this.value > 100) this.value = 100; if(this.value < 0) this.value = 0; calculateValuation()">
                    <div class="estimate-option"><input type="checkbox" id="mixEstimate"> Estimate</div>
                </div>
                <label for="clientConcentration">Client Concentration (% Rev Top 10) <span class="tooltip-icon" data-tooltip="If 10 clients make up >25% of revenue, you have a 'Whale Problem' and high risk.">ⓘ</span> <span class="req">*</span></label>
                <div class="input-row">
                    <input type="number" id="clientConcentration" placeholder="e.g., 15 (Lower is better)" min="0" max="100" required oninput="if(this.value > 100) this.value = 100; if(this.value < 0) this.value = 0; calculateValuation()">
                    <div class="estimate-option"><input type="checkbox" id="concentrationEstimate"> Estimate</div>
                </div>
            </div>

            <div class="metric-group">
                <h3>7. Operational/Transferability Metrics</h3>
                <label for="carrierDiversification">Carrier Diversification (% Rev Top 3) <span class="tooltip-icon" data-tooltip="Reliance on one carrier is risky. If they terminate you, your business fails.">ⓘ</span> <span class="opt">(Optional)</span></label>
                <div class="input-row">
                    <input type="number" id="carrierDiversification" placeholder="e.g., 55 (Lower is better)" min="0" max="100" oninput="if(this.value > 100) this.value = 100; if(this.value < 0) this.value = 0; calculateValuation()">
                    <div class="estimate-option"><input type="checkbox" id="carrierEstimate"> Estimate</div>
                    <button class="unknown-btn" id="carrierDiversification-btn" onclick="toggleUnknown('carrierDiversification');">Exclude</button>
                </div>
                <label for="revenuePerEmployee">Revenue Per Employee (RPE) <span class="tooltip-icon" data-tooltip="Total Revenue / Employee Count. Standard is $150k-$200k.">ⓘ</span> <span class="opt">(Optional)</span></label>
                <div class="input-row">
                    <input type="number" id="revenuePerEmployee" placeholder="e.g., 250000" oninput="calculateValuation()">
                    <div class="estimate-option"><input type="checkbox" id="rpeEstimate"> Estimate</div>
                    <button class="unknown-btn" id="revenuePerEmployee-btn" onclick="toggleUnknown('revenuePerEmployee');">Exclude</button>
                </div>
                <label for="top5Carriers">Top 5 Carriers <span class="tooltip-icon" data-tooltip="Buyers look for alignment. Do they have the same appointments?">ⓘ</span> <span class="opt">(Optional)</span></label>
                <div class="input-row">
                    <input type="text" id="top5Carriers" placeholder="e.g., Travelers, Safeco, Progressive..." oninput="calculateValuation()">
                </div>
            </div>
            
            <div id="full-agency-due-diligence">
                <h3>🤝 Full Agency Acquisition Details</h3>
                <p style="font-size:0.9em; color:var(--text-sub); margin-top:-10px;">(This section is only relevant for a Full Agency Purchase, 1.0x Scope)</p>
                <label>• Target Closing Timeline <span class="tooltip-icon" data-tooltip="Urgent sales often signal distress, which lowers leverage.">ⓘ</span> <span class="req">*</span>:</label>
                <div class="scope-options">
                    <label><input type="radio" name="closingTimeline" value="urgent" onchange="calculateValuation()"> **High Urgency (0-60 Days):** Deal ready, highest priority.</label>
                    <label><input type="radio" name="closingTimeline" value="standard" onchange="calculateValuation()"> **Standard (60-120 Days):** Normal due diligence period.</label>
                    <label><input type="radio" name="closingTimeline" value="long" onchange="calculateValuation()"> **Long (>120 Days):** Complex structure or low priority.</label>
                </div>
                <label for="annualPayrollCost">• Total Annual Employee Payroll <span class="tooltip-icon" data-tooltip="Excluding owner. Used to verify SDE calculations.">ⓘ</span> <span class="opt">(Optional)</span></label>
                <div class="input-row">
                    <input type="number" id="annualPayrollCost" placeholder="e.g., 300000" min="0" oninput="calculateValuation()">
                    <div class="estimate-option"><input type="checkbox" id="payrollEstimate"> Estimate</div>
                    <button class="unknown-btn" id="annualPayrollCost-btn" onclick="toggleUnknown('annualPayrollCost');">Exclude</button>
                </div>
                <label for="ownerCompActual">• Owner's Compensation <span class="tooltip-icon" data-tooltip="Actual W2 salary + distributions. We add this back to calculate SDE.">ⓘ</span> <span class="opt">(Optional)</span></label>
                <div class="input-row">
                    <input type="number" id="ownerCompActual" placeholder="e.g., 100000" min="0" oninput="calculateValuation()">
                    <div class="estimate-option"><input type="checkbox" id="ownerCompEstimate"> Estimate</div>
                    <button class="unknown-btn" id="ownerCompActual-btn" onclick="toggleUnknown('ownerCompActual');">Exclude</button>
                </div>
                <label>• Employee Retention Agreements <span class="tooltip-icon" data-tooltip="Will the staff stay? Buyers need assurance key talent won't walk.">ⓘ</span> <span class="opt">(Optional)</span></label>
                <div class="scope-options">
                    <label><input type="radio" name="staffRetentionRisk" value="secure" onchange="calculateValuation()"> **Secure:** Contracts/long-term incentives in place.</label>
                    <label><input type="radio" name="staffRetentionRisk" value="moderate" onchange="calculateValuation()"> **Moderate:** Staff is loyal, but new bonuses will be required.</label>
                    <label><input type="radio" name="staffRetentionRisk" value="high" onchange="calculateValuation()"> **High Risk:** Staff is known to be unhappy or actively looking to leave.</label>
                </div>
                <label for="newBusinessValue">• Pipeline Value (30-60 Days) <span class="tooltip-icon" data-tooltip="Proves the engine is still running and not stalling out.">ⓘ</span> <span class="opt">(Optional)</span></label>
                <div class="input-row">
                    <input type="number" id="newBusinessValue" placeholder="e.g., 35000" oninput="calculateValuation()">
                    <div class="estimate-option"><input type="checkbox" id="pipelineEstimate"> Estimate</div>
                    <button class="unknown-btn" id="newBusinessValue-btn" onclick="toggleUnknown('newBusinessValue');">Exclude</button>
                </div>
                <label for="avgClientTenure">• Average Client Tenure <span class="tooltip-icon" data-tooltip="How long do they stay? 7+ years indicates a very stable 'Legacy' book.">ⓘ</span> <span class="opt">(Optional)</span></label>
                <div class="input-row">
                    <input type="number" id="avgClientTenure" placeholder="e.g., 8" min="1" oninput="calculateValuation()">
                    <div class="estimate-option"><input type="checkbox" id="tenureEstimate"> Estimate</div>
                    <button class="unknown-btn" id="avgClientTenure-btn" onclick="toggleUnknown('avgClientTenure');">Exclude</button>
                </div>
            </div>
        </div> 
    </div>

    <div id="structure-tab" class="tab-content" style="display: none;">
        
        <h3 style="border-bottom: 1px solid var(--border); margin-bottom: 15px;">Deal Strategy Guide</h3>
        
        <div style="background-color: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px; border-radius: 4px;">
            <strong style="color: #f59e0b; display: block; margin-bottom: 5px;">⚠️ Preliminary Estimate Only</strong>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-sub); line-height: 1.4;">
                This simulator is a <strong>learning tool</strong>. These figures are not binding offers. Final deal structure depends on due diligence, carrier approvals, and financing.
            </p>
        </div>
        
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin-bottom:25px;">
            <div style="background:rgba(34, 197, 94, 0.1); padding:15px; border-radius:8px; border:1px solid var(--btn-green);">
                <strong style="color:var(--btn-green);">⚡ Quick Exit (Cash)</strong>
                <p style="font-size:0.85em; margin:5px 0 0; color:var(--text-sub);">
                    Best for sellers who want a clean break. You get 100% cash at closing, but the total valuation is usually lower to account for buyer risk.
                </p>
            </div>
            <div style="background:rgba(245, 158, 11, 0.1); padding:15px; border-radius:8px; border:1px solid var(--btn-orange);">
                <strong style="color:var(--btn-orange);">⚖️ Balanced (Hybrid)</strong>
                <p style="font-size:0.85em; margin:5px 0 0; color:var(--text-sub);">
                    The industry standard. 80-85% Cash + a small holdback (1-2 years) to ensure retention stays stable during transition.
                </p>
            </div>
            <div style="background:rgba(14, 165, 233, 0.1); padding:15px; border-radius:8px; border:1px solid var(--btn-blue);">
                <strong style="color:var(--btn-blue);">📈 Growth (Earnout)</strong>
                <p style="font-size:0.85em; margin:5px 0 0; color:var(--text-sub);">
                    Maximizes price. You take less cash now (70%) in exchange for a large potential upside if the book grows over 2-3 years.
                </p>
            </div>
        </div>

        <div style="background-color: var(--bg-body); padding: 25px; border-radius: 12px; border: 2px solid var(--border); text-align: center; margin-bottom: 20px;">
            <div style="font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; color: var(--text-sub); margin-bottom: 5px;">Est. Gross Valuation</div>
            <div id="simStartValue" style="font-size: 2.2em; font-weight: 800; color: var(--accent);">$0</div>
            <div id="simValAdjustment" style="font-size: 0.9em; color: var(--btn-orange); font-weight: 500; height: 20px;"></div>
        </div>

        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 350px;">
                <div class="metric-group" style="background-color: var(--bg-body); border-color: var(--border);">
                    <h4 style="margin-top:0; border-bottom:1px solid var(--border); padding-bottom:10px;">1. Visualize Strategy</h4>
                    
                    

                    <div style="display: flex; gap: 8px; margin-bottom: 25px;">
                        <button onclick="setSimulationStrategy('quick')" class="strategy-btn" id="btn-strat-quick" style="flex:1; padding: 10px; border: 1px solid var(--border); background: var(--bg-card); border-radius: 6px; color:var(--text-main); font-size:0.9em;">
                            ⚡ Quick
                        </button>
                        <button onclick="setSimulationStrategy('blend')" class="strategy-btn" id="btn-strat-blend" style="flex:1; padding: 10px; border: 1px solid var(--border); background: var(--bg-card); border-radius: 6px; color:var(--text-main); font-size:0.9em;">
                            ⚖️ Balanced
                        </button>
                        <button onclick="setSimulationStrategy('structured')" class="strategy-btn" id="btn-strat-structured" style="flex:1; padding: 10px; border: 1px solid var(--border); background: var(--bg-card); border-radius: 6px; color:var(--text-main); font-size:0.9em;">
                            📈 Earnout
                        </button>
                    </div>

                    <h4 style="margin-top:0; border-bottom:1px solid var(--border); padding-bottom:10px;">2. Fine Tune Split</h4>
                    <div id="sim-explanation-box" style="background: rgba(14, 165, 233, 0.1); border-left: 4px solid var(--btn-blue); padding: 12px; font-size: 0.9em; margin-bottom: 20px; border-radius: 4px;">
                        <strong id="sim-explain-title" style="color: var(--accent);">Analysis</strong>
                        <p id="sim-explain-text" style="margin: 5px 0 0 0; color: var(--text-sub);">Adjust sliders to see impact.</p>
                    </div>

                    <div style="margin-bottom: 25px;">
                        <label onclick="explainTerm('cash')" style="display:flex; justify-content:space-between; cursor:pointer; border-bottom:1px dotted var(--text-sub); padding-bottom:2px;" title="Click for definition">
                            <span>Cash Up Front ⓘ</span> 
                            <span id="dispCashPct" style="font-weight:bold;">80%</span>
                        </label>
                        <input type="range" id="simCashRange" min="0" max="100" step="5" value="80" style="width:100%; accent-color: var(--btn-green);" oninput="updateSimSliders('cash')">
                    </div>
                    
                    <div style="margin-bottom: 25px;">
                        <label onclick="explainTerm('earnout')" style="display:flex; justify-content:space-between; cursor:pointer; border-bottom:1px dotted var(--text-sub); padding-bottom:2px;" title="Click for definition">
                            <span>Earn-out ⓘ</span> 
                            <span id="dispEarnoutPct" style="font-weight:bold;">20%</span>
                        </label>
                        <input type="range" id="simEarnoutRange" min="0" max="100" step="5" value="20" style="width:100%; accent-color: #a855f7;" oninput="updateSimSliders('earnout')">
                    </div>
                </div>
            </div>

            <div style="flex: 1; min-width: 350px;">
                <div class="metric-group" style="background: var(--bg-body); border-color: var(--border);">
                    <h4 style="margin-top:0;">3. Scenario Visualization</h4>
                    <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:6px; padding:15px; margin-bottom:20px;">
                        <div style="font-size:0.85em; color:var(--text-sub); margin-bottom:5px;">EST. LIQUID CASH AT CLOSE</div>
                        <div id="simCashAtClose" style="font-size: 2.2em; font-weight:800; color:var(--btn-green);">$0</div>
                        <div style="font-size:0.8em; color:var(--text-sub);">(Before tax/debt. Subject to due diligence.)</div>
                    </div>
                    <label style="font-size:0.9em; font-weight:600; margin-bottom:8px; display:block;">Payout Waterfall</label>
                    <div style="width: 100%; height: 35px; background: var(--bg-card); border:1px solid var(--border); border-radius: 6px; overflow: hidden; display: flex; margin-bottom: 15px;">
                        <div id="barCash" style="height: 100%; background: var(--btn-green); width: 0%; transition: width 0.5s;" title="Cash"></div>
                        <div id="barEarnout" style="height: 100%; background: #a855f7; width: 0%; transition: width 0.5s;" title="Earnout"></div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:0;">
                        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px dashed var(--border); font-size:0.95em;">
                            <span><span style="color:var(--btn-green);">●</span> Cash at Close:</span>
                            <strong id="valCash">$0</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:none; font-size:0.95em;">
                            <span><span style="color:#a855f7;">●</span> Potential Earnout:</span>
                            <strong id="valEarnout">$0</strong>
                        </div>
                    </div>
                    
                    <div style="text-align:center; margin-top:20px; font-size:0.75em; color:var(--text-sub); opacity:0.7;">
                        *Figures are for educational modeling only. Not a binding offer.
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div id="risk-tab" class="tab-content" style="display: none;">
        <h3 style="border-bottom: none;">Risk Assessment & Mitigation</h3>
        <div id="risk-header-container" style="display:none; margin-bottom: 25px; padding: 30px; border-radius: 12px; background: var(--bg-card); border: 1px solid var(--border); align-items: center; gap: 25px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div id="risk-grade" style="font-size: 4em; font-weight: 900; line-height: 1; padding: 0 15px;">?</div>
            <div style="flex:1;">
                <h3 style="margin: 0 0 10px 0; font-size: 1.5em; border:none;">Deal Health Audit</h3>
                <p id="risk-summary-text" style="margin: 0; color: var(--text-sub); font-size: 1.1em; line-height: 1.4;">Running analysis...</p>
            </div>
        </div>
        <div id="risk-audit-container">
            <p>Loading analysis...</p>
        </div>
    </div>
</div>