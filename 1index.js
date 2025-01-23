const { ethers } = require("ethers");
const dotenv = require("dotenv");
dotenv.config();
const { neon } = require("@neondatabase/serverless");
const express = require("express");

const app = express();

// Replace with your WebSocket provider URL
const provider = new ethers.WebSocketProvider(process.env.WS_URL);

// ERC-721 Transfer event signature
const transferEventSignature = ethers.id("Transfer(address,address,uint256)");

console.log("Indexing the whole blockchain for Transfer events...");

async function indexBlockchain() {
  const sql = neon(`${process.env.DATABASE_URL}`);
  let fromBlock = 0;
  const toBlock = await provider.getBlockNumber();

  while (fromBlock <= toBlock) {
    const logs = await provider.getLogs({
      fromBlock,
      toBlock: fromBlock + 1000 > toBlock ? toBlock : fromBlock + 1000,
      topics: [transferEventSignature],
    });

    for (const log of logs) {
      console.log(`Log: ${JSON.stringify(log)}`);

      try {
        // Decode the topics
        const from = ethers.getAddress(log.topics[1].slice(26)).toLowerCase(); // Remove padding
        const to = ethers.getAddress(log.topics[2].slice(26)).toLowerCase();   // Remove padding

        // Ensure log.topics[3] is not null
        if (log.topics[3]) {
          const tokenId = ethers.toBigInt(log.topics[3]);          // Convert to BigInt

          // Extract the NFT contract address from the log
          const nftAddress = log.address.toLowerCase();

          console.log(`Parsed Log: NFT Contract=${nftAddress}, from=${from}, to=${to}, tokenId=${tokenId}`);

          // Check if the NFT already exists in the database
          const existingRecord = await sql(
            'SELECT * FROM transactions WHERE nftAddress = $1 AND tokenId = $2',
            [nftAddress, tokenId]
          );

          if (existingRecord.length > 0) {
            // Update the existing record with the new wallet address and other details
            await sql(
              'UPDATE transactions SET walletAddress = $1, blockNumber = $2, transactionHash = $3 WHERE nftAddress = $4 AND tokenId = $5',
              [to, log.blockNumber, log.transactionHash, nftAddress, tokenId]
            );
            console.log(`Updated database: ${nftAddress}, Token ID: ${tokenId}, New Wallet: ${to}`);
          } else {
            // Insert a new record
            await sql(
              'INSERT INTO transactions (walletAddress, blockNumber, tokenId, nftAddress, transactionHash) VALUES ($1, $2, $3, $4, $5)',
              [to, log.blockNumber, tokenId, nftAddress, log.transactionHash]
            );
            console.log(`Inserted into database: ${nftAddress}, Block: ${log.blockNumber}, Token ID: ${tokenId}`);
          }
        } else {
          console.log("Log does not contain a valid tokenId");
        }
      } catch (error) {
        console.log(`Error parsing log: ${error}`);
      }
    }

    fromBlock += 1000;
  }
}

indexBlockchain().then(() => {
  console.log("Indexing complete.");
}).catch((error) => {
  console.error("Error indexing blockchain:", error);
});

// Start an express server to keep the process alive
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});