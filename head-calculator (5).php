<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agency Appraiser | Valuation Tool</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap" rel="stylesheet">
    <style>
        /* --- 1. THEME VARIABLES --- */
        :root {
            --bg-body: #1e293b;
            --bg-card: #334155;
            --text-main: #f8fafc;
            --text-sub: #cbd5e1;
            --text-nav: #e2e8f0;
            --border: #475569;
            --accent: #38bdf8;
            --btn-green: #22c55e;
            --btn-red: #ef4444;
            --btn-blue: #0ea5e9;
            --btn-orange: #f59e0b;
            --input-bg: #ffffff;
            --input-text: #0f172a;
            --input-border: #94a3b8;
        }

        body[data-theme='light'] {
            --bg-body: #f1f5f9;
            --bg-card: #ffffff;
            --text-main: #0f172a;
            --text-sub: #475569;
            --text-nav: #475569;
            --border: #e2e8f0;
            --accent: #0284c7;
            --input-bg: #ffffff;
            --input-text: #0f172a;
            --input-border: #cbd5e1;
        }

        /* --- 2. LAYOUT --- */
        body { font-family: 'Roboto', sans-serif; margin: 0; padding: 20px; background-color: var(--bg-body); color: var(--text-main); display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; transition: all 0.3s ease; }
        #page-wrapper { display: flex; justify-content: center; gap: 25px; width: 100%; max-width: 1200px; }
        .container, #results-panel { background-color: var(--bg-card); padding: 30px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3); border: 1px solid var(--border); }
        .container { width: 700px; flex-shrink: 0; }
        #results-panel { width: 320px; position: sticky; top: 20px; height: fit-content; }

        /* --- 3. ERROR HIGHLIGHTING & LABELS --- */
        .input-error { border: 2px solid #ef4444 !important; background-color: #fee2e2 !important; box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.2); }
        .radio-error { border: 2px solid #ef4444 !important; padding: 10px; border-radius: 8px; background-color: rgba(239, 68, 68, 0.1); }
        .opt { font-size: 0.8em; color: var(--text-sub); font-weight: 400; font-style: italic; margin-left: 5px; }
        .req { color: var(--btn-red); margin-left: 3px; font-weight: bold; }

        /* --- 4. UI ELEMENTS --- */
        h1, h2, h3, h4 { color: var(--accent); margin-top: 0; font-weight: 700; }
        .subtitle { color: var(--text-sub); text-align: center; margin-bottom: 25px; font-size: 0.95em; }
        label { display: block; margin-top: 15px; font-weight: 500; font-size: 0.95em; color: var(--text-main); }
        input[type="number"], input[type="text"], input[type="email"], select, textarea { width: 100%; display: block; padding: 12px; background-color: var(--input-bg) !important; color: var(--input-text) !important; border: 1px solid var(--input-border); border-radius: 6px; box-sizing: border-box; font-size: 1rem; margin-top: 6px; }
        input:focus { outline: 2px solid var(--accent); border-color: var(--accent); }
        button { cursor: pointer; border: none; border-radius: 6px; font-weight: 600; transition: 0.2s; }
        .unknown-btn { padding: 8px 14px; background: transparent; color: var(--text-sub); border: 1px solid var(--border); margin-top: 6px; font-size: 0.85em; }
        .unknown-btn.active { background: var(--btn-orange); color: white; border-color: var(--btn-orange); }
        .sidebar-btn { width: 100%; padding: 14px; color: white !important; font-size: 1em; text-align: center; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); display: flex; justify-content: center; align-items: center; gap: 8px; }
        #main-nav { display: flex; justify-content: center; margin-bottom: 30px; border-bottom: 1px solid var(--border); padding-bottom: 0; }
        .nav-item { padding: 12px 25px; font-weight: 500; font-size: 1.05em; color: var(--text-nav) !important; text-decoration: none; border-bottom: 2px solid transparent; transition: all 0.3s; }
        .nav-item:hover { color: var(--text-main) !important; }
        .nav-item.active { color: var(--accent) !important; border-bottom-color: var(--accent); font-weight: 700; }
        .metric-group { border: 1px solid var(--border); padding: 20px; margin-bottom: 20px; border-radius: 8px; background-color: transparent; }
        .metric-group h3 { border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 15px; font-size: 1.1em; color: var(--accent); }
        .scope-options label { font-weight: 400; display: flex; align-items: flex-start; gap: 8px; color: var(--text-sub); margin-top:8px;}
        .input-row { display: flex; align-items: center; gap: 10px; margin-top: 5px; }
        #theme-toggle-container { display: none; } 
        .blurred-results { filter: blur(6px); pointer-events: none; user-select: none; opacity: 0.6; transition: all 0.5s ease; }
        .modal { display: none; position: fixed; z-index: 9999; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.85); backdrop-filter: blur(4px); }
        .modal-content { background-color: var(--bg-card); margin: 5% auto; padding: 30px; border: 1px solid var(--border); width: 90%; max-width: 500px; border-radius: 12px; color: var(--text-main); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
        .close-btn { color: var(--text-sub); float: right; font-size: 28px; font-weight: bold; cursor: pointer; }
        
        /* --- TOOLTIPS --- */
        .tooltip-icon { display: inline-block; margin-left: 6px; cursor: pointer; color: var(--accent); font-size: 0.9em; position: relative; }
        .tooltip-icon:hover::after { content: attr(data-tooltip); position: absolute; bottom: 125%; left: 50%; transform: translateX(-50%); background: #0f172a; color: #fff; padding: 8px 12px; border-radius: 6px; width: 220px; font-size: 0.85em; font-weight: 400; line-height: 1.4; box-shadow: 0 4px 6px rgba(0,0,0,0.3); z-index: 1000; pointer-events: none; border: 1px solid var(--border); }

        /* --- GOAT LOADER --- */
        .mountain-loader { position: relative; width: 120px; height: 120px; margin: 0 auto; }
        .goat-spinner { font-size: 45px; position: absolute; top: 10px; left: 35px; animation: bounceSpin 2s infinite ease-in-out; z-index: 2; }
        .mountain-base { font-size: 70px; position: absolute; bottom: 0; left: 25px; z-index: 1; opacity: 0.8; }
        @keyframes bounceSpin { 0%, 100% { transform: translateY(0) rotate(0deg); } 25% { transform: translateY(-25px) rotate(-10deg); } 50% { transform: translateY(0) rotate(0deg); } 75% { transform: translateY(-12px) rotate(10deg); } }

        /* --- DASHBOARD STYLES --- */
        .summary-hero { text-align: center; padding: 30px; background: rgba(56, 189, 248, 0.08); border: 1px solid var(--accent); border-radius: 12px; margin-bottom: 30px; }
        .summary-hero h2 { margin-bottom: 10px; font-size: 2.2em; color: var(--accent); }
        .summary-hero p { color: var(--text-sub); font-size: 1.1em; margin: 0; }
        .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .stat-card { background: var(--bg-body); border: 1px solid var(--border); padding: 20px; border-radius: 8px; text-align: center; display: flex; flex-direction: column; justify-content: center; }
        .stat-card strong { font-size: 1.8em; display: block; margin-top: 5px; }
        .stat-card span { font-size: 0.9em; color: var(--text-sub); text-transform: uppercase; letter-spacing: 0.5px; }

        /* --- SUCCESS MODAL STYLES --- */
        #success-modal-content { text-align:center; padding: 40px; }
        #success-checkmark { font-size: 60px; color: #22c55e; margin-bottom: 20px; display: block; }
        #success-btn { background-color: var(--btn-green); color: white; padding: 15px 30px; font-size: 1.1em; border-radius: 8px; margin-top: 20px; width: 100%; cursor: pointer; border: none; font-weight: bold; }
        #success-btn:hover { opacity: 0.9; }

        /* --- PRINT STYLES (FIXED) --- */
        
        /* IMPORTANT: HIDE REPORT ON SCREEN */
        #printable-report-content { display: none; }

        @media print {
            @page { margin: 0.5in; size: auto; }
            html, body { height: auto !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; background: white !important; }
            body > * { display: none !important; }
            
            #printable-report-content { 
                display: block !important; visibility: visible !important; position: relative !important; 
                width: 100% !important; left: 0 !important; top: 0 !important; color: black !important; background: white !important; 
            }
            #printable-report-content * { visibility: visible !important; color: black !important; }
            
            /* Page Break Logic */
            .report-section { page-break-inside: avoid; margin-bottom: 30px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
            tr, td, th { page-break-inside: avoid; }
            
            h1, h2, h3, h4, strong, span, p, td, th { color: black !important; }
            .action-buttons, #main-nav, #theme-toggle-container, .modal, .tooltip-icon, #results-panel, .sidebar-btn { display: none !important; }
        }
    </style>
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
    <script>if(typeof pdfjsLib!=='undefined'){pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';}</script>
</head>