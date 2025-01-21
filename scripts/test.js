const axios = require('axios');

// Define the request payload
const data = {
  jsonrpc: "2.0",
  method: "ankr_getNFTsByOwner",
  params: {
    blockchain: ["eth"], // Specify the blockchain (e.g., Ethereum)
    walletAddress: "0xF3D778ff02730e71d20b591997Aec573f14F7b21", // Replace with the wallet address
    pageSize: 2, // Number of results to fetch
    pageToken: "", // Use a token for the next page if paginating
    // filter: [
    //   { "0x700b4b9f39bb1faf5d0d16a20488f2733550bff4": [] }, // Filters for specific contracts
    //   { "0xd8682bfa6918b0174f287b888e765b9a1b4dc9c3": ["8937"] } // With optional token IDs
    // ]
  },
  id: 1
};

// Make the POST request
axios.post('https://rpc.ankr.com/multichain', data, {
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('Response Data:', response.data);
})
.catch(error => {
  console.error('Error:', error.response ? error.response.data : error.message);
});
