// Constants
const CACHE_DURATION = 86400000; // 24 hours in milliseconds
const RESET_HOUR = 17; // UTC hour when weekly reset occurs
const RESET_DAY = 2;  // Tuesday (0 = Sunday, 2 = Tuesday)

// Date formatting options
const DATE_FORMAT_OPTIONS = { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric',
  timeZone: 'UTC'
};

// Types
/**
 * @typedef {Object} Activity
 * @property {string} name - Activity name
 * @property {string} icon - Path to activity icon
 * @property {string} content - Activity content
 * @property {string} [reward] - Optional reward text
 * @property {string} [rewardUrl] - Optional reward URL
 */

/**
 * @typedef {Object} WeeklyData
 * @property {string[][]} values - Raw data from spreadsheet
 */

/**
 * @typedef {Object} CacheData
 * @property {WeeklyData} weeklyData - Cached weekly data
 * @property {string} lastFetch - Last fetch timestamp
 */

// Data fetching utilities
/**
 * Fetch data from cache or network
 * @returns {Promise<WeeklyData>}
 */
async function fetchData() {
  const cache = await chrome.storage.local.get(['weeklyData', 'lastFetch']);
  const currentTime = new Date();
  const lastFetch = cache.lastFetch ? new Date(cache.lastFetch) : null;
  const isOffline = !navigator.onLine;

  const needsUpdate = !lastFetch || 
                     currentTime - lastFetch > CACHE_DURATION ||
                     isNewWeek(lastFetch);

  if (!needsUpdate && cache.weeklyData) {
    console.log('Using cached data');
    return cache.weeklyData;
  }

  console.log('Fetching fresh data');
  const response = await chrome.runtime.sendMessage({ action: "getData" });
  if (!response.data) {
    throw new Error('Failed to fetch data from server');
  }
  return response.data;
}

/**
 * Filter activities for current week
 * @param {string[][]} activities - Raw activity data
 * @returns {string[][]} Filtered activities
 */
function filterCurrentWeekActivities(activities) {
  const currentUTC = new Date(Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate(),
    new Date().getUTCHours(),
    new Date().getUTCMinutes(),
    new Date().getUTCSeconds()
  ));

  return activities.filter(row => {
    if (!row[1]) return false;
    
    const fromDate = new Date(row[1]);
    if (fromDate.toString() === 'Invalid Date') {
      console.log('Failed to parse date:', row[1]);
      return false;
    }

    fromDate.setUTCHours(RESET_HOUR, 0, 0, 0);
    
    const nextTuesday = new Date(fromDate);
    nextTuesday.setDate(fromDate.getDate() + 7);
    nextTuesday.setUTCHours(RESET_HOUR - 1, 59, 59, 999);
    
    return currentUTC >= fromDate && currentUTC <= nextTuesday;
  });
}

/**
 * Set refresh button state
 * @param {HTMLButtonElement} button - Refresh button element
 * @param {boolean} isLoading - Loading state
 */
function setRefreshButtonState(button, isLoading) {
  const icon = button.querySelector('span');
  button.disabled = isLoading;
  button.style.opacity = isLoading ? '0.7' : '1';
  if (isLoading) {
    icon.classList.add('refresh-spin');
  } else {
    icon.classList.remove('refresh-spin');
  }
}

/**
 * Show error message to user
 * @param {Error} error - Error object
 * @param {HTMLElement} container - Container to show error in
 */
function handleError(error, container) {
  console.error('Error:', error);
  container.innerHTML = `
    <li class="fade-in">
      <div class="error-message">
        Failed to load activities. ${error.message}
        <br>
        Please try again later or check your connection.
      </div>
    </li>
  `;
}

/**
 * Get the date range for the current weekly reset
 * @returns {{start: Date, end: Date}}
 */
