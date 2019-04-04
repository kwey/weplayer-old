import XHRLoader from './loaders/XHR'
import FetchLoader from './loaders/fetch'
const Loader = (() => {
    if (fetch) {
        return FetchLoader
    }
    return XHRLoader
})()
const queue: VodTask[] = []
const limit = 2

class VodTask {
    url: string
    range: number[]
    id: string
    on: boolean
    loader: any
    isCanceled: boolean

    constructor(url: string, range: number[], headers: any) {
        this.url = url
        this.range = range
        this.id = range.join('-')
        this.on = false
        this.loader = new Loader(url, range, headers)
        this.isCanceled = false
        queue.push(this)
        this.update()
    }

    cancel() {
        this.isCanceled = true
        this.loader.cancel()
    }

    remove(loader?: any) {
        queue.filter((item, idx) => {
            if (item.url === loader.url && item.id === loader.id) {
                queue.splice(idx, 1)
                return true
            } else {
                return false
            }
        })
        this.update()
    }

    update() {
        const sended = queue.filter(item => item.on)
        const wait = queue.filter(item => !item.on)
        const max = limit - sended.length
        wait.forEach((item, idx) => {
            if (idx < max) {
                item.run()
            }
        })
    }

    run() {
        if (this.loader.readyState === 1) {
            this.on = true
            this.loader.run()
        } else {
            this.remove()
        }
    }

    clear() {
        queue.forEach(item => {
            if (!item.loader.complete) {
                item.cancel()
            }
        })
        queue.length = 0
    }

    get promise() {
        return this.loader.promise
    }
    get timeStamp() {
        return this.loader.timeStamp
    }
}

export default VodTask
