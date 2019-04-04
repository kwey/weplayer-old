import { ConfigInterface } from '..'
import Controller from './controller/controller'
import FlvPlayer from './flv/flv'
import EventEmitter from './plugins/event-emitter'

class Player extends EventEmitter {
    prefix: string
    config: ConfigInterface
    container: HTMLElement
    video: HTMLElement

    flvPlayer: FlvPlayer
    controller: Controller

    constructor(config: ConfigInterface) {
        super()
        this.config = {
            prefix: 'kwe-player',
            isLive: false,
            autoplay: false,
            chunkSize: 0,
            cors: '',
            minCachedTime: 10,
            preloadTime: 20,
            ...config
        }

        this.init()
        this.globalEvents()
    }

    init() {
        this.flvPlayer = new FlvPlayer(this.config)
        // this.controller = new Controller({})
    }
    globalEvents() {}
}

export default Player
