const API_BASE = 'https://jdforrepam.com/api'
const PROXY_BASE = import.meta.env.VITE_JAVDB_PROXY_URL?.replace(/\/$/, '')

function add32(a, b) { return (a + b) & 0xffffffff }
function cmn(q, a, b, x, s, t) {
  a = add32(add32(a, q), add32(x, t))
  return add32((a << s) | (a >>> (32 - s)), b)
}
const ff = (a,b,c,d,x,s,t) => cmn((b & c) | (~b & d),a,b,x,s,t)
const gg = (a,b,c,d,x,s,t) => cmn((b & d) | (c & ~d),a,b,x,s,t)
const hh = (a,b,c,d,x,s,t) => cmn(b ^ c ^ d,a,b,x,s,t)
const ii = (a,b,c,d,x,s,t) => cmn(c ^ (b | ~d),a,b,x,s,t)

function md5cycle(state, k) {
  let [a,b,c,d] = state
  a=ff(a,b,c,d,k[0],7,-680876936); d=ff(d,a,b,c,k[1],12,-389564586); c=ff(c,d,a,b,k[2],17,606105819); b=ff(b,c,d,a,k[3],22,-1044525330)
  a=ff(a,b,c,d,k[4],7,-176418897); d=ff(d,a,b,c,k[5],12,1200080426); c=ff(c,d,a,b,k[6],17,-1473231341); b=ff(b,c,d,a,k[7],22,-45705983)
  a=ff(a,b,c,d,k[8],7,1770035416); d=ff(d,a,b,c,k[9],12,-1958414417); c=ff(c,d,a,b,k[10],17,-42063); b=ff(b,c,d,a,k[11],22,-1990404162)
  a=ff(a,b,c,d,k[12],7,1804603682); d=ff(d,a,b,c,k[13],12,-40341101); c=ff(c,d,a,b,k[14],17,-1502002290); b=ff(b,c,d,a,k[15],22,1236535329)
  a=gg(a,b,c,d,k[1],5,-165796510); d=gg(d,a,b,c,k[6],9,-1069501632); c=gg(c,d,a,b,k[11],14,643717713); b=gg(b,c,d,a,k[0],20,-373897302)
  a=gg(a,b,c,d,k[5],5,-701558691); d=gg(d,a,b,c,k[10],9,38016083); c=gg(c,d,a,b,k[15],14,-660478335); b=gg(b,c,d,a,k[4],20,-405537848)
  a=gg(a,b,c,d,k[9],5,568446438); d=gg(d,a,b,c,k[14],9,-1019803690); c=gg(c,d,a,b,k[3],14,-187363961); b=gg(b,c,d,a,k[8],20,1163531501)
  a=gg(a,b,c,d,k[13],5,-1444681467); d=gg(d,a,b,c,k[2],9,-51403784); c=gg(c,d,a,b,k[7],14,1735328473); b=gg(b,c,d,a,k[12],20,-1926607734)
  a=hh(a,b,c,d,k[5],4,-378558); d=hh(d,a,b,c,k[8],11,-2022574463); c=hh(c,d,a,b,k[11],16,1839030562); b=hh(b,c,d,a,k[14],23,-35309556)
  a=hh(a,b,c,d,k[1],4,-1530992060); d=hh(d,a,b,c,k[4],11,1272893353); c=hh(c,d,a,b,k[7],16,-155497632); b=hh(b,c,d,a,k[10],23,-1094730640)
  a=hh(a,b,c,d,k[13],4,681279174); d=hh(d,a,b,c,k[0],11,-358537222); c=hh(c,d,a,b,k[3],16,-722521979); b=hh(b,c,d,a,k[6],23,76029189)
  a=hh(a,b,c,d,k[9],4,-640364487); d=hh(d,a,b,c,k[12],11,-421815835); c=hh(c,d,a,b,k[15],16,530742520); b=hh(b,c,d,a,k[2],23,-995338651)
  a=ii(a,b,c,d,k[0],6,-198630844); d=ii(d,a,b,c,k[7],10,1126891415); c=ii(c,d,a,b,k[14],15,-1416354905); b=ii(b,c,d,a,k[5],21,-57434055)
  a=ii(a,b,c,d,k[12],6,1700485571); d=ii(d,a,b,c,k[3],10,-1894986606); c=ii(c,d,a,b,k[10],15,-1051523); b=ii(b,c,d,a,k[1],21,-2054922799)
  a=ii(a,b,c,d,k[8],6,1873313359); d=ii(d,a,b,c,k[15],10,-30611744); c=ii(c,d,a,b,k[6],15,-1560198380); b=ii(b,c,d,a,k[13],21,1309151649)
  a=ii(a,b,c,d,k[4],6,-145523070); d=ii(d,a,b,c,k[11],10,-1120210379); c=ii(c,d,a,b,k[2],15,718787259); b=ii(b,c,d,a,k[9],21,-343485551)
  state[0]=add32(state[0],a); state[1]=add32(state[1],b); state[2]=add32(state[2],c); state[3]=add32(state[3],d)
}
function md5(input) {
  const bytes = unescape(encodeURIComponent(input))
  const words = []
  for (let i=0;i<bytes.length;i++) words[i>>2] = (words[i>>2] || 0) | (bytes.charCodeAt(i) << ((i%4)*8))
  const bitLength = bytes.length * 8
  words[bitLength>>5] = (words[bitLength>>5] || 0) | (0x80 << (bitLength%32))
  const end = (((bitLength + 64) >>> 9) << 4) + 14
  words[end] = bitLength
  words[end+1] = Math.floor(bitLength / 0x100000000)
  const state=[1732584193,-271733879,-1732584194,271733878]
  for(let i=0;i<words.length;i+=16) md5cycle(state,Array.from({length:16},(_,j)=>words[i+j]||0))
  return state.map(n=>[0,8,16,24].map(s=>((n>>>s)&255).toString(16).padStart(2,'0')).join('')).join('')
}

