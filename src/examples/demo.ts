import { CrocEnv } from '../croc';
import { BigNumber, ethers } from 'ethers';
/*import { AddressZero } from '@ethersproject/constants';
import { CrocKnockoutHandle } from '../knockout';*/

const ETH = ethers.constants.AddressZero
const DAI = "0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60"
//const USDC = "0xD87Ba7A50B2E7E660f678A895E4B72E7CB4CCd9C"

const KEY = "0x7c5e2cfbba7b00ba95e5ed7cd80566021da709442e147ad3e08f23f5044a3d5a"

async function demo() {
    let wallet = new ethers.Wallet(KEY)
    
    let croc = new CrocEnv("goerli", wallet)

    /*croc.token(DAI).deposit(1, wallet.address)
    croc.token(DAI).withdraw(0.25, wallet.address)
    croc.token(DAI).transfer(0.001, "0xd825D73CDD050ecbEBC0B3a8D9C5952d1F64722e")*/

    //croc.tokenEth().deposit(0.001, wallet.address)
    //croc.tokenEth().withdraw(0.0001, wallet.address)
    /*let tx = croc.tokenEth().transfer(0.0001, "0xd825D73CDD050ecbEBC0B3a8D9C5952d1F64722e")

    await (await tx).wait()
    console.log(await croc.token(DAI).balanceDisplay(wallet.address))
    console.log(await croc.token(DAI).balanceDisplay("0xd825D73CDD050ecbEBC0B3a8D9C5952d1F64722e"))
    console.log(await croc.tokenEth().balanceDisplay("0xd825D73CDD050ecbEBC0B3a8D9C5952d1F64722e"))
    console.log(await croc.token(DAI).walletDisplay(wallet.address))*/

    //let ko = new CrocKnockoutHandle(DAI, AddressZero, 0.001, -78464+512, croc.context)
    /*ko = new CrocKnockoutHandle(DAI, AddressZero, 0.001, -78464+1024, croc.context)
    //ko = new CrocKnockoutHandle(DAI, AddressZero, 0.001, -78464+2048, croc.context)
    //ko = new CrocKnockoutHandle(AddressZero, DAI, 0.01, -78464-2048, croc.context)
    //ko = new CrocKnockoutHandle(AddressZero, DAI, 0.01, -78464-1024, croc.context)
    await (await ko.mint()).wait()*/

    //let tx = croc.poolEth(DAI).burnAmbientLiq(BigNumber.from(10).pow(7), [0.0001, 0.001])
    //let tx = croc.poolEth(DAI).mintRangeBase(0.0001, [-640000, 640000], [0.0001, 0.001])
    //let tx = croc.poolEth(DAI).mintRangeBase(1.0, [-100000, 0], [0.0001, 0.001])

    //let tx = croc.poolEth(DAI).burnRangeLiq(BigNumber.from(10).pow(7), [-640000, 640000], [0.0001, 0.001])
    /*let tx = croc.poolEth(DAI).harvestRange([-640000, 640000], [0.0001, 0.001])
    await (await tx).wait()*/

    /*let ko = new CrocKnockoutHandle(DAI, AddressZero, 0.001, -73152, croc.context)
    await (await ko.mint()).wait()
    ko = new CrocKnockoutHandle(DAI, AddressZero, 0.001, -74432, croc.context)
    await (await ko.mint()).wait()
    
    croc.poolEth(DAI).spotTick().then(console.log)
    croc.poolEth(DAI).spotPrice().then(console.log)*/

    /*croc.poolEth(DAI).spotPrice().then(console.log);
    croc.pool(DAI, AddressZero).displayPrice().then(console.log);
    croc.pool(AddressZero, DAI).displayPrice().then(console.log);*/

    //await (await croc.pool(AddressZero, USDC).initPool(3000)).wait()

    /*croc.poolEth(USDC).spotPrice().then(console.log);
    croc.pool(USDC, AddressZero).displayPrice().then(console.log);
    croc.pool(AddressZero, USDC).displayPrice().then(console.log);

    croc.pool(AddressZero, USDC).mintAmbientQuote(100, [2000, 4000])*/

    //croc.poolEth(DAI).initPool()

    //await croc.poolEth(DAI).mintAmbientBase(0.5, [0.0001, 0.001])
    //await croc.poolEth(DAI).mintAmbientQuote(1.0, [0.0001, 0.001])
    //await croc.poolEth(DAI).mintRangeBase(0.0001, [-640000, 640000], [0.0001, 0.001])*/

    //await croc.sellEth(0.0001).for(DAI).swap()
    //await croc.sell(DAI, 0.0001).forEth().swap()
    /*await croc.buy(DAI, 0.0001).withEth().swap()*/
    //await croc.buyEth(0.01).with(DAI).swap()
    //await croc.sellEth(0.01).for(DAI, { slippage: 0.1}).swap()

    //console.log(await croc.sellEth(20).for(DAI, { slippage: .05}).calcImpact())

    // Pay ETH from wallet, receive DAI to exchange balance
    /*await croc.sellEth(0.01).for(DAI).swap({surplus: [false, true]})

    // Pay ETH from exchange balance, receive DAI to wallet
    await croc.sellEth(0.01).for(DAI).swap({surplus: [false, true]})

    // Pay DAI from exchange balance, receive ETH to wallet 
    await croc.buyEth(0.01).with(DAI).swap({surplus: [true, false]})

    // Pay DAI from wallet, receive ETH to exchange balance
    await croc.buyEth(0.01).with(DAI).swap({surplus: [false, true]})    

    // Pay ETH to receive DAI, both to/from exchange balance 
    await croc.buy(DAI, 100).withEth().swap({surplus: true})

    // Pay ETH to receive DAI, both to/from wallet 
    await croc.buy(DAI, 10).withEth().swap({surplus: false})

    // Pay ETH to receive DAI, both to/from wallet 
    await croc.buy(DAI, 10).withEth().swap()*/

    // Pays DAI to wallet and ETH to exchange balance
    await croc.pool(DAI, ETH).burnAmbientLiq(BigNumber.from(10).pow(7), [0.0001, 0.001], {surplus: [false, true]})

    // Pays DAI to exchange balance and ETH to wallet
    await croc.pool(DAI, ETH).burnAmbientLiq(BigNumber.from(10).pow(7), [0.0001, 0.001], {surplus: [true, false]})

    // Pays ETH to exchange balance and DAI to wallet
    await croc.pool(ETH, DAI).burnAmbientLiq(BigNumber.from(10).pow(7), [1000, 10000], {surplus: [true, false]})

    // Pays ETH to wallet and DAI to exchange balance
    await croc.pool(ETH, DAI).burnAmbientLiq(BigNumber.from(10).pow(7), [1000, 10000], {surplus: [false, true]})

    console.log(await (await croc.token(DAI).balance(wallet.address)).toString())
    console.log(await (await croc.tokenEth().balance(wallet.address)).toString())
}

if (true) {
    demo()
}
