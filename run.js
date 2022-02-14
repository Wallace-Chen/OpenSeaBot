const OrderSide = require("opensea-js/lib/types");
const BigNumber = require("bignumber.js");
require('dotenv').config();
const opensea = require("opensea-js");
const OpenSeaPort = opensea.OpenSeaPort;
const Network = opensea.Network;
const MnemonicWalletSubprovider = require("@0x/subproviders")
  .MnemonicWalletSubprovider;
const RPCSubprovider = require("web3-provider-engine/subproviders/rpc");
const Web3ProviderEngine = require("web3-provider-engine");
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const axios = require("axios");
const ethereumjs = require("ethereumjs-util");
const toBuffer = ethereumjs.toBuffer;
const _web3 = require("web3");

const MNEMONIC = process.env.MNEMONIC;
const WALLET = process.env.WALLET;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const NODE_API_KEY = process.env.INFURA_KEY || process.env.ALCHEMY_KEY;
const isInfura = !!process.env.INFURA_KEY;
const NETWORK = process.env.NETWORK;
const API_KEY = process.env.API_KEY || "";

const NFT_CONTRACT_ADDRESS = "0x8056ad118916db0feef1c8b82744fa37e5d57cc0";
const GASFEE = new BigNumber(10).pow(9).multipliedBy(100);
const PRIORITYFEE = new BigNumber(10).pow(9).multipliedBy(1.1);
const PRICE = 0.03; // find sell order below to PRICE, and auto buy, in ether.
const OWNER_ADDRESS = 0x00;
var ORDER_QNTY = 1;

// peopleintheplace
//const NFT_CONTRACT_ADDRESS = "0x496a2d17a89cbc4248e9b52c8003a50c648fbca0";
//const GASFEE = new BigNumber(10).pow(9).multipliedBy(100);
//const PRIORITYFEE = new BigNumber(10).pow(9).multipliedBy(2);
//const PRICE = 3; // find sell order below to PRICE, and auto buy, in ether.
//const OWNER_ADDRESS = 0x00;
//var ORDER_QNTY = 1;

const ABI = "./OPENSEA.json";
const OS_ADDR = "0x7Be8076f4EA4A4AD08075C2508e481d6C946D12b";
const BASE_DERIVATION_PATH = `44'/60'/0'/0`;

const mnemonicWalletSubprovider = new MnemonicWalletSubprovider({
  mnemonic: MNEMONIC,
  baseDerivationPath: BASE_DERIVATION_PATH,
});

const network =
  NETWORK === "mainnet" || NETWORK === "live" ? "mainnet" : "rinkeby";
const infuraRpcSubprovider = new RPCSubprovider({
  rpcUrl: isInfura
    ? "https://" + network + ".infura.io/v3/" + NODE_API_KEY
    : "https://eth-" + network + ".alchemyapi.io/v2/" + NODE_API_KEY,
});
const web3 = createAlchemyWeb3(
  isInfura
    ? "https://" + network + ".infura.io/v3/" + NODE_API_KEY
    : "https://eth-" + network + ".alchemyapi.io/v2/" + NODE_API_KEY
);

const providerEngine = new Web3ProviderEngine();
providerEngine.addProvider(mnemonicWalletSubprovider);
providerEngine.addProvider(infuraRpcSubprovider);
providerEngine.start();

const seaport = new OpenSeaPort(
  providerEngine,
  {
    networkName:
      NETWORK === "mainnet" || NETWORK === "live"
        ? Network.Main
        : Network.Rinkeby,
    apiKey: API_KEY,
  },
  (arg) => console.log(arg)
);

async function getEvents(afterTime, evt) {
  const url = "https://api.opensea.io/api/v1/events";
  const params = {
    asset_contract_address: NFT_CONTRACT_ADDRESS,
    only_opensea: true,
    event_type: evt,
    limit: 300,
    occurred_after: afterTime,
//    auction_type: 'dutch'
  };
  var allEvents = [];
  var price_map = {};
  try{
    while(true){
      const response = await axios.get(url, {
        params: params,
        headers: {'X-API-KEY': API_KEY},
      });
      if(response.status !== 200){
        throw new Error("[getEvents] Failed to get events: "+String(response.status));
      }
      const events = response.data["asset_events"];
      allEvents.push(...events);
      if(events.length < 300){
        break;
      }
      params.offset += 300;
    }
    allEvents.forEach( evt => {
      if(evt && evt.asset && evt.asset.token_id && evt.ending_price === evt.starting_price && evt.auction_type === "dutch"){
        if(!(evt.asset.token_id in price_map)){
          price_map[evt.asset.token_id] = parseFloat(web3.utils.fromWei(evt.ending_price, "ether"));
        }else{
          price_map[evt.asset.token_id] = Math.min(price_map[evt.asset.token_id], parseFloat(web3.utils.fromWei(evt.ending_price, "ether")));
        }
      }
    });
    var items = Object.keys(price_map).map( key => {
      return [key, price_map[key]];
    });
    items.sort( (first, second) => {
      return first[1] - second[1];
    });
    return [items, 1];
  } catch (e){
    console.log("Error: getEvents: "+e);
    return [[], 0];
  }

}

