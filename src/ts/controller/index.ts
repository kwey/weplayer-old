
import * as EventEmitter from 'event-emitter';
import util from '../utils';



class Controller {
    config: any;
    paused: boolean;


    constructor(options: any) {
        this.config = util.deepCopy({
            width: 600,
            height: 337.5,
            ignores: [],
            whitelist: [],
            lang: (document.documentElement.getAttribute('lang') || navigator.language || 'zh-cn').toLocaleLowerCase(),
            inactive: 3000,
            volume: 0.6,
            controls: true,
            controlsList: ['nodownload']
        }, options);
        EventEmitter(this);
    }

    play() {
        console.log('play');
    }
    pause() {
        console.log('play');
    }
    seek() {
        console.log('seek');
    }


}

    // Player.util = util
    // Player.sniffer = sniffer
    // Player.Errors = Errors

export default Controller;
