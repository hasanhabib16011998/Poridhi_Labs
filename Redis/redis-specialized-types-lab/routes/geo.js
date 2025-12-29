const express = require('express');
const router = express.Router();
const redis = require('../redis');

// Add location
router.post('/locations/:category', async (req, res) => {
  try {
    const category = req.params.category;
    const { name, longitude, latitude } = req.body;

    if (!name || longitude === undefined || latitude === undefined) {
      return res.status(400).json({ 
        error: 'name, longitude, and latitude required' 
      });
    }

    // Validate coordinates
    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({ 
        error: 'longitude must be between -180 and 180' 
      });
    }

    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({ 
        error: 'latitude must be between -90 and 90' 
      });
    }

    const geoKey = `locations:${category}`;

    // Add location with coordinates
    // Note: GEOADD takes longitude first, then latitude
    await redis.geoadd(geoKey, longitude, latitude, name);

    res.status(201).json({
      message: 'Location added',
      category,
      name,
      coordinates: {
        longitude,
        latitude
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get location coordinates
router.get('/locations/:category/:name', async (req, res) => {
  try {
    const category = req.params.category;
    const name = req.params.name;

    const geoKey = `locations:${category}`;

    // Get coordinates for location
    const result = await redis.geopos(geoKey, name);

    if (!result[0]) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const [longitude, latitude] = result[0];

    res.json({
      category,
      name,
      coordinates: {
        longitude: parseFloat(longitude),
        latitude: parseFloat(latitude)
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Calculate distance between two locations
router.get('/distance/:category/:name1/:name2', async (req, res) => {
  try {
    const category = req.params.category;
    const name1 = req.params.name1;
    const name2 = req.params.name2;
    const unit = req.query.unit || 'km'; // m, km, mi, ft

    const geoKey = `locations:${category}`;

    // Calculate distance
    const distance = await redis.geodist(geoKey, name1, name2, unit);

    if (distance === null) {
      return res.status(404).json({ 
        error: 'One or both locations not found' 
      });
    }

    res.json({
      category,
      from: name1,
      to: name2,
      distance: parseFloat(distance),
      unit
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Find locations within radius of coordinates
router.get('/nearby/:category', async (req, res) => {
  try {
    const category = req.params.category;
    const { longitude, latitude, radius, unit } = req.query;

    if (!longitude || !latitude || !radius) {
      return res.status(400).json({ 
        error: 'longitude, latitude, and radius query parameters required' 
      });
    }

    const geoKey = `locations:${category}`;
    const searchUnit = unit || 'km';

    // Find locations within radius
    // WITHDIST returns distances, WITHCOORD returns coordinates
    const results = await redis.georadius(
      geoKey,
      parseFloat(longitude),
      parseFloat(latitude),
      parseFloat(radius),
      searchUnit,
      'WITHDIST',
      'WITHCOORD',
      'ASC' // Sort by distance ascending
    );

    // Format results
    const locations = results.map(result => ({
      name: result[0],
      distance: parseFloat(result[1]),
      coordinates: {
        longitude: parseFloat(result[2][0]),
        latitude: parseFloat(result[2][1])
      }
    }));

    res.json({
      category,
      searchCenter: {
        longitude: parseFloat(longitude),
        latitude: parseFloat(latitude)
      },
      radius: parseFloat(radius),
      unit: searchUnit,
      locations,
      count: locations.length
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Find locations within radius of another location
router.get('/nearby/:category/:name', async (req, res) => {
  try {
    const category = req.params.category;
    const name = req.params.name;
    const { radius, unit, count } = req.query;

    if (!radius) {
      return res.status(400).json({ 
        error: 'radius query parameter required' 
      });
    }

    const geoKey = `locations:${category}`;
    const searchUnit = unit || 'km';
    const maxCount = count ? parseInt(count) : undefined;

    // Find locations within radius of a member
    const args = [
      geoKey,
      name,
      parseFloat(radius),
      searchUnit,
      'WITHDIST',
      'WITHCOORD',
      'ASC'
    ];

    if (maxCount) {
      args.push('COUNT', maxCount);
    }

    const results = await redis.georadiusbymember(...args);

    const locations = results.map(result => ({
      name: result[0],
      distance: parseFloat(result[1]),
      coordinates: {
        longitude: parseFloat(result[2][0]),
        latitude: parseFloat(result[2][1])
      }
    }));

    res.json({
      category,
      centerLocation: name,
      radius: parseFloat(radius),
      unit: searchUnit,
      locations,
      count: locations.length
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove location
router.delete('/locations/:category/:name', async (req, res) => {
  try {
    const category = req.params.category;
    const name = req.params.name;

    const geoKey = `locations:${category}`;

    // Geo data is stored as Sorted Set, use ZREM
    const removed = await redis.zrem(geoKey, name);

    if (!removed) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json({
      message: 'Location removed',
      category,
      name
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all locations in category
router.get('/locations/:category', async (req, res) => {
  try {
    const category = req.params.category;
    const geoKey = `locations:${category}`;

    // Get all members (Geo is a Sorted Set)
    const names = await redis.zrange(geoKey, 0, -1);

    if (names.length === 0) {
      return res.json({
        category,
        locations: [],
        count: 0
      });
    }

    // Get coordinates for all locations
    const coordinates = await redis.geopos(geoKey, ...names);

    const locations = names.map((name, index) => ({
      name,
      coordinates: coordinates[index] ? {
        longitude: parseFloat(coordinates[index][0]),
        latitude: parseFloat(coordinates[index][1])
      } : null
    }));

    res.json({
      category,
      locations,
      count: locations.length
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk add locations (for testing)
router.post('/locations/:category/bulk', async (req, res) => {
  try {
    const category = req.params.category;
    const { locations } = req.body;

    if (!Array.isArray(locations)) {
      return res.status(400).json({ error: 'locations array required' });
    }

    const geoKey = `locations:${category}`;

    // Prepare arguments for GEOADD
    const args = [geoKey];
    for (const loc of locations) {
      args.push(loc.longitude, loc.latitude, loc.name);
    }

    const added = await redis.geoadd(...args);

    res.json({
      message: 'Locations added',
      category,
      added
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Geofencing: Check if location is within area
router.post('/geofence/check', async (req, res) => {
  try {
    const { 
      longitude, 
      latitude, 
      fenceLongitude, 
      fenceLatitude, 
      radius, 
      unit 
    } = req.body;

    if (!longitude || !latitude || !fenceLongitude || !fenceLatitude || !radius) {
      return res.status(400).json({ 
        error: 'longitude, latitude, fenceLongitude, fenceLatitude, and radius required' 
      });
    }

    const geoKey = 'geofence:temp';
    const fenceUnit = unit || 'km';

    // Add fence center temporarily
    await redis.geoadd(geoKey, fenceLongitude, fenceLatitude, 'fence_center');

    // Add location to check
    await redis.geoadd(geoKey, longitude, latitude, 'check_point');

    // Calculate distance
    const distance = await redis.geodist(geoKey, 'fence_center', 'check_point', fenceUnit);

    // Clean up
    await redis.del(geoKey);

    const inside = parseFloat(distance) <= parseFloat(radius);

    res.json({
      checkPoint: { longitude, latitude },
      fenceCenter: { longitude: fenceLongitude, latitude: fenceLatitude },
      radius: parseFloat(radius),
      unit: fenceUnit,
      distance: parseFloat(distance),
      inside
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
