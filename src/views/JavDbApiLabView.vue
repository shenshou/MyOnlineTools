<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, ExternalLink, MessageSquareText, ChevronLeft, ChevronRight, Code2, CheckCircle2, AlertTriangle, LoaderCircle, Search } from 'lucide-vue-next'
import { buildSignature, getReviews, parseMovieId } from '../modules/javdb/api'

const router = useRouter()
const number = ref('ABF-338')
const javdbBaseUrl = ref('https://javdb.com')
const movieInput = ref('')
const movieId = ref('')
const busy = ref(false)
const reviewState = ref('idle')
const error = ref('')
const diagnostic = ref('')
const errorResponse = ref(null)
const reviewResult = ref(null)
const page = ref(1)
const keyword = ref('')
const showRaw = ref(false)
const requestLog = ref([])
const searchUrl = computed(() => {
  const base = javdbBaseUrl.value.trim().replace(/\/+$/, '')
  return base ? `${base}/search?q=${encodeURIComponent(number.value.trim())}` : ''
})
const reviews = computed(() => Array.isArray(reviewResult.value?.data?.data?.reviews) ? reviewResult.value.data.data.reviews : [])
const filteredReviews = computed(() => {
  const q = keyword.value.trim().toLocaleLowerCase()
  if (!q) return reviews.value
  return reviews.value.filter(item => [item.content, item.username].join(' ').toLocaleLowerCase().includes(q))
})

function logRequest(label, result) {
  requestLog.value.unshift({ label, status: result.status, url: result.url, at: new Date().toLocaleString() })
}
function explainError(err) {
  if (err instanceof TypeError || /fetch|network|cors/i.test(err.message || '')) {
    return '浏览器无法读取评论 API 响应。可能是跨域策略、网络拦截或 DNS 问题；请查看原始错误。'
  }
  if (err.action === 'JWTVerificationError' || /請登錄帳號|请登录账号|JWTVerificationError/i.test(err.message || '')) {
    return '上游 Reviews API 返回了业务层认证失败。HTTP 200 不代表评论请求成功。'
  }
  if (err.status === 401 || err.status === 403 || /签名|signature|expired/i.test(err.message || '')) {
    return '请求已到达服务端，但签名或访问权限未通过。请检查系统时间、签名算法及接口当前的鉴权要求。'
  }
  return err.message || '请求失败，请查看原始错误信息。'
}
function resolveMovieId() {
  error.value = ''; diagnostic.value = ''; errorResponse.value = null; reviewResult.value = null
  try {
    movieId.value = parseMovieId(movieInput.value)
    reviewState.value = 'idle'
  } catch (err) {
    movieId.value = ''
    error.value = '无法识别影片 ID'
    diagnostic.value = err.message
    reviewState.value = 'failed'
  }
}
async function loadReviews(targetPage = 1) {
  if (!movieId.value) { resolveMovieId(); if (!movieId.value) return }
  busy.value = true; error.value = ''; diagnostic.value = ''; errorResponse.value = null
  page.value = targetPage; reviewState.value = 'loading'; reviewResult.value = null
  try {
    const result = await getReviews(movieId.value, targetPage, 20)
    reviewResult.value = result; logRequest(`Reviews 第 ${targetPage} 页`, result); reviewState.value = 'success'
    if (!reviews.value.length) diagnostic.value = '请求成功，但响应中没有识别到评论数组。请展开原始 JSON 检查实际数据结构。'
  } catch (err) {
    error.value = explainError(err); diagnostic.value = err.message; errorResponse.value = err.response || null; reviewState.value = 'failed'
    requestLog.value.unshift({ label: `Reviews 第 ${targetPage} 页失败`, status: err.status || '网络错误', url: err.url || '请求未能完成', at: new Date().toLocaleString() })
  } finally { busy.value = false }
}
function formatDate(value) {
  if (!value) return '时间未知'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}
</script>

