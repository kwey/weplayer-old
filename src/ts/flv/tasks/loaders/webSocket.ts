

export default class WebSocketLoader {
    url: string
    _sendData: any
    on: boolean
    _ws: any
    header: any

    constructor (url: string, callback: Function, header?: any) {
        this.header = header
        this.url = url
        this._sendData = callback
        this.on = false
        this._ws = null
    }

    initWsObj () {
        const ws = new WebSocket(this.url)
        ws.binaryType = 'arraybuffer'
        ws.onopen = this._onOpen.bind(this)
        ws.onclose = this._onClose.bind(this)
        ws.onmessage = this._onMessage.bind(this)
        // ws.onerror = this._onError.bind(this)
    }

    _onOpen () {
        this.on = true
    }

    _onClose() {
        this._sendData()
    }

    _onMessage (result: any = {}) {
        const { data } = result
        if (data instanceof ArrayBuffer) {
            this._sendData(data)
        } else if (data instanceof Blob) {
            const reader = new FileReader()
            reader.onload = () => {
                this._sendData(reader.result)
            }
            reader.readAsArrayBuffer(data)
        }
    }

    run () {
        this._ws = this.initWsObj()
    }

    cancel () {
        if (this.isCancelAble) {
            this._ws.close()
            this._ws = null
        }
    }

    get isCancelAble () {
        const { _ws: ws } = this
        return ws && ws.readyState === 0 && ws.readyState === 1
    }

}
