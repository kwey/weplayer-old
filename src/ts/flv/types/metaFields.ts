const fields = [
    {
        name: 'duration',
        type: Boolean,
        parser(target: any, origin: any) {
            target.mediaInfo.duration = origin.duration
        }
    },
    {
        name: 'hasAudio',
        type: Boolean,
        parser(target: any, origin: any) {
            target.mediaInfo.hasAudio = origin.hasAudio
        }
    },
    {
        name: 'hasVideo',
        type: Boolean,
        parser(target: any, origin: any) {
            target.mediaInfo.hasVideo = origin.hasVideo
        }
    },
    {
        name: 'audiodatarate',
        type: Number,
        parser(target: any, origin: any) {
            target.mediaInfo.audioDataRate = origin.audiodatarate
        }
    },
    {
        name: 'videodatarate',
        type: Number,
        parser(target: any, origin: any) {
            target.mediaInfo.videoDataRate = origin.videodatarate
        }
    },
    {
        name: 'width',
        type: Number,
        parser(target: any, origin: any) {
            target.mediaInfo.width = origin.width
        }
    },
    {
        name: 'height',
        type: Number,
        parser(target: any, origin: any) {
            target.mediaInfo.height = origin.height
        }
    },
    {
        name: 'duration',
        type: Number,
        parser(target: any, origin: any) {
            if (!target.state.duration) {
                const duration = Math.floor(
                    origin.duration * target.state.timeScale
                )
                target.state.duration = target.mediaInfo.duration = duration
            }
        },
        onTypeErr(target: any) {
            target.mediaInfo.duration = 0
        }
    },
    {
        name: 'framerate',
        type: Number,
        parser(target: any, origin: any) {
            const fpsNum = Math.floor(origin.framerate * 1000)
            if (fpsNum > 0) {
                const fps = fpsNum / 1000
                const { referFrameRate, mediaInfo } = target
                referFrameRate.fixed = true
                referFrameRate.fps = fps
                referFrameRate.fpsNum = fpsNum
                referFrameRate.fpsDen = 1000
                mediaInfo.fps = fps
            }
        }
    },
    {
        name: 'keyframes',
        type: Object,
        parser(target: any, origin: any) {
            const { keyframes } = origin
            target.mediaInfo.hasKeyframes = !!keyframes
            if (keyframes) {
                target.mediaInfo.keyframes = this._parseKeyframes(keyframes)
            }
            origin.keyframes = null
        },
        onTypeErr(target: any) {
            target.mediaInfo.hasKeyframes = false
        }
    }
]
export default fields
