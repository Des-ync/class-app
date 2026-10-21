const express = require('express');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static('public'));

  const riders = [];
  let nextId = 1;

  const requiredFields = [
    'name',
    'type',
    'pickupType',
    'pickupLocation',
    'dayDestination',
    'morningPickupTime',
    'eveningPickupTime',
    'monthlyFee'
  ];

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/riders', (_req, res) => {
    res.json(riders);
  });

  app.post('/api/riders', (req, res) => {
    const missing = requiredFields.filter((field) => req.body[field] === undefined || req.body[field] === '');
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }

    const { type, pickupType, monthlyFee } = req.body;
    if (!['student', 'worker'].includes(type)) {
      return res.status(400).json({ error: 'type must be student or worker' });
    }

    if (!['stop', 'home'].includes(pickupType)) {
      return res.status(400).json({ error: 'pickupType must be stop or home' });
    }

    if (Number.isNaN(Number(monthlyFee)) || Number(monthlyFee) <= 0) {
      return res.status(400).json({ error: 'monthlyFee must be a positive number' });
    }

    const rider = {
      id: nextId++,
      name: req.body.name,
      type,
      pickupType,
      pickupLocation: req.body.pickupLocation,
      dayDestination: req.body.dayDestination,
      morningPickupTime: req.body.morningPickupTime,
      eveningPickupTime: req.body.eveningPickupTime,
      monthlyFee: Number(monthlyFee),
      active: req.body.active !== false,
      paidMonths: []
    };

    riders.push(rider);
    return res.status(201).json(rider);
  });

  app.get('/api/trips', (req, res) => {
    const period = req.query.period;
    if (period && !['morning', 'evening'].includes(period)) {
      return res.status(400).json({ error: 'period must be morning or evening' });
    }

    const activeRiders = riders.filter((rider) => rider.active);
    const makeMorningTrip = (rider) => ({
      riderId: rider.id,
      riderName: rider.name,
      riderType: rider.type,
      period: 'morning',
      pickup: rider.pickupLocation,
      destination: rider.dayDestination,
      pickupTime: rider.morningPickupTime,
      pickupType: rider.pickupType
    });

    const makeEveningTrip = (rider) => ({
      riderId: rider.id,
      riderName: rider.name,
      riderType: rider.type,
      period: 'evening',
      pickup: rider.dayDestination,
      destination: rider.pickupLocation,
      pickupTime: rider.eveningPickupTime,
      dropoffType: rider.pickupType
    });

    const trips = [];
    if (!period || period === 'morning') {
      trips.push(...activeRiders.map(makeMorningTrip));
    }

    if (!period || period === 'evening') {
      trips.push(...activeRiders.map(makeEveningTrip));
    }

    return res.json(trips);
  });

  app.get('/api/subscriptions', (_req, res) => {
    const subscriptions = riders.map((rider) => ({
      riderId: rider.id,
      riderName: rider.name,
      monthlyFee: rider.monthlyFee,
      paidMonths: rider.paidMonths,
      billingModel: 'fixed-monthly'
    }));

    res.json(subscriptions);
  });

  app.post('/api/subscriptions/:riderId/pay', (req, res) => {
    const riderId = Number(req.params.riderId);
    const rider = riders.find((item) => item.id === riderId);

    if (!rider) {
      return res.status(404).json({ error: 'Rider not found' });
    }

    const month = req.body.month || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month must be YYYY-MM' });
    }

    if (!rider.paidMonths.includes(month)) {
      rider.paidMonths.push(month);
    }

    return res.json({
      riderId: rider.id,
      riderName: rider.name,
      month,
      monthlyFee: rider.monthlyFee,
      status: 'paid'
    });
  });

  return app;
}

module.exports = { createApp };
