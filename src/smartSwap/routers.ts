import { CrocSmartSwapHop, CrocSmartSwapRoute } from "./smartSwapRoute";
import { ChainId } from "../constants";

export interface CrocSmartSwapRouter {
    type: string
    suggestRoutes(fromToken: string, toToken: string, qty: bigint, isFixedOutput: boolean, slippage: number): Promise<CrocSmartSwapRoute[]>
}

export interface PoolStats {
    base: string,
    quote: string,
    baseTvl: number,
    quoteTvl: number,
    events: number,
}

/* Pool-aware router that suggests routes based on possible paths built from a
 * supplied list of pools. */
export class CrocSmartSwapPoolRouter {
    public type: string
    private maxDepth: number
    private allPoolStats: PoolStats[]
    constructor (allPoolStats: PoolStats[], maxDepth: number = 3) {
        this.type = "poolStats"
        this.allPoolStats = allPoolStats
        this.maxDepth = maxDepth
    }

    public async suggestRoutes(fromToken: string, toToken: string, qty: bigint, isFixedOutput: boolean, _: number): Promise<CrocSmartSwapRoute[]> {
        console.log('pool router suggestRoutes', this.allPoolStats);
        fromToken = fromToken.toLowerCase()
        toToken = toToken.toLowerCase()
        const routes: CrocSmartSwapRoute[] = []
        const tokenMap = new Map<string, Map<string, PoolStats>>()

        for (const pool of this.allPoolStats) {
            if (!tokenMap.has(pool.base))
                tokenMap.set(pool.base, new Map<string, PoolStats>())
            tokenMap.get(pool.base)!.set(pool.quote, pool)
            if (!tokenMap.has(pool.quote))
                tokenMap.set(pool.quote, new Map<string, PoolStats>())
            tokenMap.get(pool.quote)!.set(pool.base, pool)
        }

        // This is BFS of a list of pools that's sorted by the number of events,
        // so the resulting paths will be sorted by the number of hops first and
        // then by the number of events in each pool (which is a rough proxy for
        // the pool's liquidity).
        let paths: string[][] = [[fromToken]]
        let relevantPaths: string[][] = []
        let hasMore = true
        let depth = 0;
        while (hasMore && depth < this.maxDepth) {
            hasMore = false
            depth += 1
            const newPaths: string[][] = []
            for (let path of paths) {
                const lastToken = path.at(-1) as string
                for (const [nextToken, pool] of tokenMap.get(lastToken)?.entries() || []) {
                    if (nextToken == toToken) {
                        if (fromToken != lastToken) // skip the long form direct swap
                            relevantPaths.push([...path, nextToken])
                        continue
                    }
                    if (path.includes(nextToken))
                        continue

                    // Some basic path culling
                    if (pool.events <= 1 || (toToken < fromToken ? pool.baseTvl <= 0 : pool.quoteTvl <= 0))
                        continue
                    hasMore = true
                    newPaths.push([...path, nextToken])
                }
            }
            paths = newPaths
        }

        for (const path of relevantPaths) {
            const route = new CrocSmartSwapRoute([{
                hops: path.map(token => ({ token, poolIdx: 420 })),
                qty,
                inputFlow: isFixedOutput ? BigInt(0) : qty,
                outputFlow: isFixedOutput ? qty : BigInt(0),
                isFixedOutput: isFixedOutput,
            }])
            routes.push(route)
        }

        return routes
    }

}

/* Simplest possible router that suggests routes from a list of common
 * tokens, whether the suggested pools exist or not. */
export class CrocSmartSwapHardcodedRouter {
    public type: string
    private chainId: ChainId
    constructor (chainId: ChainId) {
        this.type = "hardcoded"
        this.chainId = chainId
    }

