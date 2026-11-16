<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { ArrowLeft, Search, Play, Pause, Square, RotateCcw, ExternalLink, MessageSquareText, CheckCircle2, AlertTriangle, Clock3, Film } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { Button, Textarea, Select } from '../components/ui'
import { getReviews } from '../modules/javdb/api'
import { searchJavDbMovies, isExactMovieCode, parseMovieNumbers } from '../modules/javdb/search'
import { filterReviewsByKeywords, getReviewItems, parseKeywords, uniqueReviews } from '../modules/javdb/batch'

const router = useRouter()
const numbersInput = ref('')
const mode = ref('all')
const keywordsInput = ref('')
const requestInterval = ref('3000')
const tasks = ref([])
const isRunning = ref(false)
const isPaused = ref(false)
const pageError = ref('')
const gapOptions = [
  { value: '2000', label: '2 秒（较快）' },
  { value: '3000', label: '3 秒（默认，较保守）' },
  { value: '5000', label: '5 秒（更保守）' },
]
const keywordList = computed(() => parseKeywords(keywordsInput.value))
const rawNumbers = computed(() => String(numbersInput.value || '').split(/[\s,，;；]+/).map(value => value.trim()).filter(Boolean))
const parsedNumbers = computed(() => parseMovieNumbers(numbersInput.value))
const invalidNumbers = computed(() => rawNumbers.value.filter(value => !/^[A-Z0-9]+(?:[-_][A-Z0-9]+)*$/i.test(value)))
const uniqueNumberCount = computed(() => parsedNumbers.value.length)
const validInput = computed(() => uniqueNumberCount.value > 0 && invalidNumbers.value.length === 0)
const canStart = computed(() => !isRunning.value && validInput.value && (mode.value !== 'keywords' || keywordList.value.length > 0))
const finishedCount = computed(() => tasks.value.filter(task => ['completed', 'failed', 'not-found', 'ambiguous', 'cancelled'].includes(task.status)).length)
const completedCount = computed(() => tasks.value.filter(task => task.status === 'completed').length)
const totalReviews = computed(() => tasks.value.reduce((sum, task) => sum + task.reviews.length, 0))
const matchedReviews = computed(() => tasks.value.reduce((sum, task) => sum + filterReviewsByKeywords(task.reviews, keywordList.value).length, 0))

let activeController = null
let cancelled = false
let resumeResolver = null
let lastRequestAt = 0

function createAbortError() {
  return new DOMException('任务已取消', 'AbortError')
}

function wakePausedQueue() {
  if (resumeResolver) {
    resumeResolver()
    resumeResolver = null
  }
}

async function waitForResume() {
  while (isPaused.value && !cancelled) {
    await new Promise(resolve => { resumeResolver = resolve })
  }
  if (cancelled) throw createAbortError()
}

function wait(ms, signal) {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(done, ms)
    function cleanup() {
      window.clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
    }
    function done() {
      cleanup()
      resolve()
    }
    function abort() {
      cleanup()
      reject(createAbortError())
    }
    if (signal?.aborted) abort()
    else signal?.addEventListener('abort', abort, { once: true })
  })
}

async function beforeRequest() {
  await waitForResume()
  const gap = Number(requestInterval.value) || 3000
  const remaining = Math.max(0, lastRequestAt + gap - Date.now())
  await wait(remaining, activeController?.signal)
  await waitForResume()
  lastRequestAt = Date.now()
}

function setTaskError(task, error, stage) {
  if (error?.name === 'AbortError' || cancelled) {
    task.status = 'cancelled'
    task.error = '任务已取消'
    return
  }
  task.status = 'failed'
  task.error = `${stage}失败：${error?.message || '未知错误'}`
}

async function fetchAllReviews(task, movie) {
  const collected = []
  const limit = 20
  let page = 1

  while (page <= 200) {
    await beforeRequest()
    const result = await getReviews(movie.movieId, page, limit, { signal: activeController.signal })
    const pageReviews = getReviewItems(result)
    if (!pageReviews.length) break

    const previousCount = collected.length
    collected.push(...pageReviews)
    const deduplicated = uniqueReviews(collected)
    collected.length = 0
    collected.push(...deduplicated)

    task.pagesFetched = page
    task.reviews = [...collected]

    if (pageReviews.length < limit || collected.length === previousCount) break
    page += 1
  }

  if (page > 200) task.warning = '评论页数超过 200 页，已停止继续请求以避免异常循环。'
  return collected
}

