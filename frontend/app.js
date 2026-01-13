async function fetchSummary(filters={}) {
  const params = new URLSearchParams();
  if (filters.team) params.set('team', filters.team);
  if (filters.start) params.set('start', filters.start);
  if (filters.end) params.set('end', filters.end);
  const resp = await fetch('/api/summary?' + params.toString());
  return resp.json();
}

function drawBar(ctx, labels, values, label) {
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label,
        data: values,
        backgroundColor: 'rgba(54, 162, 235, 0.6)'
      }]
    },
    options: {responsive: true}
  });
}

async function updateAll(filters={}){
  const summaryEl = document.getElementById('summary');
  const backendMsg = document.getElementById('backendMessage');
  // show spinner
  summaryEl.innerHTML = '<div class="spinner" style="margin:6px 0"></div> Loading...';
  try{
    const s = await fetchSummary(filters);
    document.getElementById('summary').textContent = JSON.stringify(s, null, 2);

  const teams = Object.keys(s.teams || {});
  const wins = teams.map(t => s.teams[t].wins);
  const runs = teams.map(t => s.teams[t].runs);

  // clear canvases by replacing elements so Chart.js doesn't reuse old instances
  const winsCanvas = document.getElementById('winsChart');
  const runsCanvas = document.getElementById('runsChart');
  winsCanvas.parentNode.replaceChild(winsCanvas.cloneNode(true), winsCanvas);
  runsCanvas.parentNode.replaceChild(runsCanvas.cloneNode(true), runsCanvas);

  drawBar(document.getElementById('winsChart').getContext('2d'), teams, wins, 'Wins');
  drawBar(document.getElementById('runsChart').getContext('2d'), teams, runs, 'Runs');
  }catch(err){
    summaryEl.textContent = 'Failed to load summary';
    console.error(err);
    if (backendMsg) backendMsg.textContent = 'Backend error';
  }
}

async function pingBackend(){
  const statusDot = document.getElementById('backendStatus');
  const backendMsg = document.getElementById('backendMessage');
  try{
    const r = await fetch('/api/summary');
    if (r.ok){
      if (statusDot){ statusDot.className = 'status-dot ok'; }
      if (backendMsg) backendMsg.textContent = 'Backend OK';
      return true;
    }
  }catch(e){
    if (statusDot){ statusDot.className = 'status-dot fail'; }
    if (backendMsg) backendMsg.textContent = 'Backend unreachable';
    return false;
  }
}

async function uploadCsv(file, confirm=false){
  const form = new FormData();
  form.append('file', file);
  if (confirm) form.append('confirm', '1');
  const resp = await fetch('/api/upload', {method:'POST', body: form});
  return resp.json();
}

function readFilters(){
  return {
    team: document.getElementById('filterTeam').value || undefined,
    start: document.getElementById('filterStart').value || undefined,
    end: document.getElementById('filterEnd').value || undefined
  };
}

document.addEventListener('DOMContentLoaded', () => {
  // initial load
  await pingBackend();
  updateAll();

  document.getElementById('applyFilters').addEventListener('click', () => {
    const f = readFilters();
    updateAll(f);
    // open report page in a new tab with black/pink theme
    const qs = new URLSearchParams();
    if (f.team) qs.set('team', f.team);
    if (f.start) qs.set('start', f.start);
    if (f.end) qs.set('end', f.end);
    window.open('report.html?' + qs.toString(), '_blank');
  });

  document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('csvFile');
    const status = document.getElementById('uploadStatus');
    if (!input.files || input.files.length === 0){
      status.textContent = 'Select a file first.'; return;
    }
    status.textContent = 'Uploading for preview...';
    try{
      const res = await uploadCsv(input.files[0], false);
      // clear previous confirm button if any
      const existing = document.getElementById('confirmUpload');
      if (existing) existing.remove();
      if (res.errors && res.errors.length){
        status.textContent = `Validation errors (${res.errors.length}) — see console for details`;
        console.error('Upload errors preview:', res.errors);
        // show a short snippet
        const errList = document.createElement('pre');
        errList.textContent = JSON.stringify(res.errors.slice(0,10), null, 2);
        status.innerHTML = '';
        status.appendChild(errList);
        return;
      }
      // show preview and confirm button
      status.textContent = `Preview OK — ${res.rows} rows. Click Confirm to commit.`;
      const pre = document.createElement('pre');
      pre.textContent = JSON.stringify(res.preview || [], null, 2);
      status.appendChild(pre);
      const btn = document.createElement('button');
      btn.id = 'confirmUpload';
      btn.textContent = 'Confirm Upload';
      btn.addEventListener('click', async () => {
        status.textContent = 'Committing upload...';
        try{
          const r2 = await uploadCsv(input.files[0], true);
          if (r2.status === 'ok'){
            status.textContent = `Upload committed — ${r2.rows} rows`;
            updateAll();
            btn.remove();
          } else if (r2.error){
            status.textContent = 'Error: ' + r2.error;
          } else {
            status.textContent = JSON.stringify(r2);
          }
        }catch(err){
          status.textContent = 'Commit failed';
          console.error(err);
        }
      });
      status.appendChild(btn);
    }catch(err){
      status.textContent = 'Upload failed';
      console.error(err);
    }
  });
});
