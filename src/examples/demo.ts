import { CrocEnv } from '../croc';
import { ethers } from 'ethers';

const DAI = "0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60"

const KEY = "0x7c5e2cfbba7b00ba95e5ed7cd80566021da709442e147ad3e08f23f5044a3d5a"

async function demo() {
    let wallet = new ethers.Wallet(KEY)
    let croc = new CrocEnv("goerli", wallet)

    croc.poolEth(DAI).spotPrice().then(console.log);

    /*croc.poolEth(DAI).mintAmbientBase(0.0001, [0.0001, 0.001])
    croc.poolEth(DAI).mintAmbientQuote(1.0, [0.0001, 0.001])
    croc.poolEth(DAI).mintRangeBase(0.0001, [-640000, 640000], [0.0001, 0.001])

    croc.sell(DAI, 0.0001).forEth().swap()
    croc.buy(DAI, 0.0001).withEth().swap()
    croc.buyEth(0.000001).with(DAI).swap()
    croc.sellEth(0.000001).for(DAI).swap()*/
}

if (true) {
    demo()
}
