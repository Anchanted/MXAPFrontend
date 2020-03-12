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

export function arrowAnimation (t, c, d) {
  if (t / d <= 0.35) return (c / (0.35 * d)) * t
  else if (t / d <= 0.7) return -(c / (0.35 * d)) * t + 2 * c
  else return 0
}

export function locationAnimation (t, c, d) {
  if (t / d <= 0.25) return (c / (0.25 * d)) * t
  else if (t / d <= 0.75) return c
  else if (t / d < 1) return (c / (0.25 * d)) * (d - t)
  else return 0
}

export function titleCase(s) {  
  return s.toLowerCase().split(/\s+/).map(function(item, index) {  
      return item.slice(0, 1).toUpperCase() + item.slice(1);  
  }).join(' ');  
}

export function getCentroid (coordsStr) {
  const coordsArr = coordsStr.split(",");
  const coordsArrLength = coordsArr.length;
  const vertexArr = [];

  for (let i=0; i<coordsArrLength; i=i+2) {
    if (coordsArr[i]!=""&&coordsArr[i+1]!="") {
      vertexArr.push({
        x: parseInt(coordsArr[i]),
        y: parseInt(coordsArr[i+1]),
      });
    }
  }

  const vertexArrLength = vertexArr.length;
  let subAreaSum = 0;
  let subCentroidXSum = 0;
  let subCentroidYSum = 0;

  for(let i=2; i<vertexArrLength; i++){
    const p0 = vertexArr[0];
    const p1 = vertexArr[i-1];
    const p2 = vertexArr[i];
    const subArea = (p0.x*p1.y + p1.x*p2.y + p2.x*p0.y - p1.x*p0.y - p2.x*p1.y - p0.x*p2.y)/2;
    const subCentroidX = (p0.x+p1.x+p2.x)/3;
    const subCentroidY = (p0.y+p1.y+p2.y)/3;

    subAreaSum += subArea;
    subCentroidXSum += subCentroidX*subArea;
    subCentroidYSum += subCentroidY*subArea;
  }

  return {
    x: subCentroidXSum/subAreaSum,
    y: subCentroidYSum/subAreaSum,
  }
}
