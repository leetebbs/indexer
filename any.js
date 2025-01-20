const { ethers } = require("ethers");
const dotenv = require("dotenv");
dotenv.config();

// Replace with your WebSocket provider URL
const provider = new ethers.WebSocketProvider(process.env.WS_URL);

console.log("Listening for all events...");

// Listen for all block events
provider.on("block", async (blockNumber) => {
  console.log(`New block: ${blockNumber}`);
  const block = await provider.getBlock(blockNumber);

  for (const txHash of block.transactions) {
    const tx = await provider.getTransaction(txHash);
    console.log(`Transaction: ${tx.hash}`);

    const receipt = await provider.getTransactionReceipt(tx.hash);
    for (const log of receipt.logs) {
      console.log(`Log: ${JSON.stringify(log)}`);
      
      try {
        // Ensure the log is for an ERC721 Transfer event
        const transferEventSignature = ethers.id("Transfer(address,address,uint256)");
        if (log.topics[0] === transferEventSignature) {
          // Decode the topics
          const from = ethers.getAddress(log.topics[1].slice(26)); // Remove padding
          const to = ethers.getAddress(log.topics[2].slice(26));   // Remove padding
          const tokenId = ethers.toBigInt(log.topics[3]);          // Convert to BigInt

          // Extract the NFT contract address from the log
          const nftAddress = log.address;

          console.log(`Parsed Log: NFT Contract=${nftAddress}, from=${from}, to=${to}, tokenId=${tokenId}`);
        } else {
          console.log("Not a Transfer event");
        }
      } catch (error) {
        console.log(`Error parsing log: ${error}`);
      }
    }
  }
});

// Handle WebSocket errors and reconnection
  // Handle WebSocket errors and trigger reconnection
//   provider.on("close", handleReconnection);
//   provider.on("error", handleReconnection);


// // Reconnection logic
// function handleReconnection() {
//   if (!isReconnecting) {
//     isReconnecting = true;
//     console.log("WebSocket disconnected. Reconnecting in 3 seconds...");
//     setTimeout(() => {
//       isReconnecting = false;
//       main();
//     }, 3000);
//   }
// }
