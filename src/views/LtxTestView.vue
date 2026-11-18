<script setup>
import { computed, ref } from 'vue'
import { ArrowLeft, CheckCircle2, CircleAlert, Clock3, Database, ExternalLink, FileJson2, LoaderCircle, Search, ShieldCheck } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { Button } from '../components/ui'
import { searchLtxItems } from '../modules/ltx/api'

const router = useRouter()
const code = ref('IPX-811')
const loading = ref(false)
const stage = ref('')
const error = ref('')
const result = ref(null)
const expanded = ref(new Set())
const startedAt = ref(0)
const elapsedMs = ref(0)

const items = computed(() => result.value?.items || [])
const total = computed(() => result.value?.total ?? result.value?.count ?? items.value.length)
const durationLabel = computed(() => elapsedMs.value ? `${(elapsedMs.value / 1000).toFixed(2)} 秒` : '—')

function toggleItem(index) {
  const next = new Set(expanded.value)
  next.has(index) ? next.delete(index) : next.add(index)
  expanded.value = next
}

async function runSearch() {
  if (loading.value) return
  error.value = ''
  result.value = null
  expanded.value = new Set()
  loading.value = true
  startedAt.value = performance.now()
  stage.value = '准备请求'
  try {
    result.value = await searchLtxItems(code.value, {
      onStage: value => { stage.value = value },
    })
    stage.value = '搜索成功，响应已解密'
  } catch (cause) {
    error.value = cause?.message || '未知错误'
    stage.value = '验证未完成'
  } finally {
    elapsedMs.value = performance.now() - startedAt.value
    loading.value = false
  }
}

function displayTitle(item) {
  return item.title_zh || item.title || item.code || '未提供标题'
}

function formatValue(value) {
  try { return JSON.stringify(value, null, 2) } catch { return String(value) }
}
</script>

