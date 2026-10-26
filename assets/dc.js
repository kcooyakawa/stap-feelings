/* Minimal runtime for the Stap site pages (replaces the canvas runtime). */
class DCLogic {
  constructor(props) { this.props = props || {}; this.state = {}; }
  setState(p) {
    const patch = typeof p === 'function' ? p(this.state, this.props) : p;
    this.state = Object.assign({}, this.state, patch);
    if (this.__dc) this.__dc.schedule();
  }
}
(function () {
  const RE = /\{\{\s*([A-Za-z_$][\w$]*)\s*\}\}/g;
  const fill = (tpl, v) => tpl.replace(RE, (m, k) => (v[k] == null || typeof v[k] === 'function') ? '' : String(v[k]));
  window.__dcMount = function (root, Cls) {
    const inst = new Cls({});
    const binds = [];
    let cur = {};
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach((node) => {
      if (node.nodeType === 3) {
        const tpl = node.nodeValue;
        if (tpl.indexOf('{{') >= 0) binds.push(() => { const s = fill(tpl, cur); if (node.nodeValue !== s) node.nodeValue = s; });
        return;
      }
      Array.from(node.attributes).forEach((a) => {
        let name = a.name; const tpl = a.value;
        if (name.indexOf('data-dcon-') === 0) {
          const key = tpl, type = name.slice(10);
          node.addEventListener(type, (e) => { const f = cur[key]; if (typeof f === 'function') f(e); }, type === 'scroll' ? { passive: true } : false);
          return;
        }
        if (name.indexOf('data-dcattr-') === 0) { node.removeAttribute(name); name = name.slice(12); }
        if (tpl.indexOf('{{') < 0) return;
        if (/^on/.test(name)) {
          const m = tpl.match(/\{\{\s*([\w$]+)\s*\}\}/);
          node.removeAttribute(name);
          const type = name.slice(2);
          node.addEventListener(type, (e) => { const f = cur[m[1]]; if (typeof f === 'function') f(e); }, type === 'scroll' ? { passive: true } : false);
          return;
        }
        binds.push(() => {
          const s = fill(tpl, cur);
          if (name === 'value' && 'value' in node) { if (node.value !== s && document.activeElement !== node) node.value = s; return; }
          if (node.getAttribute(name) !== s) node.setAttribute(name, s);
        });
      });
    });
    let queued = false;
    const update = () => { queued = false; cur = inst.renderVals ? inst.renderVals() : {}; binds.forEach((b) => b()); };
    inst.__dc = { schedule: () => { if (!queued) { queued = true; requestAnimationFrame(update); } } };
    update();
    if (inst.componentDidMount) inst.componentDidMount();
    window.addEventListener('pagehide', () => { if (inst.componentWillUnmount) inst.componentWillUnmount(); });
    return inst;
  };
})();
