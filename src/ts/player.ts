
import { ConfigInterface } from '..';
import Controller from './controller';

class Player {
    prefix: string;
    container: HTMLElement;
    controller: Controller;

    constructor(config: ConfigInterface) {
        this.container = document.querySelector(config.id);
        this.prefix = 'kwe-player';
        this.container.classList.add(this.prefix);
        this.init();
    }

    init() {
        this.controller = new Controller({});
    }
}

export default Player;