<template>
  <section class="lab-page">
    <button class="back-link" @click="router.push('/')"><ArrowLeft :size="15"/> 返回工具箱</button>
    <header class="lab-heading">
      <div class="lab-icon"><MessageSquareText :size="23"/></div>
      <div><div class="eyebrow">INTEGRATION / API LAB</div><h1>JavDB 评论 API 验证</h1><p>通过 JavDB 官方网页定位影片，再使用影片 ID 验证 Reviews API；不依赖移动端搜索 API。</p></div>
    </header>

    <section class="lab-panel">
      <div class="panel-title"><span>01 / 在 JavDB 官方页面搜索</span><span class="muted">人工选择匹配影片</span></div>
      <label class="field-label">JavDB 站点地址</label>
      <input class="wide-input" v-model="javdbBaseUrl" placeholder="https://javdb.com" spellcheck="false"/>
      <label class="field-label">番号</label>
      <div class="search-form">
        <input v-model="number" placeholder="输入番号，例如 ABF-338" autocomplete="off" spellcheck="false"/>
        <a class="primary-button" :href="searchUrl" target="_blank" rel="noopener noreferrer" :aria-disabled="!searchUrl || !number.trim()"><Search :size="15"/> 打开官方搜索 <ExternalLink :size="13"/></a>
      </div>
      <p class="hint">在新标签页中确认番号对应的影片，打开影片详情页。此页面不直接抓取 JavDB HTML，避免依赖跨域代理或共享登录 Cookie。</p>
    </section>

    <section class="lab-panel">
      <div class="panel-title"><span>02 / 提取影片 ID</span><span class="muted">支持详情页 URL 或 ID</span></div>
      <div class="search-form">
        <input v-model="movieInput" placeholder="粘贴影片详情页地址，例如 https://javdb.com/v/xxxx，或直接输入 ID" autocomplete="off" spellcheck="false"/>
        <button class="secondary-button" @click="resolveMovieId">解析 ID</button>
      </div>
      <div v-if="movieId" class="resolved-id"><CheckCircle2 :size="15"/> 已识别影片 ID：<code>{{movieId}}</code></div>
      <p class="hint">JAV-JHS 的实现也是从 JavDB 搜索结果卡片中的详情页链接提取 /v/{id}，然后直接请求 Reviews。</p>
    </section>

    <section class="status-grid">
      <div class="status-card"><span>签名生成</span><strong class="status-ok"><CheckCircle2 :size="15"/> 已就绪</strong><small>时间戳 + MD5</small></div>
      <div class="status-card"><span>影片 ID</span><strong>{{movieId ? '已识别' : '待输入'}}</strong><small>/v/{id}</small></div>
      <div class="status-card"><span>评论状态</span><strong>{{reviewState === 'success' ? '已获取' : reviewState === 'failed' ? '失败' : reviewState === 'loading' ? '请求中' : '待验证'}}</strong><small>/v1/movies/{id}/reviews</small></div>
    </section>

    <div v-if="error" class="alert-error"><AlertTriangle :size="17"/><div><strong>请求未通过</strong><p>{{error}}</p><small v-if="diagnostic">原始错误：{{diagnostic}}</small></div></div>
    <div v-else-if="diagnostic" class="alert-info">{{diagnostic}}</div>

    <section v-if="movieId" class="lab-panel">
      <div class="panel-title"><span>03 / 获取 Reviews 评论</span><span class="muted">影片 ID：{{movieId}}</span></div>
      <div class="review-toolbar">
        <span>当前第 {{page}} 页 · 每页 20 条</span>
        <div class="toolbar-actions"><input v-model="keyword" placeholder="筛选当前页评论关键词…"/><button class="primary-button" :disabled="busy" @click="loadReviews(1)"><LoaderCircle v-if="busy" class="spin" :size="14"/><MessageSquareText v-else :size="14"/> 获取评论</button></div>
      </div>
      <div v-if="reviews.length" class="review-list">
        <article v-for="(review, index) in filteredReviews" :key="review.id || index" class="review-item">
          <div class="review-meta"><strong>{{review.username || '匿名用户'}}</strong><span>{{formatDate(review.created_at)}}</span></div>
          <p>{{review.content || '（空评论）'}}</p>
          <div class="review-foot"><span>评分：{{review.score ?? '未评分'}}</span><span>赞：{{review.likes_count ?? 0}}</span></div>
        </article>
        <div v-if="!filteredReviews.length" class="empty-filter">当前页没有匹配关键词的评论。</div>
      </div>
      <div v-else class="empty-filter">尚未获取评论，或当前页没有评论数据。</div>
      <div class="pagination"><button class="secondary-button" :disabled="page <= 1 || busy" @click="loadReviews(page - 1)"><ChevronLeft :size="14"/> 上一页</button><span>第 {{page}} 页</span><button class="secondary-button" :disabled="reviews.length < 20 || busy" @click="loadReviews(page + 1)">下一页 <ChevronRight :size="14"/></button></div>
    </section>

    <section class="lab-panel diagnostics">
      <div class="panel-title"><span><Code2 :size="16"/> 请求诊断</span><button class="text-button" @click="showRaw = !showRaw">{{showRaw ? '收起' : '展开'}}原始 JSON</button></div>
      <div v-if="requestLog.length" class="request-list"><div v-for="(item, index) in requestLog" :key="index" class="request-row"><span>{{item.label}}</span><code>{{item.status}}</code><small>{{item.url}}</small></div></div>
      <p v-else class="muted">尚未发起 Reviews 请求。解析影片 ID 后即可测试。</p>
      <pre v-if="showRaw" class="raw-json">{{JSON.stringify({reviews: reviewResult?.data || errorResponse || null}, null, 2)}}</pre>
      <div class="signature-preview"><span>本次签名格式预览</span><code>{{buildSignature().slice(0, 24)}}…</code><small>仅用于调试；签名会随时间戳更新。</small></div>
    </section>

    <aside class="lab-notice"><strong>原型边界</strong><p>此流程不调用 /api/v2/search，也不部署 Worker。官方网页搜索由你在 JavDB 标签页中完成，影片 ID 从详情页 URL 提取；本页面只负责验证 Reviews API。当前不共享或上传 JavDB 登录 Cookie。</p></aside>
  </section>
