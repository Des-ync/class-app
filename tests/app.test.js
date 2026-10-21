const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { createApp } = require('../src/app');

async function withServer(run) {
  const app = createApp();
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

test('register rider and create morning/evening trips', async () => {
  await withServer(async (baseUrl) => {
    const riderPayload = {
      name: 'Amina Yusuf',
      type: 'student',
      pickupType: 'home',
      pickupLocation: 'Maple Street 12',
      dayDestination: 'Central High School',
      morningPickupTime: '07:10',
      eveningPickupTime: '16:30',
      monthlyFee: 80
    };

    const createResponse = await fetch(`${baseUrl}/api/riders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(riderPayload)
    });

    assert.equal(createResponse.status, 201);

    const morningResponse = await fetch(`${baseUrl}/api/trips?period=morning`);
    const morningTrips = await morningResponse.json();
    assert.equal(morningTrips.length, 1);
    assert.equal(morningTrips[0].pickup, riderPayload.pickupLocation);
    assert.equal(morningTrips[0].destination, riderPayload.dayDestination);

    const eveningResponse = await fetch(`${baseUrl}/api/trips?period=evening`);
    const eveningTrips = await eveningResponse.json();
    assert.equal(eveningTrips.length, 1);
    assert.equal(eveningTrips[0].pickup, riderPayload.dayDestination);
    assert.equal(eveningTrips[0].destination, riderPayload.pickupLocation);
  });
});

test('subscriptions expose fixed monthly fee and can be paid', async () => {
  await withServer(async (baseUrl) => {
    const createResponse = await fetch(`${baseUrl}/api/riders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Daniel Okafor',
        type: 'worker',
        pickupType: 'stop',
        pickupLocation: 'North Park Stop',
        dayDestination: 'Riverside Office',
        morningPickupTime: '06:45',
        eveningPickupTime: '18:00',
        monthlyFee: 120
      })
    });

    const rider = await createResponse.json();
    const month = '2026-10';

    const payResponse = await fetch(`${baseUrl}/api/subscriptions/${rider.id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month })
    });

    assert.equal(payResponse.status, 200);

    const subscriptionsResponse = await fetch(`${baseUrl}/api/subscriptions`);
    const subscriptions = await subscriptionsResponse.json();

    assert.equal(subscriptions.length, 1);
    assert.equal(subscriptions[0].monthlyFee, 120);
    assert.deepEqual(subscriptions[0].paidMonths, [month]);
    assert.equal(subscriptions[0].billingModel, 'fixed-monthly');
  });
});
