import Buffer from '../../write/Buffer'
// const UINT32_MAX = Math.pow(2, 32) - 1;
import { cacheWrapper } from '../../utils/funcUtils'
const fmp4type = cacheWrapper((name: any) => {
    return new Uint8Array([
        name.charCodeAt(0),
        name.charCodeAt(1),
        name.charCodeAt(2),
        name.charCodeAt(3)
    ])
})
let sequence = 1
class FMP4 {
    static size(value: any) {
        return Buffer.writeUint32(value)
    }
    static initBox(size: any, name: any, ...content: any) {
        const buffer = new Buffer()
        buffer.write(FMP4.size(size), fmp4type(name), ...content)
        return buffer.buffer
    }
    static extension(version: any, flag: any) {
        return new Uint8Array([
            version,
            (flag >> 16) & 0xff,
            (flag >> 8) & 0xff,
            flag & 0xff
        ])
    }
    static ftyp() {
        return FMP4.initBox(
            24,
            'ftyp',
            new Uint8Array([
                0x69,
                0x73,
                0x6f,
                0x6d, // isom,
                0x0,
                0x0,
                0x00,
                0x01, // minor_version: 0x01
                0x69,
                0x73,
                0x6f,
                0x6d, // isom
                0x61,
                0x76,
                0x63,
                0x31 // avc1
            ])
        )
    }
    static moov(data: any) {
        let size = 8
        const mvhd = FMP4.mvhd(data.duration, data.timescale)
        const trak1 = FMP4.videoTrak(data)
        const trak2 = FMP4.audioTrak(data)
        const mvex = FMP4.mvex(data.duration)

        ; [mvhd, trak1, trak2, mvex].forEach(item => {
            size += item.byteLength
        })
        return FMP4.initBox(size, 'moov', mvhd, trak1, trak2, mvex)
    }
    static mvhd(duration: any, timeScale: any) {
        const timescale = timeScale || 1000
        // duration *= timescale;
        const bytes = new Uint8Array([
            0x00,
            0x00,
            0x00,
            0x00, // version(0) + flags     1位的box版本+3位flags   box版本，0或1，一般为0。（以下字节数均按version=0）
            0x00,
            0x00,
            0x00,
            0x00, // creation_time    创建时间  （相对于UTC时间1904-01-01零点的秒数）
            0x00,
            0x00,
            0x00,
            0x00, // modification_time   修改时间

            /**
             * timescale: 4 bytes文件媒体在1秒时间内的刻度值，可以理解为1秒长度
             */
            (timescale >>> 24) & 0xff,
            (timescale >>> 16) & 0xff,
            (timescale >>> 8) & 0xff,
            timescale & 0xff,

            /**
             * duration: 4 bytes该track的时间长度，用duration和time scale值可以计算track时长，比如audio track的time scale = 8000,
             * duration = 560128，时长为70.016，video track的time scale = 600, duration = 42000，时长为70
             */
            (duration >>> 24) & 0xff,
            (duration >>> 16) & 0xff,
            (duration >>> 8) & 0xff,
            duration & 0xff,
            0x00,
            0x01,
            0x00,
            0x00, // Preferred rate: 1.0   推荐播放速率，高16位和低16位分别为小数点整数部分和小数部分，即[16.16] 格式，该值为1.0（0x00010000）表示正常前向播放
            /**
             * PreferredVolume(1.0, 2bytes) + reserved(2bytes)
             * 与rate类似，[8.8] 格式，1.0（0x0100）表示最大音量
             */
            0x01,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00, //  reserved: 4 + 4 bytes保留位
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x01,
            0x00,
            0x00, // ----begin composition matrix----
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00, // 视频变换矩阵   线性代数
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x01,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x40,
            0x00,
            0x00,
            0x00, // ----end composition matrix----
            0x00,
            0x00,
            0x00,
            0x00, // ----begin pre_defined 6 * 4 bytes----
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00, // pre-defined 保留位
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00, // ----end pre_defined 6 * 4 bytes----
            0xff,
            0xff,
            0xff,
            0xff // next_track_ID 下一个track使用的id号
        ])
        return FMP4.initBox(8 + bytes.length, 'mvhd', new Uint8Array(bytes))
    }
    static videoTrak(data: any) {
        let size = 8
        const tkhd = FMP4.tkhd({
            id: 1,
            duration: data.duration,
            timescale: data.timescale,
            width: data.width,
            height: data.height,
            type: 'video'
        })
        const mdia = FMP4.mdia({
            type: 'video',
            timescale: data.timescale,
            duration: data.duration,
            sps: data.sps,
            pps: data.pps,
            pixelRatio: data.pixelRatio,
            width: data.width,
            height: data.height
        })
        ; [tkhd, mdia].forEach(item => {
            size += item.byteLength
        })
        return FMP4.initBox(size, 'trak', tkhd, mdia)
    }
    static audioTrak(data: any) {
        let size = 8
        const tkhd = FMP4.tkhd({
            id: 2,
            duration: data.duration,
            timescale: data.timescale,
            width: 0,
            height: 0,
            type: 'audio'
        })
        const mdia = FMP4.mdia({
            type: 'audio',
            timescale: data.timescale,
            duration: data.duration,
            channelCount: data.audioChannelCount,
            samplerate: data.audioSampleRate,
            config: data.audioConfig
        })
        ; [tkhd, mdia].forEach(item => {
            size += item.byteLength
        })
        return FMP4.initBox(size, 'trak', tkhd, mdia)
    }
    static tkhd(data: any) {
        const id = data.id
        const duration = data.duration
        const width = data.width
        const height = data.height
        const content = new Uint8Array([
            0x00,
            0x00,
            0x00,
            0x07, // version(0) + flags 1位版本 box版本，0或1，一般为0。（以下字节数均按version=0）按位或操作结果值，预定义如下：
            // 0x000001 track_enabled，否则该track不被播放；
            // 0x000002 track_in_movie，表示该track在播放中被引用；
            // 0x000004 track_in_preview，表示该track在预览时被引用。
            // 一般该值为7，1+2+4 如果一个媒体所有track均未设置track_in_movie和track_in_preview，将被理解为所有track均设置了这两项；对于hint track，该值为0
            // hint track 这个特殊的track并不包含媒体数据，而是包含了一些将其他数据track打包成流媒体的指示信息。
            0x00,
            0x00,
            0x00,
            0x00, // creation_time创建时间（相对于UTC时间1904-01-01零点的秒数）
            0x00,
            0x00,
            0x00,
            0x00, // modification time 修改时间
            (id >>> 24) & 0xff, // track_ID: 4 bytes id号，不能重复且不能为0
            (id >>> 16) & 0xff,
            (id >>> 8) & 0xff,
            id & 0xff,
            0x00,
            0x00,
            0x00,
            0x00, // reserved: 4 bytes    保留位
            (duration >>> 24) & 0xff, // duration: 4 bytes track的时间长度
            (duration >>> 16) & 0xff,
            (duration >>> 8) & 0xff,
            duration & 0xff,
            0x00,
            0x00,
            0x00,
            0x00, // reserved: 2 * 4 bytes    保留位
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00, // layer(2bytes) + alternate_group(2bytes)  视频层，默认为0，值小的在上层.track分组信息，默认为0表示该track未与其他track有群组关系
            0x00,
            0x00,
            0x00,
            0x00, // volume(2bytes) + reserved(2bytes)    [8.8] 格式，如果为音频track，1.0（0x0100）表示最大音量；否则为0   +保留位
            0x00,
            0x01,
            0x00,
            0x00, // ----begin composition matrix----
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x01,
            0x00,
            0x00, // 视频变换矩阵
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x40,
            0x00,
            0x00,
            0x00, // ----end composition matrix----
            (width >>> 8) & 0xff, // //宽度
            width & 0xff,
            0x00,
            0x00,
            (height >>> 8) & 0xff, // 高度
            height & 0xff,
            0x00,
            0x00
        ])
        return FMP4.initBox(8 + content.byteLength, 'tkhd', content)
    }
    static edts(data: any) {
        const buffer = new Buffer()
        const duration = data.duration
        const mediaTime = data.mediaTime
        buffer.write(FMP4.size(36), fmp4type('edts'))
        // elst
        buffer.write(FMP4.size(28), fmp4type('elst'))
        buffer.write(
            new Uint8Array([
                0x00,
                0x00,
                0x00,
                0x01, // entry count
                (duration >> 24) & 0xff,
                (duration >> 16) & 0xff,
                (duration >> 8) & 0xff,
                duration & 0xff,
                (mediaTime >> 24) & 0xff,
                (mediaTime >> 16) & 0xff,
                (mediaTime >> 8) & 0xff,
                mediaTime & 0xff,
                0x00,
                0x00,
                0x00,
                0x01 // media rate
            ])
        )
        return buffer.buffer
    }
    static mdia(data: any) {
        let size = 8
        const mdhd = FMP4.mdhd(data.timescale, data.duration)
        const hdlr = FMP4.hdlr(data.type)
        const minf = FMP4.minf(data)
        ; [mdhd, hdlr, minf].forEach(item => {
            size += item.byteLength
        })
        return FMP4.initBox(size, 'mdia', mdhd, hdlr, minf)
    }
    static mdhd(timescale: any, duration: any) {
        const content = new Uint8Array([
            0x00,
            0x00,
            0x00,
            0x00, // creation_time    创建时间
            0x00,
            0x00,
            0x00,
            0x00, // modification_time修改时间
            (timescale >>> 24) & 0xff, // timescale: 4 bytes    文件媒体在1秒时间内的刻度值，可以理解为1秒长度
            (timescale >>> 16) & 0xff,
            (timescale >>> 8) & 0xff,
            timescale & 0xff,
            (duration >>> 24) & 0xff, // duration: 4 bytes  track的时间长度
            (duration >>> 16) & 0xff,
            (duration >>> 8) & 0xff,
            duration & 0xff,
            0x55,
            0xc4, // language: und (undetermined) 媒体语言码。最高位为0，后面15位为3个字符（见ISO 639-2/T标准中定义）
            0x00,
            0x00 // pre_defined = 0
        ])
        return FMP4.initBox(
            12 + content.byteLength,
            'mdhd',
            FMP4.extension(0, 0),
            content
        )
    }
    static hdlr(type: any) {
        const value = [
            0x00, // version 0
            0x00,
            0x00,
            0x00, // flags
            0x00,
            0x00,
            0x00,
            0x00, // pre_defined
            0x76,
            0x69,
            0x64,
            0x65, // handler_type: 'vide'
            0x00,
            0x00,
            0x00,
            0x00, // reserved
            0x00,
            0x00,
            0x00,
            0x00, // reserved
            0x00,
            0x00,
            0x00,
            0x00, // reserved
            0x56,
            0x69,
            0x64,
            0x65,
            0x6f,
            0x48,
            0x61,
            0x6e,
            0x64,
            0x6c,
            0x65,
            0x72,
            0x00 // name: 'VideoHandler'
        ]
        if (type === 'audio') {
            value.splice(8, 4, ...[0x73, 0x6f, 0x75, 0x6e])
            value.splice(
                24,
                13,
                ...[
                    0x53,
                    0x6f,
                    0x75,
                    0x6e,
                    0x64,
                    0x48,
                    0x61,
                    0x6e,
                    0x64,
                    0x6c,
                    0x65,
                    0x72,
                    0x00
                ]
            )
        }
        return FMP4.initBox(8 + value.length, 'hdlr', new Uint8Array(value))
    }
    static minf(data: any) {
        let size = 8
        const vmhd = data.type === 'video' ? FMP4.vmhd() : FMP4.smhd()
        const dinf = FMP4.dinf()
        const stbl = FMP4.stbl(data)
        ; [vmhd, dinf, stbl].forEach(item => {
            size += item.byteLength
        })
        return FMP4.initBox(size, 'minf', vmhd, dinf, stbl)
    }
    static vmhd() {
        return FMP4.initBox(
            20,
            'vmhd',
            new Uint8Array([
                0x00, // version
                0x00,
                0x00,
                0x01, // flags
                0x00,
                0x00, // graphicsmode
                0x00,
                0x00,
                0x00,
                0x00,
                0x00,
                0x00 // opcolor
            ])
        )
    }
    static smhd() {
        return FMP4.initBox(
            16,
            'smhd',
            new Uint8Array([
                0x00, // version
                0x00,
                0x00,
                0x00, // flags
                0x00,
                0x00, // balance
                0x00,
                0x00 // reserved
            ])
        )
    }
    static dinf() {
        const buffer = new Buffer()
        const dref = [
            0x00, // version 0
            0x00,
            0x00,
            0x00, // flags
            0x00,
            0x00,
            0x00,
            0x01, // entry_count
            0x00,
            0x00,
            0x00,
            0x0c, // entry_size
            0x75,
            0x72,
            0x6c,
            0x20, // 'url' type
            0x00, // version 0
            0x00,
            0x00,
            0x01 // entry_flags
        ]
        buffer.write(
            FMP4.size(36),
            fmp4type('dinf'),
            FMP4.size(28),
            fmp4type('dref'),
            new Uint8Array(dref)
        )
        return buffer.buffer
    }
    static stbl(data: any) {
        let size = 8
        const stsd = FMP4.stsd(data)
        const stts = FMP4.stts()
        const stsc = FMP4.stsc()
        const stsz = FMP4.stsz()
        const stco = FMP4.stco()
        ; [stsd, stts, stsc, stsz, stco].forEach(item => {
            size += item.byteLength
        })
        return FMP4.initBox(size, 'stbl', stsd, stts, stsc, stsz, stco)
    }
    static stsd(data: any) {
        let content
        if (data.type === 'audio') {
            // if (!data.isAAC && data.codec === 'mp4') {
            //     content = FMP4.mp3(data);
            // } else {
            //
            // }
            // 支持mp4a
            content = FMP4.mp4a(data)
        } else {
            content = FMP4.avc1(data)
        }
        return FMP4.initBox(
            16 + content.byteLength,
            'stsd',
            FMP4.extension(0, 0),
            new Uint8Array([0x00, 0x00, 0x00, 0x01]),
            content
        )
    }
    static mp4a(data: any) {
        const content = new Uint8Array([
            0x00,
            0x00,
            0x00, // reserved
            0x00,
            0x00,
            0x00, // reserved
            0x00,
            0x01, // data_reference_index
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00, // reserved
            0x00,
            data.channelCount, // channelcount
            0x00,
            0x10, // sampleSize:16bits
            0x00,
            0x00,
            0x00,
            0x00, // reserved2
            (data.samplerate >> 8) & 0xff,
            data.samplerate & 0xff, //
            0x00,
            0x00
        ])
        const esds = FMP4.esds(data.config)
        return FMP4.initBox(
            8 + content.byteLength + esds.byteLength,
            'mp4a',
            content,
            esds
        )
    }
    static esds(config = [43, 146, 8, 0]) {
        const configlen = config.length
        const buffer = new Buffer()
        const content = new Uint8Array(
            [
                0x00, // version 0
                0x00,
                0x00,
                0x00, // flags

                0x03, // descriptor_type
                0x17 + configlen, // length
                0x00,
                0x01, // es_id
                0x00, // stream_priority

                0x04, // descriptor_type
                0x0f + configlen, // length
                0x40, // codec : mpeg4_audio
                0x15, // stream_type
                0x00,
                0x00,
                0x00, // buffer_size
                0x00,
                0x00,
                0x00,
                0x00, // maxBitrate
                0x00,
                0x00,
                0x00,
                0x00, // avgBitrate

                0x05 // descriptor_type
            ]
                .concat([configlen])
                .concat(config)
                .concat([0x06, 0x01, 0x02])
        )
        buffer.write(
            FMP4.size(8 + content.byteLength),
            fmp4type('esds'),
            content
        )
        return buffer.buffer
    }
    static avc1(data: any) {
        const buffer = new Buffer()
        const size = 40 // 8(avc1)+8(avcc)+8(btrt)+16(pasp)
        const sps = data.sps
        const pps = data.pps
        const width = data.width
        const height = data.height
        const hSpacing = data.pixelRatio[0]
        const vSpacing = data.pixelRatio[1]
        const avccBuffer = new Buffer()
        avccBuffer.write(
            new Uint8Array(
                [
                    0x01, // version
                    sps[1], // profile
                    sps[2], // profile compatible
                    sps[3], // level
                    0xfc | 3,
                    0xe0 | 1 // 目前只处理一个sps
                ].concat([(sps.length >>> 8) & 0xff, sps.length & 0xff])
            )
        )
        avccBuffer.write(
            sps,
            new Uint8Array([1, (pps.length >>> 8) & 0xff, pps.length & 0xff]),
            pps
        )

        const avcc = avccBuffer.buffer
        const avc1 = new Uint8Array([
            0x00,
            0x00,
            0x00, // reserved
            0x00,
            0x00,
            0x00, // reserved
            0x00,
            0x01, // data_reference_index
            0x00,
            0x00, // pre_defined
            0x00,
            0x00, // reserved
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00, // pre_defined
            (width >> 8) & 0xff,
            width & 0xff, // width
            (height >> 8) & 0xff,
            height & 0xff, // height
            0x00,
            0x48,
            0x00,
            0x00, // horizresolution
            0x00,
            0x48,
            0x00,
            0x00, // vertresolution
            0x00,
            0x00,
            0x00,
            0x00, // reserved
            0x00,
            0x01, // frame_count
            0x12,
            0x64,
            0x61,
            0x69,
            0x6c, // dailymotion/hls.js
            0x79,
            0x6d,
            0x6f,
            0x74,
            0x69,
            0x6f,
            0x6e,
            0x2f,
            0x68,
            0x6c,
            0x73,
            0x2e,
            0x6a,
            0x73,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00, // compressorname
            0x00,
            0x18, // depth = 24
            0x11,
            0x11
        ]) // pre_defined = -1
        const btrt = new Uint8Array([
            0x00,
            0x1c,
            0x9c,
            0x80, // bufferSizeDB
            0x00,
            0x2d,
            0xc6,
            0xc0, // maxBitrate
            0x00,
            0x2d,
            0xc6,
            0xc0 // avgBitrate
        ])
        const pasp = new Uint8Array([
            hSpacing >> 24, // hSpacing
            (hSpacing >> 16) & 0xff,
            (hSpacing >> 8) & 0xff,
            hSpacing & 0xff,
            vSpacing >> 24, // vSpacing
            (vSpacing >> 16) & 0xff,
            (vSpacing >> 8) & 0xff,
            vSpacing & 0xff
        ])

        buffer.write(
            FMP4.size(
                size + avc1.byteLength + avcc.byteLength + btrt.byteLength
            ),
            fmp4type('avc1'),
            avc1,
            FMP4.size(8 + avcc.byteLength),
            fmp4type('avcC'),
            avcc,
            FMP4.size(20),
            fmp4type('btrt'),
            btrt,
            FMP4.size(16),
            fmp4type('pasp'),
            pasp
        )
        return buffer.buffer
    }
    static stts() {
        const content = new Uint8Array([
            0x00, // version
            0x00,
            0x00,
            0x00, // flags
            0x00,
            0x00,
            0x00,
            0x00 // entry_count
        ])
        return FMP4.initBox(16, 'stts', content)
    }
    static stsc() {
        const content = new Uint8Array([
            0x00, // version
            0x00,
            0x00,
            0x00, // flags
            0x00,
            0x00,
            0x00,
            0x00 // entry_count
        ])
        return FMP4.initBox(16, 'stsc', content)
    }
    static stco() {
        const content = new Uint8Array([
            0x00, // version
            0x00,
            0x00,
            0x00, // flags
            0x00,
            0x00,
            0x00,
            0x00 // entry_count
        ])
        return FMP4.initBox(16, 'stco', content)
    }
    static stsz() {
        const content = new Uint8Array([
            0x00, // version
            0x00,
            0x00,
            0x00, // flags
            0x00,
            0x00,
            0x00,
            0x00, // sample_size
            0x00,
            0x00,
            0x00,
            0x00 // sample_count
        ])
        return FMP4.initBox(20, 'stsz', content)
    }
    static mvex(duration: any) {
        const buffer = new Buffer()
        const mehd = Buffer.writeUint32(duration)
        buffer.write(
            FMP4.size(88),
            fmp4type('mvex'),
            FMP4.size(16),
            fmp4type('mehd'),
            FMP4.extension(0, 0),
            mehd,
            FMP4.trex(1),
            FMP4.trex(2)
        )
        return buffer.buffer
    }
    static trex(id: any) {
        const content = new Uint8Array([
            0x00, // version 0
            0x00,
            0x00,
            0x00, // flags
            id >> 24,
            (id >> 16) & 0xff,
            (id >> 8) & 0xff,
            id & 0xff, // track_ID
            0x00,
            0x00,
            0x00,
            0x01, // default_sample_description_index
            0x00,
            0x00,
            0x00,
            0x00, // default_sample_duration
            0x00,
            0x00,
            0x00,
            0x00, // default_sample_size
            0x00,
            0x01,
            0x00,
            0x01 // default_sample_flags
        ])
        return FMP4.initBox(8 + content.byteLength, 'trex', content)
    }
    static moof(data: any) {
        let size = 8
        const mfhd = FMP4.mfhd()
        const traf = FMP4.traf(data)
        ; [mfhd, traf].forEach(item => {
            size += item.byteLength
        })
        return FMP4.initBox(size, 'moof', mfhd, traf)
    }
    static mfhd() {
        const content = Buffer.writeUint32(sequence)
        sequence += 1
        return FMP4.initBox(16, 'mfhd', FMP4.extension(0, 0), content)
    }
    static traf(data: any) {
        let size = 8
        const tfhd = FMP4.tfhd(data.id)
        const tfdt = FMP4.tfdt(data.time)
        const sdtp = FMP4.sdtp(data)
        const trun = FMP4.trun(data, sdtp.byteLength)
        ; [tfhd, tfdt, sdtp, trun].forEach(item => {
            size += item.byteLength
        })
        return FMP4.initBox(size, 'traf', tfhd, tfdt, sdtp, trun)
    }
    static tfhd(id: any) {
        const content = Buffer.writeUint32(id)
        return FMP4.initBox(16, 'tfhd', FMP4.extension(0, 0), content)
    }
    static tfdt(time: any) {
        // const upper = Math.floor(time / (UINT32_MAX + 1)),
        //     lower = Math.floor(time % (UINT32_MAX + 1));
        return FMP4.initBox(
            16,
            'tfdt',
            FMP4.extension(0, 0),
            Buffer.writeUint32(time)
        )
    }
    static trun(data: any, sdtpLength: any) {
        // const id = data.id;
        // const ceil = id === 1 ? 16 : 12;
        const buffer = new Buffer()
        const sampleCount = Buffer.writeUint32(data.samples.length)
        // mdat-header 8
        // moof-header 8
        // mfhd 16
        // traf-header 8
        // thhd 16
        // tfdt 20
        // trun-header 12
        // sampleCount 4
        // data-offset 4
        // samples.length
        const offset = Buffer.writeUint32(
            8 +
                8 +
                16 +
                8 +
                16 +
                16 +
                12 +
                4 +
                4 +
                16 * data.samples.length +
                sdtpLength
        )
        buffer.write(
            FMP4.size(20 + 16 * data.samples.length),
            fmp4type('trun'),
            new Uint8Array([0x00, 0x00, 0x0f, 0x01]),
            sampleCount,
            offset
        )

        let size = buffer.buffer.byteLength
        let writeOffset = 0
        data.samples.forEach(() => {
            size += 16
        })

        const trunBox = new Uint8Array(size)

        trunBox.set(buffer.buffer, 0)
        writeOffset += buffer.buffer.byteLength
        data.samples.forEach((item: any) => {
            trunBox.set(Buffer.writeUint32(item.duration), writeOffset)
            writeOffset += 4
            trunBox.set(Buffer.writeUint32(item.size), writeOffset)
            writeOffset += 4

            if (data.id === 1) {
                trunBox.set(
                    Buffer.writeUint32(
                        item.isKeyframe ? 0x02000000 : 0x01010000
                    ),
                    writeOffset
                )
                writeOffset += 4
                trunBox.set(Buffer.writeUint32(item.cps), writeOffset)
                writeOffset += 4
            } else {
                trunBox.set(Buffer.writeUint32(0x01000000), writeOffset)
                writeOffset += 4
                trunBox.set(Buffer.writeUint32(0), writeOffset)
                writeOffset += 4
            }

            // buffer.write(Buffer.writeUint32(0));
        })
        return trunBox
    }
    static sdtp(data: any) {
        const buffer = new Buffer()
        buffer.write(
            FMP4.size(12 + data.samples.length),
            fmp4type('sdtp'),
            FMP4.extension(0, 0)
        )
        data.samples.forEach((item: any) => {
            buffer.write(
                new Uint8Array(data.id === 1 ? [item.key ? 32 : 16] : [16])
            )
        })
        return buffer.buffer
    }
    static mdat(data: any) {
        const buffer = new Buffer()
        let size = 8
        data.samples.forEach((item: any) => {
            size += item.size
        })
        buffer.write(FMP4.size(size), fmp4type('mdat'))
        const mdatBox = new Uint8Array(size)
        let offset = 0
        mdatBox.set(buffer.buffer, offset)
        offset += 8
        data.samples.forEach((item: any) => {
            item.buffer.forEach((unit: any) => {
                mdatBox.set(unit.data, offset)
                offset += unit.data.byteLength
                // buffer.write(unit.data);
            })
        })
        return mdatBox
    }
}

export default FMP4
