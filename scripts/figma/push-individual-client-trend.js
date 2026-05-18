/**
 * Run via Figma MCP `use_figma` after authenticating the Figma plugin.
 * Target: https://www.figma.com/design/qWHOLk5arPj0kYuoIzc7BU/57B-Platform-Web--2-?node-id=20635-310437
 *
 * fileKey: qWHOLk5arPj0kYuoIzc7BU
 * nodeId: 20635:310437
 */

const TARGET_NODE_ID = '20635:310437';
const W = 924;
const H = 340;
const MARGIN = { top: 8, right: 12, bottom: 72, left: 56 };
const Y_MAX = 13642;

const PERIODS = ['Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26'];
const SERIES = [
  { name: 'Acme Corp · ERP rollout', hex: '#8371F3', values: [7076, 9164, 6612, 10788, 12180] },
  { name: 'Globex · Data platform', hex: '#40C585', values: [5208, 5704, 7316, 6324, 8370] },
  { name: 'Initech · Billing integration', hex: '#EDAB00', values: [2805, 3740, 3960, 4895, 3520] },
  { name: 'Umbrella · Mobile app', hex: '#469BFF', values: [1664, 2132, 3016, 2392, 3744] },
];

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

function plotPoint(i, value, plot) {
  const x = plot.left + (plot.width * i) / (PERIODS.length - 1);
  const y = plot.bottom - (value / Y_MAX) * plot.height;
  return { x, y };
}

function solidPaint(hex, opacity = 1) {
  const { r, g, b } = hexToRgb(hex);
  return [{ type: 'SOLID', color: { r, g, b }, opacity }];
}

const parent = await figma.getNodeByIdAsync(TARGET_NODE_ID);
if (!parent || !('appendChild' in parent)) {
  throw new Error(`Target node ${TARGET_NODE_ID} not found or not a container`);
}

for (const child of [...parent.children]) {
  if (child.name === 'Individual Client Trend Chart') child.remove();
}

const chart = figma.createFrame();
chart.name = 'Individual Client Trend Chart';
chart.resize(W, H);
chart.fills = [];
chart.clipsContent = false;
parent.appendChild(chart);
chart.layoutPositioning = 'ABSOLUTE';
chart.x = 0;
chart.y = 0;

const plot = {
  left: MARGIN.left,
  top: MARGIN.top,
  right: W - MARGIN.right,
  bottom: H - MARGIN.bottom,
  width: W - MARGIN.left - MARGIN.right,
  height: H - MARGIN.top - MARGIN.bottom,
};

// Grid lines (horizontal)
for (let t = 0; t <= 4; t++) {
  const y = plot.top + (plot.height * t) / 4;
  const line = figma.createLine();
  line.name = `grid-h-${t}`;
  line.strokeWeight = 1;
  line.strokes = solidPaint('#f0f0f0');
  line.dashPattern = [3, 3];
  chart.appendChild(line);
  line.x = plot.left;
  line.y = y;
  line.resize(plot.width, 0);
}

// Y axis
const yAxis = figma.createLine();
yAxis.name = 'y-axis';
yAxis.strokes = solidPaint('#e8e8e8');
yAxis.strokeWeight = 1;
chart.appendChild(yAxis);
yAxis.x = plot.left;
yAxis.y = plot.top;
yAxis.resize(0, plot.height);

// X axis
const xAxis = figma.createLine();
xAxis.name = 'x-axis';
xAxis.strokes = solidPaint('#e8e8e8');
xAxis.strokeWeight = 1;
chart.appendChild(xAxis);
xAxis.x = plot.left;
xAxis.y = plot.bottom;
xAxis.resize(plot.width, 0);

await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });

const yLabels = ['$0', '$3k', '$7k', '$10k', '$14k'];
for (let t = 0; t < yLabels.length; t++) {
  const label = figma.createText();
  label.name = `y-label-${t}`;
  label.fontName = { family: 'Inter', style: 'Regular' };
  label.fontSize = 12;
  label.fills = solidPaint('#595959');
  label.characters = yLabels[t];
  chart.appendChild(label);
  label.x = plot.left - 8 - label.width;
  label.y = plot.bottom - (plot.height * t) / 4 - 6;
}

for (let i = 0; i < PERIODS.length; i++) {
  const label = figma.createText();
  label.name = `x-label-${i}`;
  label.fontName = { family: 'Inter', style: 'Regular' };
  label.fontSize = 12;
  label.fills = solidPaint('#595959');
  label.characters = PERIODS[i];
  chart.appendChild(label);
  const pt = plotPoint(i, 0, plot);
  label.x = pt.x - label.width / 2;
  label.y = plot.bottom + 8;
}

const createdNodeIds = [chart.id];

for (const s of SERIES) {
  const points = s.values.map((v, i) => plotPoint(i, v, plot));
  const line = figma.createVector();
  line.name = s.name;
  line.strokes = solidPaint(s.hex);
  line.strokeWeight = 2;
  line.fills = [];
  chart.appendChild(line);

  const path = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
  line.vectorPaths = [{ windingRule: 'NONZERO', data: path }];

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  line.x = Math.min(...xs);
  line.y = Math.min(...ys);
  line.resize(Math.max(...xs) - Math.min(...xs) || 1, Math.max(...ys) - Math.min(...ys) || 1);

  for (const p of points) {
    const dot = figma.createEllipse();
    dot.name = `${s.name} point`;
    dot.resize(8, 8);
    dot.fills = solidPaint('#ffffff');
    dot.strokes = solidPaint(s.hex);
    dot.strokeWeight = 2;
    chart.appendChild(dot);
    dot.x = p.x - 4;
    dot.y = p.y - 4;
    createdNodeIds.push(dot.id);
  }
  createdNodeIds.push(line.id);
}

// Legend row
const legendY = H - 24;
const legendItems = SERIES.map((s, idx) => ({ ...s, x: 120 + idx * 210 }));
for (const item of legendItems) {
  const swatch = figma.createEllipse();
  swatch.resize(8, 8);
  swatch.fills = solidPaint(item.hex);
  swatch.strokes = [];
  chart.appendChild(swatch);
  swatch.x = item.x;
  swatch.y = legendY;

  const label = figma.createText();
  label.fontName = { family: 'Inter', style: 'Regular' };
  label.fontSize = 12;
  label.fills = solidPaint('#595959');
  label.characters = item.name;
  chart.appendChild(label);
  label.x = item.x + 12;
  label.y = legendY - 2;
  createdNodeIds.push(swatch.id, label.id);
}

return { createdNodeIds, parentId: parent.id };
