// canvas.ts
class Line {
  norm;
  d;
  a;
  b;
  c;
  nnx;
  nny;
  t1;
  t2;
  dash;
  constructor(normal_angle_deg, d = 0) {
    this.norm = normal_angle_deg;
    this.d = d;
    const rad = normal_angle_deg * Math.PI / 180;
    this.a = Math.cos(rad);
    this.b = Math.sin(rad);
    this.nnx = this.a;
    this.nny = this.b;
    this.t1 = Math.random() > 0.5;
    this.t2 = Math.random() > 0.5;
    this.dash = Math.random() * 20;
    this.c = 0;
    this.updateParams();
  }
  updateParams() {
    this.c = this.d - this.a * cx - this.b * cy;
  }
}
var canvas = document.getElementById("canvas");
if (!canvas)
  throw new Error("canvas#canvas missing");
var ctx = canvas.getContext("2d");
if (!ctx)
  throw new Error("2D context unavailable");
var w = window.innerWidth;
var h = window.innerHeight;
var cx = w / 2;
var cy = h / 2;
canvas.width = w;
canvas.height = h;
var viewport = [
  { x: 0, y: 0 },
  { x: w, y: 0 },
  { x: w, y: h },
  { x: 0, y: h }
];
var lines = [];
var hover = null;
var cside = 0;
var selected = null;
var hside = 0;
function updateViewport() {
  w = window.innerWidth;
  h = window.innerHeight;
  cx = w / 2;
  cy = h / 2;
  canvas.width = w;
  canvas.height = h;
  viewport = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h }
  ];
  lines.forEach((line) => line.updateParams());
}
function getIntersection(p1, p2, a, b, c) {
  const f1 = a * p1.x + b * p1.y + c, f2 = a * p2.x + b * p2.y + c;
  const denom = f2 - f1;
  if (Math.abs(denom) < 0.000000000001)
    return null;
  const t = -f1 / denom;
  return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
}
function clipToHalfPlane(points, a, b, c) {
  const out = [];
  const n = points.length;
  if (n === 0)
    return out;
  for (let i = 0;i < n; i++) {
    const curr = points[i], prev = points[(i + n - 1) % n];
    const currF = a * curr.x + b * curr.y + c, prevF = a * prev.x + b * prev.y + c;
    const currIn = currF >= 0, prevIn = prevF >= 0;
    if (prevIn) {
      if (currIn)
        out.push(curr);
      else {
        const ip = getIntersection(prev, curr, a, b, c);
        if (ip)
          out.push(ip);
      }
    } else {
      if (currIn) {
        const ip = getIntersection(prev, curr, a, b, c);
        if (ip)
          out.push(ip);
        out.push(curr);
      }
    }
  }
  return out;
}
function polygonArea(points) {
  return points.reduce((acc, p, i) => acc + p.x * points[(i + 1) % points.length].y - points[(i + 1) % points.length].x * p.y, 0) / 2;
}
function insetPolygon(points, dist) {
  if (points.length < 3)
    return [];
  if (polygonArea(points) < 0)
    points = points.slice().reverse();
  const res = [];
  const n = points.length;
  for (let i = 0;i < n; i++) {
    const prev = points[(i + n - 1) % n], curr = points[i], next = points[(i + 1) % n];
    let dx1 = curr.x - prev.x, dy1 = curr.y - prev.y, len1 = Math.hypot(dx1, dy1);
    if (len1 < 0.000001)
      continue;
    let nx1 = -dy1 / len1, ny1 = dx1 / len1;
    let dx2 = next.x - curr.x, dy2 = next.y - curr.y, len2 = Math.hypot(dx2, dy2);
    if (len2 < 0.000001)
      continue;
    let nx2 = -dy2 / len2, ny2 = dx2 / len2;
    const ox1 = prev.x + nx1 * dist, oy1 = prev.y + ny1 * dist;
    const ox2 = curr.x + nx2 * dist, oy2 = curr.y + ny2 * dist;
    const det = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(det) < 0.000001)
      continue;
    const t = ((ox2 - ox1) * dy2 - (oy2 - oy1) * dx2) / det;
    res.push({ x: ox1 + t * dx1, y: oy1 + t * dy1 });
  }
  return res;
}
function pointInPolygon(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1;i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    const intersect = yi > pt.y !== yj > pt.y && pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi;
    if (intersect)
      inside = !inside;
  }
  return inside;
}
function pointOnLine(line) {
  if (Math.abs(line.b) > 0.000001) {
    const px = 0, py = -(line.c + line.a * px) / line.b;
    return { x: px, y: py };
  } else {
    const py = 0, px = -(line.c + line.b * py) / line.a;
    return { x: px, y: py };
  }
}
function lineDirectionUnit(line) {
  const dx = -line.b, dy = line.a;
  const len = Math.hypot(dx, dy);
  return len === 0 ? { x: 0, y: 0 } : { x: dx / len, y: dy / len };
}
function drawLineSegmentFromLine(line, extendMult = 2) {
  const p = pointOnLine(line), dir = lineDirectionUnit(line);
  const ext = Math.hypot(w, h) * extendMult;
  return {
    x1: p.x + dir.x * ext,
    y1: p.y + dir.y * ext,
    x2: p.x - dir.x * ext,
    y2: p.y - dir.y * ext
  };
}
function draw() {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, w, h);
  for (const line of lines) {
    if (line.t1) {
      const poly = clipToHalfPlane(viewport, line.a, line.b, line.c);
      if (poly.length) {
        ctx.save();
        ctx.beginPath();
        poly.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.clip();
        ctx.globalCompositeOperation = "difference";
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    }
    if (line.t2) {
      const poly = clipToHalfPlane(viewport, -line.a, -line.b, -line.c);
      if (poly.length) {
        ctx.save();
        ctx.beginPath();
        poly.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.clip();
        ctx.globalCompositeOperation = "difference";
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    }
  }
  ctx.save();
  ctx.globalCompositeOperation = "difference";
  ctx.strokeStyle = "white";
  ctx.setLineDash([10, 10]);
  ctx.lineWidth = 2;
  for (const line of lines) {
    ctx.lineDashOffset = line.dash;
    const seg = drawLineSegmentFromLine(line);
    ctx.beginPath();
    ctx.moveTo(seg.x1, seg.y1);
    ctx.lineTo(seg.x2, seg.y2);
    ctx.stroke();
  }
  ctx.restore();
  if (hover) {
    const seg = drawLineSegmentFromLine(hover);
    ctx.save();
    ctx.globalCompositeOperation = "difference";
    ctx.strokeStyle = "white";
    ctx.lineWidth = 4;
    const offset = 5;
    if (cside === 1) {
      ctx.shadowOffsetX = hover.nnx * offset;
      ctx.shadowOffsetY = hover.nny * offset;
    } else if (cside === 2) {
      ctx.shadowOffsetX = -hover.nnx * offset;
      ctx.shadowOffsetY = -hover.nny * offset;
    }
    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.moveTo(seg.x1, seg.y1);
    ctx.lineTo(seg.x2, seg.y2);
    ctx.stroke();
    ctx.restore();
  }
  if (selected) {
    const poly1 = clipToHalfPlane(viewport, selected.a, selected.b, selected.c);
    const inset1 = insetPolygon(poly1, 10);
    const poly2 = clipToHalfPlane(viewport, -selected.a, -selected.b, -selected.c);
    const inset2 = insetPolygon(poly2, 10);
    ctx.save();
    ctx.globalCompositeOperation = "difference";
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    if (inset1.length > 2) {
      ctx.beginPath();
      inset1.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.closePath();
      if (hside === 1) {
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fill();
        ctx.restore();
        ctx.lineWidth = 4;
      } else
        ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (inset2.length > 2) {
      ctx.beginPath();
      inset2.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.closePath();
      if (hside === 2) {
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fill();
        ctx.restore();
        ctx.lineWidth = 4;
      } else
        ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }
}
function animate() {
  for (const line of lines) {
    line.dash += hover === line ? 1 : 0.2;
    if (line.dash > 20)
      line.dash = 0;
  }
  draw();
  requestAnimationFrame(animate);
}
canvas.addEventListener("mousemove", (e) => {
  hover = null;
  cside = 0;
  let minDist = Infinity;
  const { clientX: mx, clientY: my } = e;
  for (const line of lines) {
    const f = line.a * mx + line.b * my + line.c;
    const dist = Math.abs(f);
    if (dist < 10 && dist < minDist) {
      minDist = dist;
      hover = line;
      cside = f > 0 ? 1 : f < 0 ? 2 : 0;
    }
  }
  hside = 0;
  if (selected && minDist > 10) {
    const f = selected.a * mx + selected.b * my + selected.c;
    const side = f > 0 ? 1 : f < 0 ? 2 : 0;
    if (side !== 0) {
      const poly = side === 1 ? clipToHalfPlane(viewport, selected.a, selected.b, selected.c) : clipToHalfPlane(viewport, -selected.a, -selected.b, -selected.c);
      const insetPoly = insetPolygon(poly, 10);
      if (insetPoly.length > 2 && pointInPolygon({ x: mx, y: my }, insetPoly))
        hside = side;
    }
  }
});
canvas.addEventListener("click", (e) => {
  let clicked = null;
  let clickedSide = 0;
  let minDist = Infinity;
  const { clientX: mx, clientY: my } = e;
  for (const line of lines) {
    const f = line.a * mx + line.b * my + line.c;
    const dist = Math.abs(f);
    if (dist < 5 && dist < minDist) {
      minDist = dist;
      clicked = line;
      clickedSide = 0;
    }
  }
  if (!clicked && selected) {
    const f = selected.a * mx + selected.b * my + selected.c;
    const side = f > 0 ? 1 : f < 0 ? 2 : 0;
    if (side !== 0) {
      const poly = side === 1 ? clipToHalfPlane(viewport, selected.a, selected.b, selected.c) : clipToHalfPlane(viewport, -selected.a, -selected.b, -selected.c);
      const insetPoly = insetPolygon(poly, 10);
      if (insetPoly.length > 2 && pointInPolygon({ x: mx, y: my }, insetPoly)) {
        clicked = selected;
        clickedSide = side;
      }
    }
  }
  if (clicked) {
    if (clickedSide === 0)
      selected = selected === clicked ? null : clicked;
    else if (clickedSide === 1) {
      clicked.t1 = !clicked.t1;
      selected = null;
    } else if (clickedSide === 2) {
      clicked.t2 = !clicked.t2;
      selected = null;
    }
  } else
    selected = null;
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape")
    selected = null;
});
window.addEventListener("resize", updateViewport);
updateViewport();
animate();
function level2(spacingVal, count) {
  return [0, 60, 120].flatMap((n) => Array.from({ length: count * 2 + 1 }, (_, i) => new Line(n, (i - count) * spacingVal)));
}
lines.push(...level2(56, 7));
