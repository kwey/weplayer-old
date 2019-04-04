import EventEmitter from '../plugins/event-emitter'
import Errors from './models/error'
import Store from './models/store'

export default class Muxer extends EventEmitter {
    store: Store
    name: string

    constructor(store: Store, name: string = 'muxer') {
        super()
        if (store) {
            this.store = store
        }
        this.name = name
    }
    emitError(
        type: any,
        errorDetail: any = { line: '', handle: '', msg: '', version: '' }
    ) {
        const { controller, state } = this.store
        if (controller) {
            const errorToEmit = new Errors(
                type,
                state.duration,
                '',
                true,
                controller.config.url,
                errorDetail
            )
            controller.emit('error', errorToEmit)
        }
    }
    dispatch(type: string, ...payload: any) {
        this.emit(`${this.name}_${type}`, ...payload)
    }
    error(message: string) {
        console.error(`[${this.name} error] `, message)
    }

    info(message: string) {
        console.log(`[${this.name} info] `, message)
    }

    log(message: string) {
        console.log(`[${this.name} log] `, message)
    }

    warn(message: string) {
        console.warn(`[${this.name} warn] `, message)
    }
}
