# OpenSea Bot
A simple js script to automatically buy ERC-721 item from OpenSea under specified price limit.
The script dependes on the official [opensea-js](https://github.com/ProjectOpenSea/opensea-js/tree/master).

# Usage
1. Download this repository to your local;
2. Make sure you have node environment install, and the vervion is equal to v12.18. You can use the node version manager `nvm` to easily switch between versions;
3. Install dependent libraries/modules by:
   ```
   npm install .
   ```
4. Copy hack/seaport.js to your local path: `node_modules/opensea-js/lib/seaport.js`. You can replace the original file or backup that.
5. Prepare the `.env` file containing the following environmental variables:
   ```
   ALCHEMY_KEY=''
   ETHERSCAN_API=''
   NETWORK='mainnet'
   MNEMONIC=''
   WALLET=''
   PRIVATE_KEY=''
   API_KEY=''
   ```
   where `API_KEY` is your api key to the opensea. You may apply [here](https://docs.opensea.io/reference/request-an-api-key).
6. Cofigure proper values in the `./run.js`:
   ```
   const NFT_CONTRACT_ADDRESS = ''; // the NFT address of your interest to buy
   const GASFEE = ''; // the total gas fee you're willing to pay for the transaction
   const PRIORITYFEE = ''; // the priority fee you want to pay
   const PRICE = 1.0; // the max price you're willing to pay for one NFT, in the unit of ether
   var ORDER_QNTY = 1; // the amount of NFTs you want to buy
   ```
7. Execute the script:
   ```
   node ./run.js
   ```

# Note
+ Make sure you have enough funds deposited in your wallet before you execute the script;
+ Never disclose your wallet private key and mnemonic phrases;
+ Nothing guaranteed in the code. Future updates may be necessary in the case of OpenSea API upgrade.
