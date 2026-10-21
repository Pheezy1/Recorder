document.addEventListener('DOMContentLoaded', () => {
    // Form and input node elements hooks
    const arbForm = document.getElementById('arb-form');
    const financeForm = document.getElementById('finance-form');
    const container = document.getElementById('outcomes-container');
    const addOutcomeBtn = document.getElementById('add-outcome-btn');
    const baseCapitalInput = document.getElementById('base-capital-input');
    
    // Backdate Input Form Elements Hooks
    const arbDateInput = document.getElementById('arb-date-input');
    const financeDateInput = document.getElementById('finance-date-input');
    
    // Calendar nodes dashboard filter targets
    const dailyCalendarInput = document.getElementById('daily-calendar-input');
    const rangeStartInput = document.getElementById('range-start-input');
    const rangeEndInput = document.getElementById('range-end-input');
    
    // Dropdown category selectors
    const mainCategorySelect = document.getElementById('main-category');
    const subCategoryGroup = document.getElementById('sub-category-group');
    const subCategorySelect = document.getElementById('sub-category');
    
    // Ledger table row targets
    const historyBody = document.getElementById('history-body');
    const ledgerBody = document.getElementById('ledger-body');
    
    // Clear log handlers
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');
    
    // Dashboard report display hooks
    const masterBalanceDisplay = document.getElementById('master-balance-display');
    const dailyProfitDisplay = document.getElementById('daily-profit-display');
    const dailyExpenseDisplay = document.getElementById('daily-expense-display');
    const rangeProfitDisplay = document.getElementById('range-profit-display');
    const rangeExpenseDisplay = document.getElementById('range-expense-display');

    let memoryArbHistory = [];
    let memoryFinanceHistory = [];

    // Custom sub-category configuration relationships
    const subCategoriesMap = {
        "Bike": ["Fuel", "Oil", "Other Fixings"],
        "Food": ["Food", "Drinks"]
    };

    // Helper Utility: Convert active date instance into localized YYYY-MM-DDTHH:MM representation
    function getLocalDateTimeString() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const h = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${d}T${h}:${min}`;
    }

    // Auto-initialize form entry date pickers to current active local system time
    const currentDateTimeString = getLocalDateTimeString();
    if (arbDateInput) arbDateInput.value = currentDateTimeString;
    if (financeDateInput) financeDateInput.value = currentDateTimeString;

    // Preset dashboard calendar report filters to modern system date (YYYY-MM-DD format)
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const currentDay = String(today.getDate()).padStart(2, '0');
    const todayISOStr = `${currentYear}-${currentMonth}-${currentDay}`;

    if (dailyCalendarInput) dailyCalendarInput.value = todayISOStr;
    if (rangeStartInput) rangeStartInput.value = todayISOStr;
    if (rangeEndInput) rangeEndInput.value = todayISOStr;

    // Attach listener triggers onto calendars to recalculate instant totals when altered
    if (dailyCalendarInput) dailyCalendarInput.addEventListener('change', renderDashboardAndTables);
    if (rangeStartInput) rangeStartInput.addEventListener('change', renderDashboardAndTables);
    if (rangeEndInput) rangeEndInput.addEventListener('change', renderDashboardAndTables);

    // Read and cache capital parameters actively on manual base change adjustments
    if (baseCapitalInput) {
        if (localStorage.getItem('arb_base_capital')) {
            baseCapitalInput.value = localStorage.getItem('arb_base_capital');
        } else {
            localStorage.setItem('arb_base_capital', baseCapitalInput.value);
        }
        baseCapitalInput.addEventListener('input', () => {
            localStorage.setItem('arb_base_capital', baseCapitalInput.value);
            renderDashboardAndTables();
        });
    }

    // Dynamic Category Selector Filter Engine
    if (mainCategorySelect) {
        mainCategorySelect.addEventListener('change', function() {
            const selectedVal = this.value;
            if (subCategoriesMap[selectedVal]) {
                subCategorySelect.innerHTML = '';
                subCategoriesMap[selectedVal].forEach(sub => {
                    const opt = document.createElement('option');
                    opt.value = sub;
                    opt.textContent = sub;
                    subCategorySelect.appendChild(opt);
                });
                subCategoryGroup.classList.remove('hidden');
                subCategorySelect.required = true;
            } else {
                subCategoryGroup.classList.add('hidden');
                subCategorySelect.innerHTML = '';
                subCategorySelect.required = false;
            }
        });
    }

    // LocalStorage Core Memory Controllers
    function getArbHistory() {
        try {
            let stored = localStorage.getItem('arb_multi_logs');
            return stored ? JSON.parse(stored) : memoryArbHistory;
        } catch (e) { return memoryArbHistory; }
    }

    // Save and run rendering
    function saveArbHistory(data) {
        memoryArbHistory = data;
        try { localStorage.setItem('arb_multi_logs', JSON.stringify(data)); } catch (e) {}
        renderDashboardAndTables();
    }

    function getFinanceHistory() {
        try {
            let stored = localStorage.getItem('finance_tracker_logs');
            return stored ? JSON.parse(stored) : memoryFinanceHistory;
        } catch (e) { return memoryFinanceHistory; }
    }

    function saveFinanceHistory(data) {
        memoryFinanceHistory = data;
        try { localStorage.setItem('finance_tracker_logs', JSON.stringify(data)); } catch (e) {}
        renderDashboardAndTables();
    }

    // Dynamic Outcomes Row Inserter 
    if (addOutcomeBtn) {
        addOutcomeBtn.addEventListener('click', () => {
            const row = document.createElement('div');
            row.className = 'outcome-row';
            row.innerHTML = `
                <div class="outcome-inputs">
                    <div class="input-group" style="margin:0;">
                        <label class="row-label">Odds</label>
                        <input type="number" class="outcome-odds" value="3.00" step="0.01" min="1.01" required>
                    </div>
                    <div class="input-group" style="margin:0;">
                        <label style="display:flex; justify-content:space-between; align-items:center;">
                            Stake (₦)
                            <button type="button" class="btn-delete-row" title="Delete Option">✕</button>
                        </label>
                        <input type="text" class="outcome-stake" placeholder="--" readonly>
                    </div>
                </div>
                <div class="payout-display">Expected Payout: <span class="outcome-payout">₦0</span></div>
            `;
            row.querySelector('.btn-delete-row').addEventListener('click', () => {
                row.remove();
                reindexLabels();
            });
            container.appendChild(row);
            reindexLabels();
        });
    }

    function reindexLabels() {
        const labels = container.getElementsByClassName('row-label');
        for (let i = 0; i < labels.length; i++) {
            labels[i].textContent = `Odds #${i + 1}`;
        }
    }
    // Form Submission Processing Engine #1: Arbitrage Math Calculator with Backdate Control
    if (arbForm) {
        arbForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const totalInvestment = Math.round(parseFloat(document.getElementById('total-investment').value));
            const oddInputs = container.getElementsByClassName('outcome-odds');
            const stakeInputs = container.getElementsByClassName('outcome-stake');
            const payoutDisplays = container.getElementsByClassName('outcome-payout');

            let totalInverseOdds = 0;
            let oddsValues = [];

            for (let i = 0; i < oddInputs.length; i++) {
                const val = parseFloat(oddInputs[i].value);
                oddsValues.push(val);
                totalInverseOdds += (1 / val);
            }

            let balancedPayout = 0;
            for (let i = 0; i < oddInputs.length; i++) {
                const currentInverse = 1 / oddsValues[i];
                const rawStake = (totalInvestment * currentInverse) / totalInverseOdds;
                const optimalStake = Math.round(rawStake);
                const expectedPayout = Math.round(optimalStake * oddsValues[i]);

                if (i === 0) balancedPayout = expectedPayout;
                stakeInputs[i].value = `₦${optimalStake.toFixed(0)}`;
                payoutDisplays[i].textContent = `₦${expectedPayout.toFixed(0)}`;
            }

            const netProfit = Math.round(balancedPayout - totalInvestment);
            const roi = (netProfit / totalInvestment) * 100;
            const isProfitable = netProfit > 0;

            document.getElementById('results-box').classList.remove('hidden');
            const statusBadge = document.getElementById('arb-status');
            statusBadge.textContent = isProfitable ? 'Arbitrage Opportunity Found!' : 'No Arbitrage Profit Available';
            statusBadge.className = `status-badge ${isProfitable ? 'profitable' : 'negative'}`;

            document.getElementById('res-payout').textContent = `₦${balancedPayout.toFixed(0)}`;
            const profitEl = document.getElementById('res-profit');
            profitEl.textContent = `₦${netProfit.toFixed(0)}`;
            profitEl.className = isProfitable ? 'text-green' : 'text-red';

            const roiEl = document.getElementById('res-roi');
            roiEl.textContent = `${roi.toFixed(2)}%`; 
            roiEl.className = isProfitable ? 'text-green' : 'text-red';

            // Extract values directly from the manual datetime picker override element
            const pickedDateVal = arbDateInput && arbDateInput.value ? new Date(arbDateInput.value) : new Date();
            const formattedTimestamp = `${String(pickedDateVal.getDate()).padStart(2, '0')}/${String(pickedDateVal.getMonth() + 1).padStart(2, '0')}/${pickedDateVal.getFullYear()} ${String(pickedDateVal.getHours()).padStart(2, '0')}:${String(pickedDateVal.getMinutes()).padStart(2, '0')}`;

            const logEntry = {
                id: 'arb_' + Date.now().toString() + Math.random().toString(16).slice(2, 6),
                timestamp: formattedTimestamp,
                totalStake: totalInvestment.toFixed(0),
                oddsSignature: oddsValues.map(o => o.toFixed(2)).join(' / '),
                profit: netProfit.toFixed(0),
                roiPercentage: roi.toFixed(2), 
                isProfitable: isProfitable
            };

            let activeLogs = getArbHistory();
            activeLogs.unshift(logEntry);
            saveArbHistory(activeLogs);

            if (arbDateInput) arbDateInput.value = getLocalDateTimeString();
        });
    }

    // Form Submission Processing Engine #2: Financial Outflow Tracker with Backdate Control
    if (financeForm) {
        financeForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const amountInput = document.getElementById('amount').value;
            const mainCategory = mainCategorySelect.value;
            const subCategory = !subCategoryGroup.classList.contains('hidden') ? subCategorySelect.value : null;
            const descriptionInput = document.getElementById('description').value.trim();

            const finalAmount = Math.round(parseFloat(amountInput));

            if (isNaN(finalAmount) || finalAmount <= 0) {
                alert("Please enter a valid amount.");
                return;
            }

            const displayedCategory = subCategory ? `${mainCategory} (${subCategory})` : mainCategory;
            const finalDescription = descriptionInput || 'No description provided';

            // Extract values directly from the manual datetime picker override element
            const pickedDateVal = financeDateInput && financeDateInput.value ? new Date(financeDateInput.value) : new Date();
            const formattedTimestamp = `${String(pickedDateVal.getDate()).padStart(2, '0')}/${String(pickedDateVal.getMonth() + 1).padStart(2, '0')}/${pickedDateVal.getFullYear()} ${String(pickedDateVal.getHours()).padStart(2, '0')}:${String(pickedDateVal.getMinutes()).padStart(2, '0')}`;

            const ledgerEntry = {
                id: 'fin_' + Date.now().toString() + Math.random().toString(16).slice(2, 6),
                timestamp: formattedTimestamp,
                category: displayedCategory,
                description: finalDescription,
                amount: finalAmount
            };

            let currentLedger = getFinanceHistory();
            currentLedger.unshift(ledgerEntry);
            saveFinanceHistory(currentLedger);

            financeForm.reset();
            subCategoryGroup.classList.add('hidden');
            subCategorySelect.innerHTML = '';
            subCategorySelect.required = false;
            
            if (financeDateInput) financeDateInput.value = getLocalDateTimeString();
        });
    }

    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to permanently clear ALL logged Arbitrage calculations?")) {
                saveArbHistory([]);
            }
        });
    }

    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to permanently delete ALL recorded expenses?")) {
                saveFinanceHistory([]);
            }
        });
    }

    // FIXED PERMANENTLY: Uses base-10 radix and isolates variables cleanly to protect mobile engines
    function parseCustomTimestamp(tsString) {
        try {
            const spaceDelimiterPosition = tsString.indexOf(' ');
            const dateStringSection = spaceDelimiterPosition !== -1 ? tsString.substring(0, spaceDelimiterPosition) : tsString;
            const dateParts = dateStringSection.split('/'); 
            
            const day = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10) - 1; 
            const year = parseInt(dateParts[2], 10);
            
            // Build the date object explicitly set to local noon hours to safely prevent timezone shifting drops
            const generatedDate = new Date(year, month, day);
            generatedDate.setHours(12, 0, 0, 0);
            return generatedDate;
        } catch(e) {
            console.error("Timestamp parser automatic recovery mechanism engaged.", e);
            return new Date();
        }
    }

    // FIXED PERMANENTLY: Clears date mapping formats to accurately crosscheck with input fields calendar strings
    function getISODateString(dateObj) {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    // MASTER INTEGRATED REAL-TIME TIMELINE FILTER AND RENDER PIPELINE
    function renderDashboardAndTables() {
        const arbLogs = getArbHistory();
        const financeLogs = getFinanceHistory();

        // 1. CLEAR & PREPARE RE-RENDERING THE TWO LEDGER TABLES
        historyBody.innerHTML = '';
        ledgerBody.innerHTML = '';

        // 2. DEFINE MASTER FLOW TOTAL ACCUMULATORS
        let masterTotalCapitalInput = Math.round(parseFloat(baseCapitalInput.value)) || 0;
        let grandTotalArbProfit = 0;
        let grandTotalExpensesSpent = 0;

        // Fetch calendar baseline inputs for active comparison parameters
        const dailyTargetValue = dailyCalendarInput ? dailyCalendarInput.value : '';
        const rangeStartValue = rangeStartInput ? rangeStartInput.value : '';
        const rangeEndValue = rangeEndInput ? rangeEndInput.value : '';

        // Standardize range dates for logical evaluations
        const rangeStartDate = rangeStartValue ? new Date(rangeStartValue) : null;
        if (rangeStartDate) rangeStartDate.setHours(0, 0, 0, 0);
        
        const rangeEndDate = rangeEndValue ? new Date(rangeEndValue) : null;
        if (rangeEndDate) rangeEndDate.setHours(23, 59, 59, 999);

        let filteredDailyArb = 0;
        let filteredDailyExpense = 0;
        let filteredRangeArb = 0;
        let filteredRangeExpense = 0;

        // 3. PARSE ARBITRAGE ENTRIES AND COMPUTE ACCUMULATIVE CHRONOLOGY
        arbLogs.forEach(entry => {
            const profitAmount = parseInt(entry.profit, 10) || 0;
            grandTotalArbProfit += profitAmount;

            const entryDate = parseCustomTimestamp(entry.timestamp);
            const entryISODateStr = getISODateString(entryDate);

            // A. Daily Calendar Matrix Matching
            if (dailyTargetValue && entryISODateStr === dailyTargetValue) {
                filteredDailyArb += profitAmount;
            }

            // B. Range Scope Calendar Matrix Matching
            if (rangeStartDate && rangeEndDate && entryDate >= rangeStartDate && entryDate <= rangeEndDate) {
                filteredRangeArb += profitAmount;
            }

            // Pull ROI percentage safely
            const roiDisplayStr = entry.roiPercentage ? `${entry.roiPercentage}%` : '--';

            // Render row into Arbitrage Table (Enhanced with explicit ROI column signature)
            const tr = document.createElement('tr');
            const colorClass = entry.isProfitable ? 'text-green' : 'text-red';
            tr.innerHTML = `
                <td>${entry.timestamp}</td>
                <td>₦${parseInt(entry.totalStake, 10).toLocaleString('en-US')}</td>
                <td style="word-break: break-all; max-width:180px;">${entry.oddsSignature}</td>
                <td class="${colorClass}">₦${profitAmount.toLocaleString('en-US')} <span style="font-size:0.75rem; opacity:0.85; margin-left:2px;">(${roiDisplayStr})</span></td>
                <td class="action-cell">
                    <button class="btn-secondary delete-arb-trigger" data-id="${entry.id}" style="padding: 4px 8px; font-size: 0.75rem;">Delete</button>
                </td>
            `;
            historyBody.appendChild(tr);
        });

        // 4. PARSE EXPENSE ENTRIES AND COMPUTE ACCUMULATIVE CHRONOLOGY
        financeLogs.forEach(entry => {
            const expenseAmount = parseInt(entry.amount, 10) || 0;
            grandTotalExpensesSpent += expenseAmount;

            const entryDate = parseCustomTimestamp(entry.timestamp);
            const entryISODateStr = getISODateString(entryDate);

            // A. Daily Calendar Matrix Matching
            if (dailyTargetValue && entryISODateStr === dailyTargetValue) {
                filteredDailyExpense += expenseAmount;
            }

            // B. Range Scope Calendar Matrix Matching
            if (rangeStartDate && rangeEndDate && entryDate >= rangeStartDate && entryDate <= rangeEndDate) {
                filteredRangeExpense += expenseAmount;
            }

            // Render row into Expense Table
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${entry.timestamp}</td>
                <td style="font-weight: 600; color: var(--text-main);">${entry.category}</td>
                <td style="color: var(--text-muted); max-width: 200px; word-break: break-word;">${entry.description}</td>
                <td style="font-weight: 700; color: var(--expense-color);">₦${expenseAmount.toLocaleString('en-US')}</td>
                <td class="action-cell">
                    <button class="btn-secondary delete-fin-trigger" data-id="${entry.id}" style="padding: 4px 8px; font-size: 0.75rem;">Delete</button>
                </td>
            `;
            ledgerBody.appendChild(tr);
        });

        // 5. WIRE UP EVENT LISTENERS FOR DELETION TRIGGERS ON LIVE RENDERED ROWS
        document.querySelectorAll('.delete-arb-trigger').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('data-id');
                saveArbHistory(getArbHistory().filter(item => item.id !== targetId));
            });
        });

        document.querySelectorAll('.delete-fin-trigger').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('data-id');
                saveFinanceHistory(getFinanceHistory().filter(item => item.id !== targetId));
            });
        });

        // 6. RENDER EMPTY ARCHIVE FALLBACK LABELS FOR CLEAN INTERFACES
        if (arbLogs.length === 0) {
            historyBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">No calculation entries logged yet.</td></tr>`;
        }
        if (financeLogs.length === 0) {
            ledgerBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">No expense transactions recorded yet.</td></tr>`;
        }

        // 7. COMPUTE AND RENDER THE UNIFIED REAL-TIME LIQUIDITY BALANCE FORMULA
        const finalCalculatedWalletBalance = masterTotalCapitalInput + grandTotalArbProfit - grandTotalExpensesSpent;
        
        masterBalanceDisplay.textContent = '₦' + finalCalculatedWalletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        masterBalanceDisplay.className = finalCalculatedWalletBalance >= 0 ? "stats-val balance-grand-total" : "stats-val balance-grand-total text-red";

        // 8. UPDATE THE REAL-TIME SELECTOR BOARD HOUSING ROWS DYNAMICALLY
        if (dailyProfitDisplay) dailyProfitDisplay.textContent = '₦' + Math.round(filteredDailyArb).toLocaleString('en-US');
        if (dailyExpenseDisplay) dailyExpenseDisplay.textContent = '₦' + Math.round(filteredDailyExpense).toLocaleString('en-US');
        
        if (rangeProfitDisplay) rangeProfitDisplay.textContent = '₦' + Math.round(filteredRangeArb).toLocaleString('en-US');
        if (rangeExpenseDisplay) rangeExpenseDisplay.textContent = '₦' + Math.round(filteredRangeExpense).toLocaleString('en-US');
    }

    // EXPORT ENGINE CONVERTS INTEGRATED DATA REVENUE LOGS INTO BACKUP SHEETS
    function exportToCSV() {
        const arbData = getArbHistory();
        if (arbData.length === 0) {
            alert("No data available in history log entries to compile backups.");
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Arbitrage Calculation History Archive Log Entries\n";
        csvContent += "Date & Time,Total Stake (NGN),Allocated Odds Signature,Net Profit (ROI)\n";

        arbData.forEach(log => {
            const formattedOdds = log.oddsSignature.replace(/ \/ /g, " | ");
            const roiLabel = log.roiPercentage ? `(${log.roiPercentage}%)` : '';
            csvContent += `"${log.timestamp}","${log.totalStake}","${formattedOdds}","${log.profit} ${roiLabel}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `arbitrage_commander_backup_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        
        link.click();
        document.body.removeChild(link);
    }

    // Initial table indexing pipeline boot sequence layout configurations
    reindexLabels();
    renderDashboardAndTables();
});
