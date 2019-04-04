class Stream {
    buffer: any
    dataview: any

    constructor(buffer: any) {
        this.buffer = buffer
        this.dataview = new DataView(buffer)
        this.dataview.position = 0
    }

    fill(count: any) {
        for (let i = 0; i < count; i++) {
            this.writeUint8(0)
        }
    }

    set position(value) {
        this.dataview.position = value
    }

    get position() {
        return this.dataview.position || 0
    }

    static writeByte(buffer: any, value: any, size?: any, sign?: any) {
        switch (size) {
            case 1:
                if (sign) {
                    buffer.setInt8(buffer.position, value)
                } else {
                    buffer.setUint8(buffer.position, value)
                }
                break
            case 2:
                if (sign) {
                    buffer.setInt16(buffer.position, value)
                } else {
                    buffer.setUint16(buffer.position, value)
                }
                break
            case 3:
                if (sign) {
                    for (let i = 0; i < 3; i++) {
                        buffer.setInt8(buffer.position + i, (value >> (16 - i * 8)) & 0xff)
                    }
                } else {
                    for (let i = 0; i < 3; i++) {
                        buffer.setUint8(buffer.position + i, (value >> (16 - i * 8)) & 0xff)
                    }
                }
                break
            case 4:
                if (sign) {
                    buffer.setInt32(buffer.position, value)
                } else {
                    buffer.setUint32(buffer.position, value)
                }
                break
            default:
                console.log(`not support ${size} write`)
        }
        buffer.position += size
    }

    writeUint8(value: any) {
        Stream.writeByte(this.dataview, value, 1)
    }
    writeInt8(value: any) {
        Stream.writeByte(this.dataview, value, 1, true)
    }
    writeUint16(value: any) {
        Stream.writeByte(this.dataview, value, 2)
    }
    writeInt16(value: any) {
        Stream.writeByte(this.dataview, value, 2, true)
    }
    writeUint24(value: any) {
        Stream.writeByte(this.dataview, value, 3)
    }
    writeInt24(value: any) {
        Stream.writeByte(this.dataview, value, 3, true)
    }
    writeUint32(value: any) {
        Stream.writeByte(this.dataview, value, 4)
    }
    writeInt32(value: any) {
        Stream.writeByte(this.dataview, value, 4, true)
    }
    writeUint64(value: any) {
        Stream.writeByte(this.dataview, (value & 0xffffffff00000000) >> 32, 4)
        Stream.writeByte(this.dataview, value & 0x00000000ffffffff, 4)
    }
    writeStr(value: any) {
        const values = value.toString()
        const length = values.length
        for (let i = 0; i < length; i++) {
            this.writeUint8(values.charCodeAt(i))
        }
    }
}

export default Stream
