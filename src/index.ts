/// <reference path='../types/index.d.ts'/>

import './static/index.less';

import player from './ts/player';
import { metadata, DataInterface } from './metadata';

export interface ConfigInterface {
    id: string;
    name: string;
    metadata?: DataInterface;
}

class WEPlayer {
    constructor(config: any) {
        config.metadata = metadata;
        new player(config);
    }
}

export default WEPlayer;
