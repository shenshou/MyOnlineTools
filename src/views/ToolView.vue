<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Copy, Check, RotateCcw, Play, Star, Info, WandSparkles } from 'lucide-vue-next'
import { tools } from '../data/tools'
import { usePreferences } from '../stores/preferences'
import { runTool } from '../utils/toolActions'
import { Button, Input, Tabs, EmptyState } from '../components/ui'
const props=defineProps({id:String})
const router=useRouter(), prefs=usePreferences()
const tool=computed(()=>tools.find(t=>t.id===props.id))
const input=ref(''), output=ref(''), error=ref(''), copied=ref(false), busy=ref(false)
const mode=ref('format'), pattern=ref(''), flags=ref('g')
const modes={
 json:[['format','格式化'],['minify','压缩']],
 base64:[['encode','编码'],['decode','解码']],
 url:[['encode','编码'],['decode','解码']],
 case:[['camel','camelCase'],['pascal','PascalCase'],['snake','snake_case'],['kebab','kebab-case'],['upper','UPPERCASE'],['lower','lowercase']],
}
const modeOptions=computed(()=>modes[props.id]||[])
const modeTabs=computed(()=>modeOptions.value.map(([value,label])=>({value,label})))
watch(()=>props.id,()=>{input.value='';output.value='';error.value='';mode.value=modes[props.id]?.[0]?.[0]||'default';prefs.touch(props.id)},{immediate:true})
const placeholder=computed(()=>({json:'粘贴 JSON 数据…',base64:'输入要编码或解码的文本…',url:'输入 URL 或需要编码的内容…','text-stats':'在这里输入或粘贴文本…',case:'例如：hello world / helloWorld / hello_world',color:'#6366f1',regex:'输入需要匹配的文本…',magnet:'每行输入一个 BTIH 哈希或磁力链接…'})[props.id]||'输入内容…')
const description=computed(()=>({json:'校验 JSON，并将其格式化为易读结构或压缩为单行。',base64:'支持 UTF-8 中文文本的 Base64 编码和解码。',url:'对 URL 组件进行百分号编码或解码。','text-stats':'统计字符、非空白字符、单词、行数以及 UTF-8 字节数。',case:'支持 camelCase、PascalCase、snake_case、kebab-case 和大小写转换。',color:'输入 HEX 颜色值，查看对应 RGB 和 HSL。',regex:'输入正则表达式和 flags，查看所有匹配项。',magnet:'每行输入一个 BTIH 哈希或磁力链接；已有标准磁力链接会保持不变，缺少前缀的内容会自动补全。'})[props.id])
async function execute(){
  error.value='';copied.value=false;busy.value=true
  try {
    output.value=await runTool(props.id,input.value,{mode:mode.value,pattern:pattern.value,flags:flags.value})
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
      <div class="workspace-toolbar"><Tabs v-if="modeOptions.length" v-model="mode" :tabs="modeTabs" aria-label="处理模式"/><span v-else class="workspace-label">输入与设置</span><Button variant="ghost" size="sm" @click="clear"><RotateCcw :size="14"/> 清空</Button></div>
      <div v-if="tool.id==='regex'" class="regex-options"><Input v-model="pattern" label="正则表达式" placeholder="例如：\d+"/><Input v-model="flags" label="Flags" placeholder="g"/></div>
      <div class="editor-grid"><section class="editor-pane"><div class="pane-heading"><span>输入</span><span>{{input.length}} 字符</span></div><textarea v-model="input" :placeholder="placeholder" spellcheck="false"></textarea></section><section class="editor-pane output-pane"><div class="pane-heading"><span>结果</span><Button variant="ghost" size="sm" :disabled="!output" @click="copy"><Check v-if="copied" :size="14"/><Copy v-else :size="14"/>{{copied?'已复制':'复制结果'}}</Button></div><pre v-if="output">{{output}}</pre><EmptyState v-else title="等待处理结果" description="处理结果将在这里显示"/></section></div>
      <div v-if="error" class="error-message">{{error}}</div>
      <div class="workspace-bottom"><span><Info :size="14"/> 所有处理均在当前浏览器本地完成</span><Button :loading="busy" :disabled="busy" @click="execute"><Play :size="15" fill="currentColor"/>{{busy?'处理中…':'立即处理'}}</Button></div>
    </div>
    <div class="tip-card"><span>✦</span><div><b>使用提示</b><p>{{tool.desc}} 处理过程不会将你的输入内容发送到服务器。</p></div></div>
  </div>
  <EmptyState v-else title="没有找到这个工具" description="该工具可能已被移除或链接不正确。" action-label="返回首页" @action="router.push('/')"/>
</template>