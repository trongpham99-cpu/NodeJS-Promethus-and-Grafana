const express = require('express');
const client = require('prom-client');

const app = express();
const port = 3000;

// Create a Registry for Prometheus metrics
const register = new client.Registry();

// Define default and custom metrics
client.collectDefaultMetrics({ register });

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 1.5, 2, 5], // Buckets for response time
});

register.registerMetric(httpRequestDurationMicroseconds);

// Middleware to measure request duration
app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path || req.path, status: res.statusCode });
  });
  next();
});

// Sample route
app.get('/', (req, res) => {
  const random = Math.random();
  if (random < 0.5) {
    res.status(200).send('Hello World!');
  } else if (random < 0.75) {
    res.status(400).send('Bad Request');
  } else {
    res.status(500).send('Internal Server Error');
  }
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
