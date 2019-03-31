
interface EventsInterface {
    [key: string]: Function[]
}
class EventEmitter {
    __ee__: EventsInterface
    __eeOnce__: EventsInterface

    constructor() {
        this.__eeOnce__ = {}
        this.__ee__ = {}
    }
    on(type: string, listener: Function) {
        this.addEvents(this.__ee__, type, listener)
        return this
    }
    once(type: string, listener: Function) {
        this.addEvents(this.__eeOnce__, type, listener)
    }
    off(type: string, listener: Function) {
        const ee = this.__ee__[type]
        const eeOnce = this.__eeOnce__[type]

        if (ee && ee.length > 0) {
            ee.forEach((handler: Function, index: number) => {
                if (handler === listener) {
                    this.__ee__[type] = ee.splice(index, 1)
                }
            })
        }
        if (eeOnce && eeOnce.length > 0) {
            eeOnce.forEach((handler: Function, index: number) => {
                if (handler === listener) {
                    this.__eeOnce__[type] = eeOnce.splice(index, 1)
                }
            })
        }
        return this
    }
    emit(type: string, ...arg: any) {
        const ee = this.__ee__[type]
        const eeOnce = this.__eeOnce__[type]
        if (ee && ee.length > 0) {
            ee.forEach((handler: Function) => {
                if (typeof handler === 'function') {
                    handler(...arg)
                }
            })
        }
        if (eeOnce && eeOnce.length > 0) {
            eeOnce.forEach((handler: Function, index: number) => {
                if (typeof handler === 'function') {
                    handler(...arg)
                    this.__eeOnce__[type] = eeOnce.splice(index, 1)
                }
            })
        }
    }
    destroy() {
        this.__ee__ = {}
        this.__eeOnce__ = {}
    }
    private addEvents(data: EventsInterface, type: string, listener: Function) {
        if (!data[type]) {
            data[type] = [listener]
        } else {
            data[type].push(listener)
        }
    }
}

export default EventEmitter
