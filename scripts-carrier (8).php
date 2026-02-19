<script>
    let currentCarrierValuation = { lowOffer: 0, highOffer: 0, premium: 0 };
    
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, });






// Direct paths (fixes 404 issue)
const API_ENDPOINT = '/Carrier/partials/submit_deal-carrier.php';
const AI_PARSER_ENDPOINT = '/Carrier/ai-parser.php';



console.log("API Path:", API_ENDPOINT);
console.log("AI Path:", AI_PARSER_ENDPOINT);





console.log("API Path:", API_ENDPOINT);
console.log("AI Path:", AI_PARSER_ENDPOINT);

   
    
    // Log to console so we can see exactly where the browser is looking
    console.log("Resolved API Path:", API_ENDPOINT);
    console.log("Resolved AI Path:", AI_PARSER_ENDPOINT);
    // If you are running from /Carrier/index.php, the path above is correct.
    // If the 404 persists, try changing AI_PARSER_ENDPOINT to: 'ai-parser.php'
   
   
   
   
    // ==================================================================
    // !!! CARRIER-ONLY FUNCTIONS !!!
    // ==================================================================

    // --- *** PDF PARSING LOGIC *** ---
    
    async function parsePDF(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async function(event) {
                try {
                    const pdfData = new Uint8Array(event.target.result);
                    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
                    let fullText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        fullText += textContent.items.map(item => item.str).join(' ') + '\n';
                    }
                    resolve(fullText);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    }

    function setInputValue(name, value) {
        if (value === null || value === undefined) return; 
        const input = document.querySelector(`input[name="${name}"]`);
        if (input) {
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
    
    function fillCarrierForm(data) {
        for (const [key, value] of Object.entries(data)) {
            setInputValue(key, value);
        }
    }
    
    // --- *** END PDF PARSING LOGIC *** ---


    function validateCarrierForm() {
        const carrier = document.getElementById('carrier-select').value;
        if (!carrier) {
            return { isValid: false, message: 'Please select a carrier (Section 1).', missingField: 'carrier_name' };
        }

        const isEntered = (name) => {
            const input = document.querySelector(`input[name="${name}"]`);
            if (!input) return false; 
            if (input.type === 'number') {
                return input.value && input.value.trim() !== "" && parseFloat(input.value) >= 0;
            }
            if (input.type === 'radio') {
                return document.querySelector(`input[name="${name}"]:checked`);
            }
            return false;
        };

        if (carrier === 'progressive') {
            const bookTypeRadio = document.querySelector('input[name="book_type_progressive"]:checked');
            if (!bookTypeRadio) {
                if (document.getElementById('book-type-selector-progressive').style.display === 'block') {
                    return { isValid: false, message: 'Please select a book type (Step 3).', missingField: 'book_type_progressive' };
                }
                return { isValid: false, message: 'Please complete Step 2 (Upload or Manual).' };

            } else {
                const bookType = bookTypeRadio.value;
                if (bookType === 'personal' || bookType === 'both') {
                    if (!isEntered('prog_pl_premium')) return { isValid: false, message: 'Please enter Progressive "Personal Lines T12 Written Premium".', missingField: 'prog_pl_premium' };
                    if (!isEntered('prog_pl_loss_ratio')) return { isValid: false, message: 'Please enter Progressive "Personal Lines T12 Loss Ratio".', missingField: 'prog_pl_loss_ratio' };
                }
                if (bookType === 'commercial' || bookType === 'both') {
                    if (!isEntered('prog_cl_premium')) return { isValid: false, message: 'Please enter Progressive "Commercial Lines T12 Written Premium".', missingField: 'prog_cl_premium' };
                    if (!isEntered('prog_cl_loss_ratio')) return { isValid: false, message: 'Please enter Progressive "Commercial Lines T12 Loss Ratio".', missingField: 'prog_cl_loss_ratio' };
                }
                if (!isEntered('prog_diamond_status')) return { isValid: false, message: 'Please select a Progressive "Diamond or Program Status".', missingField: 'prog_diamond_status' };
            }
        
        } else if (carrier === 'safeco') {
            if (!isEntered('safeco_total_dwp')) return { isValid: false, message: 'Please enter Safeco "Total DWP (YTD)".', missingField: 'safeco_total_dwp' };
            if (!isEntered('safeco_pif')) return { isValid: false, message: 'Please enter Safeco "PIF (YTD)".', missingField: 'safeco_pif' };
            if (!isEntered('safeco_loss_ratio')) return { isValid: false, message: 'Please enter Safeco "Loss Ratio (YTD)".', missingField: 'safeco_loss_ratio' };
            if (!isEntered('safeco_retention')) return { isValid: false, message: 'Please enter Safeco "Retention (YTD)".', missingField: 'safeco_retention' };
        
        } else if (carrier === 'hartford') {
            const bookTypeRadio = document.querySelector('input[name="book_type_hartford"]:checked');
            if (bookTypeRadio) {
                const bookType = bookTypeRadio.value;
                if (bookType === 'personal' || bookType === 'both') {
                    if (!isEntered('hartford_pl_twp')) return { isValid: false, message: 'Please enter Hartford "Personal Lines TWP ($k)".', missingField: 'hartford_pl_twp' };
                    if (!isEntered('hartford_pl_lr')) return { isValid: false, message: 'Please enter Hartford "Personal Lines Loss Ratio".', missingField: 'hartford_pl_lr' };
                }
                if (bookType === 'commercial' || bookType === 'both') {
                    if (!isEntered('hartford_cl_twp')) return { isValid: false, message: 'Please enter Hartford "Small Commercial TWP ($k)".', missingField: 'hartford_cl_twp' };
                    if (!isEntered('hartford_cl_lr')) return { isValid: false, message: 'Please enter Hartford "Small Commercial Loss Ratio".', missingField: 'hartford_cl_lr' };
                }
            } else if (document.getElementById('book-type-selector-hartford').style.display === 'block') {
                 return { isValid: false, message: 'Please select a Hartford book type (Step 3).', missingField: 'book_type_hartford' };
            } else {
                 return { isValid: false, message: 'Please complete Step 2 (Upload or Manual).' };
            }


        } else if (carrier === 'travelers') {
            const bookTypeRadio = document.querySelector('input[name="book_type_travelers"]:checked');
             if (bookTypeRadio) {
                const bookType = bookTypeRadio.value;
                if (bookType === 'auto' || bookType === 'both') {
                    if (!isEntered('travelers_auto_wp')) return { isValid: false, message: 'Please enter Travelers "Auto WP (,000)".', missingField: 'travelers_auto_wp' };
                    if (!isEntered('travelers_auto_lr')) return { isValid: false, message: 'Please enter Travelers "Auto Loss Ratio".', missingField: 'travelers_auto_lr' };
                }
             
             
             
             
             
if (bookType === 'home' || bookType === 'both') {
                    if (!isEntered('travelers_home_wp')) return { isValid: false, message: 'Please enter Travelers "Home WP (,000)".', missingField: 'travelers_home_wp' };
                    if (!isEntered('travelers_home_lr')) return { isValid: false, message: 'Please enter Travelers "Home Loss Ratio".', missingField: 'travelers_home_lr' };
                }
             } else if (document.getElementById('book-type-selector-travelers').style.display === 'block') {
                 return { isValid: false, message: 'Please select a Travelers book type (Step 3).', missingField: 'book_type_travelers' };
            } else {
                 return { isValid: false, message: 'Please complete Step 2 (Upload or Manual).' };
            }
        } else if (carrier === 'msa') {
            if (!isEntered('msa_total_dwp')) return { isValid: false, message: 'Please enter MSA "Total DWP (YTD)".', missingField: 'msa_total_dwp' };
            if (!isEntered('msa_pif')) return { isValid: false, message: 'Please enter MSA "PIF (YTD)".', missingField: 'msa_pif' };
            if (!isEntered('msa_loss_ratio')) return { isValid: false, message: 'Please enter MSA "Loss Ratio (YTD)".', missingField: 'msa_loss_ratio' };
        }

        return { isValid: true, message: '' };
        
        
        
        
        
        
        
        
        
        
    }

    function showValidationError(elementId, message, type = 'error') {
        const statusEl = document.getElementById(elementId);
        if (statusEl) {
            statusEl.textContent = message;
            if (type === 'success') {
                statusEl.style.backgroundColor = '#d4edda';
                statusEl.style.color = '#155724';
                statusEl.style.borderColor = '#c3e6cb';
            } else {
                statusEl.style.backgroundColor = '#f8d7da';
                statusEl.style.color = '#721c24';
                statusEl.style.borderColor = '#f5c6fb';
            }
            statusEl.style.display = 'block';
        }
    }
    
    function toggleTheme() {
        const body = document.body;
        const toggleButton = document.getElementById('theme-toggle');
        const currentTheme = body.getAttribute('data-theme');
        
        if (currentTheme === 'light') {
            body.setAttribute('data-theme', 'dark');
            toggleButton.innerHTML = '🌙 Toggle to Light Mode';
            localStorage.setItem('theme', 'dark');
        } else {
            body.setAttribute('data-theme', 'light');
            toggleButton.innerHTML = '☀️ Toggle to Dark Mode';
            localStorage.setItem('theme', 'light');
        }
    }

    (function applyTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.body.setAttribute('data-theme', savedTheme);
        const toggleButton = document.getElementById('theme-toggle');
        if (toggleButton) {
            if (savedTheme === 'dark') {
                toggleButton.innerHTML = '🌙 Toggle to Light Mode';
            } else {
                toggleButton.innerHTML = '☀️ Toggle to Dark Mode';
            }
        }
    })();
    
    function openMethodologyModal(type) {
        document.getElementById('carrierMethodology').style.display = 'block';
        document.getElementById('methodologyModal').style.display = 'block';
    }

    function getActiveBookType(carrier) {
        const checked = document.querySelector(`input[name="book_type_${carrier}"]:checked`);
        return checked ? checked.value : null; 
    }

    function getCarrierInputValue(name) {
        const input = document.querySelector(`input[name="${name}"]`);
        if (input) {
            if (input.type === 'radio') {
                const checked = document.querySelector(`input[name="${name}"]:checked`);
                return checked ? checked.value : null;
            }
            const val = parseFloat(input.value);
            return (input.value !== '' && !isNaN(val)) ? val : null;
        }
        return null;
    }
    
    function calculateCarrierValuation() {
        const selectedCarrier = document.getElementById('carrier-select').value;
        
        let basePremium = 0;
        let lowOffer = 0;
        let highOffer = 0;
        let finalMultiple = 1.5; 

        if (selectedCarrier === 'progressive') {
            const bookType = getActiveBookType('progressive');
            if (!bookType) { 
                document.getElementById('carrierLowOffer').textContent = '---';
                document.getElementById('carrierHighOffer').textContent = '---';
                return;
            }
            const pl_premium = (getCarrierInputValue('prog_pl_premium') ?? 0) * 1; // No $k
            const pl_loss_ratio = getCarrierInputValue('prog_pl_loss_ratio') ?? 100;
            const cl_premium = (getCarrierInputValue('prog_cl_premium') ?? 0) * 1; // No $k
            const cl_loss_ratio = getCarrierInputValue('prog_cl_loss_ratio') ?? 100;
            const bundle_rate = getCarrierInputValue('prog_bundle_rate') ?? 0;
            const ytd_apps = getCarrierInputValue('prog_ytd_apps') ?? 0;
            const is_diamond = getCarrierInputValue('prog_diamond_status') === 'yes';

            if (bookType === 'both') {
                basePremium = pl_premium + cl_premium;
                if (basePremium > 0) {
                    if (pl_loss_ratio < 40) finalMultiple += 0.15; else if (pl_loss_ratio > 55) finalMultiple -= 0.15;
                    if (cl_loss_ratio < 10) finalMultiple += 0.2; else if (cl_loss_ratio > 55) finalMultiple -= 0.1;
                }
            } else if (bookType === 'personal') {
                basePremium = pl_premium;
                if (basePremium > 0) {
                    if (pl_loss_ratio < 40) finalMultiple += 0.25; else if (pl_loss_ratio > 55) finalMultiple -= 0.20;
                }
            } else if (bookType === 'commercial') {
                basePremium = cl_premium;
                if (basePremium > 0) {
                    if (cl_loss_ratio < 10) finalMultiple += 0.3; else if (cl_loss_ratio > 55) finalMultiple -= 0.15;
                }
            }
            if (basePremium > 0) {
                if (bundle_rate > 65) finalMultiple += 0.1;
                if (ytd_apps > 50) finalMultiple += 0.05;
                if (is_diamond) finalMultiple += 0.05;
            }
        
        } else if (selectedCarrier === 'safeco') {
            basePremium = (getCarrierInputValue('safeco_total_dwp') ?? 0) * 1; // No $k
            const loss_ratio = getCarrierInputValue('safeco_loss_ratio') ?? 100;
            const retention = getCarrierInputValue('safeco_retention') ?? 0;
            if (basePremium > 0) {
                if (loss_ratio < 45) finalMultiple += 0.25; else if (loss_ratio > 60) finalMultiple -= 0.20;
                if (retention > 70) finalMultiple += 0.15; else if (retention < 60) finalMultiple -= 0.10;
            }

        } else if (selectedCarrier === 'hartford') {
            const bookType = getActiveBookType('hartford');
            if (!bookType) { 
                document.getElementById('carrierLowOffer').textContent = '---';
                document.getElementById('carrierHighOffer').textContent = '---';
                return;
            }
            // All Hartford premiums are in $k
            const pl_twp = (getCarrierInputValue('hartford_pl_twp') ?? 0) * 1000;
            const pl_lr = getCarrierInputValue('hartford_pl_lr') ?? 100;
            const pl_retention = getCarrierInputValue('hartford_pl_retention') ?? 0;
            const cl_twp = (getCarrierInputValue('hartford_cl_twp') ?? 0) * 1000;
            const cl_lr = getCarrierInputValue('hartford_cl_lr') ?? 100;
            const cl_retention = getCarrierInputValue('hartford_cl_retention') ?? 0;

            if (bookType === 'both') {
                basePremium = pl_twp + cl_twp;
                if (basePremium > 0) {
                    if (pl_lr < 30) finalMultiple += 0.2; else if (pl_lr > 55) finalMultiple -= 0.15;
                    if (cl_lr < 20) finalMultiple += 0.2; else if (cl_lr > 55) finalMultiple -= 0.15;
                }
            } else if (bookType === 'personal') {
                basePremium = pl_twp;
                if (basePremium > 0) {
                    if (pl_lr < 30) finalMultiple += 0.3; else if (pl_lr > 55) finalMultiple -= 0.2;
                }
            } else if (bookType === 'commercial') {
                basePremium = cl_twp;
                if (basePremium > 0) {
                    if (cl_lr < 20) finalMultiple += 0.3; else if (cl_lr > 55) finalMultiple -= 0.2;
                }
            }
            if (basePremium > 0) {
                if (pl_retention > 75 || cl_retention > 70) finalMultiple += 0.1;
            }
        
        } else if (selectedCarrier === 'travelers') {
            const bookType = getActiveBookType('travelers');
            if (!bookType) { 
                document.getElementById('carrierLowOffer').textContent = '---';
                document.getElementById('carrierHighOffer').textContent = '---';
                return;
            }
            // All Travelers premiums are in $k
            const auto_wp = (getCarrierInputValue('travelers_auto_wp') ?? 0) * 1000;
            const auto_lr = getCarrierInputValue('travelers_auto_lr') ?? 100;
            const auto_retention = getCarrierInputValue('travelers_auto_retention') ?? 0;
            const home_wp = (getCarrierInputValue('travelers_home_wp') ?? 0) * 1000;
            const home_lr = getCarrierInputValue('travelers_home_lr') ?? 100;
            const home_retention = getCarrierInputValue('travelers_home_retention') ?? 0;

            if (bookType === 'both') {
                basePremium = auto_wp + home_wp;
                if (basePremium > 0) {
                    if (auto_lr < 65) finalMultiple += 0.1; else if (auto_lr > 80) finalMultiple -= 0.1;
                    if (home_lr < 80) finalMultiple += 0.1; else if (home_lr > 105) finalMultiple -= 0.2;
                }
            } else if (bookType === 'auto') {
                basePremium = auto_wp;
                if (basePremium > 0) {
                    if (auto_lr < 65) finalMultiple += 0.2; else if (auto_lr > 80) finalMultiple -= 0.2;
                }
            } else if (bookType === 'home') {
                basePremium = home_wp;
                if (basePremium > 0) {
                    if (home_lr < 80) finalMultiple += 0.2; else if (home_lr > 105) finalMultiple -= 0.3;
                }
            }
        
        
        
        
        
        
        
if (basePremium > 0) {
                if (auto_retention > 70 || home_retention > 75) finalMultiple += 0.1;
            }
        } else if (selectedCarrier === 'msa') {
            basePremium = (getCarrierInputValue('msa_total_dwp') ?? 0) * 1;
            const loss_ratio = getCarrierInputValue('msa_loss_ratio') ?? 100;
            const retention = getCarrierInputValue('msa_retention') ?? 0;
            if (basePremium > 0) {
                if (loss_ratio < 45) finalMultiple += 0.20; else if (loss_ratio > 60) finalMultiple -= 0.15;
                if (retention > 88) finalMultiple += 0.10; else if (retention < 80) finalMultiple -= 0.10;
            }
        }

        finalMultiple = Math.max(0.75, Math.min(3.0, finalMultiple));






        if (basePremium > 0) {
            highOffer = basePremium * finalMultiple;
            lowOffer = basePremium * (finalMultiple - 0.25);
        }

        lowOffer = Math.max(0, lowOffer);
        if (lowOffer > highOffer) {
            lowOffer = highOffer * 0.9;
        }
        
        currentCarrierValuation = {
            lowOffer: lowOffer,
            highOffer: highOffer,
            premium: basePremium
        };
        
        document.getElementById('carrierLowOffer').textContent = lowOffer > 0 ? formatter.format(lowOffer) : '---';
        document.getElementById('carrierHighOffer').textContent = highOffer > 0 ? formatter.format(highOffer) : '---';
    }

    function safeSetDisplay(elementId, displayValue) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = displayValue;
        }
    }

    function handleCarrierSelection() {
        const selectedCarrier = document.getElementById('carrier-select').value;
        
        // Hide all carrier-specific sections
        safeSetDisplay('entry-method-selector', 'none');
        safeSetDisplay('upload-report-section', 'none');
        document.querySelectorAll('.book-type-selector').forEach(div => div.style.display = 'none');
        document.querySelectorAll('.carrier-question-set').forEach(div => div.style.display = 'none');
        
        // Hide all sidebar lines
        document.querySelectorAll('.carrier-metric-line').forEach(line => {
            line.style.display = 'none';
        });
        
        // Reset sidebar values
        document.querySelectorAll('#carrier-sidebar-summary strong').forEach(el => {
            el.textContent = '---';
        });
        
        // Uncheck all book type radios
        document.querySelectorAll('.book-type-selector input[type="radio"]').forEach(radio => radio.checked = false);

        if (selectedCarrier) {
            // 1. Show the "Yes/No" buttons
            safeSetDisplay('entry-method-selector', 'block');
            
            // *** TEXT FIX START ***
            const heading = document.getElementById('report-availability-heading');
            const btnYes = document.getElementById('btn-report-yes');
            if (heading && btnYes) {
                if (selectedCarrier === 'progressive') {
                    heading.textContent = '2. Are your reports available right now?';
                    btnYes.textContent = 'Yes, I have them';
                } else {
                    heading.textContent = '2. Is your report available right now?';
                    btnYes.textContent = 'Yes, I have it';
                }
            }
            // *** TEXT FIX END ***
            
            // 2. Prepare the correct sidebar lines
            if (selectedCarrier === 'progressive') {
                document.querySelectorAll('#line-pl-premium, #line-pl-pif, #line-pl-loss-ratio, #line-cl-premium, #line-cl-pif, #line-cl-loss-ratio, #line-bundle-rate, #line-ytd-apps, #line-diamond-status').forEach(line => {
                    if(line) line.style.display = 'flex';
                });
            } else if (selectedCarrier === 'safeco') {
                document.querySelectorAll('#line-safeco-dwp, #line-safeco-pif, #line-safeco-loss-ratio, #line-safeco-retention, #line-safeco-nb-count').forEach(line => {
                    if(line) line.style.display = 'flex';
                });
            } else if (selectedCarrier === 'hartford') {
                document.querySelectorAll('#line-hartford-pl-twp, #line-hartford-pl-lr, #line-hartford-pl-retention, #line-hartford-cl-twp, #line-hartford-cl-lr, #line-hartford-cl-retention').forEach(line => {
                    if(line) line.style.display = 'flex';
                });
     
     
     
     
            } else if (selectedCarrier === 'travelers') {
                document.querySelectorAll('#line-travelers-auto-wp, #line-travelers-auto-lr, #line-travelers-auto-retention, #line-travelers-home-wp, #line-travelers-home-lr, #line-travelers-home-retention').forEach(line => {
                    if(line) line.style.display = 'flex';
                });
            } else if (selectedCarrier === 'msa') {
                document.querySelectorAll('#line-msa-dwp, #line-msa-pif, #line-msa-loss-ratio, #line-msa-retention, #line-msa-nb-premium').forEach(line => {
                    if(line) line.style.display = 'flex';
                });
            }
        }
        
        
        
        
        
        calculateCarrierValuation();
    }

    function showManualForm() {
        const selectedCarrier = document.getElementById('carrier-select').value;
        safeSetDisplay('entry-method-selector', 'none');
        safeSetDisplay('upload-report-section', 'none');

        if (selectedCarrier === 'progressive') {
            safeSetDisplay('book-type-selector-progressive', 'block');
        } else if (selectedCarrier === 'safeco') {
            safeSetDisplay('carrier-questions-safeco-manual', 'block');
            safeSetDisplay('safeco-ai-helper', 'block'); // Show Safeco AI
        } else if (selectedCarrier === 'hartford') {
            safeSetDisplay('book-type-selector-hartford', 'block');
       
       
        } else if (selectedCarrier === 'travelers') {
            safeSetDisplay('book-type-selector-travelers', 'block');
        } else if (selectedCarrier === 'msa') {
            safeSetDisplay('carrier-questions-msa-manual', 'block');
            safeSetDisplay('msa-ai-helper', 'block');
        }
    }




    function updateCarrierSidebar(event) {
        const input = event.target;
        const targetSidebarId = input.dataset.sidebarTarget;
        if (targetSidebarId) {
            let value = '---';
            if (input.type === 'radio') {
                value = input.value === 'yes' ? 'Yes' : 'No';
            } else if(input.value) {
                const numValue = parseFloat(input.value);
                if (!isNaN(numValue)) {
                    // Formatting logic same as before...
                
                
                
                    if (targetSidebarId.includes('-premium') || targetSidebarId.includes('-dwp') || targetSidebarId.includes('-twp') || targetSidebarId.includes('-wp')) {
                        if (targetSidebarId.includes('safeco-dwp') || targetSidebarId.includes('msa_total_dwp') || targetSidebarId.includes('prog_pl_premium') || targetSidebarId.includes('prog_cl_premium')) {
                            value = formatter.format(numValue);
                        } else {
                   
                   
                   
                   
                   
                            value = formatter.format(numValue * 1000);
                        }
                    } else if (targetSidebarId.includes('-pif') || targetSidebarId.includes('-nb-count') || targetSidebarId.includes('prog_ytd_apps')) {
                         value = numValue.toLocaleString('en-US');
                    } else if (targetSidebarId.includes('-loss-ratio') || targetSidebarId.includes('-bundle-rate') || targetSidebarId.includes('-retention') || targetSidebarId.includes('-lr')) {
                        value = numValue.toLocaleString('en-US') + '%';
                    } else {
                        value = numValue.toLocaleString('en-US');
                    }
                } else {
                    value = input.value;
                }
            }
            const targetElement = document.getElementById(targetSidebarId);
            if (targetElement) {
                targetElement.textContent = value;
            }
        }
        calculateCarrierValuation();
    }
    
    function handleBookTypeChange(carrier) {
        const bookType = getActiveBookType(carrier);
        const statusEl = document.getElementById('carrier-email-status');
        if (statusEl) statusEl.style.display = 'none';

        if (carrier === 'progressive') {
            const allProgLines = document.querySelectorAll('#line-pl-premium, #line-pl-pif, #line-pl-loss-ratio, #line-cl-premium, #line-cl-pif, #line-cl-loss-ratio, #line-bundle-rate, #line-ytd-apps, #line-diamond-status');
            if (!bookType) {
                safeSetDisplay('carrier-questions-progressive-manual', 'none');
                return;
            }
            allProgLines.forEach(line => { if (line) line.style.display = 'flex'; });
            safeSetDisplay('line-pl-premium', (bookType === 'personal' || bookType === 'both') ? 'flex' : 'none');
            safeSetDisplay('line-pl-pif', (bookType === 'personal' || bookType === 'both') ? 'flex' : 'none');
            safeSetDisplay('line-pl-loss-ratio', (bookType === 'personal' || bookType === 'both') ? 'flex' : 'none');
            safeSetDisplay('line-cl-premium', (bookType === 'commercial' || bookType === 'both') ? 'flex' : 'none');
            safeSetDisplay('line-cl-pif', (bookType === 'commercial' || bookType === 'both') ? 'flex' : 'none');
            safeSetDisplay('line-cl-loss-ratio', (bookType === 'commercial' || bookType === 'both') ? 'flex' : 'none');
            
            safeSetDisplay('prog-personal-section', (bookType === 'personal' || bookType === 'both') ? 'block' : 'none');
            safeSetDisplay('prog-commercial-section', (bookType === 'commercial' || bookType === 'both') ? 'block' : 'none');
            safeSetDisplay('prog-health-section', 'block');
            safeSetDisplay('progressive-ai-helper', 'block');
            safeSetDisplay('carrier-questions-progressive-manual', 'block');
        
        } else if (carrier === 'hartford') {
            if (!bookType) {
                safeSetDisplay('carrier-questions-hartford-manual', 'none');
                return;
            }
            safeSetDisplay('line-hartford-pl-twp', (bookType === 'personal' || bookType === 'both') ? 'flex' : 'none');
            safeSetDisplay('line-hartford-pl-lr', (bookType === 'personal' || bookType === 'both') ? 'flex' : 'none');
            safeSetDisplay('line-hartford-pl-retention', (bookType === 'personal' || bookType === 'both') ? 'flex' : 'none');
            safeSetDisplay('line-hartford-cl-twp', (bookType === 'commercial' || bookType === 'both') ? 'flex' : 'none');
            safeSetDisplay('line-hartford-cl-lr', (bookType === 'commercial' || bookType === 'both') ? 'flex' : 'none');
            safeSetDisplay('line-hartford-cl-retention', (bookType === 'commercial' || bookType === 'both') ? 'flex' : 'none');

            safeSetDisplay('hartford-personal-section', (bookType === 'personal' || bookType === 'both') ? 'block' : 'none');
            safeSetDisplay('hartford-commercial-section', (bookType === 'commercial' || bookType === 'both') ? 'block' : 'none');
            
            safeSetDisplay('hartford-ai-helper', 'block'); // Show Hartford AI
            safeSetDisplay('carrier-questions-hartford-manual', 'block');






        } else if (carrier === 'travelers') {
            if (!bookType) {
                safeSetDisplay('carrier-questions-travelers-manual', 'none');
                return;
            }
            safeSetDisplay('line-travelers-auto-wp', (bookType === 'auto' || bookType === 'both') ? 'flex' : 'none');
            safeSetDisplay('line-travelers-auto-lr', (bookType === 'auto' || bookType === 'both') ? 'flex' : 'none');
            safeSetDisplay('line-travelers-auto-retention', (bookType === 'auto' || bookType === 'both') ? 'flex' : 'none');
            safeSetDisplay('line-travelers-home-wp', (bookType === 'home' || bookType === 'both') ? 'flex' : 'none');
            safeSetDisplay('line-travelers-home-lr', (bookType === 'home' || bookType === 'both') ? 'flex' : 'none');
            safeSetDisplay('line-travelers-home-retention', (bookType === 'home' || bookType === 'both') ? 'flex' : 'none');

            safeSetDisplay('travelers-auto-section', (bookType === 'auto' || bookType === 'both') ? 'block' : 'none');
            safeSetDisplay('travelers-home-section', (bookType === 'home' || bookType === 'both') ? 'block' : 'none');
            safeSetDisplay('travelers-ai-helper', 'block');
            safeSetDisplay('carrier-questions-travelers-manual', 'block');
        }
        
        
        
        
        
        
        
        calculateCarrierValuation();
    }

    function collectCarrierInputData() {
        const selectedCarrier = document.getElementById('carrier-select').value;
        const data = {
            carrier_name: selectedCarrier,
            low_offer: currentCarrierValuation.lowOffer,
            high_offer: currentCarrierValuation.highOffer,
            total_book_premium: currentCarrierValuation.premium,
        };
        let activeSet;
        if (selectedCarrier === 'progressive') {
            activeSet = document.getElementById('carrier-questions-progressive-manual');
            data.book_type = getActiveBookType('progressive');
        } else if (selectedCarrier === 'safeco') {
            activeSet = document.getElementById('carrier-questions-safeco-manual');
            data.book_type = 'Safeco YTD Book';
        } else if (selectedCarrier === 'hartford') {
            activeSet = document.getElementById('carrier-questions-hartford-manual');
            data.book_type = getActiveBookType('hartford');
      
      
      
      
        } else if (selectedCarrier === 'travelers') {
            activeSet = document.getElementById('carrier-questions-travelers-manual');
            data.book_type = getActiveBookType('travelers');
        } else if (selectedCarrier === 'msa') {
            activeSet = document.getElementById('carrier-questions-msa-manual');
            data.book_type = 'MSA YTD Book';
        }
        if (activeSet) {
            
            
            
            activeSet.querySelectorAll('input, textarea, select').forEach(input => {
                if (input.name) {
                    if (input.type === 'radio') {
                        if (input.checked) data[input.name] = input.value;
                    } else {
                        data[input.name] = input.value;
                    }
                }
            });
        }
        return data;
    }
    
    function printCarrierReport() {
        document.getElementById('document-upload-tab').classList.add('print-active');
        document.getElementById('carrier-results-panel').classList.add('print-active');
        window.print();
    }

    // --- Initial Calculation on Load ---
    document.addEventListener('DOMContentLoaded', function() {
        
        const carrierSidebar = document.getElementById('carrier-results-panel');
        if (carrierSidebar) carrierSidebar.style.display = 'block';

        const carrierFollowUpForm = document.getElementById('carrierFollowUpForm');
        if (carrierFollowUpForm) {
            carrierFollowUpForm.addEventListener('submit', async function(event) {
                event.preventDefault(); 
                const submitBtn = document.getElementById('carrierModalSubmitBtn');
                const emailStatus = document.getElementById('carrier-email-status');
                submitBtn.disabled = true;
                submitBtn.textContent = 'Submitting...';
                emailStatus.style.display = 'none'; 
                try {
                    calculateCarrierValuation(); 
                    const valuationData = collectCarrierInputData(); 
                    const fullPayload = {
                        title: `${document.getElementById('carrierAgencyName').value} - Carrier Book Valuation Lead (${valuationData.carrier_name || 'Unknown'})`,
                        contact_name: document.getElementById('carrierSellerName').value,
                        contact_email: document.getElementById('carrierSellerEmail').value,
                        agency_name: document.getElementById('carrierAgencyName').value, 
                        custom_fields: valuationData
                    };
                    const response = await fetch(API_ENDPOINT, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
                        body: JSON.stringify(fullPayload)
                    });
                    const result = await response.json(); 
                    if (!response.ok) throw new Error(result.error || `Server Error: ${response.statusText}`);
                    if (result.success === true) { 
                        document.getElementById('carrier-gated-results').classList.remove('blurred-results');
                        showValidationError('carrier-email-status', 'Success! Your valuation is now unlocked.', 'success');
                        document.getElementById('carrierLeadModal').style.display = 'none'; 
                        document.getElementById('carrierFollowUpForm').reset(); 
                        document.getElementById('carrier-notify-btn').style.display = 'none';
                    } else {
                        throw new Error(result.error || 'The server returned an error status.');
                    }
                } catch (error) {
                    console.error('Carrier Submission Error:', error);
                    showValidationError('carrier-email-status', `Error: Submission Failed. ${error.message}`, 'error');
                    document.getElementById('carrierLeadModal').style.display = 'none'; 
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Submit & View Results';
                }
            });
        }
        
        const carrierResults = document.getElementById('carrier-gated-results');
        if (carrierResults) carrierResults.classList.add('blurred-results');
        
        const carrierNotifyBtn = document.getElementById('carrier-notify-btn');
        if (carrierNotifyBtn) {
            carrierNotifyBtn.addEventListener('click', function() {
                const validation = validateCarrierForm();
                if (!validation.isValid) {
                    showValidationError('carrier-email-status', validation.message);
                    if (validation.missingField) {
                        let el = document.querySelector(`input[name="${validation.missingField}"]`);
                        if (!el) {
                             el = document.querySelector(`input[name="${validation.missingField}"]`);
                            if (el) { const container = el.closest('.scope-options') || el.closest('div'); if(container) el = container; }
                            if (!el) el = document.querySelector(`select[name="${validation.missingField}"]`);
                        }
                        if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            el.classList.add('input-error-flash');
                            setTimeout(() => el.classList.remove('input-error-flash'), 2000);
                        }
                    }
                    return;
                }
                document.getElementById('carrier-email-status').style.display = 'none';
                calculateCarrierValuation();
                document.getElementById('carrierLeadModal').style.display = 'block';
            });
        }
        
        const carrierPdfBtn = document.getElementById('carrier-pdf-btn');
        if (carrierPdfBtn) carrierPdfBtn.addEventListener('click', printCarrierReport);

        const carrierSelect = document.getElementById('carrier-select');
        if (carrierSelect) carrierSelect.addEventListener('change', handleCarrierSelection);

        document.querySelectorAll('.carrier-metric-input').forEach(input => {
            input.addEventListener('input', updateCarrierSidebar);
            input.addEventListener('input', () => { document.getElementById('carrier-email-status').style.display = 'none'; });
        });
        
        const btnReportYes = document.getElementById('btn-report-yes');
        if(btnReportYes) {
            btnReportYes.addEventListener('click', function() {
                safeSetDisplay('entry-method-selector', 'none');
                safeSetDisplay('upload-report-section', 'block');
            });
        }
        
        const btnReportNo = document.getElementById('btn-report-no');
        if(btnReportNo) {
            btnReportNo.addEventListener('click', function() {
                showManualForm();
            });
        }
        
        document.querySelectorAll('input[name="book_type_progressive"]').forEach(radio => { radio.addEventListener('change', () => handleBookTypeChange('progressive')); });
        document.querySelectorAll('input[name="book_type_hartford"]').forEach(radio => { radio.addEventListener('change', () => handleBookTypeChange('hartford')); });
        document.querySelectorAll('input[name="book_type_travelers"]').forEach(radio => { radio.addEventListener('change', () => handleBookTypeChange('travelers')); });
        
        const btnSubmitReport = document.getElementById('btn-submit-report-upload');
        if (btnSubmitReport) {
            btnSubmitReport.addEventListener('click', async function() {
                const fileInput = document.getElementById('report-file-upload');
                if (!fileInput.files || fileInput.files.length === 0) {
                    showValidationError('carrier-email-status', 'Please select at least one PDF report to upload.');
                    return;
                }
                const selectedCarrier = document.getElementById('carrier-select').value;
                if (!selectedCarrier) {
                    showValidationError('carrier-email-status', 'An error occurred. Please re-select your carrier.');
                    return;
                }
                btnSubmitReport.disabled = true;
                btnSubmitReport.textContent = 'Parsing...';
                showValidationError('carrier-email-status', 'Parsing... Please wait.', 'success');
                safeSetDisplay('btn-manual-entry-fallback', 'none');
                try {
                    const allFiles = Array.from(fileInput.files);
                    const textPromises = allFiles.map(file => parsePDF(file));
                    const allTexts = await Promise.all(textPromises);
                    const fullText = allTexts.join("\n\n--- END OF FILE ---\n\n");
const formData = new FormData();
// Check if it's progressive to use the new file
const parserPath = (selectedCarrier === 'progressive') ? '/Carrier/parsers/progressive.php' : AI_PARSER_ENDPOINT;
formData.append('report', fileInput.files[0]); // Changed key to 'report'
const response = await fetch(parserPath, { method: 'POST', body: formData });
                    if (!response.ok) throw new Error(`Server Error ${response.status}`);
                    const result = await response.json();
                    if (result.success === true && result.data) {
                        fillCarrierForm(result.data);
                        showValidationError('carrier-email-status', 'Success! Reports parsed.', 'success');
                        safeSetDisplay('upload-report-section', 'none');
                        showManualForm(); 
                    } else { throw new Error(result.error || 'Failed to parse data.'); }
                } catch (error) {
                    console.error('AI Parsing Error:', error);
                    showValidationError('carrier-email-status', `Error: AI parsing failed. ${error.message}.`);
                    safeSetDisplay('btn-manual-entry-fallback', 'block');
                } finally {
                    btnSubmitReport.disabled = false;
                    btnSubmitReport.textContent = 'Upload & Analyze';
                }
            });
        }

        // PROGRESSIVE AI BUTTON
        const btnProgressiveAiUpload = document.getElementById('btn-progressive-ai-upload');
        if (btnProgressiveAiUpload) {
             btnProgressiveAiUpload.addEventListener('click', async function() {
                 const fileInput = document.getElementById('progressive-report-upload');
                 if (!fileInput.files || fileInput.files.length === 0) {
                    showValidationError('carrier-email-status', 'Please select a PDF report to upload.');
                    return;
                }
                btnProgressiveAiUpload.disabled = true;
                btnProgressiveAiUpload.textContent = 'Parsing...';
                showValidationError('carrier-email-status', 'Parsing... Please wait.', 'success');
                try {
                    const allFiles = Array.from(fileInput.files);
                    const textPromises = allFiles.map(file => parsePDF(file));
                    const allTexts = await Promise.all(textPromises);
                    const fullText = allTexts.join("\n\n--- END OF FILE ---\n\n");
                    const formData = new FormData();
                    formData.append('carrier_name', 'progressive');
                    formData.append('full_text', fullText);
                    const response = await fetch(AI_PARSER_ENDPOINT, { method: 'POST', body: formData });
                    if (!response.ok) throw new Error(`Server Error ${response.status}`);
                    const result = await response.json();
                    if (result.success === true && result.data) {
                        fillCarrierForm(result.data);
                        showValidationError('carrier-email-status', 'Success! Data auto-filled.', 'success');
                    } else { throw new Error(result.error || 'Failed to parse data.'); }
                } catch (error) {
                     console.error('AI Parsing Error:', error);
                     showValidationError('carrier-email-status', `Error: AI parsing failed. ${error.message}.`);
                } finally {
                     btnProgressiveAiUpload.disabled = false;
                     btnProgressiveAiUpload.textContent = 'Upload & Auto-fill';
                }
            });
        }

        // SAFECO AI BUTTON
        const btnSafecoAiUpload = document.getElementById('btn-safeco-ai-upload');
        if (btnSafecoAiUpload) {
             btnSafecoAiUpload.addEventListener('click', async function() {
                 const fileInput = document.getElementById('safeco-report-upload');
                 if (!fileInput.files || fileInput.files.length === 0) {
                    showValidationError('carrier-email-status', 'Please select a PDF report to upload.');
                    return;
                }
                btnSafecoAiUpload.disabled = true;
                btnSafecoAiUpload.textContent = 'Parsing...';
                showValidationError('carrier-email-status', 'Parsing... Please wait.', 'success');
                try {
                    const allFiles = Array.from(fileInput.files);
                    const textPromises = allFiles.map(file => parsePDF(file));
                    const allTexts = await Promise.all(textPromises);
                    const fullText = allTexts.join("\n\n--- END OF FILE ---\n\n");
                    const formData = new FormData();
                    formData.append('carrier_name', 'safeco');
                    formData.append('full_text', fullText);
                    const response = await fetch(AI_PARSER_ENDPOINT, { method: 'POST', body: formData });
                    if (!response.ok) throw new Error(`Server Error ${response.status}`);
                    const result = await response.json();
                    if (result.success === true && result.data) {
                        fillCarrierForm(result.data);
                        showValidationError('carrier-email-status', 'Success! Data auto-filled.', 'success');
                    } else { throw new Error(result.error || 'Failed to parse data.'); }
                } catch (error) {
                     console.error('AI Parsing Error:', error);
                     showValidationError('carrier-email-status', `Error: AI parsing failed. ${error.message}.`);
                } finally {
                     btnSafecoAiUpload.disabled = false;
                     btnSafecoAiUpload.textContent = 'Upload & Auto-fill';
                }
            });
        }

        // HARTFORD AI BUTTON
     
     
     
     
     
     
