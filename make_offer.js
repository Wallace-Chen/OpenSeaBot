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
const isInfura = process.env.INFURA_KEY;
const NETWORK = process.env.NETWORK;
const API_KEY = process.env.API_KEY || "";


var FP = .01;
var BELOW_FP = true;
var BELOW_RATIO = 0.8;
var TARGET_RATIO = 1.2;
var offer_valid = 900;

// MAYC, 5% fee
//const NFT_CONTRACT_ADDRESS = "0x60e4d786628fea6478f785a6d7e704777c86a7c6";
//const GASFEE = new BigNumber(10).pow(9).multipliedBy(500);
//const PRIORITYFEE = new BigNumber(10).pow(9).multipliedBy(11);
//var PRICE_RATIO = 0.75; 
//BELOW_RATIO = 0.91;
//var TOP_PRICE = 18;

// NFT World, 12% fee
//const NFT_CONTRACT_ADDRESS = "0xbd4455da5929d5639ee098abfaa3241e9ae111af";
//const GASFEE = new BigNumber(10).pow(9).multipliedBy(500);
//const PRIORITYFEE = new BigNumber(10).pow(9).multipliedBy(11);
//var PRICE_RATIO = 0.7; 
//BELOW_RATIO = 0.82;
//var TOP_PRICE = 10;

// World Webb Land, 7.5% fee
//const NFT_CONTRACT_ADDRESS = "0xa1d4657e0e6507d5a94d06da93e94dc7c8c44b51";
//const GASFEE = new BigNumber(10).pow(9).multipliedBy(500);
//const PRIORITYFEE = new BigNumber(10).pow(9).multipliedBy(11);
//var PRICE_RATIO = 0.7; 
//BELOW_RATIO = 0.85;
//var TOP_PRICE = 2;

// Godjira Gen 2, 12.5% fee
//const NFT_CONTRACT_ADDRESS = "0xedc3ad89f7b0963fe23d714b34185713706b815b";
//const GASFEE = new BigNumber(10).pow(9).multipliedBy(500);
//const PRIORITYFEE = new BigNumber(10).pow(9).multipliedBy(11);
//var PRICE_RATIO = 0.65; 
//BELOW_RATIO = 0.78;
//var TOP_PRICE = 1.8;

// Meebits, 2.5% fee
//const NFT_CONTRACT_ADDRESS = "0x7bd29408f11d2bfc23c34f18275bbf23bb716bc7";
//const GASFEE = new BigNumber(10).pow(9).multipliedBy(500);
//const PRIORITYFEE = new BigNumber(10).pow(9).multipliedBy(11);
//var PRICE_RATIO = 0.7; 
//BELOW_RATIO = 0.9;
//var TOP_PRICE = 5;

// CoolCats, 5% fee
const NFT_CONTRACT_ADDRESS = "0x1a92f7381b9f03921564a437210bb9396471050c";
const GASFEE = new BigNumber(10).pow(9).multipliedBy(500);
const PRIORITYFEE = new BigNumber(10).pow(9).multipliedBy(11);
var PRICE_RATIO = 0.7; 
BELOW_RATIO = 0.9;
var TOP_PRICE = 8;

// Doodles, 7.5% fee
//const NFT_CONTRACT_ADDRESS = "0x8a90cab2b38dba80c64b7734e58ee1db38b8992e";
//const GASFEE = new BigNumber(10).pow(9).multipliedBy(500);
//const PRIORITYFEE = new BigNumber(10).pow(9).multipliedBy(11);
//var PRICE_RATIO = 0.77; // find sell order below to PRICE, and auto buy, in ether.
//BELOW_RATIO = 0.87;
//var TOP_PRICE = 13;

var ids_offered = new Map();
var update_time = Math.round(Date.now() / 1000);
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

const ABI = "./OPENSEA.json";
 const OS_ADDR = "0x7f268357A8c2552623316e2562D90e642bB538E5";
//const OS_ADDR = "0x7be8076f4ea4a4ad08075c2508e481d6c946d12b";
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

function convertUnix(timeString){
  var time = new Date(timeString+'Z');
  return parseInt( Date.parse(time.toUTCString()) / 1000 );
  return parseInt( Date.parse(time) / 1000 );
}

