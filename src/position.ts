import { POOL_PRIMARY } from "./constants";
import { BytesLike, ethers } from 'ethers';

/* Determines the EVM storage slot for a given ambient liquidity postion. Can be used
 * to uniquely identify LP positions.
 * 
 * @param owner The owner of the ambient LP (usually msg.sender)
 * @param base The address of the base token in the pool
 * @param quote The address of the quote token in the pool
 * @param poolType The pool type index number
 * @return The EVM slot hash that the position is stored at in the contract.  */
export function ambientPosSlot (owner: string,  base: string, quote: string,
    poolType: number = POOL_PRIMARY): BytesLike {
    const encoder = new ethers.utils.AbiCoder()
    const poolHash = ethers.utils.keccak256(encoder.encode
        (["address", "address", "uint256"], [base, quote, poolType]))
    const posKey = ethers.utils.keccak256(encoder.encode(["address", "bytes32"], [owner, poolHash]))
    return ethers.utils.solidityKeccak256(["bytes32", "uint256"], [posKey, AMBIENT_POS_SLOT])
}

// Based on the slots of the current contract layout
const AMBIENT_POS_SLOT = 14
