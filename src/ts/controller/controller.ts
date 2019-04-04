import EventEmitter from '../plugins/event-emitter'
import util from '../utils/utils'

class Controller extends EventEmitter {
    config: any
    paused: boolean

    constructor(options: any) {
        super()
        this.config = util.deepCopy(
            {
                width: 600,
                height: 337.5,
                ignores: [],
                whitelist: [],
                lang: (
                    document.documentElement.getAttribute('lang') ||
                    navigator.language ||
                    'zh-cn'
                ).toLocaleLowerCase(),
                inactive: 3000,
                volume: 0.6,
                controls: true,
                controlsList: ['nodownload']
            },
            options
        )
        this.init()
    }

    init() {
        this.on('test', () => {
            console.log('object')
        })
        this.emit('test')
    }
    play() {
        console.log('play')
    }
    pause() {
        console.log('play')
    }
    seek() {
        console.log('seek')
    }
}

// Player.util = util
// Player.sniffer = sniffer
// Player.Errors = Errors

export default Controller
