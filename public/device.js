var deviceChar;
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i.test(navigator.userAgent)) {
    deviceChar = 'm';
} else {
    deviceChar = 'd';
}
var origin = window.location.origin ? window.location.origin : `${window.location.protocol}//${window.location.host}`;
var prefix = `${origin}/${deviceChar}/`;
var href = window.location.href;
if (href.length <= origin.length) href += '/';
if (`${href}/`.indexOf(prefix) !== 0) {
    var found = href.slice(`${origin}/`.length).match(/^([md]\/)?(.*)$/i);
    window.location.replace(`${prefix}${found ? found[2] : ''}`);
}