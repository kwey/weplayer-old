export default class MediaInfo {
    mimeType: any = null
    codec: string = ''
    duration: any = null
    hasAudio: boolean = false
    hasVideo: boolean = false
    audioCodec: any = null
    videoCodec: any = null

    videoDataRate: any = null
    audioDataRate: any = null
    audioSampleRate: any = null
    audioChannelCount: any = null
    audioConfig: any = null

    width: any = null
    height: any = null
    fps: any = null
    profile: any = null
    level: any = null
    chromaFormat: any = null

    pixelRatio: any = []

    _metaData: any = null
    segments: any = []
    hasKeyframes: any = null
    keyframes: any = []

    get isComplete() {
        const { mimeType, duration, hasKeyframes } = this
        return (
            mimeType !== null &&
            duration !== null &&
            hasKeyframes !== null &&
            this.isVideoInfoFilled &&
            this.isAudioInfoFilled
        )
    }
    get isAudioInfoFilled() {
        const {
            hasAudio,
            audioCodec,
            audioSampleRate,
            audioChannelCount
        } = this

        return !!(
            !hasAudio ||
            (hasAudio && audioCodec && audioSampleRate && audioChannelCount)
        )
    }

    get isVideoInfoFilled() {
        const notNullFields = [
            'videoCodec',
            'width',
            'height',
            'fps',
            'profile',
            'level',
            'chromaFormat'
        ]
        for (let i = 0, len = notNullFields.length; i < len; i++) {
            if (this[notNullFields[i]] === null) {
                return false
            }
        }

        return this.hasVideo
    }
}
