const { ethers } = require("ethers");
const dotenv = require("dotenv");
dotenv.config();
const { neon } = require("@neondatabase/serverless");

// Vercel-compatible export
module.exports = async (req, res) => {
  // Initialize the WebSocket provider
  const provider = new ethers.WebSocketProvider(process.env.WS_URL);
  console.log("Listening for all events...");

  // Listen for new block events
  provider.on("block", async (blockNumber) => {
    console.log(`New block: ${blockNumber}`);
    const block = await provider.getBlock(blockNumber);
    const sql = neon(`${process.env.DATABASE_URL}`);

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
            const from = ethers.getAddress(log.topics[1].slice(26)); // Remove padding
            const to = ethers.getAddress(log.topics[2].slice(26));   // Remove padding
            const tokenId = ethers.toBigInt(log.topics[3]);          // Convert to BigInt
            const nftAddress = log.address;

            console.log(`Parsed Log: NFT Contract=${nftAddress}, from=${from}, to=${to}, tokenId=${tokenId}`);

            const existingRecord = await sql(
              'SELECT * FROM transactions WHERE nftAddress = $1 AND tokenId = $2',
              [nftAddress, tokenId]
            );

            if (existingRecord.length > 0) {
              await sql(
                'UPDATE transactions SET walletAddress = $1, blockNumber = $2, transactionHash = $3 WHERE nftAddress = $4 AND tokenId = $5',
                [to, blockNumber, tx.hash, nftAddress, tokenId]
              );
              console.log(`Updated database: ${nftAddress}, Token ID: ${tokenId}, New Wallet: ${to}`);
            } else {
              await sql(
                'INSERT INTO transactions (walletAddress, blockNumber, tokenId, nftAddress, transactionHash) VALUES ($1, $2, $3, $4, $5)',
                [to, blockNumber, tokenId, nftAddress, tx.hash]
              );
              console.log(`Inserted into database: ${nftAddress}, Block: ${blockNumber}, Token ID: ${tokenId}`);
            }
          } else {
            console.log("Not a Transfer event");
          }
        } catch (error) {
          console.log(`Error parsing log: ${error}`);
        }
      }
    }
  });

  // Respond to Vercel requests
  res.status(200).send(`Listening for blockchain events... Last processed block number: ${blockNumber}`)};
