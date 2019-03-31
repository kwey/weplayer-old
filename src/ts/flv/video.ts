
import { ConfigInterface } from '../..'
import Mse from './mse'
import { VideoEvents } from './events'
import utils from '../utils/utils'

export interface TimeUpdateInterface {
    currentTime: number
    range: number[]
}

class Video extends Mse {
    prefix: string
    config: ConfigInterface
    mediaSource: MediaSource
    ev: string[]
    range: number[]
    mimeCodec: string
    isSeeking: boolean = false
    _mediaElement: HTMLVideoElement

    constructor(config: ConfigInterface) {
        super(config)
        this.config = config
        if (this.url) {
            this.init()
        }
    }

    init() {
        this.ev = Object.keys(VideoEvents)
        this._mediaElement = utils.createDom('video', '', {
            controls: 'controls'
        })
        const container = utils.findDom(document, `${this.config.id}`)

        container.classList.add(this.config.prefix)
        this._mediaElement.src = this.url
        container.appendChild(this._mediaElement)
        this.mediaEvents()

    }
    mediaEvents() {
        const timeUpdate = this.timeUpdate()
        this.ev.forEach((item: string) => {
            this._mediaElement.addEventListener(VideoEvents[item], (e: any) => {
                console.log(item, e.timeStamp)
                switch (VideoEvents[item]) {
                    case VideoEvents.CANPLAY:
                        this.canPlay(e)
                        break
                    case VideoEvents.SEEKING:
                        this.seeking(e)
                        break
                    case VideoEvents.SEEKED:
                        this.isSeeking = false
                        break
                    case VideoEvents.TIMEUPDATE:
                        // if (this.duration - this.currentTime < 0.3) {
                        //     this._mediaElement.pause()
                        // }
                        timeUpdate()
                        break
                    default:
                        break
                }
            })
        })
    }
    destroy() {
    }
    canPlay(e: any) {
        if (this.config.autoplay) {
            const video = this._mediaElement.play()
            if (video) {
                video.catch(() => {
                    console.log('onvCanPlay-------chrome')
                })
            }
        }
        console.log('onvCanPlay', e.timeStamp)
    }
    timeUpdate() {
        return utils.throttle(() => {
            console.log(this.duration, this.currentTime, '-------------')
            this.emit(VideoEvents.TIMEUPDATE, {
                range: this.getBufferedRange(),
                currentTime: this.currentTime
            })
        })
    }
    seeking(e: any) {
        console.log(e.timeStamp)
        if (this.isBuffered()) {
            return
        }
        if (!this.seekable) {
            return
        }
        this.emit(VideoEvents.SEEKING, { seektTime: this._mediaElement.currentTime })
        this.isSeeking = true
    }
    isBuffered(cahedTime: number = 0) {
        const { buffered, currentTime } = this._mediaElement
        let isBuffered = false
        if (buffered.length) {
            for (let i = 0, len = buffered.length; i < len; i++) {
                if (currentTime > buffered.start(i) && currentTime + cahedTime < buffered.end(i)) {
                    isBuffered = true
                    break
                }
            }
        }
        return isBuffered
    }
    getBufferedRange() {
        const range = [0, 0]
        const video = this._mediaElement
        const buffered = video.buffered
        const currentTime = video.currentTime
        if (buffered) {
            for (let i = 0, len = buffered.length; i < len; i++) {
                range[0] = buffered.start(i)
                range[1] = buffered.end(i)
                if (range[0] <= currentTime && currentTime <= range[1]) {
                    break
                }
            }
        }
        if (range[0] - currentTime <= 0 && currentTime - range[1] <= 0) {
            return range
        } else {
            return [0, 0]
        }
    }
    set autoplay(isTrue) {
        this._mediaElement.autoplay = isTrue
    }
    get autoplay() {
        return this._mediaElement.autoplay
    }
    get buffered() {
        return this._mediaElement.buffered
    }
    get crossOrigin() {
        return this._mediaElement.crossOrigin
    }
    set crossOrigin(isTrue) {
        this._mediaElement.crossOrigin = isTrue
    }
    get currentSrc() {
        return this._mediaElement.currentSrc
    }
    get currentTime() {
        return this._mediaElement.currentTime
    }
    set currentTime(time) {
        this._mediaElement.currentTime = time
    }
    get defaultMuted() {
        return this._mediaElement.defaultMuted
    }
    set defaultMuted(isTrue) {
        this._mediaElement.defaultMuted = isTrue
    }
    get duration() {
        return this._mediaElement.duration
    }
    get ended() {
        return this._mediaElement.ended
    }
    get error() {
        const err = this._mediaElement.error
        if (!err) {
            return null
        }
        const status = [{
            en: 'MEDIA_ERR_ABORTED',
            cn: '取回过程被用户中止'
        }, {
            en: 'MEDIA_ERR_NETWORK',
            cn: '当下载时发生错误'
        }, {
            en: 'MEDIA_ERR_DECODE',
            cn: '当解码时发生错误'
        }, {
            en: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
            cn: '不支持音频/视频'
        }]
        return status[err.code - 1].en
    }
    get loop() {
        return this._mediaElement.loop
    }
    set loop(isTrue) {
        this._mediaElement.loop = isTrue
    }
    get muted() {
        return this._mediaElement.muted
    }
    set muted(isTrue) {
        this._mediaElement.muted = isTrue
    }
    get networkState() {
        const status = [{
            en: 'NETWORK_EMPTY',
            cn: '音频/视频尚未初始化'
        }, {
            en: 'NETWORK_IDLE',
            cn: '音频/视频是活动的且已选取资源，但并未使用网络'
        }, {
            en: 'NETWORK_LOADING',
            cn: '浏览器正在下载数据'
        }, {
            en: 'NETWORK_NO_SOURCE',
            cn: '未找到音频/视频来源'
        }]
        return status[this._mediaElement.networkState].en
    }
    get paused() {
        return this._mediaElement.paused
    }
    get playbackRate() {
        return this._mediaElement.playbackRate
    }
    set playbackRate(rate) {
        this._mediaElement.playbackRate = rate
    }
    get played() {
        return this._mediaElement.played
    }
    get preload() {
        return this._mediaElement.preload
    }
    set preload(isTrue) {
        this._mediaElement.preload = isTrue
    }
    get readyState() {
        const status = [{
            en: 'HAVE_NOTHING',
            cn: '没有关于音频/视频是否就绪的信息'
        }, {
            en: 'HAVE_METADATA',
            cn: '关于音频/视频就绪的元数据'
        }, {
            en: 'HAVE_CURRENT_DATA',
            cn: '关于当前播放位置的数据是可用的，但没有足够的数据来播放下一帧/毫秒'
        }, {
            en: 'HAVE_FUTURE_DATA',
            cn: '当前及至少下一帧的数据是可用的'
        }, {
            en: 'HAVE_ENOUGH_DATA',
            cn: '可用数据足以开始播放'
        }]
        return status[this._mediaElement.readyState]
    }
    get seekable() {
        return this._mediaElement.seekable
    }
    get src() {
        return this._mediaElement.src
    }
    set src(url) {
        console.log(url)
        // const self = this
        // if (!util.hasClass(this.root, 'xgplayer-ended')) {
        //     this.emit('urlchange', JSON.parse(JSON.stringify(self.logParams)))
        // }
        // this.logParams = {
        //     bc: 0,
        //     bu_acu_t: 0,
        //     pt: new Date().getTime(),
        //     vt: 0,
        //     vd: 0
        // }
        // this.video.pause()
        // this.video.src = url
        // this.once('canplay', function() {
        //     self.once('timeupdate', function() {
        //         self.logParams.vt = new Date().getTime()
        //         self.logParams.vd = self.video.duration
        //     })
        // })
    }
    get volume() {
        return this._mediaElement.volume
    }
    set volume(vol) {
        this._mediaElement.volume = vol
    }
}

export default Video
