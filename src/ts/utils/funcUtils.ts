export const debounce = (func: Function, wait: number, immediate: boolean) => {
    let timeout: number
    let result: number

    const debounced = () => {
        if (timeout) {
            clearTimeout(timeout)
        }
        if (immediate) {
            const callNow = !timeout
            timeout = setTimeout(func, wait)
            if (callNow) {
                result = func()
            }
        } else {
            timeout = setTimeout(func, wait)
        }

        return result
    }

    debounced.cancel = () => {
        clearTimeout(timeout)
        timeout = null
    }
    return debounced
}

export const cacheWrapper = (fn: Function) => {
    const cache = {}
    return (...args: any) => {
        const key = args.reduce((pre: string, cur: string) => {
            return `${pre}_${cur}`
        }, '')
        const result = fn(...args)
        if (cache[key] !== undefined) {
            return cache[key]
        } else {
            cache[key] = result
            return result
        }
    }
}
