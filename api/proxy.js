const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const { api, url } = req.query;
  if (!url || !api) {
    return res.status(400).json({ error: 'Missing API or URL' });
  }

  try {
    const response = await fetch(decodeURIComponent(url));
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error(`Proxy error for ${api}:`, error.message);
    res.status(500).json({ error: `Failed to fetch from ${api}: ${error.message}` });
  }
};