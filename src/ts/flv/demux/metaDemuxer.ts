import { MetaTypes } from '../types/types'
import UTF8 from '../../utils/UTF8'
import Demuxer from '../muxer'
import Store from '../models/store'
const {
    NUMBER,
    BOOLEAN,
    STRING,
    OBJECT,
    MIX_ARRAY,
    OBJECT_END,
    STRICT_ARRAY,
    DATE,
    LONE_STRING
} = MetaTypes
/**
 * meta信息解析
 */
export default class MetaDemuxer extends Demuxer {
    offset: any
    readOffset: any

    constructor(store: Store) {
        super(store)
        this.offset = 0
        this.readOffset = this.offset
    }
    get isLe() {
        return this.store.isLe
    }
    resolve(meta: any, size: number) {
        if (size < 3) {
            console.log('not enough data for metainfo')
        }
        const metaData = {}
        const name = this.parseValue(meta, size)
        const value = this.parseValue(meta, size - name.bodySize)
        metaData[name.data] = value.data

        this.resetStatus()
        return metaData
    }

    resetStatus() {
        this.offset = 0
        this.readOffset = this.offset
    }

    parseString(buffer: any) {
        const dv = new DataView(buffer, this.readOffset)
        const strLen = dv.getUint16(0, !this.isLe)
        let str = ''
        if (strLen > 0) {
            str = UTF8.decode(
                new Uint8Array(buffer, this.readOffset + 2, strLen)
            )
        } else {
            str = ''
        }
        const size = strLen + 2
        this.readOffset += size
        return {
            data: str,
            bodySize: strLen + 2
        }
    }

    parseDate(buffer: any, size: any) {
        const { isLe } = this
        const dv = new DataView(buffer, this.readOffset, size)
        let ts = dv.getFloat64(0, !isLe)
        const timeOffset = dv.getInt16(8, !isLe)
        ts += timeOffset * 60 * 1000

        this.readOffset += 10
        return {
            data: new Date(ts),
            bodySize: 10
        }
    }

    parseObject(buffer: any, size: any): any {
        const name = this.parseString(buffer)
        const value = this.parseValue(buffer, size - name.bodySize)
        return {
            data: {
                name: name.data,
                value: value.data
            },
            bodySize: name.bodySize + value.bodySize,
            isObjEnd: value.isObjEnd
        }
    }

    parseLongString(buffer: any) {
        const dv = new DataView(buffer, this.readOffset)
        const strLen = dv.getUint32(0, !this.isLe)
        let str = ''
        if (strLen > 0) {
            str = UTF8.decode(
                new Uint8Array(buffer, this.readOffset + 2, strLen)
            )
        }
        // const size = strLen + 4
        this.readOffset += strLen + 4
        return {
            data: str,
            bodySize: strLen + 4
        }
    }

    /**
     * 解析meta中的变量
     */
    parseValue(data: any, size: any): any {
        let buffer
        if (data instanceof ArrayBuffer) {
            buffer = data
        } else {
            buffer = data.buffer
        }
        const { isLe } = this
        const dataView = new DataView(buffer, this.readOffset, size)
        let isObjEnd = false
        const type = dataView.getUint8(0)
        let offset = 1
        this.readOffset += 1
        let value = null

        switch (type) {
            case NUMBER: {
                value = dataView.getFloat64(1, !isLe)
                this.readOffset += 8
                offset += 8
                break
            }
            case BOOLEAN: {
                const boolNum = dataView.getUint8(1)
                value = !!boolNum
                this.readOffset += 1
                offset += 1
                break
            }
            case STRING: {
                const str = this.parseString(buffer)
                value = str.data
                offset += str.bodySize
                break
            }
            case OBJECT: {
                value = {}
                let objEndSize = 0
                if (dataView.getUint32(size - 4, !isLe) & 0x00ffffff) {
                    objEndSize = 3
                }
                // this.readOffset += offset - 1
                while (offset < size - 4) {
                    const amfObj = this.parseObject(
                        buffer,
                        size - offset - objEndSize
                    )
                    if (amfObj.isObjectEnd) {
                        break
                    }
                    value[amfObj.data.name] = amfObj.data.value
                    offset += amfObj.bodySize
                }
                if (offset <= size - 3) {
                    const mark =
                        dataView.getUint32(offset - 1, !isLe) & 0x00ffffff
                    if (mark === 9) {
                        this.readOffset += 3
                        offset += 3
                    }
                }
                break
            }
            case MIX_ARRAY: {
                value = {}
                offset += 4
                this.readOffset += 4
                let objEndSize = 0
                if ((dataView.getUint32(size - 4, !isLe) & 0x00ffffff) === 9) {
                    objEndSize = 3
                }
                while (offset < size - 8) {
                    const amfVar = this.parseObject(
                        buffer,
                        size - offset - objEndSize
                    )
                    if (amfVar.isObjectEnd) {
                        break
                    }
                    value[amfVar.data.name] = amfVar.data.value
                    offset += amfVar.bodySize
                }
                if (offset <= size - 3) {
                    const marker =
                        dataView.getUint32(offset - 1, !isLe) & 0x00ffffff
                    if (marker === 9) {
                        offset += 3
                        this.readOffset += 3
                    }
                }
                break
            }
            case OBJECT_END: {
                value = null
                isObjEnd = true
                break
            }
            case STRICT_ARRAY: {
                value = []
                const arrLength = dataView.getUint32(1, !isLe)
                offset += 4
                this.readOffset += 4
                for (let i = 0; i < arrLength; i++) {
                    const script = this.parseValue(buffer, size - offset)
                    value.push(script.data)
                    offset += script.bodySize
                }
                break
            }
            case DATE: {
                const date = this.parseDate(buffer, size - 1)
                value = date.data
                offset += date.bodySize
                break
            }
            case LONE_STRING: {
                const longStr = this.parseLongString(buffer)
                value = longStr.data
                offset += longStr.bodySize
                break
            }
            default: {
                offset = size
            }
        }
        return {
            isObjEnd,
            data: value,
            bodySize: offset
        }
    }
}