export function buildSignature(timestamp = Math.floor(Date.now() / 1000)) {
  const digest = md5(`${timestamp}71cf27bb3c0bcdf207b64abecddc970098c7421ee7203b9cdae54478478a199e7d5a6e1a57691123c1a931c057842fb73ba3b3c83bcd69c17ccf174081e3d8aa`)
  return `${timestamp}.lpw6vgqzsp.${digest}`
}

async function request(path, params = {}, headers = {}) {
  const proxyEnabled = Boolean(PROXY_BASE)
  const url = new URL(`${proxyEnabled ? PROXY_BASE : API_BASE}${path}`)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)))
  let response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { [proxyEnabled ? 'x-jd-signature' : 'jdsignature']: buildSignature(), ...headers },
      mode: 'cors',
      credentials: 'omit',
    })
  } catch (error) {
    throw Object.assign(error, { url: url.toString() })
  }
  const text = await response.text()
  let data
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!response.ok || data?.success === 0) {
    const message = data?.message || data?.error || `HTTP ${response.status}`
    throw Object.assign(new Error(message), { status: response.status, response: data, action: data?.action, url: url.toString() })
  }
  return { data, status: response.status, url: url.toString() }
}

export async function searchMovies(number) {
  return request('/v2/search', {
    q: number, page: 1, type: 'movie', limit: 1,
    movie_type: 'all', from_recent: 'false',
    movie_filter_by: 'all', movie_sort_by: 'relevance',
  }, { 'accept-language': 'zh-TW' })
}

export async function getReviews(movieId, page = 1, limit = 20) {
  return request(`/v1/movies/${encodeURIComponent(movieId)}/reviews`, {
    page, sort_by: 'hotly', limit,
  })
}


// Accept either a JavDB detail URL (/v/{id}) or a movie ID copied directly.
export function parseMovieId(input) {
  const value = String(input || '').trim()
  if (!value) throw new Error('请粘贴 JavDB 影片详情页地址或影片 ID')

  if (/^[a-zA-Z0-9]+$/.test(value)) return value

  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error('无法识别输入内容。请粘贴完整的 JavDB 影片详情页地址，或直接输入影片 ID')
  }

  const match = url.pathname.match(/\\/v\\/([a-zA-Z0-9]+)(?:\\/|$)/)
  if (!match) throw new Error('地址中没有找到影片 ID。请确认这是 JavDB 的影片详情页（路径通常为 /v/影片ID）')
  return match[1]
}