async function processTask(task) {
  task.status = 'searching'
  task.error = ''
  task.warning = ''
  task.movie = null
  task.candidates = []
  task.reviews = []
  task.pagesFetched = 0

  await beforeRequest()
  const searchResult = await searchJavDbMovies(task.number, { signal: activeController.signal })
  const exactMatches = searchResult.results.filter(item => isExactMovieCode(item.title, task.number))
  task.candidates = exactMatches
  task.suggestions = exactMatches.length ? [] : searchResult.results.slice(0, 5)

  if (!exactMatches.length) {
    task.status = 'not-found'
    task.error = '搜索结果中没有找到番号完全匹配的影片'
    return
  }

  if (exactMatches.length > 1) {
    task.status = 'ambiguous'
    task.error = '找到多个完全匹配结果，请手动选择正确影片'
    return
  }

  task.movie = exactMatches[0]
  task.status = 'fetching'
  await fetchAllReviews(task, task.movie)
  task.status = 'completed'
}

async function startQueue() {
  if (!canStart.value) {
    pageError.value = mode.value === 'keywords' && !keywordList.value.length
      ? '关键词筛选模式至少需要输入一个关键词。'
      : '请检查番号格式，至少输入一个有效番号。'
    return
  }

  pageError.value = ''
  tasks.value = parsedNumbers.value.map((number, index) => ({
    id: `${number}-${index}`,
    number,
    status: 'queued',
    movie: null,
    candidates: [],
    suggestions: [],
    reviews: [],
    pagesFetched: 0,
    error: '',
    warning: '',
  }))

  isRunning.value = true
  isPaused.value = false
  cancelled = false
  activeController = new AbortController()
  lastRequestAt = 0

  try {
    for (const task of tasks.value) {
      if (cancelled) break
      try {
        await processTask(task)
      } catch (error) {
        setTaskError(task, error, task.status === 'searching' ? '影片搜索' : '评论获取')
        if (cancelled) break
      }
    }
  } finally {
    if (cancelled) {
      for (const task of tasks.value) {
        if (task.status === 'queued') {
          task.status = 'cancelled'
          task.error = '任务已取消'
        }
      }
    }
    isRunning.value = false
    isPaused.value = false
    activeController = null
    wakePausedQueue()
  }
}

function pauseQueue() {
  isPaused.value = true
}

function resumeQueue() {
  isPaused.value = false
  wakePausedQueue()
}

function cancelQueue() {
  cancelled = true
  isPaused.value = false
  wakePausedQueue()
  activeController?.abort()
}

async function retryTask(task) {
  if (isRunning.value) return
  isRunning.value = true
  isPaused.value = false
  cancelled = false
  activeController = new AbortController()
  try {
    await processTask(task)
  } catch (error) {
    setTaskError(task, error, task.status === 'searching' ? '影片搜索' : '评论获取')
  } finally {
    isRunning.value = false
    activeController = null
  }
}

async function fetchSelectedCandidate(task, candidate) {
  if (isRunning.value) return
  task.movie = candidate
  task.status = 'fetching'
  task.error = ''
  task.warning = ''
  task.reviews = []
  task.pagesFetched = 0
  isRunning.value = true
  cancelled = false
  activeController = new AbortController()
  try {
    await fetchAllReviews(task, candidate)
    task.status = 'completed'
  } catch (error) {
    setTaskError(task, error, '评论获取')
  } finally {
    isRunning.value = false
    activeController = null
  }
}

function visibleReviews(task) {
  return mode.value === 'keywords'
    ? filterReviewsByKeywords(task.reviews, keywordList.value)
    : task.reviews
}

function statusLabel(status) {
  return ({
    queued: '排队中',
    searching: '搜索影片中',
    fetching: '获取评论中',
    completed: '已完成',
    failed: '失败',
    'not-found': '未找到',
    ambiguous: '需要选择',
    cancelled: '已取消',
  })[status] || status
}

