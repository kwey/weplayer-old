export default {
    createDom(el = 'div', tpl = '', attrs = {}, cname = '') {
        const dom: any = document.createElement(el)
        dom.className = cname
        dom.innerHTML = tpl
        Object.keys(attrs).forEach(item => {
            const key = item
            const value = attrs[item]
            if (el === 'video' || el === 'audio') {
                if (value) {
                    dom.setAttribute(key, value)
                }
            } else {
                dom.setAttribute(key, value)
            }
        })
        return dom
    },

    hasClass(el: HTMLElement, className: string) {
        if (el.classList) {
            return Array.prototype.some.call(el.classList, (item: string) => item === className)
        } else {
            return !!el.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'))
        }
    },

    addClass(el: HTMLElement, className: string) {
        if (el.classList) {
            className
                .replace(/(^\s+|\s+$)/g, '')
                .split(/\s+/g)
                .forEach(item => {
                    item && el.classList.add(item)
                })
        } else if (!this.hasClass(el, className)) {
            el.className += ' ' + className
        }
    },

    removeClass(el: HTMLElement, className: string) {
        if (el.classList) {
            className.split(/\s+/g).forEach(item => {
                el.classList.remove(item)
            })
        } else if (this.hasClass(el, className)) {
            className.split(/\s+/g).forEach(item => {
                const reg = new RegExp('(\\s|^)' + item + '(\\s|$)')
                el.className = el.className.replace(reg, ' ')
            })
        }
    },

    toggleClass(el: HTMLElement, className: string) {
        className.split(/\s+/g).forEach(item => {
            if (this.hasClass(el, item)) {
                this.removeClass(el, item)
            } else {
                this.addClass(el, item)
            }
        })
    },

    findDom(el = document, sel: string) {
        return el.querySelector(sel)
    },

    padStart(str: string, length: number, pad: string) {
        const charstr = String(pad)
        const len = length >> 0
        const chars = []
        const r = String(str)
        let maxlen = Math.ceil(len / charstr.length)
        while (maxlen--) {
            chars.push(charstr)
        }
        return chars.join('').substring(0, len - r.length) + r
    },

    format(time: number) {
        if (window.isNaN(time)) {
            return ''
        }
        const hour = this.padStart(Math.floor(time / 3600), 2, 0)
        const minute = this.padStart(Math.floor((time - hour * 3600) / 60), 2, 0)
        const second = this.padStart(Math.floor(time - hour * 3600 - minute * 60), 2, 0)
        return (hour === '00' ? [minute, second] : [hour, minute, second]).join(':')
    },

    event(e: any) {
        if (e.touches) {
            const touch = e.touches[0] || e.changedTouches[0]
            e.clientX = touch.clientX || 0
            e.clientY = touch.clientY || 0
            e.offsetX = touch.pageX - touch.target.offsetLeft
            e.offsetY = touch.pageY - touch.target.offsetTop
        }
        e._target = e.target || e.srcElement
    },

    typeOf(obj: string) {
        return Object.prototype.toString.call(obj).match(/([^\s.*]+)(?=]$)/g)[0]
    },

    deepCopy(dst: any, src: any) {
        if (this.typeOf(src) === 'Object' && this.typeOf(dst) === 'Object') {
            Object.keys(src).forEach(key => {
                if (this.typeOf(src[key]) === 'Object' && !(src[key] instanceof Node)) {
                    if (!dst[key]) {
                        dst[key] = src[key]
                    } else {
                        this.deepCopy(dst[key], src[key])
                    }
                } else if (this.typeOf(src[key]) === 'Array') {
                    dst[key] =
                        this.typeOf(dst[key]) === 'Array' ? dst[key].concat(src[key]) : src[key]
                } else {
                    dst[key] = src[key]
                }
            })
            return dst
        }
    },

    getBgImage(el: any) {
        const a = document.createElement('a')
        const url = (el.currentStyle || window.getComputedStyle(el, null)).backgroundImage
        a.href = url.replace(/url\("|"\)/g, '')
        return a.href
    },

    copyDom(dom: HTMLElement) {
        if (dom && dom.nodeType === 1) {
            const back = document.createElement(dom.tagName)
            Array.prototype.forEach.call(dom.attributes, (node: any) => {
                back.setAttribute(node.name, node.value)
            })
            return back
        } else {
            return ''
        }
    },
    concatTypedArray(ResultConstructor: any, ...arrays: any) {
        let totalLength = 0
        for (const arr of arrays) {
            totalLength += arr.length
        }
        const result = new ResultConstructor(totalLength)
        let offset = 0
        for (const arr of arrays) {
            result.set(arr, offset)
            offset += arr.length
        }
        return result
    },
    limit(fn: Function, wait: number = 1000, debounce: boolean = false) {
        let timeout: number
        return () => {
            const throttler = () => {
                timeout = null
                fn()
            }
            if (debounce) clearTimeout(timeout)
            if (debounce || !timeout) timeout = window.setTimeout(throttler, wait)
        }
    },
    // throttle(fn: Function, wait: number = 1000) {
    //     return this.limit(fn, wait)
    // },
    throttle(fn: Function, wait: number = 1000) {
        let _lastTime = 0
        return () => {
            const _nowTime = Date.now()
            if (_nowTime - _lastTime > wait || !_lastTime) {
                fn()
                _lastTime = _nowTime
            }
        }
    }
}