</template>

<style scoped>
.lab-page{max-width:980px;margin:0 auto;padding:30px 28px 54px;color:var(--text)}
.back-link{display:flex;align-items:center;gap:7px;border:0;background:transparent;color:var(--muted);font-size:12px;padding:5px 0}
.lab-heading{display:flex;align-items:center;gap:15px;margin:25px 0 24px}
.lab-icon{width:50px;height:50px;display:grid;place-items:center;border-radius:14px;background:var(--primary-soft);color:var(--primary);flex-shrink:0}
.eyebrow{font-size:9px;letter-spacing:1.4px;color:var(--muted);font-weight:700}
.lab-heading h1{font-size:25px;margin:4px 0;font-weight:800;letter-spacing:-.5px}
.lab-heading p,.hint{font-size:11px;color:var(--muted);margin:0;line-height:1.7}
.lab-panel{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);padding:18px 19px;margin-bottom:14px;box-shadow:var(--shadow)}
.panel-title{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12px;font-weight:750;margin-bottom:15px}
.panel-title>span:first-child{display:flex;align-items:center;gap:7px}
.muted{color:var(--muted);font-size:10px;font-weight:400}
.field-label{display:block;margin:10px 0 6px;font-size:10px;color:var(--muted)}
.wide-input,.search-form input,.review-toolbar input{min-width:0;flex:1;border:1px solid var(--line);border-radius:var(--radius-md);padding:11px 12px;background:var(--surface-2);color:var(--text);font:12px var(--font-family);outline:0}
.wide-input{width:100%;box-sizing:border-box}
.wide-input:focus,.search-form input:focus,.review-toolbar input:focus{border-color:var(--primary)}
.search-form{display:flex;gap:9px}
.primary-button,.secondary-button{display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:var(--radius-md);padding:9px 13px;font-size:11px;font-weight:650;white-space:nowrap;text-decoration:none}
.primary-button{border:1px solid var(--primary);background:var(--primary);color:var(--on-primary)}
.primary-button:disabled{opacity:.55;cursor:wait}
.secondary-button{border:1px solid var(--line);background:var(--surface);color:var(--text);cursor:pointer}
.secondary-button:disabled{opacity:.4;cursor:not-allowed}
.hint{margin-top:9px}
.resolved-id{display:flex;align-items:center;gap:6px;margin-top:10px;color:var(--success);font-size:11px}
.resolved-id code{color:var(--text);font-family:var(--font-mono)}
.status-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}
.status-card{display:grid;gap:7px;padding:13px 15px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md)}
.status-card>span,.status-card small{font-size:10px;color:var(--muted)}
.status-card strong{font-size:12px}
.status-card small{font-size:9px}
.status-ok{display:flex;align-items:center;gap:5px;color:var(--success)}
.alert-error,.alert-info{display:flex;gap:10px;padding:13px 15px;margin-bottom:14px;border-radius:var(--radius-md);font-size:11px;line-height:1.65}
.alert-error{background:var(--danger-soft);color:var(--danger)}
.alert-error p{margin:4px 0}.alert-error small{opacity:.8}
.alert-info{background:var(--info-soft);color:var(--info)}
.review-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;font-size:10px;color:var(--muted)}
.toolbar-actions{display:flex;gap:8px;min-width:0}
.review-toolbar input{max-width:240px;padding:8px 10px;font-size:10px}
.review-list{display:grid}
.review-item{padding:13px 0;border-top:1px solid var(--line)}
.review-meta,.review-foot{display:flex;justify-content:space-between;gap:12px;font-size:10px;color:var(--muted)}
.review-meta strong{color:var(--text);font-size:11px}
.review-item p{font-size:12px;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere;margin:9px 0}
.review-foot{font-size:9px}
.empty-filter{padding:22px;text-align:center;color:var(--muted);font-size:11px}
.pagination{display:flex;align-items:center;justify-content:center;gap:14px;padding-top:14px;border-top:1px solid var(--line);font-size:10px;color:var(--muted)}
.text-button{border:0;background:transparent;color:var(--primary);font-size:10px;cursor:pointer}
.request-list{display:grid;gap:9px}
.request-row{display:grid;grid-template-columns:1fr auto;gap:4px 12px;padding:9px 0;border-top:1px solid var(--line);font-size:10px}
.request-row code{color:var(--success)}
.request-row small{grid-column:1/-1;color:var(--muted);overflow-wrap:anywhere;font-size:9px}
.raw-json{max-height:360px;overflow:auto;margin:12px 0 0;padding:12px;border-radius:var(--radius-md);background:var(--surface-2);font:10px/1.6 var(--font-mono);white-space:pre-wrap;overflow-wrap:anywhere}
.signature-preview{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:13px;padding-top:12px;border-top:1px solid var(--line);font-size:9px;color:var(--muted)}
.signature-preview code{color:var(--text);font:10px var(--font-mono)}
.signature-preview small{width:100%}
.lab-notice{padding:13px 15px;background:var(--surface-2);border:1px solid var(--line);border-radius:var(--radius-md);font-size:10px;line-height:1.7;color:var(--muted)}
.lab-notice strong{color:var(--text)}
.lab-notice p{margin:4px 0 0}
.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:650px){.lab-page{padding:20px 13px 40px}.lab-heading{gap:11px;margin:20px 0}.lab-heading h1{font-size:20px}.lab-heading p{font-size:10px}.lab-panel{padding:14px}.search-form{flex-direction:column}.search-form>*{width:100%;box-sizing:border-box}.status-grid{gap:6px}.status-card{padding:10px 9px}.status-card strong{font-size:10px}.review-toolbar{align-items:flex-start;flex-direction:column}.toolbar-actions{width:100%;flex-direction:column}.review-toolbar input{max-width:none;width:100%;box-sizing:border-box}}
</style>
