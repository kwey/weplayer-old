export default class MediaSample {
    constructor(info: any) {
        const _default = MediaSample.getDefaultInf()

        if (
            !info ||
            Object.prototype.toString.call(info) !== '[object Object]'
        ) {
            return _default
        }
        const sample = {
            ..._default,
            ...info
        }

        Object.entries(sample).forEach(([k, v]) => {
            this[k] = v
        })
    }

    static getDefaultInf(): any {
        return {
            dts: null,
            pts: null,
            duration: null,
            position: null,
            isRAP: false, // is Random access point
            originDts: null
        }
    }
}
