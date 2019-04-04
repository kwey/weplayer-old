import Demuxer from '../muxer'
import MetaDemuxer from './metaDemuxer'
import VideoDemuxer from './videoDemuxer'
import AudioDemuxer from './audioDemuxer'
import metaFields from '../types/metaFields'
import Store from '../models/store'

const nativeHasProp = Object.prototype.hasOwnProperty

export default class Tagdemux extends Demuxer {
    CLASS_NAME: string
    _metaDemuxer: MetaDemuxer
    _videoDemuxer: VideoDemuxer
    _audioDemuxer: AudioDemuxer
    _firstParse: boolean
    _dataOffset: number
    metaDataReady: Function
    dataReady: Function
    mediaInfoReady: Function

    constructor(store: Store) {
        super(store, 'demuxer')
        this.CLASS_NAME = this.constructor.name
        this._metaDemuxer = new MetaDemuxer(store)
        this._videoDemuxer = new VideoDemuxer(store)
        this._audioDemuxer = new AudioDemuxer(store)
        this._firstParse = true
        this._dataOffset = 0
    }
    setEventBind() {
        //video
        this._videoDemuxer.dataReady = this.dataReady
        this._videoDemuxer.metaDataReady = this.metaDataReady
        this._videoDemuxer.mediaInfoReady = this.mediaInfoReady
        // audio
        this._audioDemuxer.dataReady = this.dataReady
        this._audioDemuxer.metaDataReady = this.metaDataReady
        this._audioDemuxer.mediaInfoReady = this.mediaInfoReady
    }
    destroy() {
        this._metaDemuxer = null
        this._videoDemuxer = null
        this._audioDemuxer = null
    }

    resolveTags() {
        const { tags } = this.store.state

        const { store } = this
        const { videoTrack, audioTrack } = store

        tags.forEach((tag: any) => {
            this.resolveTag(tag)
        })

        if (this.store.hasInitialMetaDispatched) {
            if (videoTrack.length || audioTrack.length) {
                this.dataReady(audioTrack, videoTrack)
            }
        }

        this.store.state.tags = []
    }

    resolveTag(tag: any) {
        switch (String(tag.tagType)) {
            case '8': // audio
                this._resolveAudioTag(tag)
                break
            case '9': // video
                this._resolveVideoTag(tag)
                break
            case '18': // metadata
                this._resolveMetaTag(tag)
                break
        }
    }

    _resolveAudioTag(tag: any) {
        if (tag.bodySize <= 1) {
            this.warn('Not enough data for audio tag body')
        }
        this._audioDemuxer.resolve(tag)
    }

    _resolveVideoTag(tag: any) {
        if (tag.bodySize <= 1) {
            this.error('Not enough data for video tag body')
            return
        }
        const { _hasVideo, hasVideoFlagOverrided } = this.store.state
        if (hasVideoFlagOverrided && !_hasVideo) {
            return
        }

        this._videoDemuxer.resolve(tag)
    }

    _initMetaData(metaData: any) {
        const { store } = this
        if (nativeHasProp.call(metaData, 'onMetaData')) {
            if (store.hasMetaData) {
                console.log(`[${this.CLASS_NAME}]`, 'found another meta tag')
            }
            store.metaData = metaData
            const onMetaData = metaData.onMetaData

            metaFields.forEach(field => {
                const { name, type, parser, onTypeErr } = field
                if (Object(onMetaData[name]) instanceof type) {
                    parser.call(this, store, onMetaData)
                } else {
                    if (onTypeErr && onTypeErr instanceof Function) {
                        onTypeErr(store)
                    }
                }
            })

            this.store.mediaInfo._metaData = metaData
            // 同步到共享store
            if (this.store.mediaInfo.isComplete) {
                this.mediaInfoReady(this.store.mediaInfo)
            }
        }
    }

    _resolveMetaTag(tag: any) {
        const { body } = tag
        const metaObj = this._metaDemuxer.resolve(body, body.length)
        this._initMetaData(metaObj)
    }

    _parseKeyframes(keyframes: any) {
        const times = []
        const filePositions = []
        const { videoTimeScale, state } = this.store
        for (let i = 1; i < keyframes.times.length; i++) {
            times[times.length] =
                state.timeStampBase +
                Math.floor(keyframes.times[i] * videoTimeScale)
            filePositions[filePositions.length] = keyframes.filepositions[i]
        }

        return {
            times,
            filePositions
        }
    }
}