function getWeekRange() {
  const now = new Date();
  const cetOffset = 1 * 60 * 60 * 1000;
  const cetTime = new Date(now.getTime() + cetOffset - now.getTimezoneOffset() * 60 * 1000);

  const dayOfWeek = cetTime.getDay();
  const hours = cetTime.getHours();
  const minutes = cetTime.getMinutes();

  const daysToSubtract = (dayOfWeek === RESET_DAY && (hours < RESET_HOUR || (hours === RESET_HOUR && minutes === 0))) 
    ? 7 
    : (dayOfWeek + 5) % 7;

  const tuesdayStart = new Date(cetTime);
  tuesdayStart.setDate(cetTime.getDate() - daysToSubtract);
  tuesdayStart.setHours(RESET_HOUR, 0, 0, 0);
  const tuesdayStartUTC = new Date(tuesdayStart.getTime() - cetOffset);

  const nextTuesdayEnd = new Date(tuesdayStartUTC);
  nextTuesdayEnd.setDate(tuesdayStartUTC.getDate() + 7);
  nextTuesdayEnd.setHours(RESET_HOUR - 1, 59, 59, 999);

  return { start: tuesdayStartUTC, end: nextTuesdayEnd };
}

/**
 * Format a date according to the standard format
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  return date.toLocaleDateString(undefined, DATE_FORMAT_OPTIONS);
}

/**
 * Format an ISO date string
 * @param {string} isoString
 * @returns {string}
 */
function formatDateTime(isoString) {
  return formatDate(new Date(isoString));
}

/**
 * Check if it's time for a new weekly reset
 * @param {string} lastFetchDate
 * @returns {boolean}
 */
function isNewWeek(lastFetchDate) {
  if (!lastFetchDate) return true;
  
  const lastFetch = new Date(lastFetchDate);
  const now = new Date();
  
  const lastTuesday = new Date(now);
  const day = lastTuesday.getUTCDay();
  const diff = (day + 6) % 7;
  lastTuesday.setUTCDate(lastTuesday.getUTCDate() - diff);
  lastTuesday.setUTCHours(RESET_HOUR, 0, 0, 0);
  
  return lastFetch < lastTuesday;
}

/**
 * Format the time remaining until next reset
 * @param {Date} targetDate
 * @returns {string}
 */
function formatTimeRemaining(targetDate) {
  const now = new Date();
  const diff = targetDate - now;
  
  if (diff <= 0) return "Reset is happening now!";
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  
  return `Next reset in: ${parts.join(' ')}`;
}

/**
 * Update the countdown timer display
 */
function updateCountdown() {
  const nextReset = new Date();
  const day = nextReset.getUTCDay();
  const daysUntilTuesday = (9 - day) % 7;
  
  nextReset.setUTCDate(nextReset.getUTCDate() + daysUntilTuesday);
  nextReset.setUTCHours(RESET_HOUR, 0, 0, 0);
  
  const countdownElement = document.getElementById('countdown');
  if (countdownElement) {
    countdownElement.textContent = formatTimeRemaining(nextReset);
  }
}

/**
 * Create a styled refresh button
 * @returns {HTMLButtonElement}
 */
function createRefreshButton() {
  const refreshButton = document.createElement('button');
  const refreshIcon = document.createElement('span');
  refreshIcon.innerHTML = '&#x21BB;';
  refreshButton.appendChild(refreshIcon);
  
  Object.assign(refreshButton.style, {
    position: 'absolute',
    top: '10px',
    right: '10px',
    padding: '4px 8px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#2c2c2c',
    color: 'white',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  });

  Object.assign(refreshIcon.style, {
    fontSize: '16px',
    lineHeight: '1',
    display: 'inline-block'
  });

  refreshButton.title = 'Refresh data';
  return refreshButton;
}

/**
 * Create base styles for the extension
 * @returns {HTMLStyleElement}
 */
