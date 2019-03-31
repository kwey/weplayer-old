import Demuxer from '../muxer'
import SPSParser from '../SPSParser'
import DataView4Read from '../../utils/dataView4Read'
import { Events } from '../events'
import Buffer from '../../write/Buffer'
import Store from '../models/store'

export default class VideoDemuxer extends Demuxer {
  CLASS_NAME: string
  readOffset: number
  data: any
  currentTag: any
  mediaInfoReady: Function
  dataReady: Function
  metaDataReady: Function

  constructor (store: Store) {
    super(store)
    this.CLASS_NAME = this.constructor.name
    this.readOffset = 0
    this.data = new Uint8Array(0)
    this.currentTag = null
    this.store.videoMetaData = null
  }

  resetStatus () {
    this.readOffset = 0
    this.data = new Uint8Array(0)
    this.currentTag = null
  }

  resolve (tag: any) {
    this.data = tag.body
    this.currentTag = tag
    const firstUI8 = this.readData(1)[0]
    const frameType = (firstUI8 & 0xF0) >>> 4
    const codecId = firstUI8 & 0x0F
    if (codecId !== 7) {
      /** 1: JPEG
            * 2: H263
            * 3: Screen video
            * 4: On2 VP6
            * 5: On2 VP6
            * 6: Screen videoversion 2
            * 7: AVC
            */
      this.error(`unsupported codecId: ${codecId}`)
      return
    }
    this._parseAVCPacket(frameType)

    this.resetStatus()
  }

  _parseAVCPacket (frameType: any) {
    if (this.unreadLength < 4) {
      this.error('Invalid Avc Tag')
    }
    const isLe = this.store.isLe
    const { buffer } = this.data
    const dv = new DataView(buffer, this.readOffset, this.unreadLength)
    const packageType = dv.getUint8(0)

    let cpsTime = dv.getUint32(0, !isLe) & 0x00FFFFFF
    cpsTime = (cpsTime << 8) >> 8
    this.readOffset += 4

    switch (packageType) {
      case 0: {
        const { position, tagSize } = this.currentTag

        this.store.metaEndPosition = position + Buffer.readAsInt(tagSize) + 4 // 缓存scriptTag结束的位置，replay使用
        this._parseAVCDecoderConfigurationRecord()
        break
      }
      case 1: {
        this._parseAVCVideoData(frameType, cpsTime)
        break
      }
      case 2: {
        break
      }
      default: {
        // 报错
      }
    }
  }

