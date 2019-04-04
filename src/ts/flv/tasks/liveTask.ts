class LiveTask {
    _stop: boolean
    request: Request

    constructor(url: string, config: any) {
        const _headers = new self.Headers()

        const _config = {
            headers: { ..._headers },
            method: 'GET',
            cache: 'default',
            mode: 'cors'
        }
        this._stop = false
        this.request = new Request(url, {
            ..._config,
            ...config
        })
    }

    run(callback: Function) {
        function resolve(reader: any) {
            reader.read().then((result: any) => {
                if (this._stop) {
                    reader.cancel()
                    return
                }
                callback(result.done ? undefined : result.value)
                resolve(reader)
            })
        }

        const prom = new Promise((resolve, reject) => {
            let isTimeout = true

            fetch(this.request).then(res => {
                isTimeout = false
                resolve(res)
            })
            setTimeout(() => {
                isTimeout && reject()
            }, 5000)
        })

        prom.then((res: any) => {
            const reader = res.body.getReader()
            resolve(reader)
        }).catch(err => {
            callback(err)
        })

        return this
    }
    cancel() {
        this._stop = true
    }
}

export default LiveTask
