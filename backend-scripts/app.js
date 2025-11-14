// API base URL
const API_BASE = window.location.origin;

// Get DOM elements
const battingBtn = document.getElementById('battingBtn');
const bowlingBtn = document.getElementById('bowlingBtn');
const winningBtn = document.getElementById('winningBtn');
const monthSelect = document.getElementById('monthSelect');
const yearSelect = document.getElementById('yearSelect');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const resultsContainer = document.getElementById('resultsContainer');
const tableHead = document.getElementById('tableHead');
const tableBody = document.getElementById('tableBody');

// Initialize year dropdown (current year and past 5 years)
function initializeYearSelect() {
    const currentYear = new Date().getFullYear();
    for (let i = currentYear; i >= currentYear - 5; i--) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        if (i === 2025) {
            option.selected = true;
        }
        yearSelect.appendChild(option);
    }
}

// Initialize on page load
initializeYearSelect();

// Add event listeners
battingBtn.addEventListener('click', () => loadStats('batting'));
bowlingBtn.addEventListener('click', () => loadStats('bowling'));
winningBtn.addEventListener('click', () => loadStats('winning'));

// Function to load stats
async function loadStats(type) {
    // Update active button
    document.querySelectorAll('.stat-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-type="${type}"]`).classList.add('active');

    // Get selected month and year
    const month = monthSelect.value;
    const year = yearSelect.value;

    // Hide previous results and errors
    resultsContainer.style.display = 'none';
    error.style.display = 'none';
    loading.style.display = 'block';

    try {
        const response = await fetch(`${API_BASE}/api/stats/${type}?year=${year}&month=${month}`);
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to fetch data');
        }

        if (!result.data || result.data.length === 0) {
            throw new Error('No data found for the selected month');
        }

        displayData(result.data, type);
    } catch (err) {
        console.error('Error loading stats:', err);
        showError(err.message || 'Failed to load statistics. Please try again.');
    } finally {
        loading.style.display = 'none';
    }
}

// Function to display data in table
function displayData(data, type) {
    // Clear previous data
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';

    if (data.length === 0) {
        showError('No data available');
        return;
    }

    // Get column names from first row
    const columns = Object.keys(data[0]);
    
    // Create table header
    const headerRow = document.createElement('tr');
    columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = formatColumnName(col);
        headerRow.appendChild(th);
    });
    tableHead.appendChild(headerRow);

    // Create table rows
    data.forEach(row => {
        const tr = document.createElement('tr');
        columns.forEach(col => {
            const td = document.createElement('td');
            const value = row[col];
            td.textContent = formatValue(value, col);
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });

    // Show results
    resultsContainer.style.display = 'block';
}

// Function to format column names
function formatColumnName(name) {
    // Convert snake_case to Title Case
    return name
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// Function to format values
function formatValue(value, columnName) {
    if (value === null || value === undefined) {
        return '-';
    }

    // Format numbers
    if (typeof value === 'number') {
        // Check if it's a percentage or rate
        if (columnName.includes('percentage') || columnName.includes('rate') || 
            columnName.includes('economy') || columnName.includes('average')) {
            return value.toFixed(2);
        }
        // Format large numbers with commas
        return value.toLocaleString('en-US');
    }

    return value;
}

// Function to show error
function showError(message) {
    error.textContent = `❌ ${message}`;
    error.style.display = 'block';
}

