<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agency Appraiser | Valuation Tool</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        /* --- BASE COLORS --- */
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

        /* --- LAYOUT --- */
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

        /* --- HEADER CONTROLS --- */
        #header-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            padding-bottom: 20px;
            margin-bottom: -10px;
        }
        
        #login-btn {
            background-color: var(--color-primary-brand);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: 500;
            cursor: pointer;
            border: none;
            transition: background-color 0.3s;
        }
        #login-btn:hover {
            background-color: var(--color-accent);
        }

        #theme-toggle-container {
            display: flex; justify-content: flex-end;
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

        /* --- GENERAL ELEMENTS --- */
        h1 { color: var(--color-primary-brand); text-align: center; margin-bottom: 5px; }
        .subtitle { text-align: center; margin-bottom: 30px; color: var(--color-text-secondary); font-size: 0.9em; }
        h2 { font-size: 1.5em; margin-bottom: 10px; color: var(--color-text-primary); }

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
            background-color: transparent;
            color: var(--color-primary-brand);
            border: 2px solid var(--color-primary-brand);
        }
        #btn-goto-calculator {
            background-color: var(--color-primary-brand);
            color: var(--color-surface);
        }

        /* --- MODAL STYLES --- */
        .modal { display:none; position: fixed; z-index: 100; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.7); }
        .modal-content { 
            background-color: var(--color-surface); 
            margin: 10% auto; 
            padding: 25px; 
            border: 1px solid var(--color-border); 
            width: 80%; 
            max-width: 400px; 
            border-radius: 10px; 
            position: relative; 
            color: var(--color-text-primary);
        }
        .close-btn { color: var(--color-text-secondary); float: right; font-size: 28px; font-weight: bold; cursor: pointer; }
        
        .upload-error { 
            padding: 8px; 
            background-color: #f8d7da; 
            color: #721c24; 
            border: 1px solid #f5c6fb; 
            border-radius: 5px; 
            text-align: center; 
            font-size: 0.8em; 
        }
        .upload-success {
            padding: 8px; 
            background-color: #d4edda; 
            color: #155724; 
            border: 1px solid #c3e6cb; 
            border-radius: 5px; 
            text-align: center; 
            font-size: 0.8em; 
        }

        input[type="text"], input[type="password"] {
            width: 100%;
            display: block;
            padding: 10px; 
            border: 1px solid var(--color-border); 
            border-radius: 6px; 
            box-sizing: border-box;
            font-size: 1em; 
            background-color: var(--color-surface);
            color: var(--color-text-primary);
            margin-top: 5px;
        }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
    <script>
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        }
    </script>
</head>