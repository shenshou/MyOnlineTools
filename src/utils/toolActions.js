export async function runTool(id, input, options = {}) {
  const value = String(input ?? '')
  switch (id) {
    case 'json': {
      const parsed = JSON.parse(value)
      return options.mode === 'minify' ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2)
    }
    case 'base64':
      return options.mode === 'decode' ? decodeURIComponent(escape(atob(value.trim()))) : btoa(unescape(encodeURIComponent(value)))
    case 'url':
      return options.mode === 'decode' ? decodeURIComponent(value) : encodeURIComponent(value)
    case 'text-stats': {
      const lines = value ? value.split(/\r?\n/).length : 0
      const chars = [...value].length
      const noSpace = [...value.replace(/\s/g, '')].length
      const words = (value.match(/[\p{L}\p{N}_]+/gu) || []).length
      return `字符数：${chars}\n不含空白：${noSpace}\n单词数：${words}\n行数：${lines}\n字节数（UTF-8）：${new TextEncoder().encode(value).length}`
    }
    case 'case': {
      const words = value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[^\p{L}\p{N}]+/u).filter(Boolean)
      const lower = words.map(w => w.toLowerCase())
      const mode = options.mode || 'camel'
      if (mode === 'upper') return value.toUpperCase()
      if (mode === 'lower') return value.toLowerCase()
      if (mode === 'snake') return lower.join('_')
      if (mode === 'kebab') return lower.join('-')
      if (mode === 'pascal') return lower.map(w => w[0].toUpperCase()+w.slice(1)).join('')
      return lower.map((w,i) => i ? w[0].toUpperCase()+w.slice(1) : w).join('')
    }
    case 'dedupe': return [...new Set(value.split(/\r?\n/))].join('\n')
    case 'sort-lines': return value.split(/\r?\n/).sort((a,b) => options.mode === 'desc' ? b.localeCompare(a, undefined, {numeric:true}) : a.localeCompare(b, undefined, {numeric:true})).join('\n')
    case 'timestamp': {
      if (options.mode === 'to-date') {
        const n = Number(value.trim())
        if (!Number.isFinite(n)) throw new Error('请输入有效的 Unix 时间戳')
        const d = new Date(Math.abs(n) < 1e12 ? n * 1000 : n)
        if (Number.isNaN(d.getTime())) throw new Error('时间戳超出有效范围')
        return `本地时间：${d.toLocaleString()}\nUTC：${d.toISOString()}\n秒：${Math.floor(d.getTime()/1000)}\n毫秒：${d.getTime()}`
      }
      const d = value.trim() ? new Date(value) : new Date()
      if (Number.isNaN(d.getTime())) throw new Error('无法识别该日期时间')
      return `秒：${Math.floor(d.getTime()/1000)}\n毫秒：${d.getTime()}`
    }
    case 'color': {
      const hex = value.trim().replace('#','')
      if (!/^(?:[\da-f]{3}|[\da-f]{6})$/i.test(hex)) throw new Error('请输入 3 位或 6 位 HEX 颜色值，例如 #6366f1')
      const full = hex.length === 3 ? [...hex].map(x=>x+x).join('') : hex
      const r=parseInt(full.slice(0,2),16), g=parseInt(full.slice(2,4),16), b=parseInt(full.slice(4,6),16)
      const [rr,gg,bb]=[r,g,b].map(x=>x/255)
      const max=Math.max(rr,gg,bb), min=Math.min(rr,gg,bb), delta=max-min
      let h=0, s=0, l=(max+min)/2
      if(delta){s=delta/(1-Math.abs(2*l-1)); if(max===rr)h=60*(((gg-bb)/delta)%6); else if(max===gg)h=60*((bb-rr)/delta+2); else h=60*((rr-gg)/delta+4)}
      return `HEX：#${full.toUpperCase()}\nRGB：rgb(${r}, ${g}, ${b})\nHSL：hsl(${Math.round((h+360)%360)}, ${Math.round(s*100)}%, ${Math.round(l*100)}%)`
    }
    case 'uuid': return Array.from({length:Math.min(100,Math.max(1,Number(options.count)||1))},()=>crypto.randomUUID()).join('\n')
    case 'password': {
      const chars = (options.lower !== false ? 'abcdefghijkmnopqrstuvwxyz' : '') + (options.upper ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : '') + (options.numbers ? '23456789' : '') + (options.symbols ? '!@#$%^&*()-_=+' : '')
      if (!chars) throw new Error('至少选择一种字符类型')
      const len=Math.min(128,Math.max(4,Number(options.length)||16))
      const bytes=crypto.getRandomValues(new Uint8Array(len))
      return Array.from(bytes,b=>chars[b%chars.length]).join('')
    }
    case 'hash': {
      const algorithm = options.mode || 'SHA-256'
      const digest = await crypto.subtle.digest(algorithm, new TextEncoder().encode(value))
      return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('')
    }
    case 'regex': {
      const pattern = options.pattern ?? ''
      const flags = options.flags ?? 'g'
      const re = new RegExp(pattern, flags)
      const matches = [...value.matchAll(re)]
      return matches.length ? matches.map((m,i)=>`${i+1}. ${m[0]}（位置 ${m.index}）`).join('\n') : '没有匹配结果'
    }
    case 'html':
      return options.mode === 'decode'
        ? value.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&')
        : value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
    default: throw new Error('暂不支持此工具')
  }
}