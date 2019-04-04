import 'promise-polyfill/src/polyfill'
import { Events, VideoEvents, WorkerEvents } from '../events'
import Controller from './controller'

const ctx: Worker = self as any
let controller: Controller = null

ctx.addEventListener('message', (event: any) => {
    const sign = event.data.sign
    const config = event.data.config
    switch (sign) {
        case WorkerEvents.INIT:
            controller = new Controller(config)
            controller.on(Events.IO_ERROR, onIOError.bind(this))
            controller.on(Events.DEMUX_ERROR, onDemuxError.bind(this))
            controller.on(Events.INIT_SEGMENT, onInitSegment.bind(this))
            controller.on(Events.MEDIA_SEGMENT, onMediaSegment.bind(this))
            controller.on(Events.LOADING_COMPLETE, onLoadingComplete.bind(this))
            controller.on(
                Events.RECOVERED_EARLY_EOF,
                onRecoveredEarlyEof.bind(this)
            )
            controller.on(Events.MEDIA_INFO, onMediaInfo.bind(this))
            controller.on(Events.METADATA_ARRIVED, onMetaDataArrived.bind(this))
            controller.on(
                Events.SCRIPTDATA_ARRIVED,
                onScriptDataArrived.bind(this)
            )
            controller.on(Events.STATISTICS_INFO, onStatisticsInfo.bind(this))
            controller.on(
                Events.RECOMMEND_SEEKPOINT,
                onRecommendSeekpoint.bind(this)
            )
            break
        case 'destroy':
            if (controller) {
                controller.destroy()
                controller = null
            }
            ctx.postMessage({ msg: 'destroyed' })
            break
        case 'seek':
            controller.seek(event.data.param)
            break
        case 'pause':
            controller.pause()
            break
        case 'resume':
            controller.resume()
            break
        case VideoEvents.TIMEUPDATE:
            controller.timeUpdate(config)
            break
        case VideoEvents.SEEKING:
            controller.seek(config)
            break
        case 'logging_config': {
            // LoggingControl.applyConfig(config)

            // if (config.enableCallback === true) {
            //     LoggingControl.addLogListener(logcatListener)
            // } else {
            //     LoggingControl.removeLogListener(logcatListener)
            // }
            break
        }
    }
})

function onInitSegment(initSegment: any) {
    const obj: any = {
        msg: Events.INIT_SEGMENT,
        data: initSegment
    }
    ctx.postMessage(obj, [initSegment.data]) // data: ArrayBuffer
}

function onMediaSegment(mediaSegment: any) {
    const obj = {
        msg: Events.MEDIA_SEGMENT,
        data: mediaSegment
    }
    ctx.postMessage(obj, [mediaSegment.data]) // data: ArrayBuffer
}

function onLoadingComplete() {
    const obj = {
        msg: Events.LOADING_COMPLETE
    }
    ctx.postMessage(obj)
}

function onRecoveredEarlyEof() {
    const obj = {
        msg: Events.RECOVERED_EARLY_EOF
    }
    ctx.postMessage(obj)
}

function onMediaInfo(mediaInfo: any) {
    const obj = {
        msg: Events.MEDIA_INFO,
        data: mediaInfo
    }
    ctx.postMessage(obj)
}

function onMetaDataArrived(metadata: any) {
    const obj = {
        msg: Events.METADATA_ARRIVED,
        data: metadata
    }
    ctx.postMessage(obj)
}

function onScriptDataArrived(data: any) {
    const obj = {
        data,
        msg: Events.SCRIPTDATA_ARRIVED
    }
    ctx.postMessage(obj)
}

function onStatisticsInfo(statInfo: any) {
    const obj = {
        msg: Events.STATISTICS_INFO,
        data: statInfo
    }
    ctx.postMessage(obj)
}

function onIOError(type: any, info: any) {
    ctx.postMessage({
        msg: Events.IO_ERROR,
        data: {
            type,
            info
        }
    })
}

function onDemuxError(type: any, info: any) {
    ctx.postMessage({
        msg: Events.DEMUX_ERROR,
        data: {
            type,
            info
        }
    })
}

function onRecommendSeekpoint(milliseconds: number) {
    ctx.postMessage({
        msg: Events.RECOMMEND_SEEKPOINT,
        data: milliseconds
    })
}

// function onLogcatCallback(type: any, str: any) {
//     ctx.postMessage({
//         msg: 'logcat_callback',
//         data: {
//             type,
//             logcat: str
//         }
//     })
// }
