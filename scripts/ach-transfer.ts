import axios from 'axios';

const options = {
  method: 'POST',
  url: 'https://broker-api.sandbox.alpaca.markets/v1/accounts/5f954bc2-29cf-467a-ab7f-7a0c557e09f6/transfers',
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    authorization: 'Basic Q0tVVU5PNUxQRVVBWldKRElQV1RTWjJITDQ6UmVQSHJMNXVDelZtclM3SzFoUEZEbzJFcEZBUEdRSGd5MzlCcXFZWVZpNg=='
  },
  data: {
    transfer_type: 'ach',
    direction: 'INCOMING',
    timing: 'immediate',
    relationship_id: '32c3750f-9814-442a-a337-4fbb6fa7d7f5',
    amount: '40000'
  }
};

console.log('🚀 Initiating ACH transfer...');
console.log('📊 Transfer Details:', JSON.stringify(options.data, null, 2));

axios
  .request(options)
  .then(res => {
    console.log('✅ Transfer successful!');
    console.log('📋 Response:', JSON.stringify(res.data, null, 2));
  })
  .catch(err => {
    console.error('❌ Transfer failed!');
    if (err.response) {
      console.error('📋 Error Response:', {
        status: err.response.status,
        statusText: err.response.statusText,
        data: err.response.data
      });
    } else {
      console.error('📋 Error:', err.message);
    }
  });