function formatDate(value) {
  if (!value) return '时间未知'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

onBeforeUnmount(() => {
  cancelled = true
  wakePausedQueue()
  activeController?.abort()
})
</script>

<template>
  <section class="javdb-page">
    <button class="back-link" @click="router.push('/')"><ArrowLeft :size="15" /> 返回工具箱</button>

    <header class="page-heading">
      <div class="heading-icon"><MessageSquareText :size="23" /></div>
      <div>
        <div class="eyebrow">JAVDB / REVIEWS</div>
        <h1>JavDB 评论搜索</h1>
        <p>批量输入番号，自动匹配影片并获取评论，支持关键词筛选。</p>
      </div>
    </header>

    <section class="panel">
      <div class="panel-heading"><span>01 / 番号列表</span><span class="muted">支持换行、空格、逗号分隔，自动去重</span></div>
      <Textarea
        v-model="numbersInput"
        :rows="5"
        :disabled="isRunning"
        placeholder="例如：&#10;ABF-338&#10;SSIS-123&#10;IPX-456"
        hint="每个番号会按队列顺序处理，不会同时发起批量请求。"
      />
      <div class="input-summary">
        <span>识别到 {{ uniqueNumberCount }} 个不同番号</span>
        <span v-if="rawNumbers.length > uniqueNumberCount">已自动去重</span>
        <span v-if="invalidNumbers.length">格式不正确：{{ invalidNumbers.join("、") }}</span>
      </div>
    </section>

    <section class="panel">
      <div class="panel-heading"><span>02 / 获取设置</span></div>
      <div class="settings-grid">
        <Select v-model="requestInterval" :options="gapOptions" label="请求间隔" :disabled="isRunning" />
        <Select
          v-model="mode"
          :options="[{ value: 'all', label: '获取全部评论' }, { value: 'keywords', label: '仅显示关键词匹配评论' }]"
          label="评论展示模式"
          :disabled="isRunning"
        />
      </div>
      <Textarea
        v-if="mode === 'keywords'"
        v-model="keywordsInput"
        :rows="2"
        :disabled="isRunning"
        label="筛选关键词"
        placeholder="多个关键词用逗号或换行分隔，例如：剧情，beautiful，推荐"
        hint="不区分大小写，按部分文本匹配；多个关键词采用“任意一个命中”规则。"
      />
      <p class="notice"><Clock3 :size="14" /> 请求间隔应用于 JavDB 搜索请求和 Reviews 每一页请求。间隔只是降低请求频率，不代表一定不会触发服务端限制。</p>
      <div v-if="pageError" class="error-message"><AlertTriangle :size="15" />{{ pageError }}</div>
      <div class="actions">
        <Button v-if="!isRunning" :disabled="!canStart" @click="startQueue"><Play :size="15" /> 开始批量搜索</Button>
        <template v-else>
          <Button v-if="!isPaused" variant="secondary" @click="pauseQueue"><Pause :size="15" /> 暂停</Button>
          <Button v-else @click="resumeQueue"><Play :size="15" /> 继续</Button>
          <Button variant="danger" @click="cancelQueue"><Square :size="14" /> 取消任务</Button>
        </template>
      </div>
    </section>

    <section v-if="tasks.length" class="panel results-panel">
      <div class="panel-heading">
        <span>03 / 任务结果</span>
        <span class="muted">{{ finishedCount }} / {{ tasks.length }} 项已处理</span>
      </div>
      <div class="progress-track"><div class="progress-value" :style="{ width: `${tasks.length ? finishedCount / tasks.length * 100 : 0}%` }"></div></div>
      <div class="summary-grid">
        <div><strong>{{ completedCount }}</strong><span>成功番号</span></div>
        <div><strong>{{ totalReviews }}</strong><span>获取评论</span></div>
        <div><strong>{{ matchedReviews }}</strong><span>当前匹配</span></div>
      </div>

      <article v-for="task in tasks" :key="task.id" class="task-card">
        <div class="task-heading">
          <div class="task-title">
            <strong>{{ task.number }}</strong>
            <span class="task-status" :class="task.status">{{ statusLabel(task.status) }}</span>
          </div>
          <Button
            v-if="['failed', 'not-found'].includes(task.status) && !isRunning"
            size="sm"
            variant="secondary"
            @click="retryTask(task)"
          ><RotateCcw :size="13" /> 重试</Button>
        </div>

        <div v-if="task.movie" class="matched-movie">
          <Film :size="15" />
          <div><strong>{{ task.movie.title }}</strong><a :href="task.movie.url" target="_blank" rel="noopener noreferrer">查看 JavDB 详情 <ExternalLink :size="11" /></a></div>
          <code>{{ task.movie.movieId }}</code>
        </div>

        <p v-if="task.error" class="task-error"><AlertTriangle :size="13" />{{ task.error }}</p>
        <p v-if="task.warning" class="task-warning">{{ task.warning }}</p>

        <div v-if="task.status === 'ambiguous'" class="candidate-list">
          <div v-for="candidate in task.candidates" :key="candidate.movieId" class="candidate">
            <span>{{ candidate.title }}</span>
            <Button size="sm" :disabled="isRunning" @click="fetchSelectedCandidate(task, candidate)">选择并获取评论</Button>
          </div>
        </div>
        <div v-else-if="task.suggestions?.length && task.status === 'not-found'" class="suggestion-list">
          <span>相似搜索结果（未自动采用）：</span>
          <a v-for="candidate in task.suggestions" :key="candidate.movieId" :href="candidate.url" target="_blank" rel="noopener noreferrer">{{ candidate.title }}</a>
        </div>

        <template v-if="task.status === 'completed'">
          <div class="review-result-heading">
            <span>已获取 {{ task.reviews.length }} 条评论 · {{ task.pagesFetched }} 页</span>
            <strong v-if="mode === 'keywords'">匹配 {{ visibleReviews(task).length }} 条</strong>
          </div>
          <div v-if="visibleReviews(task).length" class="review-list">
            <article v-for="(review, index) in visibleReviews(task)" :key="review.id || index" class="review-item">
              <div class="review-meta"><strong>{{ review.username || '匿名用户' }}</strong><span>{{ formatDate(review.created_at) }}</span></div>
              <p>{{ review.content || '（空评论）' }}</p>
              <div class="review-foot"><span>评分：{{ review.score ?? '未评分' }}</span><span>赞：{{ review.likes_count ?? 0 }}</span></div>
            </article>
          </div>
          <div v-else class="empty-result">{{ mode === 'keywords' ? '没有评论命中当前关键词。' : '该影片暂无评论。' }}</div>
        </template>
      </article>
    </section>

    <aside class="footnote">
      <strong>处理说明</strong>
      <p>程序直接读取 JavDB 官方搜索页面，从精确匹配的影片详情链接提取 movieId，再调用已验证的 Reviews API。评论按分页顺序逐页获取；关键词筛选在本地完成。当前不使用 Cloudflare Worker，也不上传 JavDB 登录 Cookie。</p>
    </aside>
  </section>
</template>

<style scoped>
.javdb-page{max-width:1000px;margin:0 auto;padding:30px 28px 54px;color:var(--text)}
.back-link{display:flex;align-items:center;gap:7px;border:0;background:transparent;color:var(--muted);font-size:12px;padding:5px 0;cursor:pointer}
.page-heading{display:flex;align-items:center;gap:15px;margin:25px 0 24px}
.heading-icon{width:50px;height:50px;display:grid;place-items:center;border-radius:14px;background:var(--primary-soft);color:var(--primary);flex-shrink:0}
.eyebrow{font-size:9px;letter-spacing:1.4px;color:var(--muted);font-weight:700}
.page-heading h1{font-size:25px;margin:4px 0;font-weight:800;letter-spacing:-.5px}
.page-heading p{font-size:11px;color:var(--muted);margin:0;line-height:1.7}
.panel{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);padding:18px 19px;margin-bottom:14px;box-shadow:var(--shadow)}
.panel-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12px;font-weight:750;margin-bottom:14px}
.muted{color:var(--muted);font-size:10px;font-weight:400}
.input-summary{display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:10px;color:var(--muted)}
.input-summary span:last-child:not(:first-child){color:var(--warning)}
.settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
.notice{display:flex;align-items:flex-start;gap:7px;margin:12px 0;color:var(--muted);font-size:10px;line-height:1.6}
.notice svg{flex-shrink:0;margin-top:1px}
.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.error-message,.task-error{display:flex;align-items:flex-start;gap:7px;color:var(--danger);font-size:11px;line-height:1.6}
.progress-track{height:6px;overflow:hidden;border-radius:10px;background:var(--surface-2)}
.progress-value{height:100%;border-radius:10px;background:var(--primary);transition:width .2s}
.summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0}
.summary-grid>div{display:grid;gap:3px;padding:11px 13px;border:1px solid var(--line);border-radius:var(--radius-md);background:var(--surface-2)}
.summary-grid strong{font-size:17px;font-variant-numeric:tabular-nums}
.summary-grid span{font-size:9px;color:var(--muted)}
.task-card{padding:15px 0;border-top:1px solid var(--line)}
.task-heading,.task-title{display:flex;align-items:center;gap:9px}
.task-heading{justify-content:space-between}
.task-title strong{font-size:13px}
.task-status{padding:3px 7px;border-radius:5px;background:var(--surface-2);font-size:9px;color:var(--muted)}
.task-status.completed{color:var(--success);background:var(--success-soft)}
.task-status.failed,.task-status.cancelled{color:var(--danger);background:var(--danger-soft)}
.task-status.searching,.task-status.fetching{color:var(--info);background:var(--info-soft)}
.task-status.ambiguous,.task-status.not-found{color:var(--warning);background:var(--warning-soft)}
.matched-movie{display:flex;align-items:flex-start;gap:9px;margin-top:10px;padding:10px;background:var(--surface-2);border-radius:var(--radius-md);font-size:10px}
.matched-movie>svg{flex-shrink:0;color:var(--primary);margin-top:2px}
.matched-movie>div{display:grid;gap:5px;min-width:0;flex:1}
.matched-movie strong{font-size:10px;line-height:1.6}
.matched-movie a{display:flex;align-items:center;gap:4px;color:var(--primary);text-decoration:none;font-size:9px}
.matched-movie code{font-size:10px;color:var(--muted)}
.task-error{margin:9px 0 0}
.task-warning{font-size:10px;color:var(--warning)}
.candidate-list,.suggestion-list{display:grid;gap:8px;margin-top:10px}
.candidate{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px;border:1px solid var(--line);border-radius:var(--radius-md);font-size:10px}
.candidate span{min-width:0;line-height:1.6}
.suggestion-list span{font-size:9px;color:var(--muted)}
.suggestion-list a{font-size:10px;color:var(--primary);text-decoration:none}
.review-result-heading{display:flex;justify-content:space-between;gap:10px;margin:12px 0 5px;color:var(--muted);font-size:10px}
.review-result-heading strong{color:var(--success)}
.review-item{padding:12px 0;border-top:1px solid var(--line)}
.review-meta,.review-foot{display:flex;justify-content:space-between;gap:12px;font-size:10px;color:var(--muted)}
.review-meta strong{color:var(--text);font-size:11px}
.review-item p{font-size:12px;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere;margin:8px 0}
.review-foot{font-size:9px}
.empty-result{padding:18px;text-align:center;color:var(--muted);font-size:10px}
.footnote{padding:13px 15px;background:var(--surface-2);border:1px solid var(--line);border-radius:var(--radius-md);font-size:10px;line-height:1.7;color:var(--muted)}
.footnote strong{color:var(--text)}
.footnote p{margin:4px 0 0}
@media(max-width:650px){.javdb-page{padding:20px 13px 40px}.page-heading{gap:11px;margin:20px 0}.page-heading h1{font-size:20px}.page-heading p{font-size:10px}.panel{padding:14px}.settings-grid{grid-template-columns:1fr}.candidate{align-items:flex-start;flex-direction:column}.summary-grid{gap:6px}.summary-grid>div{padding:9px}.summary-grid strong{font-size:15px}}
</style>
