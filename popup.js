function getWeekRange() {
  const now = new Date();
  const cetOffset = 1 * 60 * 60 * 1000; // CET is UTC+1 in February 2025 (no DST)
  const cetTime = new Date(now.getTime() + cetOffset - now.getTimezoneOffset() * 60 * 1000);

  const dayOfWeek = cetTime.getDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday, etc.
  const hours = cetTime.getHours();
  const minutes = cetTime.getMinutes();

  let daysToSubtract;
  if (dayOfWeek === 2 && (hours < 18 || (hours === 18 && minutes === 0))) {
    daysToSubtract = 7; // Before 6 PM CET on Tuesday, go to previous Tuesday
  } else {
    daysToSubtract = (dayOfWeek + 5) % 7; // Adjust to last Tuesday
  }

  const tuesdayStart = new Date(cetTime);
  tuesdayStart.setDate(cetTime.getDate() - daysToSubtract);
  tuesdayStart.setHours(18, 0, 0, 0); // Set to 6 PM CET
  const tuesdayStartUTC = new Date(tuesdayStart.getTime() - cetOffset);

  const nextTuesdayEnd = new Date(tuesdayStartUTC);
  nextTuesdayEnd.setDate(tuesdayStartUTC.getDate() + 7);
  nextTuesdayEnd.setHours(16, 59, 59, 999); // Set to 5:59:59.999 PM UTC (6 PM CET)

  return { start: tuesdayStartUTC, end: nextTuesdayEnd };
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

document.addEventListener('DOMContentLoaded', function() {
  const list = document.getElementById('activitiesList');
  const week = getWeekRange();
  const startDate = formatDate(week.start);
  const endDate = formatDate(week.end);

  console.log(`Filtering for current week from ${startDate} to ${endDate}`);

  const sheetUrl = 'https://sheets.googleapis.com/v4/spreadsheets/1A4Tyg_hfhbcr1iHAyvmKxRhUfWdTZ4Z299rCbskGowc/values/Activities?key=AIzaSyDS6MGS3L13Uc9KoGU6RmG4AjqOE3rNaxs';

  fetch(sheetUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('API Response:', data);
      if (!data.values || data.values.length === 0) {
        list.innerHTML = '<li>No data found in the sheet.</li>';
        return;
      }

      const rows = data.values;
      const headers = rows[0]; // 25 columns
      const activities = rows.slice(1);

      // Current date in CET for comparison
      const now = new Date();
      const cetOffset = 1 * 60 * 60 * 1000;
      const currentCET = new Date(now.getTime() + cetOffset - now.getTimezoneOffset() * 60 * 1000);
      const currentUTC = new Date(currentCET.getTime() - cetOffset);

      const thisWeek = activities.filter(row => {
        const fromDate = new Date(row[1] + 'T17:00:00Z'); // From date at 6 PM CET (17:00 UTC)
        const nextTuesday = new Date(fromDate);
        nextTuesday.setDate(fromDate.getDate() + 7);
        nextTuesday.setHours(16, 59, 59, 999); // Next Tuesday 5:59 PM UTC (6 PM CET)

        return currentUTC >= fromDate && currentUTC <= nextTuesday;
      });

      if (thisWeek.length === 0) {
        list.innerHTML = '<li>No activities this week.</li>';
      } else {
        thisWeek.forEach(row => {
          const li = document.createElement('li');
          li.className = 'week-entry';

          // Week and From
          const weekInfo = document.createElement('div');
          weekInfo.className = 'week-info';
          weekInfo.innerHTML = `<span class="label">${headers[0]}</span>: ${row[0]} | <span class="label">${headers[1]}</span> ${row[1]}`;
          li.appendChild(weekInfo);

          // Nightfall
          if (row[2]) {
            const nightfallHeader = document.createElement('h3');
            nightfallHeader.textContent = headers[2];
            li.appendChild(nightfallHeader);

            const nightfallRow = document.createElement('div');
            nightfallRow.className = 'activity-row';
            nightfallRow.innerHTML = `
              <span class="activity-name">${row[2]}</span>
              ${row[3] && row[3] !== '-' ? `<span class="reward"><span class="reward-label">Reward: </span>${row[4] && row[4] !== '-' && row[4].trim() !== '' ? `<a href="${row[4]}" target="_blank">${row[3]}</a>` : row[3]}</span>` : ''}
            `;
            li.appendChild(nightfallRow);
          }

          // Exotic Quest
          if (row[5]) {
            const questHeader = document.createElement('h3');
            questHeader.textContent = headers[5];
            li.appendChild(questHeader);

            const questRow = document.createElement('div');
            questRow.className = 'activity-row';
            questRow.innerHTML = `
              <span class="activity-name">${row[5]}</span>
              ${row[6] && row[6] !== '-' ? `<span class="reward"><span class="reward-label">Reward: </span>${row[7] && row[7] !== '-' && row[7].trim() !== '' ? `<a href="${row[7]}" target="_blank">${row[6]}</a>` : row[6]}</span>` : ''}
            `;
            li.appendChild(questRow);
          }

          // Featured Raids
          if (row[8] || row[11]) {
            const raidsHeader = document.createElement('h3');
            raidsHeader.textContent = 'Featured Raids';
            li.appendChild(raidsHeader);

            if (row[8]) {
              const raid1Row = document.createElement('div');
              raid1Row.className = 'activity-row';
              raid1Row.innerHTML = `
                <span class="activity-name">${row[8]}</span>
                ${row[9] && row[9] !== '-' ? `<span class="reward">${row[10] && row[10] !== '-' && row[10].trim() !== '' ? `<a href="${row[10]}" target="_blank">${row[9]}</a>` : row[9]}</span>` : ''}
              `;
              li.appendChild(raid1Row);
            }

            if (row[11]) {
              const raid2Row = document.createElement('div');
              raid2Row.className = 'activity-row';
              raid2Row.innerHTML = `
                <span class="activity-name">${row[11]}</span>
                ${row[12] && row[12] !== '-' ? `<span class="reward">${row[13] && row[13] !== '-' && row[13].trim() !== '' ? `<a href="${row[13]}" target="_blank">${row[12]}</a>` : row[12]}</span>` : ''}
              `;
              li.appendChild(raid2Row);
            }
          }

          // Featured Dungeons
          if (row[14] || row[17]) {
            const dungeonsHeader = document.createElement('h3');
            dungeonsHeader.textContent = 'Featured Dungeons';
            li.appendChild(dungeonsHeader);

            if (row[14]) {
              const dungeon1Row = document.createElement('div');
              dungeon1Row.className = 'activity-row';
              dungeon1Row.innerHTML = `
                <span class="activity-name">${row[14]}</span>
                ${row[15] && row[15] !== '-' ? `<span class="reward">${row[16] && row[16] !== '-' && row[16].trim() !== '' ? `<a href="${row[16]}" target="_blank">${row[15]}</a>` : row[15]}</span>` : ''}
              `;
              li.appendChild(dungeon1Row);
            }

            if (row[17]) {
              const dungeon2Row = document.createElement('div');
              dungeon2Row.className = 'activity-row';
              dungeon2Row.innerHTML = `
                <span class="activity-name">${row[17]}</span>
                ${row[18] && row[18] !== '-' ? `<span class="reward">${row[19] && row[19] !== '-' && row[19].trim() !== '' ? `<a href="${row[19]}" target="_blank">${row[18]}</a>` : row[18]}</span>` : ''}
              `;
              li.appendChild(dungeon2Row);
            }
          }

          // Other Activities (Dares of Eternity Weapons, Ascendant Challenge, Weekly Bonus, Vex Incursion Zone)
          if (row[20] || row[22] || row[24] || row[25]) {
            const otherHeader = document.createElement('h3');
            otherHeader.textContent = 'Other Activities';
            li.appendChild(otherHeader);

            // Dares of Eternity Weapons
            if (row[20]) {
              const daresRow = document.createElement('div');
              daresRow.className = 'activity-row';
              daresRow.innerHTML = `
                <span class="activity-name">${headers[20]}</span>
                ${row[20] && row[20] !== '-' ? `<span class="reward"><span class="reward-label">Reward: </span>${row[21] && row[21] !== '-' && row[21].trim() !== '' ? `<a href="${row[21]}" target="_blank">${row[20]}</a>` : row[20]}</span>` : ''}
              `;
              li.appendChild(daresRow);
            }

            // Ascendant Challenge
            if (row[22]) {
              const ascendantRow = document.createElement('div');
              ascendantRow.className = 'activity-row';
              ascendantRow.innerHTML = `
                <span class="activity-name">${headers[22]}</span>
                <span class="reward">${row[22]}</span>
              `;
              li.appendChild(ascendantRow);
            }

            // Weekly Bonus
            if (row[24]) {
              const bonusRow = document.createElement('div');
              bonusRow.className = 'activity-row';
              bonusRow.innerHTML = `
                <span class="activity-name">${headers[24]}</span>
                <span class="reward">${row[24]}</span>
              `;
              li.appendChild(bonusRow);
            }

            // Vex Incursion Zone
            if (row[25]) {
              const vexRow = document.createElement('div');
              vexRow.className = 'activity-row';
              vexRow.innerHTML = `
                <span class="activity-name">${headers[25]}</span>
                <span class="reward">${row[25]}</span>
              `;
              li.appendChild(vexRow);
            }
          }

          // Standalone activity (Event)
          const standalone = [
            { header: headers[23], value: row[23] } // Event
          ];

          standalone.forEach(item => {
            if (item.value) {
              const standaloneDiv = document.createElement('div');
              standaloneDiv.className = 'standalone';
              standaloneDiv.innerHTML = `<span class="label">${item.header}</span>: ${item.value}`;
              li.appendChild(standaloneDiv);
            }
          });

          list.appendChild(li);
        });
      }
    })
    .catch(error => {
      list.innerHTML = '<li>No data found in the sheet.</li>';
      console.error('Fetch Error:', error);
    });
});