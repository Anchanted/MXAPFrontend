export function easeOutBack (t, b, c, d, s) {
  if (s == undefined) s = 1.70158;
  return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
}

export function easeOutElastic (t, b, c, d) {
  var s=1.70158;var p=0;var a=c;
  if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
  if (a < Math.abs(c)) { a=c; var s=p/4; }
  else var s = p/(2*Math.PI) * Math.asin (c/a);
  return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
}

export function easeOutCirc (t, b, c, d) {
  return c * Math.sqrt(1 - (t=t/d-1)*t) + b;
}

export function titleCase(s) {  
  return s.toLowerCase().split(/\s+/).map(function(item, index) {  
      return item.slice(0, 1).toUpperCase() + item.slice(1);  
  }).join(' ');  
}

