<div id="methodologyModal" class="modal">
    <div class="modal-content">
        <span onclick="document.getElementById('methodologyModal').style.display='none'" class="close-btn">&times;</span>
        <h3 style="color: var(--accent); border-bottom: 1px solid var(--border);">Valuation Methodology</h3>
        
        <div id="valuationMethodology" class="methodology-content" style="display:block; color: var(--text-sub); font-size: 0.95em; line-height: 1.6;">
            <h4 style="color: var(--text-main); margin-top:15px;">Full Agency Valuation Model</h4>
            <p>Our proprietary model moves beyond simple "2x Revenue" estimations. We utilize a <strong>Weighted Average Scorecard</strong> that penalizes risk and rewards stability across 7 distinct pillars.</p>
            
            <div style="background: var(--bg-body); padding: 15px; border-radius: 8px; border: 1px dashed var(--border); text-align: center; margin: 15px 0;">
                <p style="margin:0 0 10px 0; font-size:0.85em; color:var(--text-sub); text-transform: uppercase; font-weight: bold;">The Weighted Scorecard</p>
                <div style="display:flex; height: 20px; width: 100%; border-radius: 10px; overflow: hidden; margin-bottom: 8px;">
                    <div style="width: 45%; background: #3b82f6;" title="Financials (45%)"></div>
                    <div style="width: 35%; background: #22c55e;" title="Book Quality (35%)"></div>
                    <div style="width: 20%; background: #f59e0b;" title="Legal/Ops (20%)"></div>
                </div>
                <div style="display:flex; justify-content: space-between; font-size: 0.75em; color: var(--text-main);">
                    <div style="display:flex; align-items:center; gap:4px;"><span style="width:8px; height:8px; background:#3b82f6; border-radius:50%; display:inline-block;"></span> Financials (45%)</div>
                    <div style="display:flex; align-items:center; gap:4px;"><span style="width:8px; height:8px; background:#22c55e; border-radius:50%; display:inline-block;"></span> Retention (35%)</div>
                    <div style="display:flex; align-items:center; gap:4px;"><span style="width:8px; height:8px; background:#f59e0b; border-radius:50%; display:inline-block;"></span> Ops (20%)</div>
                </div>
            </div>

            <hr style="margin:20px 0; border:0; border-top:1px solid var(--border);">
            
            <h4 style="color:#3b82f6;">1. Financial Health (45% Weight)</h4>
            <ul style="padding-left:20px; color:var(--text-sub);">
                <li><strong>SDE/EBITDA Margins:</strong> High margins (>40%) indicate an efficient machine that can easily service debt. Low margins (<20%) signal bloat.</li>
                <li><strong>Revenue Trend:</strong> We differentiate between "Declining" assets (falling knife) and "Stabilizing" assets (V-shape recovery).</li>
            </ul>

            <h4 style="color:#3b82f6;">2. Portfolio Quality (35% Weight)</h4>
            <ul style="padding-left:20px; color:var(--text-sub);">
                <li><strong>Retention is King:</strong> 92% retention commands a premium. Anything under 85% is considered a "leaky bucket" and heavily discounted.</li>
                <li><strong>Concentration Risk:</strong> If a single client represents >25% of your revenue, our model caps the multiple to protect the buyer from catastrophic loss.</li>
            </ul>

            <h4 style="color:#3b82f6;">3. Transferability & Legal (20% Weight)</h4>
            <ul style="padding-left:20px; color:var(--text-sub);">
                <li><strong>Producer Contracts:</strong> Without non-solicitation agreements, your staff effectively owns the book, not you. This is a critical valuation killer.</li>
                <li><strong>Carrier Dependencies:</strong> We analyze if your book is too heavily weighted with one carrier, creating termination risk.</li>
            </ul>
            
            <div style="background:rgba(34, 197, 94, 0.1); padding:15px; border-radius:6px; margin-top:20px; border-left:4px solid #22c55e;">
                <strong>Pro Tip:</strong> The Deal Simulator allows you to see how accepting an "Earn-out" can bridge the gap between a standard valuation and a premium one.
            </div>
        </div>
    </div>
</div>

<div id="leadModal" class="modal">
    <div class="modal-content">
        <span onclick="document.getElementById('leadModal').style.display='none'" class="close-btn">&times;</span>
        <h3 style="color: var(--btn-green); border-bottom: none;">View Your Valuation</h3>
        <p style="color: var(--text-sub); margin-bottom: 20px;">Please provide your contact information to unlock your results.</p>
        
        <form id="followUpForm">
            <label for="sellerName">Your Name:</label>
            <input type="text" id="sellerName" name="sellerName" placeholder="John Doe" required>
            
            <label for="sellerEmail">Your Email:</label>
            <input type="email" id="sellerEmail" name="sellerEmail" placeholder="john@agency.com" required>
         
            <label for="agencyName">Agency Name:</label>
            <input type="text" id="agencyName" name="agencyName" placeholder="My Agency LLC" style="margin-bottom: 25px;" required>
            
            <button type="submit" id="modalSubmitBtn" style="background-color: var(--btn-green); color: white; padding: 12px; width: 100%; border-radius: 6px; font-size: 1.1em;">Submit & Unlock</button>
        </form>
    </div>
</div>