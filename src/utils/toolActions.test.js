import { describe, expect, it } from 'vitest'
import { runTool } from './toolActions'
import { extractJavCodes } from './javCode'

describe('runTool', () => {
  it('formats and minifies valid JSON', async () => {
    expect(await runTool('json', '{"a":1}')).toBe(['{', '  "a": 1', '}'].join('\\n'))
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
    const result = await runTool('text-stats', 'A😀\\n中')
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

  it('extracts common JAV codes and defaults to spaces', async () => {
    const input = '片名：ssis-123，另外有 ABP_456 和 FC2-PPV-1234567；1pondo-123456。'
    expect(await runTool('jav-code-extract', input)).toBe('SSIS-123 ABP-456 FC2-PPV-1234567 1PONDO-123456')
  })

  it('extracts letter suffixes and numeric suffixes without partial matches', async () => {
    const input = 'PASN-027-U ABC-123A ABC-123-4 IPX-811'
    expect(await runTool('jav-code-extract', input)).toBe('PASN-027-U ABC-123A ABC-123-4 IPX-811')
    expect(await runTool('jav-code-extract', 'PASN-027-U2')).toBe('')
    expect(await runTool('jav-code-extract', 'ABC-123-AB')).toBe('')
  })

  it('supports selectable output separators without changing extraction order', async () => {
    const input = 'PASN-027-U, SSIS-123 and ABP-456'
    expect(await runTool('jav-code-extract', input, { separator: '\\n' })).toBe('PASN-027-U\\nSSIS-123\\nABP-456')
    expect(await runTool('jav-code-extract', input, { separator: '，' })).toBe('PASN-027-U，SSIS-123，ABP-456')
    expect(await runTool('jav-code-extract', input, { separator: ' | ' })).toBe('PASN-027-U | SSIS-123 | ABP-456')
  })

  it('returns an empty string when no JAV codes are found', async () => {
    expect(await runTool('jav-code-extract', '这段文本没有番号，日期是 2026-11-17。')).toBe('')
  })

  it('recognizes common formats and unknown alphanumeric prefixes', async () => {
    const input = 'ssis-123 ABP_456 FC2-PPV-1234567 1pondo-123456 10musume-123456 heyzo-1234 tokyo-hot-1234 QWERTY-123 300MIUM-456'
    expect(await runTool('jav-code-extract', input)).toBe(
      'SSIS-123 ABP-456 FC2-PPV-1234567 1PONDO-123456 10MUSUME-123456 HEYZO-1234 TOKYO-HOT-1234 QWERTY-123 300MIUM-456',
    )
  })

  it('rejects ordinal numbers and descriptive labels', async () => {
    const input = '2nd-46 and 3rd_12 Version-123 Chapter-456 Model-2026 Part-03 Episode-12'
    expect(await runTool('jav-code-extract', input)).toBe('')
  })

  it('does not interpret spaced ordinal text as a JAV code', async () => {
    expect(await runTool('jav-code-extract', 'ABW-208 终极初体验 2nd 46：3')).toBe('ABW-208')
  })

  it('normalizes underscores and preserves duplicate occurrences', async () => {
    expect(await runTool('jav-code-extract', 'abp_456 ABP-456')).toBe('ABP-456 ABP-456')
  })

  it('preserves repeated code occurrences in the source text', async () => {
    expect(await runTool('jav-code-extract', 'ssis-123 与 SSIS-123')).toBe('SSIS-123 SSIS-123')
  })

  it('adds magnet prefixes without changing existing magnet links', async () => {
    expect(await runTool('magnet', '0123\\nmagnet:?xt=urn:btih:abcd')).toBe('magnet:?xt=urn:btih:0123\\nmagnet:?xt=urn:btih:abcd')
  })

  it('rejects oversized regex input before creating a worker', async () => {
    await expect(runTool('regex', 'x', { pattern: 'a'.repeat(201) })).rejects.toThrow('不能超过 200')
    await expect(runTool('regex', 'x'.repeat(20001), { pattern: 'x' })).rejects.toThrow('20,000')
  })
})
