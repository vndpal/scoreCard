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

// Track current stats type
let currentType = '';

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
    currentType = type;
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

    // Define column order based on type
    let columns = [];
    if (type === 'batting') {
        columns = [
            'player_name', 'matches', 'innings', 'runs', 'balls_faced',
            'fours', 'sixes', 'strike_rate', 'Average', 'not_outs',
            'wins', 'win_percentage'
        ];
    } else if (type === 'bowling') {
        columns = [
            'Name', 'matches', 'overs', 'wickets', 'runs',
            'economy', 'dotBalls', 'Sixes', 'Fours', 'Extras',
            'wins', 'WinPercentage'
        ];
    } else {
        // Fallback to default order
        columns = Object.keys(data[0]);
    }

    // Filter columns to ensure they exist in data
    const availableColumns = Object.keys(data[0]);
    columns = columns.filter(col => availableColumns.includes(col));

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

// Share as Image functionality
const shareBtn = document.getElementById('shareBtn');

shareBtn.addEventListener('click', async () => {
    if (resultsContainer.style.display === 'none') {
        showError('No stats to share. Please load some data first.');
        return;
    }

    try {
        shareBtn.disabled = true;
        shareBtn.innerHTML = '<span class="spinner" style="width: 20px; height: 20px; border-width: 2px; display: inline-block; margin: 0;"></span> Generating...';

        // Create header for export
        const header = document.createElement('div');
        header.className = 'export-header';

        const monthName = monthSelect.options[monthSelect.selectedIndex].text;
        const year = yearSelect.value;
        const typeName = currentType.charAt(0).toUpperCase() + currentType.slice(1);

        header.innerHTML = `
            <h2>${typeName} Stats ${monthName}-${year}</h2>
            <div class="branding">ScoreCard Analytics</div>
        `;

        // Insert header before table
        resultsContainer.insertBefore(header, resultsContainer.firstChild);

        const canvas = await html2canvas(resultsContainer, {
            backgroundColor: '#ffffff',
            scale: 2, // Higher quality
            logging: false,
            useCORS: true
        });

        // Remove header after capture
        resultsContainer.removeChild(header);

        // Create download link
        const link = document.createElement('a');
        link.download = `scorecard-stats-${currentType}-${monthName}-${year}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        // Restore button state
        shareBtn.disabled = false;
        shareBtn.innerHTML = '<span class="icon">📸</span> <span class="label">Share as Image</span>';
    } catch (err) {
        console.error('Error generating image:', err);
        showError('Failed to generate image. Please try again.');
        // Ensure header is removed even if error occurs
        const existingHeader = resultsContainer.querySelector('.export-header');
        if (existingHeader) {
            resultsContainer.removeChild(existingHeader);
        }
        shareBtn.disabled = false;
        shareBtn.innerHTML = '<span class="icon">📸</span> <span class="label">Share as Image</span>';
    }
});

