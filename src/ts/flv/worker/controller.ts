import { ConfigInterface } from '../../..'
import { Events } from '../events'
import { TimeUpdateInterface } from '../video'
import VodTask from '../tasks/vodTask'
import Buffer from '../../write/Buffer'
import Store from '../models/Store'
import FlvParser from './flvParser'
import TagDemuxer from '../demux/tagDemuxer'
import Mp4Remuxer from '../remux/mp4remux'
import EventEmitter from '../../plugins/event-emitter'

class Controller extends EventEmitter {
    config: ConfigInterface
    loadTask: any
    range: any
    rangeList: any = []
    META_CHUNK_SIZE: any
    CHUNK_SIZE: any
    requestConfig: any
    bufferKeyframes: any
    _pendingFragments: any = []
    _pendingRemoveRange: any = []
    err_cnt: number = 0
    _tempBaseTime: number = 0
    firstFlag: boolean = true
    _isNewSegmentsArrival: boolean = false
    ftyp_moov: any
    isSeeking: boolean = false
    isChangingSrc: boolean = false
    isDataLoading: boolean = false
    stop: boolean = false

    buffer: Buffer
    store: Store
    flvParser: FlvParser
    tagDemuxer: TagDemuxer
    mp4remuxer: Mp4Remuxer
    handleSeekEnd: Function
    handleError: Function

    constructor(config: ConfigInterface) {
        super()
        this.config = config
        this.META_CHUNK_SIZE = Math.pow(10, 6)
        this.CHUNK_SIZE = Math.pow(10, 6)
        this.requestConfig = {
            mode: this.config.cors ? 'cors' : 'same-origin'
        }
        this.range = {
            start: -1,
            end: -1
        }
        this._tempBaseTime = 0
        this._isNewSegmentsArrival = false

        this.store = new Store(this)
        this.flvParser = new FlvParser(this.store)
        this.tagDemuxer = new TagDemuxer(this.store)
        this.mp4remuxer = new Mp4Remuxer(this.store)
        this.buffer = new Buffer()
        this.bufferKeyframes = new Set()

        this.initEventBind()
        this.load()
    }

    load() {
        this.range = {
            start: this.range.start + 1,
            end: this.range.end + this.META_CHUNK_SIZE
        }
        return this.loadData()
    }
    loadData() {
        return this.loadMetaData()
            .then((data: any) => {
                this.rangeList.push([this.range.start, this.range.end])
                this.resolver(data)
            })
            .catch((e: any) => {
                console.log(e)
                if (this.err_cnt >= 3) {
                    this.emit('error', e)
                    return
                }
                this.err_cnt += 1
                this.loadData()
            })
    }
    loadMetaData() {
        const { start = 0, end = start + this.META_CHUNK_SIZE } = this.range
        if (start > end) {
            return Promise.reject('')
        }
        this.loadTask = new VodTask(
            this.config.url,
            [start, end],
            this.requestConfig
        )
        return this.loadTask.promise
    }
    resolver(data: any) {
        const { timeStamp, buffer } = data
        if (timeStamp !== this.loadTask.timeStamp) return
        this.err_cnt = 0
        this.buffer.write(new Uint8Array(buffer))
        const offset = this.setFlv(this.buffer.buffer)
        this.buffer.buffer = this.buffer.buffer.slice(offset)
        if (!this.store.mediaInfo.isComplete) {
            this.load()
        }
    }
    setFlvFirst(arrayBuff: any) {
        const offset = this.flvParser.setFlv(new Uint8Array(arrayBuff))
        const { tags } = this.store.state
        if (tags.length) {
            if (tags[0].tagType !== 18) {
                throw new Error('flv file without metadata tag')
            }
            if (
                this._tempBaseTime !== 0 &&
                this._tempBaseTime === tags[0].getTime()
            ) {
                this.store.state._timestampBase = 0
            }
            this.tagDemuxer.resolveTags()
        }
        this.firstFlag = false
        return offset
    }
    setFlvUsually(arrayBuff: any) {
        const offset = this.flvParser.setFlv(new Uint8Array(arrayBuff))
        const { tags } = this.store.state
        if (tags.length) {
            this.tagDemuxer.resolveTags()
        }
        return offset
    }
    get setFlv() {
        return this.firstFlag ? this.setFlvFirst : this.setFlvUsually
    }

