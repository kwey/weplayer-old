export default class ExpGolomb {
    data: any
    bytesAvailable: any
    word: any
    bitsAvailable: any

    constructor(data: any) {
        this.data = data
        // the number of bytes left to examine in this.data
        this.bytesAvailable = data.byteLength
        // the current word being examined
        this.word = 0 // :uint
        // the number of bits left to examine in the current word
        this.bitsAvailable = 0 // :uint
    }
    // ():void
    loadWord() {
        const data = this.data
        const bytesAvailable = this.bytesAvailable
        const position = data.byteLength - bytesAvailable
        const workingBytes = new Uint8Array(4)
        const availableBytes = Math.min(4, bytesAvailable)
        if (availableBytes === 0) {
            throw new Error('no bytes available')
        }
        workingBytes.set(data.subarray(position, position + availableBytes))
        this.word = new DataView(workingBytes.buffer).getUint32(0)
        // track the amount of this.data that has been processed
        this.bitsAvailable = availableBytes * 8
        this.bytesAvailable -= availableBytes
    }

    // (count:int):void
    skipBits(c: any) {
        let skipBytes
        let count = c
        if (this.bitsAvailable > count) {
            this.word <<= count
            this.bitsAvailable -= count
        } else {
            count -= this.bitsAvailable
            skipBytes = count >> 3
            count -= skipBytes >> 3
            this.bytesAvailable -= skipBytes
            this.loadWord()
            this.word <<= count
            this.bitsAvailable -= count
        }
        return skipBytes
    }

    // (size:int):uint
    readBits(size: any): any {
        let bits = Math.min(this.bitsAvailable, size)
        const valu = this.word >>> (32 - bits)
        if (size > 32) {
            console.error('Cannot read more than 32 bits at a time')
        }
        this.bitsAvailable -= bits
        if (this.bitsAvailable > 0) {
            this.word <<= bits
        } else if (this.bytesAvailable > 0) {
            this.loadWord()
        }
        bits = size - bits
        if (bits > 0 && this.bitsAvailable) {
            return (valu << bits) | this.readBits(bits)
        } else {
            return valu
        }
    }

    // ():uint
    skipLZ(): any {
        let leadingZeroCount // :uint
        for (leadingZeroCount = 0; leadingZeroCount < this.bitsAvailable; ++leadingZeroCount) {
            if (0 !== (this.word & (0x80000000 >>> leadingZeroCount))) {
                // the first bit of working word is 1
                this.word <<= leadingZeroCount
                this.bitsAvailable -= leadingZeroCount
                return leadingZeroCount
            }
        }
        // we exhausted word and still have not found a 1
        this.loadWord()
        return leadingZeroCount + this.skipLZ()
    }

    // ():void
    skipUEG() {
        this.skipBits(1 + this.skipLZ())
    }

    // ():void
    skipEG() {
        this.skipBits(1 + this.skipLZ())
    }

    // ():uint
    readUEG() {
        const clz = this.skipLZ() // :uint
        return this.readBits(clz + 1) - 1
    }

    // ():int
    readEG() {
        const valu = this.readUEG() // :int
        if (0x01 & valu) {
            // the number is odd if the low order bit is set
            return (1 + valu) >>> 1 // add 1 to make it even, and divide by 2
        } else {
            return -1 * (valu >>> 1) // divide by two then make it negative
        }
    }

    // Some convenience functions
    // :Boolean
    readBoolean() {
        return 1 === this.readBits(1)
    }

    // ():int
    readUByte() {
        return this.readBits(8)
    }

    // ():int
    readUShort() {
        return this.readBits(16)
    }
    // ():int
    readUInt() {
        return this.readBits(32)
    }

    /**
     * Advance the ExpGolomb decoder past a scaling list. The scaling
     * list is optionally transmitted as part of a sequence parameter
     * set and is not relevant to transmuxing.
     * @param count  the number of entries in this scaling list
     * @see Recommendation ITU-T H.264, Section 7.3.2.1.1.1
     */
    skipScalingList(count: any) {
        let lastScale = 8
        let nextScale = 8
        let j
        let deltaScale
        for (j = 0; j < count; j++) {
            if (nextScale !== 0) {
                deltaScale = this.readEG()
                nextScale = (lastScale + deltaScale + 256) % 256
            }
            lastScale = nextScale === 0 ? lastScale : nextScale
        }
    }

    /**
     * Read a sequence parameter set and return some interesting video
     * properties. A sequence parameter set is the H264 metadata that
     * describes the properties of upcoming video frames.
     * @param data  the bytes of a sequence parameter set
     * @return  an object with configuration parsed from the
     * sequence parameter set, including the dimensions of the
     * associated video frames.
     */
    readSPS(): any {
        let frameCropLeftOffset = 0
        let frameCropRightOffset = 0
        let frameCropTopOffset = 0
        let frameCropBottomOffset = 0
        let profileIdc
        let levelIdc
        let codecWidth
        let codecHeight
        let presentWidth
        let numRefFramesInPicOrderCntCycle
        let picWidthInMbsMinus1
        let picHeightInMapUnitsMinus1
        let frameMbsOnlyFlag
        let scalingListCount
        let i
        const readUByte = this.readUByte.bind(this)
        const readBits = this.readBits.bind(this)
        const readUEG = this.readUEG.bind(this)
        const readBoolean = this.readBoolean.bind(this)
        const skipBits = this.skipBits.bind(this)
        const skipEG = this.skipEG.bind(this)
        const skipUEG = this.skipUEG.bind(this)
        const skipScalingList = this.skipScalingList.bind(this)

        readUByte()
        profileIdc = readUByte() // profile_idc
        readBits(5) // profileCompat constraint_set[0-4]_flag, u(5)
        skipBits(3) // reserved_zero_3bits u(3),
        levelIdc = readUByte() // level_idc u(8)
        skipUEG() // seq_parameter_set_id
        let chromaFormatIdc = 1
        let chromaFormat = 420
        const chromaFormats = [0, 420, 422, 444]
        let bitDepthLuma = 8
        const profileIdcs = [100, 110, 122, 244, 44, 83, 86, 118, 128]
        // some profiles have more optional data we don't need
        if (profileIdcs.includes(profileIdc)) {
            chromaFormatIdc = readUEG()
            if (chromaFormatIdc === 3) {
                skipBits(1) // separate_colour_plane_flag
            }
            if (chromaFormatIdc <= 3) {
                chromaFormat = chromaFormats[chromaFormatIdc]
            }
            bitDepthLuma = readUEG() + 8 // bit_depth_luma_minus8
            skipUEG() // bit_depth_chroma_minus8
            skipBits(1) // qpprime_y_zero_transform_bypass_flag
            if (readBoolean()) {
                // seq_scaling_matrix_present_flag
                scalingListCount = chromaFormatIdc !== 3 ? 8 : 12
                for (i = 0; i < scalingListCount; i++) {
                    if (readBoolean()) {
                        // seq_scaling_list_present_flag[ i ]
                        i < 6 ? skipScalingList(16) : skipScalingList(64)
                    }
                }
            }
        }
        skipUEG() // log2_max_frame_num_minus4
        const picOrderCntType = readUEG()
        if (picOrderCntType === 0) {
            readUEG() // log2_max_pic_order_cnt_lsb_minus4
        } else if (picOrderCntType === 1) {
            skipBits(1) // delta_pic_order_always_zero_flag
            skipEG() // offset_for_non_ref_pic
            skipEG() // offset_for_top_to_bottom_field
            numRefFramesInPicOrderCntCycle = readUEG()
            for (i = 0; i < numRefFramesInPicOrderCntCycle; i++) {
                skipEG() // offset_for_ref_frame[ i ]
            }
        }
        const refFrames = readUEG() // max_num_ref_frames
        skipBits(1) // gaps_in_frame_num_value_allowed_flag
        picWidthInMbsMinus1 = readUEG()
        picHeightInMapUnitsMinus1 = readUEG()
        frameMbsOnlyFlag = readBits(1)
        if (frameMbsOnlyFlag === 0) {
            skipBits(1) // mb_adaptive_frame_field_flag
        }
        skipBits(1) // direct_8x8_inference_flag
        if (readBoolean()) {
            // frame_cropping_flag
            frameCropLeftOffset = readUEG()
            frameCropRightOffset = readUEG()
            frameCropTopOffset = readUEG()
            frameCropBottomOffset = readUEG()
        }
        const frameRate: any = {
            fps: 0,
            fpsFixed: true,
            fpsNum: 0,
            fpsDen: 0
        }
        let pixelRatio = [1, 1]
        if (readBoolean()) {
            // vui_parameters_present_flag
            if (readBoolean()) {
                // aspect_ratio_info_present_flag
                const aspectRatioIdc = readUByte()
                switch (aspectRatioIdc) {
                    case 1:
                        pixelRatio = [1, 1]
                        break
                    case 2:
                        pixelRatio = [12, 11]
                        break
                    case 3:
                        pixelRatio = [10, 11]
                        break
                    case 4:
                        pixelRatio = [16, 11]
                        break
                    case 5:
                        pixelRatio = [40, 33]
                        break
                    case 6:
                        pixelRatio = [24, 11]
                        break
                    case 7:
                        pixelRatio = [20, 11]
                        break
                    case 8:
                        pixelRatio = [32, 11]
                        break
                    case 9:
                        pixelRatio = [80, 33]
                        break
                    case 10:
                        pixelRatio = [18, 11]
                        break
                    case 11:
                        pixelRatio = [15, 11]
                        break
                    case 12:
                        pixelRatio = [64, 33]
                        break
                    case 13:
                        pixelRatio = [160, 99]
                        break
                    case 14:
                        pixelRatio = [4, 3]
                        break
                    case 15:
                        pixelRatio = [3, 2]
                        break
                    case 16:
                        pixelRatio = [2, 1]
                        break
                    case 255: {
                        pixelRatio = [
                            (readUByte() << 8) | readUByte(),
                            (readUByte() << 8) | readUByte()
                        ]
                        break
                    }
                }
            }
            if (readBoolean()) {
                // overscan_info_present_flag
                readBoolean() // overscan_appropriate_flag
            }
            if (readBoolean()) {
                // video_signal_type_present_flag
                readBits(4) // video_format & video_full_range_flag
                if (readBoolean()) {
                    // colour_description_present_flag
                    readBits(24) // colour_primaries & transfer_characteristics & matrix_coefficients
                }
            }
            if (readBoolean()) {
                // chroma_loc_info_present_flag
                readUEG() // chroma_sample_loc_type_top_field
                readUEG() // chroma_sample_loc_type_bottom_field
            }

            if (readBoolean()) {
                // timing_info_present_flag
                const numUnitInTick = readBits(32)
                frameRate.fpsNum = readBits(32)
                frameRate.fixed = this.readBoolean()
                frameRate.fpsDen = numUnitInTick * 2
                frameRate.fps = frameRate.fpsNum / frameRate.fpsDen
            }
            let cropUnitX = 0
            let cropUnitY = 0
            if (chromaFormatIdc === 0) {
                cropUnitX = 1
                cropUnitX = 2 - frameMbsOnlyFlag
            } else {
                const subWc = chromaFormatIdc === 3 ? 1 : 2
                const subHc = chromaFormatIdc === 1 ? 2 : 1
                cropUnitX = subWc
                cropUnitY = subHc * (2 - frameMbsOnlyFlag)
            }

            codecWidth = (picWidthInMbsMinus1 + 1) * 16
            codecHeight = (2 - frameMbsOnlyFlag) * ((picHeightInMapUnitsMinus1 + 1) * 16)

            codecWidth -= (frameCropLeftOffset + frameCropRightOffset) * cropUnitX
            codecHeight -= (frameCropTopOffset + frameCropBottomOffset) * cropUnitY

            const pixelScale =
                pixelRatio[0] === 1 || pixelRatio[1] === 1 ? 1 : pixelRatio[0] / pixelRatio[1]

            presentWidth = pixelScale * codecWidth
        }
        return {
            profileIdc,
            levelIdc,
            refFrames,
            chromaFormat,
            bitDepth: bitDepthLuma,
            frameRate,
            codecSize: {
                width: codecWidth,
                height: codecHeight
            },
            presentSize: {
                width: presentWidth,
                height: codecHeight
            },
            width: Math.ceil(
                (picWidthInMbsMinus1 + 1) * 16 - frameCropLeftOffset * 2 - frameCropRightOffset * 2
            ),
            height:
                (2 - frameMbsOnlyFlag) * (picHeightInMapUnitsMinus1 + 1) * 16 -
                (frameMbsOnlyFlag ? 2 : 4) * (frameCropTopOffset + frameCropBottomOffset),
            pixelRatio
        }
    }

    readSliceType() {
        // skip NALu type
        this.readUByte()
        // discard first_mb_in_slice
        this.readUEG()
        // return slice_type
        return this.readUEG()
    }
}
