<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Search, MessageSquareText, RefreshCw, ChevronLeft, ChevronRight, ExternalLink, Code2, CheckCircle2, AlertTriangle, LoaderCircle } from 'lucide-vue-next'
import { buildSignature, searchMovies, getReviews } from '../modules/javdb/api'

const router = useRouter()
const number = ref('')
const busy = ref(false)
const stage = ref('idle')
const error = ref('')
const diagnostic = ref('')
const searchResult = ref(null)
const selectedMovie = ref(null)
const reviewResult = ref(null)
const page = ref(1)
const keyword = ref('')
const showRaw = ref(false)
const requestLog = ref([])
const reviews = computed(() => Array.isArray(reviewResult.value?.data?.reviews) ? reviewResult.value.data.reviews : [])
const filteredReviews = computed(() => {
  const q = keyword.value.trim().toLocaleLowerCase()
  if (!q) return reviews.value
  return reviews.value.filter(item => [item.content, item.username].join(' ').toLocaleLowerCase().includes(q))
})
const movies = computed(() => Array.isArray(searchResult.value?.data?.movies) ? searchResult.value.data.movies : [])

function logRequest(label, result) {
  requestLog.value.unshift({ label, status: result.status, url: result.url, at: new Date().toLocaleString() })
}
function explainError(err) {
  if (err instanceof TypeError || /fetch|network|cors/i.test(err.message || '')) {
    return '浏览器无法读取接口响应。常见原因是目标 API 未开放当前站点的 CORS 跨域访问；也可能是网络拦截或 DNS 问题。此时不能据此判断接口本身失效。'
  }
  if (err.status === 401 || err.status === 403 || /签名|signature|expired/i.test(err.message || '')) {
    return '请求已到达服务端，但签名或访问权限未通过。请检查系统时间、签名算法及接口当前的鉴权要求。'
  }
  return err.message || '请求失败，请查看原始错误信息。'
}
async function runSearch() {
  if (!number.value.trim()) { error.value = '请先输入番号'; return }
  busy.value = true; error.value = ''; diagnostic.value = ''; stage.value = 'searching'
  searchResult.value = null; selectedMovie.value = null; reviewResult.value = null; page.value = 1; requestLog.value = []
  try {
    const result = await searchMovies(number.value.trim())
    searchResult.value = result
    logRequest('番号搜索', result)
    stage.value = 'searched'
    if (!movies.value.length) diagnostic.value = '请求成功，但接口没有返回匹配影片。请确认番号格式，或查看原始响应。'
  } catch (err) {
    error.value = explainError(err); diagnostic.value = err.message
    stage.value = 'failed'
    requestLog.value.unshift({ label: '番号搜索失败', status: err.status || '网络错误', url: err.url || '请求未能完成', at: new Date().toLocaleString() })
  } finally { busy.value = false }
}
async function loadReviews(movie, targetPage = 1) {
  selectedMovie.value = movie; busy.value = true; error.value = ''; diagnostic.value = ''; page.value = targetPage
  stage.value = 'loading-reviews'; reviewResult.value = null
  try {
    const result = await getReviews(movie.id, targetPage, 20)
    reviewResult.value = result; logRequest(`Reviews 第 ${targetPage} 页`, result); stage.value = 'reviews'
    if (!reviews.value.length) diagnostic.value = '接口请求成功，但该页没有评论数据。'
  } catch (err) {
    error.value = explainError(err); diagnostic.value = err.message; stage.value = 'failed'
    requestLog.value.unshift({ label: `Reviews 第 ${targetPage} 页失败`, status: err.status || '网络错误', url: err.url || '请求未能完成', at: new Date().toLocaleString() })
  } finally { busy.value = false }
}
function formatDate(value) {
  if (!value) return '时间未知'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}
function movieTitle(movie) { return movie.origin_title || movie.title || movie.number || `影片 #${movie.id}` }
</script>