  _parseAVCDecoderConfigurationRecord () {
    if (this.unreadLength < 7) {
      this.error('Invalid AVCDecoderConfigurationRecord, lack of data!')
      return
    }

    // stash offset&unreadSize before parsing sps&pps
    // const tempOffset = this.readOffset
    // const tempUnreadLength = this.unreadLength
    const { store } = this
    const { mediaInfo } = store
    let meta = store.videoMetaData
    const track = store.videoTrack
    const dv = new DataView4Read(this.data.buffer, this)
    if (meta) {
      if (meta.avcc !== undefined) {
        this.error('found another AVCDecoderConfigurationRecord!')
      }
    } else {
      if (!store.state._hasVideo && !store.state.hasVideoFlagOverrided) {
        store.state._hasVideo = true
        store.mediaInfo.hasVideo = true
      }
      meta = store.videoMetaData = {}
      meta.type = 'video'
      meta.id = track.id
      meta.timeScale = store.videoTimeScale
      meta.duration = store.state.duration
      mediaInfo.timescale = store.videoTimeScale
    }

    const version = dv.getUint8()
    const avcProfile = dv.getUint8()
    dv.getUint8()
    dv.getUint8()
    if (version !== 1 || avcProfile === 0) {
      // 处理错误
      return
    }

    const naluLengthSize = store.state.naluLengthSize = dv.getUint(2, this.readOffset, false) + 1
    if (naluLengthSize !== 3 && naluLengthSize !== 4) {
      // 处理错误
      return
    }

    const spsLength = dv.getUint(5, null, false)
    if (spsLength === 0) {
      this.emitError('decoder', {
        line: 128,
        handler: '_parseAVCDecoderConfigurationRecord',
        msg: 'no sps in this video'
      })
      // 处理错误
      return
    } else if (spsLength > 1) {
      this.emitError('decoder', {
        line: 132,
        handler: '_parseAVCDecoderConfigurationRecord',
        msg: 'spsLength > 1'
      })
      this.warn('AVCDecoderConfigurationRecord: spsLength > 1')
    }
    let sps
    for (let i = 0; i < spsLength; i++) {
      const len = dv.getUint16()

      if (len === 0) {
        continue
      }
      sps = new Uint8Array(this.data.buffer, this.readOffset, len)
      this.readOffset += len
      const spsConfig = SPSParser.parseSPS(sps)

      if (i !== 0) {
        continue
      }

      const {
        codecSize,
        presentSize,
        profileString,
        levelString,
        chromaFormat,
        pixelRatio,
        frameRate,
        refFrames,
        bitDepth
      } = spsConfig

      meta.width = codecSize.width
      meta.height = codecSize.height
      meta.presentWidth = presentSize.width
      meta.presentHeight = presentSize.height

      meta.profile = profileString
      meta.level = levelString
      // meta.profileCompatibility = profileCompatibility
      // meta.naluLengthSize = naluLengthSize

      meta.bitDepth = bitDepth
      meta.chromaFormat = chromaFormat
      meta.pixelRatio = pixelRatio
      meta.frameRate = frameRate

      if (!frameRate.fixed ||
                frameRate.fpsNum === 0 ||
                frameRate.fpsDen === 0) {
        meta.frameRate = store.referFrameRate
      }

      const { fpsDen, fpsNum } = meta.frameRate
      meta.refSampleDuration = meta.timeScale * (fpsDen / fpsNum)

      const codecArr = sps.subarray(1, 4)
      let codecStr = 'avc1.'
      for (let j = 0; j < 3; j++) {
        let hex = codecArr[j].toString(16)
        hex = ('00' + hex).slice(-2)
        codecStr += hex
      }

      meta.codec = codecStr

      mediaInfo.width = meta.width
      mediaInfo.height = meta.height
      mediaInfo.fps = meta.frameRate.fps
      mediaInfo.profile = meta.profile
      mediaInfo.level = meta.level
      mediaInfo.refFrames = refFrames
      mediaInfo.pixelRatio = pixelRatio
      mediaInfo.videoCodec = codecStr
      mediaInfo.chromaFormat = chromaFormat
      if (mediaInfo.hasAudio) {
        if (mediaInfo.audioCodec) {
          mediaInfo.mimeType = `video/x-flv codecs="${mediaInfo.videoCodec},${mediaInfo.audioCodec}"`
          mediaInfo.codec = mediaInfo.mimeType.replace('x-flv', 'mp4')
        }
      } else {
        mediaInfo.mimeType = `video/x-flv codecs="${mediaInfo.videoCodec}"`
        mediaInfo.codec = mediaInfo.mimeType.replace('x-flv', 'mp4')
      }
    }
    let pps
    const ppsCount = dv.getUint8()
    if (!ppsCount) {
      this.emitError('decoder', {
        line: 227,
        handler: '_parseAVCDecoderConfigurationRecord',
        msg: 'no pps in this video'
      })
      this.dispatch(Events.ERROR, 'no pps in this video')
      return
    } else if (ppsCount > 1) {
      this.warn(`AVCDecoderConfigurationRecord has ppsCount: ${ppsCount}`)
    }

    for (let i = 0; i < ppsCount; i++) {
      const ppsSize = dv.getUint16()

      if (!ppsSize) {
        continue
      }

      pps = new Uint8Array(this.data.buffer, this.readOffset, ppsSize)
      this.readOffset += ppsSize
    }

    mediaInfo.sps = meta.sps = sps
    mediaInfo.pps = meta.pps = pps

    if (mediaInfo.isComplete) {
      this.mediaInfoReady(mediaInfo)
    }
    if (store.hasInitialMetaDispatched) {
      if (store.videoTrack.length || store.audioTrack.length) {
        this.dataReady(store.videoTrack, store.audioTrack)
      }
    } else {
      store.state._videoInitialMetadataDispatched = true
    }

    this.metaDataReady('video', meta)
  }

  _parseAVCVideoData (frameType: any, cpsTime: any) {
    let dv = new DataView4Read(this.data.buffer, this)

    const naluList = []
    let dataLen = 0
    const { naluLengthSize: naluLenSize } = this.store.state
    const ts = this.store.state.timeStampBase + this.currentTag.getTime()
    let isKeyframe = (frameType === 1)
    while (this.unreadLength > 0) {
      if (this.unreadLength < 4) {
        this.warn('not enough data for parsing AVC')
        break
      }
      const tempReadOffset = this.readOffset
      const naluSize = naluLenSize === 4 ? dv.getUint32() : dv.getUint24()
      if (naluSize > this.unreadLength) {
        return
      }

      const unitType = dv.getUint(5, this.readOffset, false)

      if (unitType === 5) {
        isKeyframe = true
      }

      const data = new Uint8Array(this.data.buffer, tempReadOffset, naluLenSize + naluSize)
      this.readOffset = tempReadOffset + naluLenSize + naluSize
      const naluUnit = {
        type: unitType,
        data
      }
      naluList.push(naluUnit)
      dataLen += data.byteLength
    }
    dv = null
    if (naluList.length) {
      const { videoTrack } = this.store
      const videoSample = {
        units: naluList,
        length: dataLen,
        dts: ts,
        cps: cpsTime,
        pts: (ts + cpsTime),
        isKeyframe,
        position: isKeyframe ? this.currentTag.position : undefined
      }
      videoTrack.samples.push(videoSample)
      videoTrack.length += dataLen
    }
  }

  readData (num: number) {
    const { data, readOffset } = this
    if (this.dataSize > readOffset + num) {
      this.readOffset += num
      return data.slice(readOffset, num)
    }
    return []
  }

  get dataSize () {
    return this.data.length
  }
  get unreadLength () {
    return this.dataSize - this.readOffset
  }
}
