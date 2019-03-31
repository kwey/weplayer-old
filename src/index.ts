/// <reference path='../types/index.d.ts'/>
/**
 * @desc Promise polyfill
 */
import 'promise-polyfill/src/polyfill'

import './static/index.less'

import player from './ts/player'
import { metadata, DataInterface } from './metadata'

export interface ConfigInterface {
    id: string
    name: string
    url: string
    isLive?: boolean
    autoplay?: boolean
    chunkSize?: number
    cors?: string
    prefix?: string
    metadata?: DataInterface
    minCachedTime?: number
    preloadTime?: number
}

class WEPlayer {
    constructor(config: any) {
        config.metadata = metadata
        new player(config)
    }
}

export default WEPlayer
