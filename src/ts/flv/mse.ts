import { ConfigInterface } from '../..'
import EventEmitter from '../plugins/event-emitter'
import { Events, MseEvents } from './events'

let count = 0

class MSE extends EventEmitter {
    config: ConfigInterface
    count: number
    codecs: string
    mediaSource: MediaSource
    url: string
    sourceBuffer: any
    handleSourceOpen: any

    constructor(
        config: ConfigInterface,
        codecs = 'video/mp4; codecs="avc1.64001E, mp4a.40.5"'
    ) {
        super()
        this.config = config
        this.count = count++
        this.codecs = codecs
        if (
            'MediaSource' in window &&
            MediaSource.isTypeSupported(this.codecs)
        ) {
            this.mediaSource = new window.MediaSource()
            this.url = window.URL.createObjectURL(this.mediaSource)
            this.handleSourceOpen = this.onSourceOpen.bind(this)

            this.globalEvents()
        } else {
            console.error('Unsupported MIME type or codec: ', this.codecs)
        }
    }
    globalEvents() {
        this.mediaSource.addEventListener(
            MseEvents.SOURCE_OPEN,
            this.handleSourceOpen
        )
        this.mediaSource.addEventListener(MseEvents.SOURCE_CLOSE, () => {
            this.emit(MseEvents.SOURCE_CLOSE)
        })
    }
    get state() {
        return this.mediaSource.readyState
    }
    get duration() {
        return this.mediaSource.duration
    }
    set duration(value) {
        this.mediaSource.duration = value
    }
    onSourceOpen() {
        this.sourceBuffer = this.mediaSource.addSourceBuffer(this.codecs)
        this.sourceBuffer.addEventListener(Events.ERROR, (e: any) => {
            this.emit(Events.ERROR, {
                type: 'sourceBuffer',
                error: e
            })
        })
        this.sourceBuffer.addEventListener(MseEvents.UPDATE_END, () => {
            this.emit(MseEvents.UPDATE_END)
            // if (!this.sourceBuffer.updating && this.mediaSource.readyState === 'open') {
            //     this.mediaSource.endOfStream() // readyState在该方法执行后将会变为ended
            // }
        })
        this.emit(MseEvents.SOURCE_OPEN)
    }
    appendBuffer(buffer: any) {
        const sourceBuffer = this.sourceBuffer
        if (sourceBuffer.updating === false && this.state === 'open') {
            sourceBuffer.appendBuffer(buffer)
            return true
        } else {
            if (this.state === 'closed') {
                this.emit(Events.ERROR, {
                    type: 'sourceBuffer',
                    error: new Error(
                        'mediaSource is not attached to video or mediaSource is closed'
                    )
                })
            } else if (this.state === 'ended') {
                this.emit(Events.ERROR, {
                    type: 'sourceBuffer',
                    error: new Error('mediaSource is closed')
                })
            } else {
                if (sourceBuffer.updating === true) {
                    this.emit('warn', {
                        type: 'sourceBuffer',
                        error: new Error('mediaSource is busy')
                    })
                }
                return false
            }
        }
    }
    destroy() {
        this.mediaSource.removeEventListener(
            MseEvents.SOURCE_OPEN,
            this.handleSourceOpen
        )
        this.destroy()
        this.mediaSource = null
        this.endOfStream()
    }
    removeBuffer(start: number, end: number) {
        this.sourceBuffer.remove(start, end)
    }
    endOfStream() {
        if (this.mediaSource.readyState === 'open') {
            this.mediaSource.endOfStream()
        }
    }
    static isSupported(codecs: string) {
        return window.MediaSource && window.MediaSource.isTypeSupported(codecs)
    }
}

export default MSE