async function getCollection(slug){
  const options = {
    method: 'GET',
    headers: {Accept: 'application/json', 'X-API-KEY': API_KEY}
  };
  return fetch('https://api.opensea.io/api/v1/collection/'+slug, options).then( response => response.json() )
}

async function getFloorPrice(cnt){
  var idx = 0;
  var price_map = {};
  const batch_num = 30;
  const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));
  var iter = 0;
  while(idx < cnt){
    if(iter%10 == 0) await sleep(9000);

    var ids = [...Array( Math.min(batch_num, cnt-idx) ).keys()];
    ids = ids.map(v => v+idx+1);
   
    var orders;
    try{
        let results = await seaport.api.getOrders({
        asset_contract_address: NFT_CONTRACT_ADDRESS,
        token_ids: ids,
        side: 1, //OrderSide.Sell,
        sale_kind: 0, // fixed-price sale
        is_english: false,
        bundled: false,
        include_bundled: 'false',
        order_by: 'eth_price',
        order_direction: 'asc',
        include_invalid:"false",
        limit: 50,
      });
      orders = results.orders;
    }catch (e){
      console.log("Error in getFloorPrice:\n " +e);
      await sleep(1000);
      continue;
    }
    orders.forEach( item => {
      if(!(item.asset.tokenId in price_map)){
        price_map[item.asset.tokenId] = parseFloat(web3.utils.fromWei(item.currentPrice.toString(), "ether"));
      }
    });
    iter ++;
    idx += batch_num;
  }

  var items = Object.keys(price_map).map( key => {
    return [key, price_map[key]];
  });
  items.sort( (first, second) => {
    return first[1] - second[1];
  });
  await sleep(1000);
  return items;
}

async function getGoodOrder(unix, cnt, thred){
  var idx = 0;
  var price_map = {};
  const batch_num = 30;
  const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));
  var iter = 0;
  const num = Math.floor((cnt-1)/batch_num) + 1;
  var unix_array = Array.from({length: num}, v => unix);

  var i = 1;
  while(1){
    console.log(String(i) + ". Looking for low orders...");
    iter = 0;
    idx = 0;
    while(idx < cnt){
      if(iter%10 == 0) await sleep(9000);
  
      var ids = [...Array( Math.min(batch_num, cnt-idx) ).keys()];
      ids = ids.map(v => v+idx+1);
      
      var orders;
      try{
        let results = await seaport.api.getOrders({
          asset_contract_address: NFT_CONTRACT_ADDRESS,
          token_ids: ids,
          side: 1, //OrderSide.Sell,
          sale_kind: 0, // fixed-price sale
          is_english: false,
          bundled: false,
          include_bundled: 'false',
          order_by: 'eth_price',
          order_direction: 'asc',
          include_invalid:"false",
          limit: 50,
          listed_after: unix_array[iter],
        });
        orders = results.orders;
      }catch(e){
        console.log("Error in getFllorPrice:\n " +e);
        await sleep(1000);
        continue;
      }
      unix_array[iter] = Math.round(Date.now() / 1000);

      for(let item of orders){
        console.log( parseFloat(web3.utils.fromWei(item.currentPrice.toString(), "ether")) );
        if( parseFloat(web3.utils.fromWei(item.currentPrice.toString(), "ether")) <= thred ){
          console.log("low price found!!!!!!");
          return item;
        }
      }
      iter ++;
      idx += batch_num;
    }
    i ++;
  }
}

async function listenGoodOrder(unix, thred, slug, interval=2){
  const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));
  var time_after = unix;
  var start = unix;
  var orders = [];
  var res;
  while(orders.length == 0 || orders[0][1] > thred){
    console.log("checking sell orders from " + timestapConvert(time_after));
    [orders, res] = await getEvents(time_after, "created");
    if(res){
      time_after = Math.round(Date.now() / 1000);
    }
    if(time_after-start > 60){
      col = await getCollection(slug);
      console.log(`\n--------- the current floor price is ${col.collection.stats.floor_price} ether, will auto-buy orders under ${PRICE} ether\n`);
      start = time_after
    }
    await sleep(1000*interval);
  }
  var good_orders = [];
  for (let o of orders){
    if ( o[1] <= thred ){
      good_orders.push(o);
    }else{
      break;
    }
  }
  return [good_orders, time_after];

}

async function getSellOrderFromItem(id){

  let order = await seaport.api.getOrder({
    asset_contract_address: NFT_CONTRACT_ADDRESS,
    token_ids: id,
    side: 1, //OrderSide.Sell,
    sale_kind: 0, // fixed-price sale
    is_english: false,
    bundled: false,
    include_bundled: 'false',
    order_by: 'eth_price',
    order_direction: 'asc',
    include_invalid:"false",
  });
  return order;
}

