const axios = require('axios');

function predictDemandLinearRegression(serviceType, counts) {
  const n = counts.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += counts[i];
    sumXY += i * counts[i];
    sumXX += i * i;
  }
  const denominator = n * sumXX - sumX * sumX;
  const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
  const intercept = (sumY - slope * sumX) / n;
  const predicted = Math.max(0, Math.round(slope * n + intercept));
  return {
    service_type: serviceType,
    predicted_demand_tomorrow: predicted,
    trend_slope: Number(slope.toFixed(2))
  };
}

exports.getDemandForecast = async (req, res) => {
  const { serviceType, historicalCounts } = req.body || {};
  if (!serviceType || !Array.isArray(historicalCounts) || historicalCounts.length < 3 || historicalCounts.some(n => !Number.isFinite(Number(n)) || Number(n) < 0)) {
    return res.status(400).json({ error: 'serviceType and at least 3 non-negative historical demand values are required.' });
  }

  const aiUrl = process.env.AI_SERVICE_URL;
  if (aiUrl) {
    try {
      const aiResponse = await axios.post(`${aiUrl.replace(/\/$/, '')}/predict-demand`, { service_type: serviceType, historical_daily_counts: historicalCounts.map(Number) }, { timeout: 4000 });
      return res.json({ success: true, data: aiResponse.data, timestamp: new Date().toISOString() });
    } catch (err) {
      console.warn('External AI service unavailable, falling back to built-in predictive linear regression:', err.message);
    }
  }

  const prediction = predictDemandLinearRegression(serviceType, historicalCounts.map(Number));
  res.json({ success: true, data: prediction, timestamp: new Date().toISOString() });
};