    public async suggestRoutes(fromToken: string, toToken: string, qty: bigint, isFixedOutput: boolean, _: number): Promise<CrocSmartSwapRoute[]> {
        fromToken = fromToken.toLowerCase()
        toToken = toToken.toLowerCase()
        const routes = []
        if (this.chainId == "0x82750") {
            const candidates: CrocSmartSwapHop[][] = [
                [{ token: "0x0000000000000000000000000000000000000000", poolIdx: 420 }],
                [{ token: "0x06efdbff2a14a7c8e15944d1f4a48f9f95f663a4", poolIdx: 420 }],
                [{ token: "0x0000000000000000000000000000000000000000", poolIdx: 420 },
                 { token: "0x06efdbff2a14a7c8e15944d1f4a48f9f95f663a4", poolIdx: 420 }],
                [{ token: "0x06efdbff2a14a7c8e15944d1f4a48f9f95f663a4", poolIdx: 420 },
                 { token: "0x0000000000000000000000000000000000000000", poolIdx: 420 }],
            ]
            for (const candidate of candidates) {
                const hops = [{token: fromToken, poolIdx: 420}, ...candidate, {token: toToken, poolIdx: 420}]
                const route = new CrocSmartSwapRoute([{
                    hops,
                    qty,
                    inputFlow: isFixedOutput ? BigInt(0) : qty,
                    outputFlow: isFixedOutput ? qty : BigInt(0),
                    isFixedOutput: isFixedOutput,
                }])
                routes.push(route)
            }
        } else if (this.chainId == "0x1") {
            const candidates: CrocSmartSwapHop[][] = [
                [{ token: "0x0000000000000000000000000000000000000000", poolIdx: 420 }],
                [{ token: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", poolIdx: 420 }],
                [{ token: "0x0000000000000000000000000000000000000000", poolIdx: 420 },
                 { token: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", poolIdx: 420 }],
                [{ token: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", poolIdx: 420 },
                 { token: "0x0000000000000000000000000000000000000000", poolIdx: 420 }],
            ]
            for (const candidate of candidates) {
                const hops = [{token: fromToken, poolIdx: 420}, ...candidate, {token: toToken, poolIdx: 420}]
                const route = new CrocSmartSwapRoute([{
                    hops,
                    qty,
                    inputFlow: isFixedOutput ? BigInt(0) : qty,
                    outputFlow: isFixedOutput ? qty : BigInt(0),
                    isFixedOutput: isFixedOutput,
                }])
                routes.push(route)
            }
        } else if (this.chainId == "0x13e31") {
            const candidates: CrocSmartSwapHop[][] = [
                [{ token: "0x0000000000000000000000000000000000000000", poolIdx: 420 }],
                [{ token: "0x4300000000000000000000000000000000000003", poolIdx: 420 }],
                [{ token: "0x0000000000000000000000000000000000000000", poolIdx: 420 },
                 { token: "0x4300000000000000000000000000000000000003", poolIdx: 420 }],
                [{ token: "0x4300000000000000000000000000000000000003", poolIdx: 420 },
                 { token: "0x0000000000000000000000000000000000000000", poolIdx: 420 }],
            ]
            for (const candidate of candidates) {
                const hops = [{token: fromToken, poolIdx: 420}, ...candidate, {token: toToken, poolIdx: 420}]
                const route = new CrocSmartSwapRoute([{
                    hops,
                    qty,
                    inputFlow: isFixedOutput ? BigInt(0) : qty,
                    outputFlow: isFixedOutput ? qty : BigInt(0),
                    isFixedOutput: isFixedOutput,
                }])
                routes.push(route)
            }
        }

        // filter out routes with duplicate tokens
        const filteredRoutes = []
        for (const route of routes) {
            const tokenSet = new Set<string>()
            let valid = true;
            for (const hop of route.paths[0].hops) {
                if (tokenSet.has(hop.token)) {
                    valid = false
                    break
                }
                tokenSet.add(hop.token)
            }
            if (valid)
                filteredRoutes.push(route)
        }
        return filteredRoutes
    }
}

/* Wrapper for an API-based external router. */
export class CrocSmartExternalRouter {
}
