const LTX_ORIGIN = 'https://ltxlib.dpdns.org'
const READY_MESSAGE = 'LTX_CODE_BRIDGE_READY'
const REQUEST_MESSAGE = 'LTX_CODE_CHECK_REQUEST'
const RESULT_MESSAGE = 'LTX_CODE_CHECK_RESULT'

function createRequestId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('')
}

export function checkLtxCodeViaOfficialPage(code, { onStage, timeoutMs = 60000 } = {}) {
  const target = String(code ?? '').trim()
  if (!target) return Promise.reject(new Error('请输入番号'))

  return new Promise((resolve, reject) => {
    let settled = false
    let requestId = ''
    let popup = null
    let timer = null

    const cleanup = () => {
      window.removeEventListener('message', onMessage)
      if (timer) clearTimeout(timer)
    }

    const finish = (error, value) => {
      if (settled) return
      settled = true
      cleanup()
      if (popup && !popup.closed) popup.close()
      if (error) reject(error)
      else resolve(value)
    }

    const onMessage = event => {
      if (event.origin !== LTX_ORIGIN || event.source !== popup) return
      const message = event.data
      if (!message || typeof message !== 'object') return

      if (message.type === READY_MESSAGE && !requestId) {
        requestId = createRequestId()
        onStage?.('已连接 LTX 官方页面，正在执行同源查询')
        popup.postMessage({ type: REQUEST_MESSAGE, requestId, code: target }, LTX_ORIGIN)
        return
      }

      if (message.type !== RESULT_MESSAGE || message.requestId !== requestId) return
      if (message.ok === true && typeof message.exists === 'boolean') {
        finish(null, message.exists)
      } else {
        finish(new Error(typeof message.error === 'string' ? message.error : 'LTX 官方页面未能完成检测'))
      }
    }

    window.addEventListener('message', onMessage)
    onStage?.('正在打开 LTX 官方页面桥接窗口')

    popup = window.open(
      LTX_ORIGIN + '/#ltx-code-check-bridge',
      'ltx-code-check-bridge',
      'popup,width=560,height=420',
    )

    if (!popup) {
      finish(new Error('浏览器阻止了桥接窗口，请允许本站弹出窗口后重试'))
      return
    }

    timer = setTimeout(() => {
      finish(new Error('未收到 LTX 辅助脚本响应。请确认已安装并启用 LTX 同源检测辅助脚本，然后重试'))
    }, timeoutMs)
  })
}
