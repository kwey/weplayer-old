

const queue: any[] = []
const limit = 2
class Task {
  url: string
  range: number[]
  id: string
  on: boolean
  xhr: any

  constructor (url: string, range: number[], callback: Function) {
    this.url = url
    this.range = range
    this.id = range.join('-')
    this.on = false
    const xhr = new window.XMLHttpRequest()
    xhr.target = this
    xhr.responseType = 'arraybuffer'
    xhr.open('get', url)
    xhr.setRequestHeader('Range', `bytes=${range[0]}-${range[1]}`)
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 206) {
        if (callback && callback instanceof Function) {
          callback(xhr.response)
        }
      }
      xhr.target.remove()
    }
    xhr.onerror = () => {
      // xhr.target.emit('error', new Errors('network', '', {line: 25, handle: '[Task] constructor', msg: e.message, url}))
      xhr.target.remove()
    }
    xhr.onabort = () => {
      xhr.target.remove()
    }
    this.xhr = xhr
    queue.push(this)
    this.update()
  }
  cancel () {
    this.xhr.abort()
  }

  remove () {
    queue.filter((item, idx) => {
      if (item.url === this.url && item.id === this.id) {
        queue.splice(idx, 1)
        return true
      } else {
        return false
      }
    })
    this.update()
  }

  update () {
    const sended = queue.filter((item) => item.on)
    const wait = queue.filter(item => !item.on)
    const max = limit - sended.length
    wait.forEach((item, idx) => {
      if (idx < max) {
        item.run()
      }
    })
  }

  run () {
    if (this.xhr.readyState === 1) {
      this.on = true
      this.xhr.send()
    } else {
      this.remove()
    }
  }

  static clear () {
    queue.forEach(item => {
      if (item.on) {
        item.cancel()
      }
    })
    queue.length = 0
  }
}

export default Task
