// css.ts
class Line {
  norm;
  d;
  a;
  b;
  nnx;
  nny;
  t1;
  t2;
  c;
  constructor(norm, d = 0) {
    this.norm = norm;
    this.d = d;
    const rad = norm * Math.PI / 180;
    this.a = Math.cos(rad);
    this.b = Math.sin(rad);
    this.nnx = this.a;
    this.nny = this.b;
    this.t1 = Math.random() > 0.5;
    this.t2 = Math.random() > 0.5;
    this.c = 0;
    this.updateParams();
  }
  updateParams(cx = window.innerWidth / 2, cy = window.innerHeight / 2) {
    this.c = this.d - this.a * cx - this.b * cy;
    const nlen = Math.hypot(this.a, this.b) || 1;
    this.nnx = this.a / nlen;
    this.nny = this.b / nlen;
  }
}
function clipToHalfPlane(points, a, b, c) {
  const output = [];
  const len = points.length;
  for (let i = 0;i < len; i++) {
    const curr = points[i];
    const prev = points[(i + len - 1) % len];
    const currF = a * curr.x + b * curr.y + c;
    const prevF = a * prev.x + b * prev.y + c;
    const currIn = currF >= 0;
    const prevIn = prevF >= 0;
    if (prevIn) {
      if (currIn) {
        output.push(curr);
      } else {
        output.push(getIntersection(prev, curr, a, b, c));
      }
    } else {
      if (currIn) {
        output.push(getIntersection(prev, curr, a, b, c));
        output.push(curr);
      }
    }
  }
  return output;
}
function getIntersection(p1, p2, a, b, c) {
  const f1 = a * p1.x + b * p1.y + c;
  const f2 = a * p2.x + b * p2.y + c;
  const denom = f2 - f1 || 0.000000001;
  const t = -f1 / denom;
  return {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y)
  };
}
var lines = [];
function addLine(model, opts = {}) {
  const id = lines.length;
  const line = document.createElement("div");
  line.className = "line";
  line.style.background = opts.color || "black";
  if (opts.thickness)
    line.style.height = opts.thickness;
  const sidePos = document.createElement("div");
  sidePos.className = "side";
  const sideNeg = document.createElement("div");
  sideNeg.className = "side";
  document.body.appendChild(line);
  document.body.appendChild(sidePos);
  document.body.appendChild(sideNeg);
  sidePos.className = model.t1 ? "side inverted" : "side";
  sideNeg.className = model.t2 ? "side inverted" : "side";
  const item = {
    id,
    model,
    line,
    sidePos,
    sideNeg,
    currentSide: 0,
    options: opts
  };
  line.addEventListener("mousemove", (e) => mouseMove(item, e.clientX, e.clientY));
  line.addEventListener("pointermove", (e) => mouseMove(item, e.clientX, e.clientY));
  line.addEventListener("mouseleave", () => {
    item.line.style.filter = "";
    item.currentSide = 0;
  });
  line.addEventListener("click", () => {
    if (item.currentSide === 1) {
      item.sidePos.classList.toggle("inverted");
    } else if (item.currentSide === 2) {
      item.sideNeg.classList.toggle("inverted");
    }
  });
  lines.push(item);
  updateLayout();
  return item;
}
function createLine(norm, d = 0, opts = {}) {
  return addLine(new Line(norm, d), opts);
}
function mouseMove(item, clientX, clientY) {
  const ww = window.innerWidth;
  const wh = window.innerHeight;
  const cx = ww / 2;
  const cy = wh / 2;
  item.model.updateParams(cx, cy);
  const a = item.model.a;
  const b = item.model.b;
  const c = item.model.c;
  const f = a * clientX + b * clientY + c;
  item.currentSide = f > 0 ? 1 : f < 0 ? 2 : 0;
  const nnx = item.model.nnx;
  const nny = item.model.nny;
  let offsetX = (item.currentSide === 1 ? nnx : -nnx) * 5;
  let offsetY = (item.currentSide === 1 ? nny : -nny) * 5;
  if (item.currentSide === 0) {
    offsetX = 0;
    offsetY = 0;
  }
  item.line.style.filter = offsetX === 0 && offsetY === 0 ? "" : `drop-shadow(${offsetX}px ${offsetY}px 10px rgba(0,0,0,0.5))`;
}
function updateLayout() {
  const ww = window.innerWidth;
  const wh = window.innerHeight;
  const cx = ww / 2;
  const cy = wh / 2;
  const viewport = [
    { x: 0, y: 0 },
    { x: ww, y: 0 },
    { x: ww, y: wh },
    { x: 0, y: wh }
  ];
  lines.forEach((item) => {
    const model = item.model;
    model.updateParams(cx, cy);
    const directionDeg = model.norm - 90;
    const theta = directionDeg * Math.PI / 180;
    const dist = -(model.a * cx + model.b * cy + model.c) / (Math.hypot(model.a, model.b) || 1);
    const offsetX = model.nnx * dist;
    const offsetY = model.nny * dist;
    const absCos = Math.max(Math.abs(Math.cos(theta)), 0.000000001);
    const absSin = Math.max(Math.abs(Math.sin(theta)), 0.000000001);
    const neededL = Math.max(ww / absCos, wh / absSin) + 40;
    const el = item.line;
    el.style.left = "50%";
    el.style.top = "50%";
    el.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) rotate(${directionDeg}deg)`;
    el.style.width = `${neededL}px`;
    el.style.height = item.options?.thickness || "5px";
    const a = model.a;
    const b = model.b;
    const c = model.c;
    const poly1 = clipToHalfPlane(viewport, a, b, c);
    const clip1 = "polygon(" + poly1.map((p) => `${p.x / ww * 100}% ${p.y / wh * 100}%`).join(", ") + ")";
    item.sidePos.style.clipPath = clip1;
    const poly2 = clipToHalfPlane(viewport, -a, -b, -c);
    const clip2 = "polygon(" + poly2.map((p) => `${p.x / ww * 100}% ${p.y / wh * 100}%`).join(", ") + ")";
    item.sideNeg.style.clipPath = clip2;
  });
}
function level2(spacing = 50, count = 10, opts = {}) {
  const normals = [0, 60, 120];
  const created = [];
  for (const n of normals) {
    for (let i = -count;i <= count; i++) {
      created.push(createLine(n, i * spacing, opts));
    }
  }
  return created;
}
window.addEventListener("resize", updateLayout);
level2(100, 3, { thickness: "5px", color: "black" });
