import { CrocEnv } from '../croc';
import { ethers } from 'ethers';
import { AddressZero } from '@ethersproject/constants';

//const DAI = "0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60"
const USDC = "0xD87Ba7A50B2E7E660f678A895E4B72E7CB4CCd9C"

const KEY = "0x7c5e2cfbba7b00ba95e5ed7cd80566021da709442e147ad3e08f23f5044a3d5a"

async function demo() {
    let wallet = new ethers.Wallet(KEY)
    let croc = new CrocEnv("goerli", wallet)

    /*croc.poolEth(DAI).spotPrice().then(console.log);
    croc.pool(DAI, AddressZero).displayPrice().then(console.log);
    croc.pool(AddressZero, DAI).displayPrice().then(console.log);*/

    //await (await croc.pool(AddressZero, USDC).initPool(3000)).wait()

    croc.poolEth(USDC).spotPrice().then(console.log);
    croc.pool(USDC, AddressZero).displayPrice().then(console.log);
    croc.pool(AddressZero, USDC).displayPrice().then(console.log);

    croc.pool(AddressZero, USDC).mintAmbientQuote(100, [2000, 4000])

    //croc.poolEth(DAI).initPool()

    /*await croc.poolEth(DAI).mintAmbientBase(0.0001, [0.0001, 0.001])
    await croc.poolEth(DAI).mintAmbientQuote(1.0, [0.0001, 0.001])
    await croc.poolEth(DAI).mintRangeBase(0.0001, [-640000, 640000], [0.0001, 0.001])*/

    //await croc.sellEth(0.0001).for(DAI).swap()
    //await croc.sell(DAI, 0.0001).forEth().swap()
    /*await croc.buy(DAI, 0.0001).withEth().swap()
    await croc.buyEth(0.000001).with(DAI).swap()
    await croc.sellEth(0.000001).for(DAI).swap()*/
}

if (true) {
    demo()
}
