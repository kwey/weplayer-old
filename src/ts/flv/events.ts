

export const Events = {
    IO_ERROR: 'io_error',
    DEMUX_ERROR: 'demux_error',
    INIT_SEGMENT: 'init_segment',
    MEDIA_SEGMENT: 'media_segment',
    LOADING_COMPLETE: 'loading_complete',
    RECOVERED_EARLY_EOF: 'recovered_early_eof',
    MEDIA_INFO: 'media_info',
    METADATA_ARRIVED: 'metadata_arrived',
    SCRIPTDATA_ARRIVED: 'scriptdata_arrived',
    STATISTICS_INFO: 'statistics_info',
    RECOMMEND_SEEKPOINT: 'recommend_seekpoint',
    ERROR: 'error'
}

export const ReadyEvents = {
    DATA_READY: 'data_ready',
    META_DATA_READY: 'meta_data_ready',
    TRACK_META_READY: 'track_meta_ready',
    MEDIA_INFO_READY: 'media_info_ready',
    META_END_POSITION: 'meta_end_position',
}
export const MseEvents = {
    SOURCE_OPEN: 'sourceopen',
    SOURCE_CLOSE: 'sourceclose',
    UPDATE_END: 'updateend',
}
export const VideoEvents = {
    PLAY: 'play',
    PLAYING: 'playing',
    PAUSE: 'pause',
    ENDED: 'ended',
    SEEKING: 'seeking',
    SEEKED: 'seeked',
    TIMEUPDATE: 'timeupdate',
    WATING: 'waiting',
    CANPLAY: 'canplay',
    THROUGH: 'canplaythrough',
    DURATION_CHANGE: 'durationchange',
    VOLUME_CHANGE: 'volumechange',
    LOADED_DATA: 'loadeddata'
}
export const WorkerEvents = {
    INIT: 'init',
}