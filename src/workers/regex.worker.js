self.onmessage = event => {
  const { pattern, flags, input } = event.data || {}
  try {
    if (typeof pattern !== 'string' || pattern.length > 200) throw new Error('正则表达式不能超过 200 个字符')
    if (typeof input !== 'string' || input.length > 20000) throw new Error('待匹配文本不能超过 20,000 个字符')

    const safeFlags = [...new Set(`${flags || ''}g`)].join('')
    const expression = new RegExp(pattern, safeFlags)
    const matches = []
    let match
    while ((match = expression.exec(input)) && matches.length < 1000) {
      matches.push(`${matches.length + 1}. ${match[0]}（位置 ${match.index}）`)
      if (match[0] === '') expression.lastIndex += 1
    }
    self.postMessage({ result: matches.length ? matches.join('\\n') : '没有匹配结果' })
  } catch (error) {
    self.postMessage({ error: error.message || '正则表达式处理失败' })
  }
}
