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
      const lower = words.map(word => word.toLowerCase())
      const mode = options.mode || 'camel'
      if (mode === 'upper') return value.toUpperCase()
      if (mode === 'lower') return value.toLowerCase()
      if (mode === 'snake') return lower.join('_')
      if (mode === 'kebab') return lower.join('-')
      if (mode === 'pascal') return lower.map(word => word[0].toUpperCase() + word.slice(1)).join('')
      return lower.map((word, index) => index ? word[0].toUpperCase() + word.slice(1) : word).join('')
    }
    case 'color': {
      const hex = value.trim().replace('#', '')
      if (!/^(?:[\da-f]{3}|[\da-f]{6})$/i.test(hex)) throw new Error('请输入 3 位或 6 位 HEX 颜色值，例如 #6366f1')
      const full = hex.length === 3 ? [...hex].map(char => char + char).join('') : hex
      const r = parseInt(full.slice(0, 2), 16), g = parseInt(full.slice(2, 4), 16), b = parseInt(full.slice(4, 6), 16)
      const [rr, gg, bb] = [r, g, b].map(channel => channel / 255)
      const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb), delta = max - min
      let h = 0, s = 0, l = (max + min) / 2
      if (delta) {
        s = delta / (1 - Math.abs(2 * l - 1))
        if (max === rr) h = 60 * (((gg - bb) / delta) % 6)
        else if (max === gg) h = 60 * ((bb - rr) / delta + 2)
        else h = 60 * ((rr - gg) / delta + 4)
      }
      return `HEX：#${full.toUpperCase()}\nRGB：rgb(${r}, ${g}, ${b})\nHSL：hsl(${Math.round((h + 360) % 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
    }
    case 'magnet': {
      const prefix = 'magnet:?xt=urn:btih:'
      return value.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
        .map(line => /^magnet:\?xt=urn:btih:/i.test(line) ? line : prefix + line)
        .join('\n')
    }
    case 'regex': {
      const pattern = options.pattern ?? ''
      const flags = options.flags ?? 'g'
      if (pattern.length > 200) throw new Error('正则表达式不能超过 200 个字符')
      if (value.length > 20000) throw new Error('待匹配文本不能超过 20,000 个字符')
      return new Promise((resolve, reject) => {
        const worker = new Worker(new URL('../workers/regex.worker.js', import.meta.url), { type: 'module' })
        const timeout = setTimeout(() => {
          worker.terminate()
          reject(new Error('正则表达式执行超时，已终止本次匹配'))
        }, 500)
        worker.onmessage = event => {
          clearTimeout(timeout)
          worker.terminate()
          if (event.data?.error) reject(new Error(event.data.error))
          else resolve(event.data?.result || '没有匹配结果')
        }
        worker.onerror = () => {
          clearTimeout(timeout)
          worker.terminate()
          reject(new Error('正则表达式工作线程启动失败'))
        }
        worker.postMessage({ pattern, flags, input: value })
      })
    }
    default:
      throw new Error('暂不支持此工具')
  }
}