<template>
  <section class="lab-page">
    <button class="back-link" @click="router.push('/')"><ArrowLeft :size="15"/> 返回工具箱</button>
    <header class="lab-heading">
      <div class="lab-icon"><MessageSquareText :size="23"/></div>
      <div><div class="eyebrow">INTEGRATION / API LAB</div><h1>JavDB 评论 API 验证</h1><p>独立实验页面：验证番号搜索、影片匹配、Reviews 获取和分页，不影响现有工具。</p></div>
    </header>

    <section class="lab-panel">
      <div class="panel-title"><span>01 / 番号搜索</span><span class="muted">JavDB 移动端 API</span></div>
      <form class="search-form" @submit.prevent="runSearch">
        <input v-model="number" placeholder="输入番号，例如 ABC-123" autocomplete="off" spellcheck="false"/>
        <button class="primary-button" :disabled="busy"><LoaderCircle v-if="busy" class="spin" :size="15"/><Search v-else :size="15"/> 开始验证</button>
      </form>
      <p class="hint">将使用 /api/v2/search 搜索影片。签名在浏览器本地生成，不会上传到 MyOnlineTools。</p>
    </section>

    <section class="status-grid">
      <div class="status-card"><span>签名生成</span><strong class="status-ok"><CheckCircle2 :size="15"/> 已就绪</strong><small>时间戳 + MD5</small></div>
      <div class="status-card"><span>搜索状态</span><strong>{{stage === 'searched' || stage === 'reviews' ? '已完成' : stage === 'failed' ? '失败' : '待验证'}}</strong><small>/v2/search</small></div>
      <div class="status-card"><span>评论状态</span><strong>{{stage === 'reviews' ? '已获取' : '待验证'}}</strong><small>/v1/movies/{id}/reviews</small></div>
    </section>

    <div v-if="error" class="alert-error"><AlertTriangle :size="17"/><div><strong>请求未通过</strong><p>{{error}}</p><small v-if="diagnostic">原始错误：{{diagnostic}}</small></div></div>
    <div v-else-if="diagnostic" class="alert-info">{{diagnostic}}</div>

    <section v-if="movies.length" class="lab-panel">
      <div class="panel-title"><span>02 / 搜索结果</span><span class="muted">{{movies.length}} 个候选结果</span></div>
      <div class="movie-list">
        <article v-for="movie in movies" :key="movie.id" class="movie-row">
          <img v-if="movie.cover_url" :src="movie.cover_url" alt="" loading="lazy"/>
          <div class="movie-copy"><strong>{{movie.number || '番号未知'}} · {{movieTitle(movie)}}</strong><small>ID: {{movie.id}} · 日期：{{movie.release_date || '未知'}} · 评分：{{movie.score ?? '暂无'}}</small></div>
          <button class="secondary-button" @click="loadReviews(movie, 1)">获取评论 <ChevronRight :size="14"/></button>
        </article>
      </div>
    </section>

    <section v-if="selectedMovie" class="lab-panel">
      <div class="panel-title"><span>03 / Reviews 评论</span><span class="muted">影片 ID：{{selectedMovie.id}}</span></div>
      <div class="review-toolbar"><span>当前第 {{page}} 页 · 每页 20 条</span><input v-model="keyword" placeholder="在当前页筛选评论关键词…"/></div>
      <div v-if="reviews.length" class="review-list">
        <article v-for="(review, index) in filteredReviews" :key="review.id || index" class="review-item">
          <div class="review-meta"><strong>{{review.username || '匿名用户'}}</strong><span>{{formatDate(review.created_at)}}</span></div>
          <p>{{review.content || '（空评论）'}}</p>
          <div class="review-foot"><span>评分：{{review.score ?? '未评分'}}</span><span>赞：{{review.likes_count ?? 0}}</span></div>
        </article>
        <div v-if="!filteredReviews.length" class="empty-filter">当前页没有匹配关键词的评论。</div>
      </div>
      <div v-else class="empty-filter">当前页没有返回评论，或评论请求尚未成功。</div>
      <div class="pagination"><button class="secondary-button" :disabled="page <= 1 || busy" @click="loadReviews(selectedMovie, page - 1)"><ChevronLeft :size="14"/> 上一页</button><span>第 {{page}} 页</span><button class="secondary-button" :disabled="reviews.length < 20 || busy" @click="loadReviews(selectedMovie, page + 1)">下一页 <ChevronRight :size="14"/></button></div>
    </section>

    <section class="lab-panel diagnostics">
      <div class="panel-title"><span><Code2 :size="16"/> 请求诊断</span><button class="text-button" @click="showRaw = !showRaw">{{showRaw ? '收起' : '展开'}}原始 JSON</button></div>
      <div v-if="requestLog.length" class="request-list"><div v-for="(item, index) in requestLog" :key="index" class="request-row"><span>{{item.label}}</span><code>{{item.status}}</code><small>{{item.url}}</small></div></div>
      <p v-else class="muted">尚未发起请求。执行搜索后，这里会记录实际请求地址和状态。</p>
      <pre v-if="showRaw" class="raw-json">{{JSON.stringify({search: searchResult?.data || null, reviews: reviewResult?.data || null}, null, 2)}}</pre>
      <div class="signature-preview"><span>本次签名格式预览</span><code>{{buildSignature().slice(0, 24)}}…</code><small>仅用于调试；签名会随时间戳更新。</small></div>
    </section>

    <aside class="lab-notice"><strong>原型边界</strong><p>本页只从浏览器直接请求 JavDB API。若浏览器因 CORS 拦截，原型会明确显示网络层错误；这不代表 API 本身不可用。届时再单独评估 Cloudflare Worker 代理，不会提前引入后端。</p></aside>
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
.search-form{display:flex;gap:9px}
.search-form input,.review-toolbar input{min-width:0;flex:1;border:1px solid var(--line);border-radius:var(--radius-md);padding:11px 12px;background:var(--surface-2);color:var(--text);font:12px var(--font-family);outline:0}
.search-form input:focus,.review-toolbar input:focus{border-color:var(--primary)}
.primary-button,.secondary-button{display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:var(--radius-md);padding:9px 13px;font-size:11px;font-weight:650;white-space:nowrap}
.primary-button{border:1px solid var(--primary);background:var(--primary);color:var(--on-primary)}
.primary-button:disabled{opacity:.55;cursor:wait}
.secondary-button{border:1px solid var(--line);background:var(--surface);color:var(--text)}
.secondary-button:disabled{opacity:.4;cursor:not-allowed}
.hint{margin-top:9px}
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
.movie-list,.review-list{display:grid}
.movie-row{display:flex;align-items:center;gap:12px;padding:11px 0;border-top:1px solid var(--line)}
.movie-row img{width:44px;height:58px;object-fit:cover;border-radius:5px;background:var(--surface-2)}
.movie-copy{min-width:0;flex:1;display:grid;gap:5px}
.movie-copy strong{font-size:11px;overflow-wrap:anywhere}
.movie-copy small{font-size:9px;color:var(--muted)}
.review-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;font-size:10px;color:var(--muted)}
.review-toolbar input{max-width:260px;padding:8px 10px;font-size:10px}
.review-item{padding:13px 0;border-top:1px solid var(--line)}
.review-meta,.review-foot{display:flex;justify-content:space-between;gap:12px;font-size:10px;color:var(--muted)}
.review-meta strong{color:var(--text);font-size:11px}
.review-item p{font-size:12px;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere;margin:9px 0}
.review-foot{font-size:9px}
.empty-filter{padding:22px;text-align:center;color:var(--muted);font-size:11px}
.pagination{display:flex;align-items:center;justify-content:center;gap:14px;padding-top:14px;border-top:1px solid var(--line);font-size:10px;color:var(--muted)}
.text-button{border:0;background:transparent;color:var(--primary);font-size:10px}
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
@media(max-width:650px){.lab-page{padding:20px 13px 40px}.lab-heading{gap:11px;margin:20px 0}.lab-heading h1{font-size:20px}.lab-heading p{font-size:10px}.lab-panel{padding:14px}.search-form{flex-direction:column}.search-form .primary-button{width:100%}.status-grid{gap:6px}.status-card{padding:10px 9px}.status-card strong{font-size:10px}.movie-row{gap:8px}.movie-copy strong{font-size:10px}.movie-row .secondary-button{padding:7px 8px;font-size:10px}.review-toolbar{align-items:flex-start;flex-direction:column}.review-toolbar input{max-width:none;width:100%}.review-meta{flex-direction:column;gap:4px}}
</style>