    dataReady(audioTrack: any, videoTrack: any) {
        this.mp4remuxer.remux(audioTrack, videoTrack)
    }
    mediaInfoReady(mediaInfo: any) {
        const FTYP_MOOV = this.mp4remuxer.onMediaInfoReady(mediaInfo)
        if (!this.ftyp_moov) {
            this.ftyp_moov = FTYP_MOOV
            this.emit(Events.MEDIA_INFO, FTYP_MOOV)
        }
    }
    metaDataReady(type: any, meta: any) {
        this.mp4remuxer.onMetaDataReady(type, meta)
    }
    newMediaFragment(newFrag: any) {
        this._isNewSegmentsArrival = true
        this.emit(Events.MEDIA_SEGMENT, newFrag)
    }
    initEventBind() {
        this.tagDemuxer.dataReady = this.dataReady.bind(this)
        this.tagDemuxer.mediaInfoReady = this.mediaInfoReady.bind(this)
        this.tagDemuxer.metaDataReady = this.metaDataReady.bind(this)
        this.tagDemuxer.setEventBind()
        this.mp4remuxer.mediaFragment = this.newMediaFragment.bind(this)
    }
    unbindEvents() {
        const NOOP = () => {}
        this.tagDemuxer.dataReady = NOOP
        this.tagDemuxer.mediaInfoReady = NOOP
        this.tagDemuxer.metaDataReady = NOOP
        this.tagDemuxer.setEventBind()
        this.mp4remuxer.mediaFragment = NOOP
    }
    timeUpdate(data: TimeUpdateInterface) {
        if (!this.isSeeking) {
            const { minCachedTime, preloadTime } = this.config
            const { duration, timeScale } = this.store.mediaInfo
            const range = data.range || [0, 0]
            const currentTime = data.currentTime || 0
            if (duration - range[1] * timeScale < 0.1 * timeScale) {
                return
            }
            if (range[1] - currentTime < minCachedTime && !this.isDataLoading) {
                this.isDataLoading = true
                this.getNextRange(currentTime, preloadTime)
                this.loadSegments().then(() => {
                    this.isDataLoading = false
                })
            }
        }
    }
    loadSegments() {
        this._isNewSegmentsArrival = false
        const loadData = () => {
            if (this.stop) return Promise.reject()

            return this.loadMetaData()
                .then((data: any) => {
                    this.rangeList.push([this.range.start, this.range.end])
                    this.resolveChunk(data)
                })
                .catch(() => {
                    if (this.err_cnt >= 3) {
                        this.emit(Events.ERROR, '加载视频失败')
                        return
                    }
                    this.err_cnt += 1
                    loadData()
                })
        }
        return loadData()
    }
    resolveChunk(data: any) {
        if (data.timeStamp !== this.loadTask.timeStamp) return
        this.err_cnt = 0
        this.buffer.write(new Uint8Array(data.buffer))
        // if (this.isSeeking) {
        //     this._pendingFragments = []
        // }
        const offset = this.setFlv(this.buffer.buffer)
        this.buffer.buffer = this.buffer.buffer.slice(offset)
        if (!this._isNewSegmentsArrival) {
            this.loadSegments()
        } else {
            this.isSeeking = false
        }
    }

    resetPosition(s: number, e: number) {
        let start = s
        let end = e
        this.rangeList.some((item: any) => {
            if (item[0] <= start && item[1] <= start) {
                start = item[1] + 1
                return true
            }
        })
        this.rangeList.some((item: any) => {
            if (item[0] <= end && item[1] <= end) {
                end = item[0] - 1
                return true
            }
        })
        return {
            start,
            end
        }
    }
    getNextRange(currentTime: number, preloadTime: number) {
        const {
            keyframes: { times, filePositions },
            videoTimeScale
        } = this.store
        const start = videoTimeScale * currentTime
        // const { start, end } = this.findPosition(seekStart)
        let end = start + preloadTime * videoTimeScale
        if (end > times[times.length - 1]) {
            end = filePositions[filePositions.length - 1]
        }
        let left = 0
        let right = times.length - 1
        let index = right

        while (left <= right) {
            const mid = Math.floor((right + left) / 2)
            if (times[mid] <= end && end <= times[mid + 1]) {
                index = mid + 1
                break
            } else if (left === right) {
                index = mid
                break
            } else if (end < times[mid]) {
                right = mid - 1
            } else {
                left = mid + 1
            }
        }
        this.range = {
            start: this.range.end + 1,
            end: filePositions[index] - 1
        }
        // return filePositions[index]
    }

    destroy() {
        this.mp4remuxer.destroy()
        this.flvParser.destroy()
        this.tagDemuxer.destroy()
        this.mp4remuxer = null
        this.flvParser = null
        this.tagDemuxer = null
        this.loadSegments = () => null
        this.store = null
        this.clearBuffer()
        this.stop = true
        this.loadTask && this.loadTask.cancel()
    }
    seek({ seektTime }: any) {
        this.loadTask.cancel()
        const { keyframes = {}, videoTimeScale } = this.store
        const seekStart = seektTime * videoTimeScale
        const { start, end } = this.findPosition(seekStart)
        if (!this.isSeeking) {
            this.isSeeking = true
        } else {
            this.store.clearTags()
        }
        this._pendingFragments = []
        this.mp4remuxer.seek()
        this.flvParser.seek()
        this.loadTask.clear()
        this.range = {
            start: keyframes.filePositions[start],
            end: keyframes.filePositions[end] - 1 || ''
        }
        this.buffer = new Buffer()
        this.loadSegments()
    }
    findPosition(current: number): any {
        const { keyframes = {}, videoTimeScale } = this.store
        const length = Math.min(
            keyframes.filePositions.length,
            keyframes.times.length
        )
        let { preloadTime } = this.config
        let low = 0
        let hight = length - 1
        let start = low
        let end = hight
        // 二分法查找当前区间
        while (low < hight) {
            const mid = Math.floor((low + hight) / 2)
            const left = keyframes.times[mid]
            const right = keyframes.times[mid + 1]
            if (left <= current && current <= right) {
                start = mid
                preloadTime = preloadTime * videoTimeScale + left
                end = start + 1
                for (; end < length - 1; end++) {
                    if (keyframes.times[end] > preloadTime) {
                        break
                    }
                }
                break
            } else if (current < left) {
                hight = mid
            } else {
                low = mid + 1
            }
        }
        return { start, end }
    }
    clearBuffer() {
        this._pendingFragments = []
        this._pendingRemoveRange = []
    }
    pause() {
        console.log('object')
    }
    resume() {
        console.log('object')
    }
}

export default Controller
