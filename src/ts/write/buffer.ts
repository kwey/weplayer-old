import Utils from '../utils/utils'

class Buffer {
    buffer: any

    constructor (buffer?: any) {
        this.buffer = buffer || new Uint8Array(0)
    }
    write (...buffer: any) {
        buffer.forEach((item: any) => {
            if (item) {
                this.buffer = Utils.concatTypedArray(Uint8Array, this.buffer, item)
            } else {
                console.error(item)
            }
        })
    }
    static writeUint32 (value: any) {
        return new Uint8Array([
            value >> 24,
            (value >> 16) & 0xff,
            (value >> 8) & 0xff,
            value & 0xff,
        ])
    }
    static readAsInt (arr: any) {
        let temp = ''
        function padStart4Hex (hexNum: any) {
            const hexStr = hexNum.toString(16)
            return ('00' + hexStr).slice(-2)
        }
        arr.forEach((num: any) => {
            temp += padStart4Hex(num)
        })
        return parseInt(temp, 16)
    }
}

export default Buffer
