export default class XHRLoader {
    url: string
    _xhr: any
    _promise: any
    header: any

    constructor(url: string, range: number[], header?: any) {
        this.header = header
        this.url = url
        const xhr = new XMLHttpRequest()
        xhr.open('get', url)
        xhr.responseType = 'arraybuffer'
        xhr.setRequestHeader('Range', `bytes=${range[0]}-${range[1]}`)
        // xhr.onabort = () => {
        //     VodTask.remove(this)
        // }
        this._promise = new Promise((resolve, reject) => {
            xhr.onload = () => {
                if (xhr.status === 200 || xhr.status === 206) {
                    resolve(xhr.response)
                }
            }
            xhr.onerror = e => {
                reject(e)
            }
        })

        this._xhr = xhr
    }

    get promise() {
        return this._promise
    }

    get readyState() {
        return this._xhr.readyState
    }

    run() {
        this._xhr.send()
    }

    cancel() {
        this._xhr.abort()
    }
}
