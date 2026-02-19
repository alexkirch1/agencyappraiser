<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agency Appraiser | Valuation Tool (Strategic Buyer)</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
    
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

    <style>
        /* --- General Base Colors (Light Mode Default) --- */
        :root {
            --color-background: #f4f6f9;
            --color-surface: #ffffff;
            --color-text-primary: #1e293b;
            --color-text-secondary: #64748b;
            --color-accent: #0f172a; 
            --color-primary-brand: #0f172a; 
            --color-border: #e2e8f0;
            --color-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            --color-risk-low: #22c55e;
            --color-risk-high: #ef4444;
            --color-panel-bg: #f8fafc;
        }

        /* --- Dark Mode Variables --- */
        body[data-theme='dark'] {
            --color-background: #1e293b;
            --color-surface: #334155;
            --color-text-primary: #f8fafc;
            --color-text-secondary: #94a3b8;
            --color-accent: #38bdf8; 
            --color-primary-brand: #38bdf8; 
            --color-border: #475569;
            --color-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            --color-panel-bg: #2d3748; 
        }

        /* --- Global Styles --- */
        body { 
            font-family: 'Roboto', sans-serif; 
            margin: 0; padding: 20px; 
            background-color: var(--color-background); 
            color: var(--color-text-primary); 
            display: flex; justify-content: center; 
            align-items: flex-start; min-height: 100vh; 
            transition: background-color 0.3s, color 0.3s;
        }

        #page-wrapper {
            display: flex;
            justify-content: center;
            gap: 20px;
            width: 100%;
        }
        
        .container { 
            background-color: var(--color-surface); 
            padding: 30px; border-radius: 12px; 
            box-shadow: var(--color-shadow); 
            width: 700px; flex-shrink: 0; 
            border: 1px solid var(--color-border);
        }

        #main-nav {
            display: flex;
            justify-content: center;
            margin-bottom: 25px;
            border-bottom: 2px solid var(--color-border);
            padding-bottom: 0;
            margin-top: -10px;
        }
        .nav-item {
            cursor: pointer;
            padding: 10px 20px;
            font-weight: 500;
            font-size: 1.05em;
            color: var(--color-text-secondary);
            border-bottom: 3px solid transparent;
            transition: all 0.3s;
            margin: 0 8px;
            position: relative;
            top: 2px;
            text-decoration: none;
        }
        .nav-item:hover:not(.active) {
             color: var(--color-accent);
        }
        .nav-item.active {
            color: var(--color-primary-brand);
            border-bottom: 3px solid var(--color-primary-brand);
            font-weight: 700;
        }

        .tab-content {
            display: none;
        }
        #valuation-tab {
            display: block;
        }

        #results-panel { 
            background-color: var(--color-panel-bg); 
            border: 1px solid var(--color-border); 
            border-radius: 12px; padding: 20px; 
            width: 300px; position: sticky; top: 20px; 
            box-shadow: var(--color-shadow); 
            order: 2; 
        }
        #carrier-results-panel {
            background-color: var(--color-panel-bg); 
            border: 1px solid var(--color-border); 
            border-radius: 12px; padding: 20px; 
            width: 300px; position: sticky; top: 20px; 
            box-shadow: var(--color-shadow); 
            order: 2;
            display: none; /* Hidden by default */
        }

        h3 { 
            color: var(--color-accent); 
            border-bottom: 2px solid var(--color-border); 
            padding-bottom: 5px; 
            margin-top: 0; 
            margin-bottom: 15px; 
            display: flex; 
            align-items: center;
            gap: 10px; 
        }

        .result-line { 
            display: flex; justify-content: space-between; 
            padding: 8px 0; font-size: 0.95em; 
            border-bottom: 1px dashed var(--color-border);
        } 
        .result-line strong { color: var(--color-accent); font-weight: 500;} 
        .adjusted-offer { font-size: 1.2em !important; font-weight: bold; padding-top: 10px; }
        #lowOffer { color: var(--color-risk-high); }
        #highOffer { color: var(--color-risk-low); }
        
        #carrierLowOffer { color: var(--color-risk-high); }
        #carrierHighOffer { color: var(--color-risk-low); }

        #riskDisplayContainer { 
            padding-bottom: 10px; margin-top: 10px; 
            border-bottom: 2px solid var(--color-border); 
            font-size: 1.1em; 
        }
        #riskDisplay { font-weight: 700; }

        .metric-heading-display { 
            font-size: 0.75em; 
            color: var(--color-text-secondary);
            font-weight: 400;
            white-space: nowrap;
        }
        .multiplier-range {
            display: none;
        }

        .blurred-results {
            filter: blur(5px);
            pointer-events: none;
            opacity: 0.7;
        }
        #gated-results, #carrier-gated-results {
            transition: filter 0.3s ease, opacity 0.3s ease;
        }

        h1 { color: var(--color-primary-brand); text-align: center; margin-bottom: 5px; }
        .subtitle { text-align: center; margin-bottom: 30px; color: var(--color-text-secondary); font-size: 0.9em; }
        .metric-group { 
            border: 1px solid var(--color-border); 
            padding: 15px; margin-bottom: 20px; 
            border-radius: 8px; 
            background-color: var(--color-surface);
        }
        
        label { display: block; margin-top: 10px; font-weight: 500; font-size: 0.95em; }
        .scope-options label { font-weight: 300; margin-top: 5px; display: flex; align-items: center; }
        .input-row { display: flex; align-items: center; gap: 10px; margin-top: 5px; }
        input[type="number"], input[type="text"], input[type="email"], select, textarea, input[type="file"] { 
            width: 100%;
            display: block;
            padding: 10px; 
            border: 1px solid var(--color-border); 
            border-radius: 6px; 
            box-sizing: border-box; 
            font-size: 1em; 
            background-color: var(--color-input-bg, var(--color-surface));
            color: var(--color-text-primary);
            margin-top: 5px;
        }
        .input-row input[type="number"], .input-row input[type="text"] {
             flex-grow: 1;
             width: auto; 
        }
        
        .unknown-btn { 
            padding: 8px 12px; 
            background-color: #f97316; 
            color: white; border: none; 
            border-radius: 6px; font-size: 0.9em; 
            cursor: pointer; transition: background-color 0.3s; 
            white-space: nowrap; 
        }
        
        .unknown-btn.active {
            background-color: #c2410c; 
            font-weight: bold;
        }
        
        #full-agency-due-diligence {
            display: none; 
            border: 2px solid var(--color-risk-low); 
            background-color: var(--color-panel-bg);
            padding: 15px;
            border-radius: 8px;
            margin-top: 25px;
            margin-bottom: 10px;
        }
        #full-agency-due-diligence h3 { 
            color: var(--color-risk-low); 
            border-bottom-color: var(--color-risk-low);
            margin-bottom: 10px;
        }

        .action-buttons { display: flex; flex-direction: column; gap: 10px; margin-top: 15px; }
        .action-buttons button { 
            width: 100%; padding: 10px; 
            font-size: 1em; margin-top: 0; 
            border: none; border-radius: 6px; 
            cursor: pointer; color: white; 
            font-weight: 500; 
            transition: background-color 0.3s;
        }
        
        #notify-btn { background-color: var(--color-risk-low); }
        #notify-btn:hover { background-color: #15803d; }
        #pdf-btn { background-color: var(--color-risk-high); }
        #pdf-btn:hover { background-color: #b91c1c; }
        
        #carrier-notify-btn { background-color: var(--color-risk-low); }
        #carrier-notify-btn:hover { background-color: #15803d; }
        #carrier-pdf-btn { background-color: var(--color-risk-high); }
        #carrier-pdf-btn:hover { background-color: #b91c1c; }

        .email-status { margin-top: 10px; padding: 8px; background-color: #d4edda; color: #155724; border: 1px solid var(--color-border); border-radius: 5px; text-align: center; font-size: 0.8em; }
        
        .modal { display:none; position: fixed; z-index: 100; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.7); }
        .modal-content { background-color: var(--color-surface); margin: 10% auto; padding: 25px; border: 1px solid var(--color-border); width: 80%; max-width: 400px; border-radius: 10px; position: relative; color: var(--color-text-primary);}
        .close-btn { color: var(--color-text-secondary); float: right; font-size: 28px; font-weight: bold; cursor: pointer; }

        #theme-toggle-container {
            display: flex; justify-content: flex-end;
            margin-bottom: 20px;
        }
        #theme-toggle {
            cursor: pointer;
            padding: 6px 12px;
            border: 1px solid var(--color-border);
            border-radius: 20px;
            font-size: 0.85em;
            background-color: var(--color-surface);
            color: var(--color-text-primary);
            transition: all 0.3s;
        }
        #theme-toggle:hover {
            background-color: var(--color-background);
        }

        #methodology-link {
            display: block;
            text-align: center;
            margin-top: 10px;
            font-size: 0.85em;
            color: var(--color-text-secondary);
            cursor: pointer;
        }

        .upload-link {
            display: block;
            text-align: center;
            margin-top: 5px;
            font-size: 0.9em;
            font-weight: 500;
            color: var(--color-primary-brand);
            text-decoration: none;
        }
        
        #document-upload-tab {
            padding-top: 20px;
        }
        .carrier-question-set {
            display: none; /* Hidden by default */
            border: 1px solid var(--color-border);
            background-color: var(--color-panel-bg);
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
        }
        .carrier-question-set h3 {
             color: var(--color-accent);
             border-bottom-color: var(--color-border);
             /* Fix alignment for section headers */
             display: flex;
             align-items: center;
             gap: 10px;
        }
        .carrier-question-set h3 .step-number {
             font-size: 0.8em;
             color: var(--color-text-secondary);
        }
        
        .entry-method-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
        }
        .entry-method-buttons button {
            flex-grow: 1;
            padding: 12px 20px;
            font-size: 1.05em;
            font-weight: 500;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s;
            min-width: 200px;
        }
        #btn-report-yes, #btn-goto-calculator {
            background-color: var(--color-primary-brand);
            color: var(--color-surface);
        }
        #btn-report-no, #btn-goto-carrier {
            background-color: transparent;
            color: var(--color-primary-brand);
            border: 2px solid var(--color-primary-brand);
        }
        
        .instructions-box {
            background-color: var(--color-background);
            border: 1px solid var(--color-border);
            border-radius: 6px;
            padding: 5px 20px;
            margin-bottom: 20px;
        }
        .instructions-box p {
            font-size: 0.9em;
            color: var(--color-text-secondary);
        }
        .instructions-box ol {
            font-size: 0.9em;
        }
        .carrier-question-set h4 {
            margin-top: 25px;
            margin-bottom: 0px;
        }
        .section-instructions {
            font-size: 0.85em;
            color: var(--color-text-secondary);
            margin-top: 0px;
            font-style: italic;
        }

        .upload-message { padding: 15px; margin-bottom: 20px; border-radius: 6px; font-weight: 500; }
        .upload-success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .upload-error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        
        .upload-button { 
            width: 100%; padding: 10px; 
            font-size: 1em; margin-top: 0; 
            border: none; border-radius: 6px; 
            cursor: pointer; color: white; 
            font-weight: 500; 
            transition: background-color 0.3s;
            background-color: #22c55e !important; 
        }
        .upload-button:hover {
            background-color: #15803d !important;
        }
        
        /* --- NEW CSS SPINNER --- */
        .loader {
            border: 8px solid #f3f3f3; /* Light grey */
            border-top: 8px solid var(--color-primary-brand); /* Blue */
            border-radius: 50%;
            width: 60px;
            height: 60px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* --- FLASH ANIMATION FOR ERRORS --- */
        @keyframes flash-error-pulse {
            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); border-color: #ef4444; }
            50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); border-color: #ef4444; }
            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); border-color: var(--color-border); }
        }
        
        .input-error-flash {
            animation: flash-error-pulse 1s ease-in-out 2; /* Flash 2 times */
            border: 2px solid #ef4444 !important;
            background-color: #fef2f2;
        }

        /* --- PRINT-SPECIFIC STYLES --- */
        @media print {
            @page {
                size: letter;
                margin: 0.75in;
            }
            body {
                zoom: 0.8; 
                display: block !important;
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
            }
            #page-wrapper {
                display: block !important;
                position: static !important;
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
            }
            .container, #results-panel, #carrier-results-panel { 
                width: 100% !important;
                max-width: 100% !important; 
                position: static !important;
                box-shadow: none !important;
                border: none !important;
                float: none !important;
                flex: none !important;
                order: unset !important;
                padding: 10px !important; 
                margin: 0 !important;
                page-break-inside: avoid !important;
            }
            .tab-content.print-active {
                page-break-after: always !important;
            }
            #results-panel.print-active, #carrier-results-panel.print-active {
                page-break-before: always !important;
                margin-top: 0 !important;
                padding-top: 0 !important;
            }
            #theme-toggle-container, #main-nav, .modal, .action-buttons, #methodology-link, .unknown-btn, .estimate-option, .entry-method-buttons, #upload-report-section {
                display: none !important;
            }
            .print-active {
                display: block !important;
            }
            .tab-content:not(.print-active), #results-panel:not(.print-active), #carrier-results-panel:not(.print-active) {
                display: none !important;
            }
            #gated-results.blurred-results, #carrier-gated-results.blurred-results {
                filter: none !important;
                opacity: 1 !important;
            }
            body, .container, #results-panel, #carrier-results-panel {
                background-color: #ffffff !important;
                color: #000000 !important;
            }
            h1, h3, .result-line strong {
                color: #000000 !important;
            }
            #lowOffer, #highOffer, #carrierLowOffer, #carrierHighOffer {
                color: #000000 !important;
            }
            .metric-group {
                border: 1px solid #cccccc;
                page-break-inside: avoid;
            }
        }
        
    </style>
    
    
    
    
    
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js" crossorigin="anonymous"></script>
    <script>
        // This line MUST be here, right after the library is loaded.
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        }
    </script>
    
    
    
    
    
    
    
    
</head>