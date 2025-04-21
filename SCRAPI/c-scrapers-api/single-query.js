const axios = require('axios');
require('dotenv').config();

const username = process.env.OXYLABS_USERNAME;
const password = process.env.OXYLABS_PASSWORD;

async function singleQuery() {
  const payload = {
    source: 'universal',
    url: 'https://example.com',
    render: 'html',
    parse: true
  };

  try {
    const response = await axios.post('https://realtime.oxylabs.io/v1/queries', payload, {
      auth: {
        username,
        password
      },
      timeout: 300000 // 5 minutes timeout
    });

    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

singleQuery();