function createStyles() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .fade-in {
      opacity: 0;
      animation: fadeIn 0.3s ease forwards;
    }
    .stagger-animation > * {
      opacity: 0;
      animation: fadeIn 0.3s ease forwards;
    }
    .stagger-animation > *:nth-child(1) { animation-delay: 0s; }
    .stagger-animation > *:nth-child(2) { animation-delay: 0.1s; }
    .stagger-animation > *:nth-child(3) { animation-delay: 0.2s; }
    .stagger-animation > *:nth-child(4) { animation-delay: 0.3s; }
    .stagger-animation > *:nth-child(5) { animation-delay: 0.4s; }
    .offline-indicator {
      text-align: center;
      color: #888;
      font-size: 12px;
      padding: 8px;
    }
    .bottom-wrapper {
      margin-top: 16px;
      text-align: center;
      margin-bottom: 10px;
    }
    .countdown-timer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: #1a1a1a;
      color: white;
      padding: 8px;
      text-align: center;
      font-size: 14px;
      border-top: 1px solid #333;
    }
    .refresh-spin {
      animation: spin 1s linear infinite;
    }
    button:hover {
      background-color: #3c3c3c !important;
    }
    button:active {
      background-color: #1c1c1c !important;
      transform: scale(0.95);
    }
    button:disabled {
      cursor: default !important;
    }
    button:disabled:hover {
      background-color: #2c2c2c !important;
    }
    .activity {
      display: flex;
      align-items: center;
    }
    .activity .activity-icon {
      margin-right: 8px;
    }
    .activity .activity-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .activity .activity-name,
    .activity .reward {
      margin: 0;
    }
    .activity a {
      text-decoration: none;
      border-bottom: 1px dotted currentColor;
      color: inherit;
    }
    .activity a:hover {
      border-bottom-style: solid;
    }
    .full-width .activity {
      display: flex;
      justify-content: center;
    }
    .full-width .activity-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .full-width .activity .activity-content {
      flex-direction: row;
      gap: 8px;
    }
  `;
  return style;
}

/**
 * Create an activity element with icon and content
 * @param {string} name - Activity name
 * @param {string} iconPath - Path to activity icon
 * @param {string} content - Activity content
 * @param {string} reward - Reward text
 * @param {string} rewardUrl - URL for reward link
 * @returns {HTMLDivElement}
 */
function createActivityElement(name, iconPath, content, reward = '', rewardUrl = '') {
  const div = document.createElement('div');
  div.className = 'activity';
  
  const html = [];
  if (iconPath) {
    html.push(`<img src="${iconPath}" alt="${name}" class="activity-icon">`);
  }
  
  html.push('<div class="activity-content">');
  html.push(`<span class="activity-name">${content}</span>`);
  
  if (reward && reward !== '-') {
    const rewardText = rewardUrl && rewardUrl !== '-' && rewardUrl.trim() !== '' 
      ? `<a href="${rewardUrl}" target="_blank">${reward}</a>`
      : reward;
    html.push(`<span class="reward"><span class="reward-label">Reward: </span>${rewardText}</span>`);
  }
  
  html.push('</div>');
  div.innerHTML = html.join('');
  return div;
}

// Activity creation functions
/**
 * Create a standalone activity section
 * @param {string} label - Section label
 * @param {string} content - Section content
 * @returns {HTMLDivElement}
 */
function createStandaloneSection(label, content) {
  const div = document.createElement('div');
  div.className = 'standalone';
  div.innerHTML = `<span class="label">${label}</span>: ${content}`;
  return div;
}

/**
 * Create a header for an activity section
 * @param {string} text - Header text
 * @param {string} [className] - Optional class name
 * @returns {HTMLHeadingElement}
 */
function createActivityHeader(text, className = '') {
  const header = document.createElement('h3');
  if (className) header.className = className;
  header.textContent = text;
  return header;
}

/**
 * Create a columns container
 * @param {HTMLElement[]} columns - Array of column elements
 * @returns {HTMLDivElement}
 */
function createColumnsContainer(columns) {
  const container = document.createElement('div');
  container.className = 'columns';
  columns.forEach(col => container.appendChild(col));
  return container;
}

/**
 * Create a trials activity section
 * @param {string} map - Map name
 * @param {string} reward - Reward text
 * @param {string} rewardUrl - Reward URL
 * @returns {HTMLDivElement}
 */
function createTrialsSection(map, reward, rewardUrl) {
  const container = document.createElement('div');
  container.className = 'full-width';
  
  const header = createActivityHeader('TRIALS OF OSIRIS IS LIVE \u{1F534}');
  container.appendChild(header);
  
  const activity = document.createElement('div');
  activity.className = 'activity';
  activity.innerHTML = `
    <div class="activity-wrapper">
      <img src="icons/trials.png" alt="Trials" class="activity-icon">
      <div class="activity-content">
        <span class="activity-name">Map: ${map}</span>
        ${reward && reward !== '-' ? `<span class="reward"><span class="reward-label">Reward: </span>${rewardUrl && rewardUrl !== '-' && rewardUrl.trim() !== '' ? `<a href="${rewardUrl}" target="_blank">${reward}</a>` : reward}</span>` : ''}
      </div>
    </div>
  `;
  
  container.appendChild(activity);
  return container;
}

/**
 * Create an activity with reward
 * @param {Activity} activity - Activity details
 * @returns {HTMLDivElement}
 */
function createActivityWithReward(activity) {
  return createActivityElement(
    activity.name,
    activity.icon,
    activity.content,
    activity.reward,
    activity.rewardUrl
  );
}

/**
 * Create an offline/cache indicator
 * @param {boolean} isOffline - Whether the app is offline
 * @param {Date} lastFetch - Last fetch timestamp
 * @returns {HTMLDivElement}
 */
function createStatusIndicator(isOffline, lastFetch) {
  const wrapper = document.createElement('div');
  wrapper.className = 'bottom-wrapper';
  
  const indicator = document.createElement('div');
  indicator.className = 'offline-indicator fade-in';
  indicator.innerHTML = isOffline ? 
    '📵 Offline mode' : 
    `(Last updated: ${lastFetch?.toLocaleString() || 'Never'})`;
  
  wrapper.appendChild(indicator);
  return wrapper;
}

/**
 * Render activities for the current week
 * @param {string[][]} activities - Activity data
 * @param {string[]} headers - Column headers
 * @param {HTMLElement} container - Container element
 */
function renderActivities(activities, headers, container) {
  if (activities.length === 0) {
    container.innerHTML = '<li class="fade-in">No activities this week.</li>';
    return;
  }

  container.className = 'stagger-animation';
  activities.forEach(row => {
    const li = document.createElement('li');
    li.className = 'week-entry';

    // Event and Weekly Bonus (Standalone)
    if (row[2]) li.appendChild(createStandaloneSection(headers[2], row[2]));
    if (row[3]) li.appendChild(createStandaloneSection(headers[3], row[3]));

    // Trials of Osiris
    if (row[4]) {
      li.appendChild(createTrialsSection(row[4], row[5], row[6]));
    }

    // Two-column activities (Nightfall and Exotic Mission)
    const columnsDiv = createColumnsContainer([
      createActivityColumn('NIGHTFALL', 'nightfall.png', row[7], row[8], row[9]),
      createActivityColumn('EXOTIC MISSION', 'exotic.png', row[10], row[11], row[12])
    ]);
    li.appendChild(columnsDiv);

    // Featured Raids
    if (row[13] || row[16]) {
      li.appendChild(createActivityHeader('FEATURED RAIDS', 'merged-header'));
      const raidsDiv = createColumnsContainer([
        createActivityColumn('', 'raid.png', row[13], row[14], row[15]),
        createActivityColumn('', 'raid.png', row[16], row[17], row[18])
      ]);
      li.appendChild(raidsDiv);
    }

    // Featured Dungeons
          if (row[19] || row[22]) {
      li.appendChild(createActivityHeader('FEATURED DUNGEONS', 'merged-header'));
      const dungeonsDiv = createColumnsContainer([
        createActivityColumn('', 'dungeon.png', row[19], row[20], row[21]),
        createActivityColumn('', 'dungeon.png', row[22], row[23], row[24])
      ]);
      li.appendChild(dungeonsDiv);
    }

    // Other Activities
    if (row[25] || row[27]) {
      li.appendChild(createActivityHeader('OTHER ACTIVITIES', 'merged-header'));
      const otherDiv = createColumnsContainer([
        createActivityColumn('Dares of Eternity', '', row[25], '', row[26], true),
        createActivityColumn(headers[27], '', row[27], '', '')
      ]);
      li.appendChild(otherDiv);
    }

    // Vex Incursion Zone
    if (row[28]) {
      li.appendChild(createStandaloneSection(headers[28], row[28]));
    }

    container.appendChild(li);
  });
}

/**
 * Create an activity column
 * @param {string} header - Column header
 * @param {string} iconName - Icon filename
 * @param {string} content - Activity content
 * @param {string} reward - Reward text
 * @param {string} rewardUrl - Reward URL
 * @param {boolean} [isDares] - Whether this is a Dares of Eternity section
 * @returns {HTMLDivElement}
 */
function createActivityColumn(header, iconName, content, reward, rewardUrl, isDares = false) {
  const column = document.createElement('div');
  
  if (header) {
    column.appendChild(createActivityHeader(header));
  }
  
  if (content) {
    if (isDares) {
      // Special handling for Dares of Eternity
      const activity = document.createElement('div');
      activity.className = 'activity';
      activity.innerHTML = `
        <div class="activity-content">
          <span class="activity-name">${content}</span>
        </div>
      `;
      column.appendChild(activity);
    } else {
      const activity = createActivityWithReward({
        name: header || 'Activity',
        icon: iconName ? `icons/${iconName}` : '',
        content,
        reward,
        rewardUrl
      });
      column.appendChild(activity);
    }
  }
  
  return column;
}

/**
 * Initialize the application
 */
async function initializeApp() {
  const list = document.getElementById('activitiesList');
  const weekInfoDiv = document.getElementById('weekInfo');
  
  // Initialize UI elements
  const refreshButton = createRefreshButton();
  document.body.appendChild(refreshButton);
  document.head.appendChild(createStyles());
  
  // Add refresh button click handler
  refreshButton.addEventListener('click', async () => {
    try {
      setRefreshButtonState(refreshButton, true);
      await chrome.runtime.sendMessage({ action: "clearCache" });
      const response = await chrome.runtime.sendMessage({ action: "getData" });
      if (response.data) {
        location.reload();
      } else {
        throw new Error('Failed to fetch new data');
      }
    } catch (error) {
      setRefreshButtonState(refreshButton, false);
      alert('Failed to refresh data. Please try again.');
    }
  });

  try {
    setRefreshButtonState(refreshButton, true);
    const data = await fetchData();

    if (!data?.values?.length) {
      throw new Error('No data available');
    }

    const [headers, ...activities] = data.values;
    const thisWeek = filterCurrentWeekActivities(activities);
    
    // Update week info
    if (thisWeek.length > 0) {
      const row = thisWeek[0];
      weekInfoDiv.innerHTML = `<span class="label">${headers[0]}</span>: ${row[0]} | <span class="label">${headers[1]}</span> ${formatDateTime(row[1])}`;
    }

    // Render activities
    renderActivities(thisWeek, headers, list);

    // Add offline indicator if needed
    if (!navigator.onLine) {
      list.appendChild(createStatusIndicator(true, null));
    }

  } catch (error) {
    handleError(error, list);
  } finally {
    setRefreshButtonState(refreshButton, false);
  }

  // Update countdown
  updateCountdown();
  setInterval(updateCountdown, 60000);
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Handle online/offline events
window.addEventListener('online', () => location.reload());
window.addEventListener('offline', () => {
  const existingIndicator = document.querySelector('.offline-indicator');
  if (!existingIndicator) {
    document.getElementById('activitiesList')
      .appendChild(createStatusIndicator(true, null));
  }
});
