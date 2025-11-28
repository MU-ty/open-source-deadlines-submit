export default function handler(req, res) {
  res.status(200).json({
    name: 'Activity Submission Bot',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /api/health',
      submit: 'POST /api/submit',
      stats: 'GET /api/stats',
    },
  });
}