<template>
  <section class="ltx-page">
    <div class="ltx-heading">
      <div>
        <div class="ltx-eyebrow"><Database :size="14"/> API PROTOTYPE</div>
        <h1>LTX 接口验证</h1>
        <p>验证浏览器端能否建立加密会话、搜索番号并还原真实数据。</p>
      </div>
      <a class="ltx-source-link" href="https://ltxlib.dpdns.org" target="_blank" rel="noreferrer">
        打开 Jasna-LTX <ExternalLink :size="14"/>
      </a>
    </div>

    <div class="ltx-notice">
      <ShieldCheck :size="18"/>
      <div>
        <strong>独立测试，不影响现有功能</strong>
        <span>本页面使用网站公开客户端协议建立临时会话，不读取或保存你在其他网站的 Cookie、账号凭据。</span>
      </div>
    </div>

    <section class="ltx-panel">
      <div class="ltx-panel-title">
        <div><span class="ltx-step">01</span><strong>搜索接口测试</strong></div>
        <span class="ltx-protocol">POST /api/items/query</span>
      </div>
      <form class="ltx-search-form" @submit.prevent="runSearch">
        <label for="ltx-code">番号</label>
        <div class="ltx-input-row">
          <input id="ltx-code" v-model="code" placeholder="例如 IPX-811" autocomplete="off" :disabled="loading"/>
          <Button type="submit" :disabled="loading || !code.trim()">
            <LoaderCircle v-if="loading" class="spin" :size="16"/>
            <Search v-else :size="16"/>
            {{ loading ? '验证中…' : '开始验证' }}
          </Button>
        </div>
        <p class="ltx-hint">当前先验证单个番号；搜索参数与网站前端默认设置保持一致，暂不加入批量请求。</p>
      </form>
    </section>

    <section class="ltx-panel ltx-status-panel">
      <div class="ltx-panel-title">
        <div><span class="ltx-step">02</span><strong>请求过程与结果</strong></div>
        <span class="ltx-duration"><Clock3 :size="13"/> {{ durationLabel }}</span>
      </div>
      <div class="ltx-status-row" :class="{ 'is-error': error, 'is-success': result }">
        <LoaderCircle v-if="loading" class="spin" :size="17"/>
        <CircleAlert v-else-if="error" :size="17"/>
        <CheckCircle2 v-else-if="result" :size="17"/>
        <Database v-else :size="17"/>
        <div>
          <strong>{{ loading ? '正在验证' : error ? '验证失败' : result ? '验证成功' : '等待开始' }}</strong>
          <span>{{ stage || '输入番号后开始测试' }}</span>
        </div>
      </div>
      <div v-if="error" class="ltx-error">
        <strong>错误信息</strong>
        <pre>{{ error }}</pre>
        <p>如果错误是 Failed to fetch / NetworkError，浏览器通常无法直接区分 CORS、网络故障或连接被中断；需要结合开发者工具的 Network / Console 判断。</p>
      </div>
      <div v-if="result" class="ltx-summary">
        <div><span>返回条目</span><strong>{{ items.length }}</strong></div>
        <div><span>接口总数</span><strong>{{ total }}</strong></div>
        <div><span>耗时</span><strong>{{ durationLabel }}</strong></div>
        <div><span>响应字段</span><strong>{{ Object.keys(result).length }}</strong></div>
      </div>
    </section>

    <section v-if="result" class="ltx-panel">
      <div class="ltx-panel-title">
        <div><span class="ltx-step">03</span><strong>解密后的搜索结果</strong></div>
        <span class="ltx-result-count">{{ items.length }} 条</span>
      </div>
      <div v-if="items.length" class="ltx-results">
        <article v-for="(item, index) in items" :key="item.code || index" class="ltx-result">
          <img v-if="item.cover" class="ltx-cover" :src="item.cover" :alt="item.code || '影片封面'" loading="lazy" referrerpolicy="no-referrer"/>
          <div v-else class="ltx-cover ltx-cover-empty"><Database :size="22"/></div>
          <div class="ltx-result-main">
            <strong>{{ item.code || '未提供番号' }}</strong>
            <span>{{ displayTitle(item) }}</span>
            <small v-if="item.title && item.title_zh && item.title !== item.title_zh">{{ item.title }}</small>
            <div class="ltx-tags">
              <span v-if="item.score != null">评分：{{ item.score }}</span>
              <span v-if="item.date">{{ item.date }}</span>
              <span v-if="item.actorNames?.length">{{ item.actorNames.join(' / ') }}</span>
            </div>
            <button class="ltx-expand" type="button" @click="toggleItem(index)">
              <FileJson2 :size="13"/> {{ expanded.has(index) ? '收起原始数据' : '查看原始数据' }}
            </button>
            <pre v-if="expanded.has(index)" class="ltx-json">{{ formatValue(item) }}</pre>
          </div>
        </article>
      </div>
      <div v-else class="ltx-empty">接口已成功响应并解密，但本次没有匹配条目。</div>
      <details class="ltx-raw-response">
        <summary>查看完整解密响应 JSON</summary>
        <pre>{{ formatValue(result) }}</pre>
      </details>
    </section>

    <div class="ltx-footer-actions">
      <Button variant="secondary" @click="router.push('/')"><ArrowLeft :size="15"/> 返回工具箱</Button>
      <span>测试页面仅用于接口可行性验证，尚未作为正式功能发布。</span>
    </div>
  </section>
</template>

