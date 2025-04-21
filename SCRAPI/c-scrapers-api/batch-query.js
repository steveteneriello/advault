const axios = require('axios');
require('dotenv').config();

const username = process.env.OXYLABS_USERNAME;
const password = process.env.OXYLABS_PASSWORD;

async function batchQuery() {
  const payload = {
    queries: [
      {
        source: 'universal',
        url: 'https://example.com/page1',
        render: 'html'
      },
      {
        source: 'universal',
        url: 'https://example.com/page2',
        render: 'html'
      }
    ]
  };

  try {
    const response = await axios.post('https://realtime.oxylabs.io/v1/queries/batch', payload, {
      auth: {
        username,
        password
      }
    });

    console.log('Batch Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

batchQuery();