const btnHartfordAiUpload = document.getElementById('btn-hartford-ai-upload');
        if (btnHartfordAiUpload) {
             btnHartfordAiUpload.addEventListener('click', async function() {
                 const fileInput = document.getElementById('hartford-report-upload');
                 if (!fileInput.files || fileInput.files.length === 0) {
                    showValidationError('carrier-email-status', 'Please select a PDF report to upload.');
                    return;
                }
                btnHartfordAiUpload.disabled = true;
                btnHartfordAiUpload.textContent = 'Parsing...';
                showValidationError('carrier-email-status', 'Parsing... Please wait.', 'success');
                try {
                    const allFiles = Array.from(fileInput.files);
                    const textPromises = allFiles.map(file => parsePDF(file));
                    const allTexts = await Promise.all(textPromises);
                    const fullText = allTexts.join("\n\n--- END OF FILE ---\n\n");
                    const formData = new FormData();
                    formData.append('carrier_name', 'hartford');
                    formData.append('full_text', fullText);
                    const response = await fetch(AI_PARSER_ENDPOINT, { method: 'POST', body: formData });
                    if (!response.ok) throw new Error(`Server Error ${response.status}`);
                    const result = await response.json();
                    if (result.success === true && result.data) {
                        fillCarrierForm(result.data);
                        showValidationError('carrier-email-status', 'Success! Data auto-filled.', 'success');
                    } else { throw new Error(result.error || 'Failed to parse data.'); }
                } catch (error) {
                     console.error('AI Parsing Error:', error);
                     showValidationError('carrier-email-status', `Error: AI parsing failed. ${error.message}.`);
                } finally {
                     btnHartfordAiUpload.disabled = false;
                     btnHartfordAiUpload.textContent = 'Upload & Auto-fill';
                }
            });
        }

        // TRAVELERS AI BUTTON
        const btnTravelersAiUpload = document.getElementById('btn-travelers-ai-upload');
        if (btnTravelersAiUpload) {
            btnTravelersAiUpload.addEventListener('click', async function() {
                const fileInput = document.getElementById('travelers-report-upload');
                if (!fileInput.files || fileInput.files.length === 0) {
                    showValidationError('carrier-email-status', 'Please select a PDF report to upload.');
                    return;
                }
                btnTravelersAiUpload.disabled = true;
                btnTravelersAiUpload.textContent = 'Parsing...';
                showValidationError('carrier-email-status', 'Parsing... Please wait.', 'success');
                try {
                    const allFiles = Array.from(fileInput.files);
                    const textPromises = allFiles.map(file => parsePDF(file));
                    const allTexts = await Promise.all(textPromises);
                    const fullText = allTexts.join("\n\n--- END OF FILE ---\n\n");
                    const formData = new FormData();
                    formData.append('carrier_name', 'travelers');
                    formData.append('full_text', fullText);
                    const response = await fetch(AI_PARSER_ENDPOINT, { method: 'POST', body: formData });
                    if (!response.ok) throw new Error(`Server Error ${response.status}`);
                    const result = await response.json();
                    if (result.success === true && result.data) {
                        fillCarrierForm(result.data);
                        showValidationError('carrier-email-status', 'Success! Data auto-filled.', 'success');
                    } else { throw new Error(result.error || 'Failed to parse data.'); }
                } catch (error) {
                    console.error('AI Parsing Error:', error);
                    showValidationError('carrier-email-status', `Error: AI parsing failed. ${error.message}.`);
                } finally {
                    btnTravelersAiUpload.disabled = false;
                    btnTravelersAiUpload.textContent = 'Upload & Auto-fill';
                }
            });
        }

        const btnManualEntry = document.getElementById('btn-manual-entry-fallback');
        
        
        
        
        
        
        if (btnManualEntry) {
          
          
          
          
          
        btnManualEntry.addEventListener('click', function() {
                safeSetDisplay('upload-report-section', 'none');
                showManualForm();
                showValidationError('carrier-email-status', 'Please begin manual entry.', 'success');
            });
        }

        // MSA AI BUTTON
        const btnMsaAiUpload = document.getElementById('btn-msa-ai-upload');
        if (btnMsaAiUpload) {
             btnMsaAiUpload.addEventListener('click', async function() {
                 const fileInput = document.getElementById('msa-report-upload');
                 if (!fileInput.files || fileInput.files.length === 0) {
                    showValidationError('carrier-email-status', 'Please select a PDF report to upload.');
                    return;
                }
                btnMsaAiUpload.disabled = true;
                btnMsaAiUpload.textContent = 'Parsing...';
                showValidationError('carrier-email-status', 'Parsing... Please wait.', 'success');
                try {
                    const allFiles = Array.from(fileInput.files);
                    const textPromises = allFiles.map(file => parsePDF(file));
                    const allTexts = await Promise.all(textPromises);
                    const fullText = allTexts.join("\n\n--- END OF FILE ---\n\n");
                    const formData = new FormData();
                    formData.append('carrier_name', 'msa');
                    formData.append('full_text', fullText);
                    const response = await fetch(AI_PARSER_ENDPOINT, { method: 'POST', body: formData });
                    if (!response.ok) throw new Error(`Server Error ${response.status}`);
                    const result = await response.json();
                    if (result.success === true && result.data) {
                        fillCarrierForm(result.data);
                        showValidationError('carrier-email-status', 'Success! Data auto-filled.', 'success');
                    } else { throw new Error(result.error || 'Failed to parse data.'); }
                } catch (error) {
                     console.error('AI Parsing Error:', error);
                     showValidationError('carrier-email-status', `Error: AI parsing failed. ${error.message}.`);
                } finally {
                     btnMsaAiUpload.disabled = false;
                     btnMsaAiUpload.textContent = 'Upload & Auto-fill';
                }
            });
        }
        
    });
</script>