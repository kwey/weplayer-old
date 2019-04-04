const le = (() => {
    const buf = new ArrayBuffer(2)
    new DataView(buf).setInt16(0, 256, true) // little-endian write
    return new Int16Array(buf)[0] === 256 // platform-spec read, if equal then LE
})()

const sniffer = {
    get device() {
        const r = sniffer.os
        return r.isPc ? 'pc' : r.isTablet ? 'tablet' : 'mobile'
    },
    get browser() {
        const ua = navigator.userAgent.toLowerCase()
        const reg = {
            ie: /rv:([\d.]+)\) like gecko/,
            firfox: /firefox\/([\d.]+)/,
            chrome: /chrome\/([\d.]+)/,
            opera: /opera.([\d.]+)/,
            safari: /version\/([\d.]+).*safari/
        }
        return [].concat(Object.keys(reg).filter(key => reg[key].test(ua)))[0]
    },
    get os() {
        const ua = navigator.userAgent
        const isWindowsPhone = /(?:Windows Phone)/.test(ua)
        const isSymbian = /(?:SymbianOS)/.test(ua) || isWindowsPhone
        const isAndroid = /(?:Android)/.test(ua)
        const isFireFox = /(?:Firefox)/.test(ua)
        const isTablet =
            /(?:iPad|PlayBook)/.test(ua) ||
            (isAndroid && !/(?:Mobile)/.test(ua)) ||
            (isFireFox && /(?:Tablet)/.test(ua))
        const isPhone = /(?:iPhone)/.test(ua) && !isTablet
        const isPc = !isPhone && !isAndroid && !isSymbian
        return {
            isTablet,
            isPhone,
            isAndroid,
            isPc,
            isSymbian,
            isWindowsPhone,
            isFireFox
        }
    },
    get isLe() {
        return le
    }
}

export default sniffer
