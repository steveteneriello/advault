const axios = require('axios');
require('dotenv').config();

const username = process.env.OXYLABS_USERNAME;
const password = process.env.OXYLABS_PASSWORD;

async function getNotifierIPs() {
  try {
    const response = await axios.get('https://realtime.oxylabs.io/v1/notifier/ips', {
      auth: {
        username,
        password
      }
    });

    console.log('Notifier IPs:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

getNotifierIPs();