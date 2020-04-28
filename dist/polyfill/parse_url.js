"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function parse_url(url) {
    var match = url.match(/^(http|https|ftp|dialog|command|)?(?:[\:\/]*)([a-z0-9\.-]*)(?:\:([0-9]+))?(\/[^?#]*)?(?:\?([^#]*))?(?:#(.*))?$/i);
    var ret = new Object();
    ret['protocol'] = '';
    ret['hostname'] = match[2];
    ret['port'] = '';
    ret['pathname'] = '';
    ret['query'] = '';
    ret['hash'] = '';
    if (match[1]) {
        ret['protocol'] = `${match[1]}:`;
    }
    if (match[3]) {
        ret['port'] = match[3];
    }
    if (match[4]) {
        ret['pathname'] = match[4];
    }
    else if (match[2]) {
        ret['hostname'] = undefined;
        ret['pathname'] = match[2];
    }
    if (match[5]) {
        ret['query'] = `?${match[5]}`;
    }
    if (match[6]) {
        ret['hash'] = `#${match[6]}`;
    }
    return ret;
}
exports.parse_url = parse_url;
