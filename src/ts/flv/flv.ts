import { ConfigInterface } from '../..'
import Video, { TimeUpdateInterface } from './video'
import EventEmitter from '../plugins/event-emitter'
import { Events, VideoEvents, MseEvents, WorkerEvents } from './events'
import Workers from 'worker-loader?inline=true&fallback=false!./worker/worker'

class FlvPlayer extends EventEmitter {
    prefix: string
    config: ConfigInterface
    video: Video
    mediaSource: MediaSource
    loadTask: any
    bufferKeyframes: any
    buffer: any
    // flvParser: any
    _pendingRemoveRange: any = []
    err_cnt: number = 0
    _tempBaseTime: number = 0
    firstFlag: boolean = true
    _isNewSegmentsArrival: boolean = false
    pendingFragments: any = []
    ftyp_moov: any
    handleSeekEnd: Function
    handleError: Function
    isSeeking: boolean = false
    isAppendBuffer: boolean = false
    isChangingSrc: boolean = false
    _pendingSeekTime: number = 0
    _mediaInfo: any
    _worker: any
    _workerDestroying: boolean = false

    constructor(config: ConfigInterface) {
        super()
        this.config = config
        this.video = new Video(config)

        this.init()
        this.globalEvents()
    }

    init() {
        // this.flvParser = new FlvParser(this._store)
        // this.__flv__ = new Flv(this.config, this)
    }
    globalEvents() {
        // this.once('complete', () => {
        //     this.createInstance()
        // })
        this.video.on(MseEvents.SOURCE_OPEN, () => {
            this.onSourceOpen()
        })
        this.video.on(Events.ERROR, (e: any) => {
            console.log(e)
        })
        this.video.on(VideoEvents.TIMEUPDATE, (config: TimeUpdateInterface) => {
            this._worker.postMessage({ sign: VideoEvents.TIMEUPDATE, config })
        })
        this.video.on(VideoEvents.SEEKING, (config: TimeUpdateInterface) => {
            this._worker.postMessage({ sign: VideoEvents.SEEKING, config })
        })
        this.handleSeekEnd = () => {
            this.isSeeking = false
        }
        this.handleError = (e: any) => {
            console.log(e)
            //   this._player.emit('error', e)
        }
        this.once(Events.MEDIA_INFO, (info: any) => {
            this.handleFtypMoov(info)
        })
    }
    onSourceOpen() {
        this.load()
        this.video.on(MseEvents.UPDATE_END, () => {
            this.isAppendBuffer = false
            if (this.pendingFragments.length) {
                const fragment = this.pendingFragments.shift()
                this.video.appendBuffer(fragment.data)
            }
        })
    }
    load() {
        this._worker = new Workers()
        this._worker.postMessage({
            sign: WorkerEvents.INIT,
            config: this.config
        })
        this._worker.onmessage = (message: any) => {
            this._onWorkerMessage(message)
        }
    }
    handleMediaFragment(fragment: any) {
        if (this.isAppendBuffer) {
            this.pendingFragments.push(fragment)
            return
        }
        this.isAppendBuffer = true
        this.video.appendBuffer(fragment.data)
    }
    handleFtypMoov(ftypMoov: any) {
        this.isAppendBuffer = true
        this.video.appendBuffer(ftypMoov.buffer)
        this._mediaInfo = ftypMoov
    }
    isEnded() {}
    _onWorkerMessage(event: any) {
        const message = event.data
        const data = message.data
        const msg = message.msg
        if (msg === 'destroyed' || this._workerDestroying) {
            this._workerDestroying = false
            this._worker.terminate()
            this._worker = null
            return
        }

        switch (msg) {
            case Events.INIT_SEGMENT:
            case Events.MEDIA_SEGMENT:
                this.handleMediaFragment(data)
                break
            case Events.LOADING_COMPLETE:
            case Events.RECOVERED_EARLY_EOF:
                this.emit(msg)
                break
            case Events.MEDIA_INFO:
                this.emit(msg, data)
                break
            case Events.METADATA_ARRIVED:
            case Events.SCRIPTDATA_ARRIVED:
            case Events.STATISTICS_INFO:
                this.emit(msg, data)
                break
            case Events.IO_ERROR:
            case Events.DEMUX_ERROR:
                this.emit(msg, data.type, data.info)
                break
            case Events.RECOMMEND_SEEKPOINT:
                this.emit(msg, data)
                break
            case 'logcat_callback':
                // Log.emitter.emit('log', data.type, data.logcat)
                break
            default:
                break
        }
    }
    play() {
        return this.video._mediaElement.play()
    }

    pause() {
        this.video._mediaElement.pause()
    }

    get buffered() {
        return this.video._mediaElement.buffered
    }

    get duration() {
        return this.video._mediaElement.duration
    }

    get volume() {
        return this.video._mediaElement.volume
    }

    set volume(value) {
        this.video._mediaElement.volume = value
    }

    get muted() {
        return this.video._mediaElement.muted
    }

    set muted(muted) {
        this.video._mediaElement.muted = muted
    }

    get currentTime() {
        if (this.video._mediaElement) {
            return this.video._mediaElement.currentTime
        }
        return 0
    }

    set currentTime(seconds) {
        if (this.video._mediaElement) {
            this._internalSeek(seconds)
        } else {
            this._pendingSeekTime = seconds
        }
    }

    get mediaInfo() {
        return {
            ...this._mediaInfo
        }
    }
    _internalSeek(seconds: number) {
        this._pendingSeekTime = seconds
        console.log('seek')
    }
}

export default FlvPlayer
