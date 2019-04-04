// import Demuxer from './demux/demuxer'
import Buffer from '../../write/Buffer'
import Tag from '../models/Tag'
import Store from '../models/Store'

export default class FlvParse {
    CLASS_NAME: any
    temp_u8a: any
    dataLen: number
    stop: boolean
    index: number
    offset: number
    filePosition: number
    firstFlag: boolean
    store: Store

    constructor(store: Store) {
        this.CLASS_NAME = this.constructor.name
        this.store = store
        this.temp_u8a = null
        this.dataLen = 0
        this.stop = false
        this.index = 0 // record the position in single round
        this.offset = 0
        this.filePosition = 0 // record current file position
        this.firstFlag = true
    }

    seek() {
        this.offset = 0
    }

    destroy() {
        this.temp_u8a = null
        this.dataLen = 0
        this.stop = false
        this.index = 0 // record the position in single round
        this.offset = 0
        this.filePosition = 0
    }

    setFlv(flvU8a: any) {
        this.stop = false
        this.index = 0
        this.offset = 0
        const tempU8a = (this.temp_u8a = flvU8a)
        this.dataLen = this.temp_u8a.length

        if (!this.firstFlag) {
            return this.parseData()
        } else if (tempU8a.length > 13 && FlvParse.isFlvHead(tempU8a)) {
            this.parseHead()
            this.readData(9) // 跳过头部
            this.readData(4) // 跳过下一个记录头部size的 int32
            this.parseData()
            this.firstFlag = false
            this.filePosition += this.offset
            return this.offset
        } else {
            return this.offset
        }
    }

    parseData() {
        const { length: u8aLength } = this.temp_u8a
        while (this.index < u8aLength && !this.stop) {
            this.offset = this.index
            const tag = new Tag()
            if (this.unreadLength >= 11) {
                // 可以读出头部信息
                tag.position = this.filePosition + this.offset
                tag.tagType = this.readData(1)[0]
                tag.bodySize = this.readData(3)
                tag.Timestamp = this.readData(4)
                tag.StreamID = this.readData(3)
            } else {
                this.stop = true
                continue
            }
            if (this.unreadLength >= this.getBodySize(tag.bodySize) + 4) {
                tag.body = this.readData(this.getBodySize(tag.bodySize))
                tag.tagSize = this.readData(4)
                const { tags, _hasVideo, _hasAudio } = this.store.state
                switch (tag.tagType) {
                    case 9:
                        _hasVideo && tags.push(tag)
                        break
                    case 8:
                        _hasAudio && tags.push(tag)
                        break
                    case 18:
                        tags.push(tag)
                        break
                }
            } else {
                this.stop = true
                continue
            }

            this.offset = this.index
        }
        this.filePosition += this.offset
        this.temp_u8a = null
        return this.offset
    }

    getBodySize(sizeArr: any) {
        return Buffer.readAsInt(sizeArr)
    }

    parseHead() {
        const { temp_u8a, store } = this
        const result = {
            match: false
        }
        if (temp_u8a[3] !== 1) {
            return result
        }
        const flag = temp_u8a[4]
        const hasAudio = (flag & 4) >>> 2 !== 0
        const hasVideo = (flag & 1) !== 0

        if (!hasAudio && !hasVideo) {
            return result
        }

        store.hasAudio = hasAudio
        store.hasVideo = hasVideo
    }

    readData(length: number) {
        const _index = this.index
        this.index += length
        return this.temp_u8a.slice(_index, _index + length)
    }

    get unreadLength() {
        return this.dataLen - this.index
    }

    static isFlvHead(tempU8a: any) {
        const firstThreeChars = [tempU8a[0], tempU8a[1], tempU8a[2]]
        return String.fromCharCode.apply(String, firstThreeChars) === 'FLV'
    }
}
