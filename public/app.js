const riderForm = document.getElementById('rider-form');
const formStatus = document.getElementById('form-status');

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Request failed');
  }

  return response.json();
}

function renderRows(elementId, rows) {
  document.getElementById(elementId).innerHTML = rows.join('') || '<tr><td colspan="10">No data yet.</td></tr>';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function loadDashboard() {
  const [riders, morningTrips, eveningTrips, subscriptions] = await Promise.all([
    request('/api/riders'),
    request('/api/trips?period=morning'),
    request('/api/trips?period=evening'),
    request('/api/subscriptions')
  ]);

  renderRows(
    'riders-body',
    riders.map(
      (rider) => `<tr>
        <td>${escapeHtml(rider.name)}</td>
        <td>${escapeHtml(rider.type)}</td>
        <td>${escapeHtml(rider.pickupLocation)} (${escapeHtml(rider.pickupType)})</td>
        <td>${escapeHtml(rider.dayDestination)}</td>
        <td>${escapeHtml(rider.morningPickupTime)}</td>
        <td>${escapeHtml(rider.eveningPickupTime)}</td>
        <td>${Number(rider.monthlyFee).toFixed(2)}</td>
      </tr>`
    )
  );

  renderRows(
    'morning-body',
    morningTrips.map(
      (trip) => `<tr><td>${escapeHtml(trip.riderName)}</td><td>${escapeHtml(trip.pickup)}</td><td>${escapeHtml(trip.destination)}</td><td>${escapeHtml(trip.pickupTime)}</td></tr>`
    )
  );

  renderRows(
    'evening-body',
    eveningTrips.map(
      (trip) => `<tr><td>${escapeHtml(trip.riderName)}</td><td>${escapeHtml(trip.pickup)}</td><td>${escapeHtml(trip.destination)}</td><td>${escapeHtml(trip.pickupTime)}</td></tr>`
    )
  );

  renderRows(
    'subscriptions-body',
    subscriptions.map(
      (subscription) => `<tr>
        <td>${escapeHtml(subscription.riderName)}</td>
        <td>${Number(subscription.monthlyFee).toFixed(2)}</td>
        <td>${escapeHtml(subscription.paidMonths.join(', ') || 'None')}</td>
        <td><button type="button" onclick="markPaid(${subscription.riderId})">Mark current month paid</button></td>
      </tr>`
    )
  );
}

async function markPaid(riderId) {
  try {
    await request(`/api/subscriptions/${riderId}/pay`, { method: 'POST', body: JSON.stringify({}) });
    await loadDashboard();
  } catch (error) {
    alert(error.message);
  }
}

window.markPaid = markPaid;

riderForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(riderForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    await request('/api/riders', { method: 'POST', body: JSON.stringify(payload) });
    riderForm.reset();
    formStatus.textContent = 'Rider registered successfully.';
    await loadDashboard();
  } catch (error) {
    formStatus.textContent = error.message;
  }
});

loadDashboard().catch((error) => {
  formStatus.textContent = error.message;
});
