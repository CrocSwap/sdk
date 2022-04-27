import { getSpotPrice } from "../utils/price";
import { AddressZero } from '@ethersproject/constants';
import { ambientPosSlot } from '../position';
import { POOL_PRIMARY, NODE_URL } from '../constants';
import { sendSwap } from '../swap';
import { ethers, BigNumber } from 'ethers';
import { JsonRpcProvider } from '@ethersproject/providers';

const DAI = "0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa"

const KEY = ""

async function demo() {
    let wallet = new ethers.Wallet(KEY, new JsonRpcProvider(NODE_URL))
    
    let price = getSpotPrice(AddressZero, DAI)
    console.log(await price)

    let slot = ambientPosSlot("0x01e650ABfc761C6A0Fc60f62A4E4b3832bb1178b", 
        AddressZero, DAI, POOL_PRIMARY)
    console.log(await slot)

    let tx = sendSwap(AddressZero, DAI, true, BigNumber.from(10).pow(13), BigNumber.from(10).pow(13), 0.03,
        POOL_PRIMARY, wallet)
    await tx
    console.log(tx)
}

demo()