<style scoped>
.ltx-page{max-width:1050px;margin:0 auto;padding:34px 30px 48px;color:var(--text)}
.ltx-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:24px}
.ltx-eyebrow{display:flex;align-items:center;gap:7px;color:var(--primary);font-size:10px;font-weight:750;letter-spacing:1.4px}
.ltx-heading h1{margin:9px 0 7px;font-size:27px;letter-spacing:-.7px}
.ltx-heading p{margin:0;color:var(--muted);font-size:13px}
.ltx-source-link{display:flex;align-items:center;gap:6px;color:var(--primary);font-size:12px;white-space:nowrap}
.ltx-notice{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;margin-bottom:18px;border:1px solid var(--line);border-radius:var(--radius-lg);background:var(--surface-2);color:var(--primary)}
.ltx-notice div{display:grid;gap:4px}.ltx-notice strong{font-size:12px;color:var(--text)}.ltx-notice span{font-size:11px;line-height:1.6;color:var(--muted)}
.ltx-panel{margin-top:16px;padding:20px;border:1px solid var(--line);border-radius:var(--radius-xl);background:var(--surface);box-shadow:var(--shadow)}
.ltx-panel-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}
.ltx-panel-title>div{display:flex;align-items:center;gap:10px}.ltx-panel-title strong{font-size:14px}
.ltx-step{display:grid;place-items:center;width:25px;height:25px;border-radius:8px;background:var(--primary-soft);color:var(--primary);font-size:10px;font-weight:750}
.ltx-protocol,.ltx-duration,.ltx-result-count{display:flex;align-items:center;gap:5px;color:var(--muted);font-size:10px}
.ltx-search-form label{display:block;margin-bottom:8px;font-size:11px;font-weight:650}
.ltx-input-row{display:flex;gap:9px}.ltx-input-row input{height:42px;min-width:0;flex:1;padding:0 13px;border:1px solid var(--line);border-radius:var(--radius-md);background:var(--surface-2);color:var(--text);outline:none}.ltx-input-row input:focus{border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-soft)}
.ltx-hint{margin:9px 0 0;color:var(--muted);font-size:10px}
.ltx-status-row{display:flex;align-items:center;gap:11px;padding:13px;border-radius:var(--radius-md);background:var(--surface-2);color:var(--muted)}
.ltx-status-row>div{display:grid;gap:3px}.ltx-status-row strong{font-size:12px;color:var(--text)}.ltx-status-row span{font-size:11px}
.ltx-status-row.is-error{color:var(--danger)}.ltx-status-row.is-success{color:var(--success)}
.ltx-error{margin-top:13px;padding:12px;border:1px solid var(--danger-border,var(--line));border-radius:var(--radius-md);background:var(--surface-2)}
.ltx-error strong{font-size:11px;color:var(--danger)}.ltx-error pre{white-space:pre-wrap;overflow-wrap:anywhere;margin:7px 0;font-size:11px;color:var(--text)}.ltx-error p{margin:0;color:var(--muted);font-size:10px;line-height:1.6}
.ltx-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:13px}
.ltx-summary>div{padding:12px;border:1px solid var(--line);border-radius:var(--radius-md);display:grid;gap:5px}.ltx-summary span{font-size:10px;color:var(--muted)}.ltx-summary strong{font-size:18px;font-variant-numeric:tabular-nums}
.ltx-results{display:grid;gap:10px}
.ltx-result{display:flex;gap:13px;padding:12px;border:1px solid var(--line);border-radius:var(--radius-md);min-width:0}
.ltx-cover{width:76px;height:104px;flex:0 0 76px;object-fit:cover;border-radius:7px;background:var(--surface-2)}
.ltx-cover-empty{display:grid;place-items:center;color:var(--muted)}
.ltx-result-main{min-width:0;flex:1;display:grid;align-content:start;gap:5px}.ltx-result-main>strong{font-size:12px;color:var(--primary)}.ltx-result-main>span{font-size:12px;font-weight:650;overflow-wrap:anywhere}.ltx-result-main>small{font-size:10px;color:var(--muted);overflow-wrap:anywhere}
.ltx-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:3px}.ltx-tags span{padding:3px 7px;border-radius:5px;background:var(--surface-2);color:var(--muted);font-size:9px}
.ltx-expand{justify-self:start;display:flex;align-items:center;gap:5px;margin-top:4px;padding:4px 0;border:0;background:transparent;color:var(--primary);font-size:10px}
.ltx-json,.ltx-raw-response pre{max-height:420px;overflow:auto;padding:12px;border-radius:8px;background:var(--surface-2);color:var(--text);font:10px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}
.ltx-empty{padding:28px;text-align:center;color:var(--muted);font-size:12px}
.ltx-raw-response{margin-top:14px}.ltx-raw-response summary{cursor:pointer;color:var(--muted);font-size:11px}.ltx-raw-response pre{margin-top:10px}
.ltx-footer-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:20px}.ltx-footer-actions>span{font-size:10px;color:var(--muted)}
.spin{animation:ltx-spin 1s linear infinite}@keyframes ltx-spin{to{transform:rotate(360deg)}}
@media(max-width:650px){.ltx-page{padding:24px 16px 36px}.ltx-heading{align-items:flex-start;flex-direction:column}.ltx-heading h1{font-size:23px}.ltx-panel{padding:15px}.ltx-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.ltx-footer-actions{align-items:flex-start;flex-direction:column}.ltx-protocol{font-size:9px}}
</style>
