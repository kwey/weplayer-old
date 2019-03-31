export default class DataView4Read {
    _dv: any
    _context: any
    isLe: boolean
    sizeArr: any

    constructor (buffer: any, context: any) {
        this._dv = new DataView(buffer)
        this._context = context
        this.isLe = !context.store.isLe
        this.sizeArr = [8, 16, 32]
    }

    /**
     * 显式声明一个比其它位数更常用读取8位整数方法
     */
    getUint8(data?: number) {
        let offset = data
        if (!offset) { offset = this._context.readOffset }
        if (offset === this._context.readOffset) {
            this._context.readOffset += 1
        }
        return this._dv.getUint8(offset, this.isLe)
    }
    /**
     * 显式声明一个比其它位数更常用读取16位整数方法
     */
    getUint16(data?: number) {
        let offset = data
        if (!offset) { offset = this._context.readOffset }
        if (offset === this._context.readOffset) {
            this._context.readOffset += 2
        }
        return this._dv.getUint16(offset, this.isLe)
    }
    /**
     * 显式声明一个比其它位数更常用读取32位整数方法
     */
    getUint32(data?: number) {
        let offset = data
        if (!offset) { offset = this._context.readOffset }
        if (offset === this._context.readOffset) {
            this._context.readOffset += 4
        }
        return this._dv.getUint32(offset, this.isLe)
    }
    /**
     * 显式声明一个比其它位数更常用读取24位整数方法
     */
    getUint24(offset?: number) {
        const result = this.getUint(24, offset, false) // 会读取Uint32,做 and 操作之后回退一位。
        this._context.readOffset -= 1
        return result
    }

    getUint(size: number, offset: number, isHigh = true) {
        if (size > 32) {
            console.log('not supported read size')
        }
        let readSize = 32
        if (!this[`getUint${size}`]) {
            for (let i = 0, len = this.sizeArr.length; i < len; i++) {
                if (size < this.sizeArr[i]) {
                    readSize = this.sizeArr[i]
                    break
                }
            }

            const numToAnd = isHigh ? DataView4Read.getAndNum(0, size - 1, readSize) : DataView4Read.getAndNum(readSize - size, readSize - 1, readSize)
            return this[`getUint${readSize}`](offset, this.isLe) & numToAnd
        } else {
            return this[`getUint${readSize}`](offset, this.isLe)
        }
    }

    static getAndNum (begin: number, end: number, s = 8) {
        let result = 0
        let size = s
        let index = --size
        while (index > 0) {
            if (index > end || index < begin) {
                index--
                continue
            } else {
                result += Math.pow(2, size - index)
                index--
            }
        }
        return result
    }
}