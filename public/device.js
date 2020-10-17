if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i.test(navigator.userAgent)) {
    console.log("mobile");
} else {
    console.log("desktop");
}
console.log(window.location.origin);
console.log(window.location.protocol);
console.log(window.location.host);
console.log(window.location.href);