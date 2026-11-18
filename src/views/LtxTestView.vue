<script setup>
import { ref } from 'vue'
import { ArrowLeft, CheckCircle2, CircleAlert, LoaderCircle, Search } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { Button } from '../components/ui'
import { checkLtxCodeViaOfficialPage } from '../modules/ltx/bridge'

const router = useRouter()
const code = ref('')
const loading = ref(false)
const stage = ref('')
const error = ref('')
const exists = ref(null)

async function runSearch() {
  if (loading.value) return

  const target = code.value.trim()
  if (!target) return

  loading.value = true
  error.value = ''
  exists.value = null
  stage.value = '准备验证'

  try {
    exists.value = await checkLtxCodeViaOfficialPage(target, {
      onStage: value => { stage.value = value },
    })
    stage.value = '验证完成'
  } catch (cause) {
    error.value = cause?.message || '未知错误'
    stage.value = '无法完成验证'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="ltx-page">
    <header class="ltx-heading">
      <div>
        <span class="ltx-eyebrow">LTX CODE CHECK</span>
        <h1>番号存在性检测</h1>
        <p>输入番号，只返回是否存在，不展示作品详情。需要安装一次同源检测辅助脚本。</p>
      </div>
      <div class="ltx-heading-links"><a href="https://raw.githubusercontent.com/shenshou/MyOnlineTools/feat/ltx-same-origin-bridge/userscripts/ltx-existence-bridge.user.js" target="_blank" rel="noreferrer">安装辅助脚本 ↗</a><a href="https://ltxlib.dpdns.org" target="_blank" rel="noreferrer">Jasna-LTX ↗</a></div>
    </header>

    <section class="ltx-panel">
      <form class="ltx-search-form" @submit.prevent="runSearch">
        <label for="ltx-code">番号</label>
        <div class="ltx-input-row">
          <input
            id="ltx-code"
            v-model="code"
            placeholder="例如 IPX-811"
            autocomplete="off"
            :disabled="loading"
          />
          <Button type="submit" :disabled="loading || !code.trim()">
            <LoaderCircle v-if="loading" class="spin" :size="16" />
            <Search v-else :size="16" />
            {{ loading ? '检测中…' : '检测' }}
          </Button>
        </div>
      </form>

      <div class="ltx-status" :class="{ 'is-loading': loading, 'is-error': error, 'is-result': exists !== null }">
        <LoaderCircle v-if="loading" class="spin" :size="20" />
        <CircleAlert v-else-if="error" :size="20" />
        <CheckCircle2 v-else-if="exists === true" :size="20" />
        <CircleAlert v-else-if="exists === false" :size="20" />
        <span v-if="loading">{{ stage || '正在检测' }}</span>
        <span v-else-if="error">无法判断：{{ error }}</span>
        <strong v-else-if="exists === true">true · 存在</strong>
        <strong v-else-if="exists === false">false · 不存在</strong>
        <span v-else>等待输入番号</span>
      </div>
      <p class="ltx-footnote">页面只显示 true / false，不展示或保存作品详情。检测通过 LTX 官方页面中的辅助脚本执行同源请求；辅助脚本仅向本页面回传布尔结果。</p>
    </section>

    <footer class="ltx-footer">
      <Button variant="secondary" @click="router.push('/')"><ArrowLeft :size="15" /> 返回工具箱</Button>
      <span>当前为独立验证页面，未接入正式工具入口。</span>
    </footer>
  </section>
</template>

<style scoped>
.ltx-page{max-width:760px;margin:0 auto;padding:38px 26px 48px;color:var(--text)}
.ltx-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:22px}
.ltx-eyebrow{color:var(--primary);font-size:10px;font-weight:750;letter-spacing:1.3px}
.ltx-heading h1{margin:8px 0 6px;font-size:25px;letter-spacing:-.5px}
.ltx-heading p{margin:0;color:var(--muted);font-size:12px}
.ltx-heading-links{display:flex;gap:14px;align-items:center}.ltx-heading-links a{color:var(--primary);font-size:11px;white-space:nowrap}
.ltx-panel{padding:20px;border:1px solid var(--line);border-radius:var(--radius-xl);background:var(--surface);box-shadow:var(--shadow)}
.ltx-search-form label{display:block;margin-bottom:8px;font-size:11px;font-weight:650}
.ltx-input-row{display:flex;gap:9px}
.ltx-input-row input{height:42px;min-width:0;flex:1;padding:0 13px;border:1px solid var(--line);border-radius:var(--radius-md);background:var(--surface-2);color:var(--text);outline:none}
.ltx-input-row input:focus{border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-soft)}
.ltx-status{display:flex;align-items:center;gap:9px;min-height:54px;margin-top:18px;padding:12px 14px;border-radius:var(--radius-md);background:var(--surface-2);color:var(--muted);font-size:12px;overflow-wrap:anywhere}
.ltx-status.is-loading{color:var(--primary)}
.ltx-status.is-error{color:var(--danger)}
.ltx-status.is-result strong{font-size:15px;color:var(--text)}
.ltx-footnote{margin:12px 1px 0;color:var(--muted);font-size:10px;line-height:1.65}
.ltx-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:18px}
.ltx-footer span{color:var(--muted);font-size:10px}
.spin{animation:ltx-spin 1s linear infinite}
@keyframes ltx-spin{to{transform:rotate(360deg)}}
@media(max-width:600px){.ltx-page{padding:26px 16px 36px}.ltx-heading{align-items:flex-start;flex-direction:column}.ltx-heading h1{font-size:22px}.ltx-panel{padding:15px}.ltx-footer{align-items:flex-start;flex-direction:column}}
</style>
