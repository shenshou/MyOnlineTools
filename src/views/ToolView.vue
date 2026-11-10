<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Copy, Check, RotateCcw, Play, Star, Info, WandSparkles } from 'lucide-vue-next'
import { tools } from '../data/tools'
import { usePreferences } from '../stores/preferences'
import { runTool } from '../utils/toolActions'
const props=defineProps({id:String})
const router=useRouter(), prefs=usePreferences()
const tool=computed(()=>tools.find(t=>t.id===props.id))
const input=ref(''), output=ref(''), error=ref(''), copied=ref(false), busy=ref(false)
const mode=ref('format'), length=ref(16), count=ref(1), pattern=ref(''), flags=ref('g')
const lower=ref(true), upper=ref(true), numbers=ref(true), symbols=ref(false)
const modes={
 json:[['format','格式化'],['minify','压缩']],
 base64:[['encode','编码'],['decode','解码']],
 url:[['encode','编码'],['decode','解码']],
 case:[['camel','camelCase'],['pascal','PascalCase'],['snake','snake_case'],['kebab','kebab-case'],['upper','UPPERCASE'],['lower','lowercase']],
 'sort-lines':[['asc','升序'],['desc','降序']],
 timestamp:[['to-date','时间戳 → 日期'],['to-ts','日期 → 时间戳']],
 hash:[['SHA-256','SHA-256'],['SHA-1','SHA-1'],['SHA-512','SHA-512']],
 html:[['encode','转义'],['decode','反转义']]
}
const modeOptions=computed(()=>modes[props.id]||[])
watch(()=>props.id,()=>{input.value='';output.value='';error.value='';mode.value=modes[props.id]?.[0]?.[0]||'default';prefs.touch(props.id)},{immediate:true})
const placeholder=computed(()=>({json:'粘贴 JSON 数据…',base64:'输入要编码或解码的文本…',url:'输入 URL 或需要编码的内容…','text-stats':'在这里输入或粘贴文本…',case:'例如：hello world / helloWorld / hello_world',dedupe:'每行输入一条内容…','sort-lines':'每行输入一条内容…',timestamp:'输入 Unix 时间戳或日期时间…',color:'#6366f1',uuid:'点击生成按钮创建 UUID',password:'可调整下方选项后生成密码',hash:'输入需要计算哈希的文本…',regex:'输入需要匹配的文本…',html:'输入包含特殊字符的 HTML 文本…'})[props.id]||'输入内容…')
const description=computed(()=>({json:'校验 JSON，并将其格式化为易读结构或压缩为单行。',base64:'支持 UTF-8 中文文本的 Base64 编码和解码。',url:'对 URL 组件进行百分号编码或解码。','text-stats':'统计字符、非空白字符、单词、行数以及 UTF-8 字节数。',case:'支持 camelCase、PascalCase、snake_case、kebab-case 和大小写转换。',dedupe:'逐行去重，保留首次出现的顺序。','sort-lines':'支持自然排序，数字按数值顺序排列。',timestamp:'自动识别秒级或毫秒级 Unix 时间戳。',color:'输入 HEX 颜色值，查看对应 RGB 和 HSL。',uuid:'使用浏览器安全随机数生成 UUID v4。',password:'使用浏览器加密安全随机数生成密码。',hash:'使用 Web Crypto API 在本地计算摘要。',regex:'输入正则表达式和 flags，查看所有匹配项。',html:'对 HTML 特殊字符进行转义或反转义。'})[props.id])
async function execute(){
  error.value='';copied.value=false;busy.value=true
  try {
    output.value=await runTool(props.id,input.value,{mode:mode.value,length:length.value,count:count.value,lower:lower.value,upper:upper.value,numbers:numbers.value,symbols:symbols.value,pattern:pattern.value,flags:flags.value})
  } catch(e){output.value='';error.value=e.message||'处理失败，请检查输入内容'}
  finally{busy.value=false}
}
async function copy(){if(!output.value)return;await navigator.clipboard.writeText(output.value);copied.value=true;setTimeout(()=>copied.value=false,1600)}
function clear(){input.value='';output.value='';error.value=''}
</script>
<template>
  <div v-if="tool" class="tool-page">
    <button class="back-link" @click="router.push('/')"><ArrowLeft :size="16"/> 返回工具箱</button>
    <div class="tool-intro"><div class="tool-intro-icon" :class="tool.color"><WandSparkles :size="23"/></div><div><div class="breadcrumb">工具箱 <span>/</span> {{tool.name}}</div><h1>{{tool.name}}</h1><p>{{description}}</p></div><button class="favorite-large" :class="{selected:prefs.favorites.includes(tool.id)}" @click="prefs.toggleFavorite(tool.id)"><Star :size="17" :fill="prefs.favorites.includes(tool.id)?'currentColor':'none'"/>{{prefs.favorites.includes(tool.id)?'已收藏':'收藏'}}</button></div>
    <div class="workspace">
      <div class="workspace-toolbar"><div class="mode-tabs" v-if="modeOptions.length"><button v-for="m in modeOptions" :key="m[0]" :class="{active:mode===m[0]}" @click="mode=m[0]">{{m[1]}}</button></div><span v-else class="workspace-label">输入与设置</span><button class="text-button" @click="clear"><RotateCcw :size="14"/> 清空</button></div>
      <div v-if="tool.id==='password'" class="options-panel"><label>密码长度 <b>{{length}}</b><input v-model.number="length" type="range" min="4" max="64"/></label><div class="check-options"><label><input v-model="lower" type="checkbox"/> 小写字母</label><label><input v-model="upper" type="checkbox"/> 大写字母</label><label><input v-model="numbers" type="checkbox"/> 数字</label><label><input v-model="symbols" type="checkbox"/> 特殊符号</label></div></div>
      <div v-if="tool.id==='uuid'" class="options-panel"><label>生成数量 <input v-model.number="count" type="number" min="1" max="100" class="number-input"/></label></div>
      <div v-if="tool.id==='regex'" class="regex-options"><label>正则表达式<input v-model="pattern" placeholder="例如：\d+"/></label><label>Flags<input v-model="flags" placeholder="g" class="flags-input"/></label></div>
      <div v-if="tool.id==='timestamp' && mode==='to-ts'" class="hint-panel"><Info :size="15"/> 可输入日期，例如 2026-11-11 12:30:00；留空则使用当前时间。</div>
      <div class="editor-grid"><section class="editor-pane"><div class="pane-heading"><span>输入</span><span>{{input.length}} 字符</span></div><textarea v-model="input" :placeholder="placeholder" spellcheck="false"></textarea></section><section class="editor-pane output-pane"><div class="pane-heading"><span>结果</span><button class="copy-button" :disabled="!output" @click="copy"><Check v-if="copied" :size="14"/><Copy v-else :size="14"/>{{copied?'已复制':'复制结果'}}</button></div><pre v-if="output">{{output}}</pre><div v-else class="output-placeholder"><span>✧</span><p>处理结果将在这里显示</p></div></section></div>
      <div v-if="error" class="error-message">{{error}}</div>
      <div class="workspace-bottom"><span><Info :size="14"/> 所有处理均在当前浏览器本地完成</span><button class="btn-primary" :disabled="busy" @click="execute"><Play :size="15" fill="currentColor"/>{{busy?'处理中…':tool.id==='uuid'||tool.id==='password'?'生成':'立即处理'}}</button></div>
    </div>
    <div class="tip-card"><span>✦</span><div><b>使用提示</b><p>{{tool.desc}} 处理过程不会将你的输入内容发送到服务器。</p></div></div>
  </div>
  <div v-else class="not-found"><h2>没有找到这个工具</h2><button class="btn-primary" @click="router.push('/')">返回首页</button></div>
</template>