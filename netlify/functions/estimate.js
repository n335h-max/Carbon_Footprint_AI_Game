// Netlify Serverless Function
exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { activity } = JSON.parse(event.body);

    if (!activity) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Activity is required' })
      };
    }

    const prompt = `You are an expert carbon footprint calculator.
Estimate the CO₂-equivalent emissions (kg CO₂e) for the following activity:
"${activity}"

Rules:
- Output ONLY a number (float or integer)
- No units, no text, no explanation.
- If activity is unclear, estimate using best guess.
- If impossible, output "-1".`;

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.URL || 'https://localhost:8888',
        'X-Title': 'Carbon Footprint Game'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini', // Cheapest option!
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 50
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('OpenRouter error:', data.error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to estimate carbon footprint' })
      };
    }

    const text = data.choices[0].message.content.trim();
    const value = parseFloat(text);

    if (isNaN(value)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid estimation result' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ value })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server error', details: error.message })
    };
  }
};