async function buyOrder(args, _value){
  const abi = require(ABI);
  const OSContract = new web3.eth.Contract(abi, OS_ADDR);
  const nonce = await web3.eth.getTransactionCount(WALLET, "latest") //get latest nonce

  console.log(args);
  args[1][0] = "0x"+args[1][0].toString(16); args[1][1] = "0x"+args[1][1].toString(16); args[1][2] = "0x"+args[1][2].toString(16);
  args[1][3] = "0x"+args[1][3].toString(16); args[1][4] = "0x"+args[1][4].toString(16); args[1][5] = "0x"+args[1][5].toString(16);
  args[1][6] = "0x"+args[1][6].toString(16); args[1][7] = "0x"+args[1][7].toString(16); args[1][8] = "0x"+args[1][8].toString(16);
  args[1][9] = "0x"+args[1][9].toString(16); args[1][10] = "0x"+args[1][10].toString(16); args[1][11] = "0x"+args[1][11].toString(16);
  args[1][12] = "0x"+args[1][12].toString(16); args[1][13] = "0x"+args[1][13].toString(16); args[1][14] = "0x"+args[1][14].toString(16);
  args[1][15] = "0x"+args[1][15].toString(16); args[1][16] = "0x"+args[1][16].toString(16); args[1][17] = "0x"+args[1][17].toString(16);
  console.log(args);
  const tx = {
    from: WALLET,
    to: OS_ADDR,
    nonce: nonce,
//    gas: Math.ceil(_data.gas*1.15),
//    value: _data.value,
    value: _value,
    maxFeePerGas: GASFEE,
    maxPriorityFeePerGas: PRIORITYFEE,
    data: OSContract.methods["atomicMatch_"](args[0],args[1],args[2],args[3],args[4],args[5],args[6],args[7],args[8],args[9],args[10]).encodeABI(),
  };
  const gasLimit = await web3.eth.estimateGas(tx);
  console.log("gas limit is: " + gasLimit);
  tx.gas = parseInt(gasLimit * 1.1);
  const signedTx = await web3.eth.accounts.signTransaction(tx, PRIVATE_KEY)
  console.log("signed tx: " + signedTx)
  web3.eth.sendSignedTransaction(signedTx.rawTransaction, (err, hash) => {
    if (!err) {
      console.log("The hash of your transaction is: ",hash)
    } else {
      console.log("Error when sending buy order: ",err)
      throw new Error("Error when sending buy order: "+err);
    }
  });

}

async function fulfillOrder(buyOrder){
  let data = await seaport.fulfillOrder({
    order: buyOrder,
    accountAddress: WALLET,
    gasFee: GASFEE,
    priorityFee: PRIORITYFEE
  });
  return data;
    
}


function timestapConvert(unix){
  var date = new Date(unix * 1000);
  var month = date.getMonth() + 1;
  var day = date.getDate();
  var hour = date.getHours();
  var min = date.getMinutes();
  var sec = date.getSeconds();
  var time = month + '-' + day + ' ' + hour + ':' + min + ':' + sec;
  return time;

}

async function main() {
  let asset = await seaport.api.getAsset({tokenAddress:NFT_CONTRACT_ADDRESS, tokenId:"1"});
  const slug = asset.collection.slug;
  col = await getCollection(slug);
  var start = Math.round(Date.now() / 1000);

//  var cnt = parseInt(asset.collection.stats.count);
//  console.log("The floor price of " + slug + " is: ")
//  console.log(col.collection.stats.floor_price);

//  console.log(start)
//  order_book = await getFloorPrice(cnt);
//  console.log(order_book);

//  console.log("Listening to new lists...");
//  let order = await getGoodOrder(start, cnt, PRICE);
//  console.log(order);

  console.log('buying the order...')
  var _sell_order = await getSellOrderFromItem("9511");
  var data = await fulfillOrder(_sell_order);
  var hash = await buyOrder(data, _sell_order.currentPrice);
  return

// listening sell orders
  console.log(`--------- Auto listening sell orders on OpenSea for the collection: ${slug}, address: ${NFT_CONTRACT_ADDRESS}, the current floor is: ${col.collection.stats.floor_price} ether`);
  console.log(`The program will automatically buy orders under ${PRICE} ethers.`);
  while(1){
    var good_orders;
    [good_orders, start] = await listenGoodOrder(start, PRICE, slug);
    for(let order of good_orders){
      try{
        var sell_order = await getSellOrderFromItem(order[0]); 
        if( parseFloat(web3.utils.fromWei(sell_order.currentPrice.toString(), "ether")) <= order[1] ){
          console.log(`!!!!! Buying the tokenId ${order[0]}, the price is: ${ parseFloat(web3.utils.fromWei(sell_order.currentPrice.toString(), "ether")) }`);
          var data = await fulfillOrder(sell_order);
          //var data = await getOrderContractData(sell_order);
          let hash = await buyOrder(data, sell_order.currentPrice);
          ORDER_QNTY -= 1;
          if(ORDER_QNTY <= 0){
            return;
          }
        }
      }catch (e){
        console.log("Error: main, "+e);
        continue;
      }
    }
  }

}

main();

