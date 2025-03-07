function getWeekRange() {
  const now = new Date();
  const cetOffset = 1 * 60 * 60 * 1000;
  const cetTime = new Date(now.getTime() + cetOffset - now.getTimezoneOffset() * 60 * 1000);

  const dayOfWeek = cetTime.getDay();
  const hours = cetTime.getHours();
  const minutes = cetTime.getMinutes();

  let daysToSubtract;
  if (dayOfWeek === 2 && (hours < 18 || (hours === 18 && minutes === 0))) {
    daysToSubtract = 7;
  } else {
    daysToSubtract = (dayOfWeek + 5) % 7;
  }

  const tuesdayStart = new Date(cetTime);
  tuesdayStart.setDate(cetTime.getDate() - daysToSubtract);
  tuesdayStart.setHours(18, 0, 0, 0);
  const tuesdayStartUTC = new Date(tuesdayStart.getTime() - cetOffset);

  const nextTuesdayEnd = new Date(tuesdayStartUTC);
  nextTuesdayEnd.setDate(tuesdayStartUTC.getDate() + 7);
  nextTuesdayEnd.setHours(16, 59, 59, 999);

  return { start: tuesdayStartUTC, end: nextTuesdayEnd };
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

document.addEventListener('DOMContentLoaded', function() {
  const list = document.getElementById('activitiesList');
  const weekInfoDiv = document.getElementById('weekInfo');
  const week = getWeekRange();
  const startDate = formatDate(week.start);
  const endDate = formatDate(week.end);

  console.log(`Filtering for current week from ${startDate} to ${endDate}`);

  const sheetUrl = 'https://sheets.googleapis.com/v4/spreadsheets/1A4Tyg_hfhbcr1iHAyvmKxRhUfWdTZ4Z299rCbskGowc/values/Activities_Beta?key=AIzaSyDS6MGS3L13Uc9KoGU6RmG4AjqOE3rNaxs';

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
      const headers = rows[0]; // 27 columns
      const activities = rows.slice(1);

      const now = new Date();
      const cetOffset = 1 * 60 * 60 * 1000;
      const currentCET = new Date(now.getTime() + cetOffset - now.getTimezoneOffset() * 60 * 1000);
      const currentUTC = new Date(currentCET.getTime() - cetOffset);

      const thisWeek = activities.filter(row => {
        const fromDate = new Date(row[1] + 'T17:00:00Z');
        const nextTuesday = new Date(fromDate);
        nextTuesday.setDate(fromDate.getDate() + 7);
        nextTuesday.setHours(16, 59, 59, 999);
        return currentUTC >= fromDate && currentUTC <= nextTuesday;
      });

      if (thisWeek.length === 0) {
        list.innerHTML = '<li>No activities this week.</li>';
      } else {
        thisWeek.forEach(row => {
          const li = document.createElement('li');
          li.className = 'week-entry';

          weekInfoDiv.innerHTML = `<span class="label">${headers[0]}</span>: ${row[0]} | <span class="label">${headers[1]}</span> ${row[1]}`;

          // Event (Full-Width, Standalone)
          if (row[2]) {
            const eventDiv = document.createElement('div');
            eventDiv.className = 'standalone';
            eventDiv.innerHTML = `<span class="label">${headers[2]}</span>: ${row[2]}`;
            li.appendChild(eventDiv);
          }

          // Weekly Bonus (Full-Width, Standalone)
          if (row[3]) {
            const bonusDiv = document.createElement('div');
            bonusDiv.className = 'standalone';
            bonusDiv.innerHTML = `<span class="label">${headers[3]}</span>: ${row[3]}`;
            li.appendChild(bonusDiv);
          }

          // Trials of Osiris (Full-Width, Individual Header)
          if (row[4]) {
            const trialsDiv = document.createElement('div');
            trialsDiv.className = 'full-width';
            const trialsHeader = document.createElement('h3');
            trialsHeader.textContent = 'TRIALS OF OSIRIS IS LIVE 🔴';
            trialsDiv.appendChild(trialsHeader);

            const trialsRow = document.createElement('div');
            trialsRow.className = 'trials-row';
            trialsRow.innerHTML = `
              <img src="icons/trials.png" alt="Trials" class="activity-icon">
              <div class="activity-content">
                <span class="activity-name">Map: ${row[4]}</span>
                ${row[5] && row[5] !== '-' ? `<span class="reward"><span class="reward-label">Reward: </span>${row[6] && row[6] !== '-' && row[6].trim() !== '' ? `<a href="${row[6]}" target="_blank">${row[5]}</a>` : row[5]}</span>` : ''}
              </div>
            `;
            trialsDiv.appendChild(trialsRow);
            li.appendChild(trialsDiv);
          }

          // Two Columns Container
          const columnsDiv = document.createElement('div');
          columnsDiv.className = 'columns';

          // Column 1
          const col1 = document.createElement('div');

          // Nightfall (Column 1, Individual Header)
          if (row[7]) {
            const nightfallHeader = document.createElement('h3');
            nightfallHeader.textContent = 'NIGHTFALL';
            col1.appendChild(nightfallHeader);

            const nightfallDiv = document.createElement('div');
            nightfallDiv.className = 'activity';
            nightfallDiv.innerHTML = `
              <img src="icons/nightfall.png" alt="Nightfall" class="activity-icon">
              <div class="activity-content">
                <span class="activity-name">${row[7]}</span>
                ${row[8] && row[8] !== '-' ? `<span class="reward"><span class="reward-label">Reward: </span>${row[9] && row[9] !== '-' && row[9].trim() !== '' ? `<a href="${row[9]}" target="_blank">${row[8]}</a>` : row[8]}</span>` : ''}
              </div>
            `;
            col1.appendChild(nightfallDiv);
          }

          // Column 2
          const col2 = document.createElement('div');

          // Exotic Mission (Column 2, Individual Header)
          if (row[10]) {
            const exoticHeader = document.createElement('h3');
            exoticHeader.textContent = 'EXOTIC MISSION';
            col2.appendChild(exoticHeader);

            const exoticDiv = document.createElement('div');
            exoticDiv.className = 'activity';
            exoticDiv.innerHTML = `
              <img src="icons/exotic.png" alt="Exotic Mission" class="activity-icon">
              <div class="activity-content">
                <span class="activity-name">${row[10]}</span>
                ${row[11] && row[11] !== '-' ? `<span class="reward"><span class="reward-label">Reward: </span>${row[12] && row[12] !== '-' && row[12].trim() !== '' ? `<a href="${row[12]}" target="_blank">${row[11]}</a>` : row[11]}</span>` : ''}
              </div>
            `;
            col2.appendChild(exoticDiv);
          }

          columnsDiv.appendChild(col1);
          columnsDiv.appendChild(col2);
          li.appendChild(columnsDiv);

          // Featured Raids (Full-Width, Merged Header)
          if (row[13] || row[16]) {
            const raidsHeader = document.createElement('h3');
            raidsHeader.className = 'merged-header';
            raidsHeader.textContent = 'FEATURED RAIDS';
            li.appendChild(raidsHeader);

            const raidsColumnsDiv = document.createElement('div');
            raidsColumnsDiv.className = 'columns';

            // Raid 1 (Column 1)
            if (row[13]) {
              const raid1Div = document.createElement('div');
              raid1Div.className = 'activity';
              raid1Div.innerHTML = `
                <img src="icons/raid.png" alt="Raid" class="activity-icon">
                <div class="activity-content">
                  <span class="activity-name">${row[13]}</span>
                  ${row[14] && row[14] !== '-' ? `<span class="reward"><span class="reward-label">Reward: </span>${row[15] && row[15] !== '-' && row[15].trim() !== '' ? `<a href="${row[15]}" target="_blank">${row[14]}</a>` : row[14]}</span>` : ''}
                </div>
              `;
              raidsColumnsDiv.appendChild(raid1Div);
            }

            // Raid 2 (Column 2)
            if (row[16]) {
              const raid2Div = document.createElement('div');
              raid2Div.className = 'activity';
              raid2Div.innerHTML = `
                <img src="icons/raid.png" alt="Raid" class="activity-icon">
                <div class="activity-content">
                  <span class="activity-name">${row[16]}</span>
                  ${row[17] && row[17] !== '-' ? `<span class="reward"><span class="reward-label">Reward: </span>${row[18] && row[18] !== '-' && row[18].trim() !== '' ? `<a href="${row[18]}" target="_blank">${row[17]}</a>` : row[17]}</span>` : ''}
                </div>
              `;
              raidsColumnsDiv.appendChild(raid2Div);
            }

            li.appendChild(raidsColumnsDiv);
          }

          // Featured Dungeons (Full-Width, Merged Header)
          if (row[19] || row[22]) {
            const dungeonsHeader = document.createElement('h3');
            dungeonsHeader.className = 'merged-header';
            dungeonsHeader.textContent = 'FEATURED DUNGEONS';
            li.appendChild(dungeonsHeader);

            const dungeonsColumnsDiv = document.createElement('div');
            dungeonsColumnsDiv.className = 'columns';

            // Dungeon 1 (Column 1)
            if (row[19]) {
              const dungeon1Div = document.createElement('div');
              dungeon1Div.className = 'activity';
              dungeon1Div.innerHTML = `
                <img src="icons/dungeon.png" alt="Dungeon" class="activity-icon">
                <div class="activity-content">
                  <span class="activity-name">${row[19]}</span>
                  ${row[20] && row[20] !== '-' ? `<span class="reward"><span class="reward-label">Reward: </span>${row[21] && row[21] !== '-' && row[21].trim() !== '' ? `<a href="${row[21]}" target="_blank">${row[20]}</a>` : row[20]}</span>` : ''}
                </div>
              `;
              dungeonsColumnsDiv.appendChild(dungeon1Div);
            }

            // Dungeon 2 (Column 2)
            if (row[22]) {
              const dungeon2Div = document.createElement('div');
              dungeon2Div.className = 'activity';
              dungeon2Div.innerHTML = `
                <img src="icons/dungeon.png" alt="Dungeon" class="activity-icon">
                <div class="activity-content">
                  <span class="activity-name">${row[22]}</span>
                  ${row[23] && row[23] !== '-' ? `<span class="reward"><span class="reward-label">Reward: </span>${row[24] && row[24] !== '-' && row[24].trim() !== '' ? `<a href="${row[24]}" target="_blank">${row[23]}</a>` : row[23]}</span>` : ''}
                </div>
              `;
              dungeonsColumnsDiv.appendChild(dungeon2Div);
            }

            li.appendChild(dungeonsColumnsDiv);
          }

          // Other Activities (Full-Width, Merged Header)
          if (row[25] || row[27]) {
            const otherHeader = document.createElement('h3');
            otherHeader.className = 'merged-header';
            otherHeader.textContent = 'OTHER ACTIVITIES';
            li.appendChild(otherHeader);

            const otherColumnsDiv = document.createElement('div');
            otherColumnsDiv.className = 'columns';

            // Dares of Eternity (Column 1)
            if (row[25]) {
              const daresDiv = document.createElement('div');
              daresDiv.className = 'activity';
              daresDiv.innerHTML = `
                <div class="activity-content">
                  <span class="activity-name">${headers[25]}</span>
                  ${row[25] && row[25] !== '-' ? `<span class="reward"><span class="reward-label">Rewards: </span>${row[26] && row[26] !== '-' && row[26].trim() !== '' ? `<a href="${row[26]}" target="_blank">Rotation #1</a>` : 'Rotation #1'}</span>` : ''}
                </div>
              `;
              otherColumnsDiv.appendChild(daresDiv);
            }

            // Ascendant Challenge (Column 2)
            if (row[27]) {
              const ascendantDiv = document.createElement('div');
              ascendantDiv.className = 'activity';
              ascendantDiv.innerHTML = `
                <div class="activity-content">
                  <span class="activity-name">${headers[27]}</span>
                  <span class="reward">${row[27]}</span>
                </div>
              `;
              otherColumnsDiv.appendChild(ascendantDiv);
            }

            li.appendChild(otherColumnsDiv);
          }

          // Vex Incursion Zone (Full-Width, Standalone)
          if (row[28]) {
            const vexDiv = document.createElement('div');
            vexDiv.className = 'standalone';
            vexDiv.innerHTML = `<span class="label">${headers[28]}</span> ${row[28]}`;
            li.appendChild(vexDiv);
          }

          list.appendChild(li);
        });
      }
    })
    .catch(error => {
      list.innerHTML = '<li>No data found in the sheet.</li>';
      console.error('Fetch Error:', error);
    });
});