async function getEvents(afterTime, _evt) {
  let payment_token = '0x0000000000000000000000000000000000000000';
  if(_evt == "created"){
  }else if(_evt == "offer_entered"){
    payment_token = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
  }else{
    return [[], 0];
  }

  const url = "https://api.opensea.io/api/v1/events";
  const params = {
//    cursor: 'LWV2ZW50X3RpbWVzdGFtcD0yMDIyLTAzLTEwKzA0JTNBNTklM0E0OC42OTQ1MTMmLXBrPTM5OTk5MjIyMzI=',
    asset_contract_address: NFT_CONTRACT_ADDRESS,
    only_opensea: true,
    event_type: _evt,
    limit: 50,
//    occurred_before: afterTime,
//    auction_type: 'dutch'
  };
  var allEvents = [];
  var price_map = {};
  var valid = true;
  try{
    while(true){
      const response = await axios.get(url, {
        params: params,
        headers: {Accept: 'application/json', 'X-API-KEY': API_KEY},
      });
      if(response.status !== 200){
        throw new Error("[getEvents] Failed to get events: "+String(response.status));
      }
      const events = response.data["asset_events"];
      for(const e of events){
        if( convertUnix(e.created_date) < afterTime ){
          valid = false;
          break;
        }
        if( !e.is_private && e.payment_token.address == payment_token ){
          allEvents.push(e);
        }
      }

      if( !valid ){
        break;
      }
      params.cursor = response.data.next;
    }
    if(_evt == "offer_entered"){
      return [allEvents, 1];
    }
    allEvents.forEach( evt => {
      if(evt && evt.asset && evt.asset.token_id){
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

async function getTopOffers(tokenId){
  var now = Math.round(Date.now() / 1000);
  var suc = false;
  let results;
  while(!suc){
    try{
      results = await seaport.api.getOrders({
        asset_contract_address: NFT_CONTRACT_ADDRESS,
        token_id: tokenId,
        side: 0,
        limit: 50,
        offset: 0,
        order_by: 'eth_price',
        order_direction: 'desc',
        bundled: false,
        include_bundled: false
      });
      suc = true;
    }catch (e){
      console.log("Error in getActiveOffers:\n " +e);
      await sleep(1000);
      continue;
    }
  }
  offers = results.orders;
  for(const o of offers){
    if(!o.cancelledOrFinalized && !o.markedInvalid && o.paymentTokenContract.address == '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' && (o.makerAccount.address !== WALLET.toLowerCase() ) && parseFloat(o.expirationTime.toString())>now ){
      return o;
    }
  }
  return {};

}

// function to
//   check if our offers expire, re-offer or delete tokenId if the item is not listed for sale anymore. 
async function updateOffers(_ids_offered){
  console.log( `updating offer, the number of offer we've made is: ${ids_offered.size}` );
  if( ids_offered.size == 0) return _ids_offered;
  ids_offered_new = _ids_offered;
  var now_time = Math.round(Date.now()/1000);

  for( let [k, v] of _ids_offered ){
    console.log(k + " id checking ...");
    await sleep(100);
    try{
      if( v[1]+offer_valid <= now_time ){
        console.log(k + " id has expired ...");
        var sell_order = await getSellOrderFromItem(k);
        if(Object.keys(sell_order).length == 0){ // the item is not listed for sale
          console.log(k + "token not listed, removing... ");
          ids_offered_new.delete(k); // delete this tokenId, and skip
          continue;
        }

        var offerPrice = BELOW_FP ? Math.min( PRICE_RATIO*FP, BELOW_RATIO*FP ) : PRICE_RATIO*FP;
        var top_price = Math.min(TOP_PRICE, FP*BELOW_RATIO);
        var o = await getTopOffers(k);
        var new_price = offerPrice;
        if(Object.keys(o).length > 0){
          var offer_price = parseFloat(web3.utils.fromWei(o.currentPrice.toString(), "ether"));
          if(top_price > offer_price && offer_price >= v[0]){
            new_price = (top_price-offer_price) / 10 + offer_price;
          }
          if (top_price <= offer_price){
            new_price = top_price;
          }
        }
        await makeOffer(k, new_price, offer_valid);
        console.log( `!!! ${k} is offered for ${new_price} ethers.` );
        ids_offered_new.set( k, [new_price, Math.round(Date.now()/1000)] );
      }
    }catch(e){
      console.log("Error in updateOffers: " +e+"\n");
      continue;
    }
  }

  return ids_offered_new;
}

// given newly-created offers, check if there're offers overbid us
async function checkOffers(offers){

  for(const o of offers){
//  console.log("checking other offers: " + o.asset.token_id);
  try{
    if( ids_offered.has(o.asset.token_id) && o.from_account.address !== WALLET.toLowerCase() ){ // offer bid on our interested items and not from us
      var offer_price = parseFloat(web3.utils.fromWei(o.bid_amount, "ether"));
      var our_price = ids_offered.get(o.asset.token_id)[0];
      if( offer_price >= our_price ){ // offer overbid us
        console.log(`find other offers overbidding us: ${offer_price} ethers`);
        var top_price = Math.min(TOP_PRICE, FP*BELOW_RATIO);
        let new_price;
        if( our_price >= top_price ) continue; // our price is already the top price, we cannot increase our bid for this item.
        if(top_price > offer_price && offer_price >= our_price){
          new_price = (top_price-offer_price) / 10 + offer_price;
        }
        if (top_price <= offer_price){
          new_price = top_price;
        }
        await makeOffer(o.asset.token_id, new_price, offer_valid);
        console.log(`!!!${o.asset.token_id} is offered for ${new_price} ethers`);
        ids_offered.set( o.asset.token_id, [new_price, Math.round(Date.now()/1000)] );
      }
    }
  }catch(e){
    console.log("Error in checkOffers: " +e+"\n");
    console.log(o);
    continue;
  }
  }

}

async function getSellOrderFromItem(id){

  let order;
  var suc = false;
  while(!suc){
  try{
    order = await seaport.api.getOrder({
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
      suc = true;
   }catch(e){
     return {};
   }
  }
  return order;
}

async function getCollection(slug){
  const options = {
    method: 'GET',
    headers: {Accept: 'application/json', 'X-API-KEY': API_KEY}
  };
  var suc = false;
  while(!suc){
    try{
        var data = await fetch('https://api.opensea.io/api/v1/collection/'+slug, options).then( response => response.json() );
        if(data.collection.stats.floor_price == undefined) continue;
        return data; 
    }catch (e){
        console.log("Error in getCllection: " + e);
        suc = false;
    }
  }
}

async function listenGoodOrder(unix, thred, slug, interval=30){
  var time_after = unix;
  var bid_time_after = unix;
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
      FP = parseFloat(col.collection.stats.floor_price);
      thred = FP*TARGET_RATIO;
      var _offerPrice = BELOW_FP ? Math.min( PRICE_RATIO*FP, BELOW_RATIO*FP ) : PRICE_RATIO*FP;
      console.log(`\n--------- the current floor price is ${FP} ether, will auto make offer of ${_offerPrice} ethers for orders under ${thred} ether\n`);
      start = time_after;
    }
    await sleep(1000*interval);

    [offers, bid_res] = await getEvents(bid_time_after, "offer_entered");
    if(bid_res){
      bid_time_after = Math.round(Date.now() / 1000);
    }
    if(offers.length > 0){
      console.log("checking offers from " + timestapConvert(bid_time_after));
      await checkOffers(offers);
    }
    await sleep(1000*interval);

    // checking and updting offers...
    if( Math.round(Date.now() / 1000) - update_time > 60 ){
      console.log("\nupdating expired offers from " + timestapConvert(Math.round(Date.now() / 1000)) );
      update_time = Math.round(Date.now() / 1000);
      ids_offered = await updateOffers(ids_offered);
    }
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


// @param valids: in seconds, how long the order is valid
async function makeOffer(_tokenId, price, valids){
    const endTime = Math.round(Date.now() / 1000 + valids);
    const offer = await seaport.createBuyOrder({
        asset: {
        tokenId: _tokenId,
        tokenAddress: NFT_CONTRACT_ADDRESS
        },
        accountAddress: WALLET,
        // Value of the offer, in units of the payment token (or wrapped ETH if none is specified):
        startAmount: price,
        expirationTime: endTime,
        privateKey: PRIVATE_KEY,
        web3: web3
    });

    return offer;
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
  var flag = false;
  let asset;
  while(!flag){
    try{
      asset = await seaport.api.getAsset({tokenAddress:NFT_CONTRACT_ADDRESS, tokenId:"1"});
      flag = true;
    }catch(e){
      console.log("Error fetching the data from OpenSea");
      flag = false;
      sleep(2000);
    }
  }
  const slug = asset.collection.slug;
  col = await getCollection(slug);
  var start = Math.round(Date.now() / 1000);

  FP = parseFloat( col.collection.stats.floor_price );
  var cnt = parseInt(asset.collection.stats.count);

  console.log("The floor price of " + slug + " is: ")
  console.log( FP );


//  var sell_order = await getSellOrderFromItem("4255");
//  console.log(sell_order);
//  console.log(typeof(sell_order));
//  console.log(sell_order.size);
//  console.log(sell_order.length);
//  return; 

//  var offer = await getTopOffers("834");
//  console.log(offer);
//  console.log(typeof(offer));
//  console.log(offer.size);
//  console.log(offer.length);
//  console.log(Object.keys(offer).length);
//  console.log( parseFloat(web3.utils.fromWei(offer.currentPrice.toString(), "ether")) );
//  console.log( parseFloat(offer.expirationTime.toString()) );
//  return;

  var offerPrice = BELOW_FP ? Math.min( PRICE_RATIO*FP, BELOW_RATIO*FP ) : PRICE_RATIO*FP;
// listening sell orders
  console.log(`--------- Auto listening sell orders on OpenSea for the collection: ${slug}, address: ${NFT_CONTRACT_ADDRESS}, the current floor is: ${FP} ether`);
  console.log(`The program will make offers of ${offerPrice} ethers for orders under ${FP*TARGET_RATIO} ethers.`);
  while(1){
    var good_orders;
    [good_orders, start] = await listenGoodOrder(start, FP*TARGET_RATIO, slug);
    offerPrice = BELOW_FP ? Math.min( PRICE_RATIO*FP, BELOW_RATIO*FP ) : PRICE_RATIO*FP;
    for(let order of good_orders){
      try{
        if( ids_offered.has(order[0]) ) continue;
        var offer = await makeOffer(order[0], offerPrice, offer_valid);
        ids_offered.set( order[0], [offerPrice, Math.round(Date.now()/1000)] );
        console.log('!!!!!!!!!!\n');
        console.log(`Offer made: ${offerPrice} ethers for the tokenId ${order[0]} with the listing price ${order[1]} ethers, at ${timestapConvert( Math.round(Date.now()/1000) )}`);
        console.log('\n!!!!!!!!!!\n');
      }catch (e){
        console.log("Error: main, "+e);
        continue;
      }
    }
  }

}

main();

