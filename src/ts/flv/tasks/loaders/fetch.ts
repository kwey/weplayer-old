export default class FetchLoader {
    url: any
    on: any
    complete: any
    isStopped: any
    timeStamp: any
    request: any
    byteLength: any
    _promise: any

    constructor(url: string, range: number[], config = {}) {
        this.url = url
        this.on = false
        this.complete = false
        this.isStopped = false
        this.timeStamp = Date.now()

        const _config: any = {
            headers: {
                Range: `bytes=${range[0]}-${range[1]}`
            },
            method: 'GET',
            cache: 'default',
            mode: 'cors'
        }

        this.request = () => {
            this.on = true
            return fetch(url, {
                ..._config,
                ...config
            })
                .then((res: any) => {
                    if (res.status > 299 || res.status < 200 || !res.ok) {
                        this.complete = true
                        return Promise.reject(
                            new Error(`url ${res.status} ${res.statusText}`)
                        )
                    }
                    return Promise.resolve(res)
                })
                .then(res => res.arrayBuffer())
                .then(buffer => {
                    this.complete = true
                    this.byteLength = buffer.byteLength
                    if (this.isStopped) return {}
                    return {
                        buffer,
                        timeStamp: this.timeStamp
                    }
                })
        }
    }

    run() {
        this._promise = this.request()
    }

    get readyState() {
        return 1
    }

    cancel() {
        this.isStopped = true
    }

    get promise() {
        return this.on ? this._promise : this.request()
    }
}
