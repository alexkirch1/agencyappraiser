<div id="methodologyModal" class="modal">
    <div class="modal-content" style="max-width: 600px;">
        <span onclick="document.getElementById('methodologyModal').style.display='none'" class="close-btn">&times;</span>
        <h3 style="color: var(--color-primary-brand); border-bottom: 2px solid var(--color-primary-brand);">Valuation Methodology & Transparency</h3>
        
        <div id="carrierMethodology" class="methodology-content" style="display:block;">
            <h4>Carrier Book Valuation</h4>
            <p style="font-size: 0.9em; color: var(--color-text-secondary);">
                This valuation is calculated differently from the Full Agency model. It uses a baseline multiplier applied to the <strong>Total Annual Premium</strong> of the book (Personal, Commercial, or Both).
            </p>
            <p style="font-size: 0.9em; color: var(--color-text-secondary);">
                The system starts with a <strong>1.5x multiplier</strong> and then applies bonuses or penalties based on the data you provide:
            </p>
            <ul style="font-size: 0.9em; color: var(--color-text-secondary);">
                <li><strong>Loss Ratios:</strong> Favorable loss ratios (e.g., < 40% PL, < 10% CL) significantly increase the multiplier. High loss ratios will decrease it.</li>
           
           
           <li><strong>Book Health:</strong> Bonuses are applied for a high Bundle Rate (> 65%), good YTD Apps (> 50), and having "Diamond" status.</li>
                <li><strong>Safeco & MSA Models:</strong> Similar logic is applied using YTD DWP, Loss Ratio, and Retention % metrics.</li>
            </ul>
         
         
         
         
            <p style="font-size: 0.9em; color: var(--color-text-secondary);">
                The final multiplier is capped within a range of <strong>0.75x to 3.0x</strong>. The "Low Offer" is calculated at 0.25x below the "High Offer" (Final Multiplier).
            </p>
        </div>

    </div>
</div>

<div id="carrierLeadModal" class="modal">
    <div class="modal-content">
        <span onclick="document.getElementById('carrierLeadModal').style.display='none'" class="close-btn">&times;</span>
        <h3 style="color: var(--color-risk-low); border-bottom: none;">View Your Book Valuation</h3>
     
        <p>Please provide your contact information to view your results and have our M&A team reach out.</p>
        
        <form id="carrierFollowUpForm">
            <label for="carrierSellerName">Your Name:</label>
            <input type="text" id="carrierSellerName" name="carrierSellerName" placeholder="John Doe" required>
            
            <label for="carrierSellerEmail">Your Email:</label>
            <input type="email" id="carrierSellerEmail" name="carrierEmail" placeholder="john.doe@agency.com" required>
         
            <label for="carrierAgencyName">Agency Name:</label>
            <input type="text" id="carrierAgencyName" name="carrierAgencyName" placeholder="Rocky Quote LLC" style="margin-bottom: 20px;" required>
            
            <button type="submit" id="carrierModalSubmitBtn" style="background-color: var(--color-risk-low); color: white; padding: 10px 15px; border: none; border-radius: 5px; cursor: pointer; width: 100%;">Submit & View Results</button>
        </form>
    </div>
</div>