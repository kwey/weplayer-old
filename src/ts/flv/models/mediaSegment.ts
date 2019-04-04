export default class MediaSegment {
    startDts: any
    endDts: any
    startPts: any
    endPts: any
    originStartDts: any
    originEndDts: any
    randomAccessPoints: any
    firstSample: any
    lastSample: any
    gap: any

    constructor() {
        this.startDts = -1
        this.endDts = -1
        this.startPts = -1
        this.endPts = -1
        this.originStartDts = -1
        this.originEndDts = -1
        this.randomAccessPoints = []
        this.firstSample = null
        this.lastSample = null
    }

    addRAP(sample: any) {
        sample.isRAP = true
        this.randomAccessPoints.push(sample)
    }
}
