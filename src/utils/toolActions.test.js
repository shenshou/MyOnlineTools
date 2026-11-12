import { describe, expect, it } from 'vitest'
import { runTool } from './toolActions'

describe('runTool', () => {
  it('formats and minifies valid JSON', async () => {
    expect(await runTool('json', '{"a":1}')).toBe(['{', '  "a": 1', '}'].join('\n'))
    expect(await runTool('json', '{ "a": 1 }', { mode: 'minify' })).toBe('{"a":1}')
  })

  it('rejects invalid JSON', async () => {
    await expect(runTool('json', '{bad}')).rejects.toThrow()
  })

  it('encodes and decodes UTF-8 Base64', async () => {
    const encoded = await runTool('base64', '中文 Hello')
    expect(await runTool('base64', encoded, { mode: 'decode' })).toBe('中文 Hello')
  })

  it('encodes URL components and decodes them', async () => {
    const encoded = await runTool('url', '你好 world')
    expect(encoded).toBe('%E4%BD%A0%E5%A5%BD%20world')
    expect(await runTool('url', encoded, { mode: 'decode' })).toBe('你好 world')
  })

  it('counts Unicode code points and UTF-8 bytes', async () => {
    const result = await runTool('text-stats', 'A😀\n中')
    expect(result).toContain('字符数：4')
    expect(result).toContain('行数：2')
    expect(result).toContain('字节数（UTF-8）：9')
  })

  it('converts common naming styles', async () => {
    expect(await runTool('case', 'hello world', { mode: 'camel' })).toBe('helloWorld')
    expect(await runTool('case', 'hello world', { mode: 'snake' })).toBe('hello_world')
    expect(await runTool('case', 'hello world', { mode: 'pascal' })).toBe('HelloWorld')
  })

  it('converts HEX colors to RGB and HSL', async () => {
    const result = await runTool('color', '#fff')
    expect(result).toContain('HEX：#FFFFFF')
    expect(result).toContain('RGB：rgb(255, 255, 255)')
    expect(result).toContain('HSL：hsl(0, 0%, 100%)')
  })

  it('rejects invalid HEX colors', async () => {
    await expect(runTool('color', 'not-a-color')).rejects.toThrow('请输入 3 位或 6 位 HEX')
  })

  it('adds magnet prefixes without changing existing magnet links', async () => {
    expect(await runTool('magnet', '0123\nmagnet:?xt=urn:btih:abcd')).toBe('magnet:?xt=urn:btih:0123\nmagnet:?xt=urn:btih:abcd')
  })

  it('rejects oversized regex input before creating a worker', async () => {
    await expect(runTool('regex', 'x', { pattern: 'a'.repeat(201) })).rejects.toThrow('不能超过 200')
    await expect(runTool('regex', 'x'.repeat(20001), { pattern: 'x' })).rejects.toThrow('20,000')
  })
})
