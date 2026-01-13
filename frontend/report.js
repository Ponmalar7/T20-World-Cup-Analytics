(async function(){
  const params = new URLSearchParams(window.location.search);
  const team = params.get('team');
  const start = params.get('start');
  const end = params.get('end');
  const q = new URLSearchParams();
  if (team) q.set('team', team);
  if (start) q.set('start', start);
  if (end) q.set('end', end);
  const resp = await fetch('/api/summary?' + q.toString());
  const s = await resp.json();
  document.getElementById('summary').innerHTML = `\n    <h2 class=\"small\">Total matches: ${s.total_matches}</h2>\n    <p class=\"small\">Total runs: ${s.total_runs}</p>\n  `;
  const teamsEl = document.getElementById('teams');
  const teams = s.teams || {};
  const wrapper = document.createElement('div');
  wrapper.className = 'table';
  Object.keys(teams).sort().forEach(t=>{
    const r = document.createElement('div'); r.className='row';
    r.innerHTML = `<div><strong>${t}</strong><div class=\"small\">matches: ${teams[t].matches}</div></div><div><div class=\"small\">wins: ${teams[t].wins}</div><div class=\"small\">runs: ${teams[t].runs}</div></div>`;
    wrapper.appendChild(r);
  });
  teamsEl.appendChild(wrapper);
})();
