export async function handler(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      name: 'Activity Submission Bot',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: 'GET /api/health',
        submit: 'POST /api/submit',
        stats: 'GET /api/stats',
      },
    }),
  };
}
