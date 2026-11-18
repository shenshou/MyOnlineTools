<script setup>
const installUrl = 'https://raw.githubusercontent.com/shenshou/MyOnlineTools/main/userscripts/ltx-batch-checker.user.js'
</script>

<template>
  <section class="ltx-page">
    <span class="eyebrow">LTX USERSCRIPT</span>
    <h1>LTX 批量番号检测已迁移</h1>
    <p>检测功能现由独立油猴脚本提供，不再通过本工具箱页面发起请求。</p>
    <div class="actions">
      <a class="primary" :href="installUrl" target="_blank" rel="noreferrer">安装 LTX 批量检测脚本 ↗</a>
      <a href="https://ltxlib.dpdns.org/" target="_blank" rel="noreferrer">打开 LTX 官方网站 ↗</a>
    </div>
    <ol>
      <li>先安装 Tampermonkey 或 Violentmonkey。</li>
      <li>打开上方脚本链接并确认安装。</li>
      <li>进入 LTX 官方网站，使用页面右下角的批量检测面板。</li>
    </ol>
    <p class="note">脚本逐个执行查询；遇到访问限制会停止或报告失败，不会把查询失败误判为番号不存在。JavDB 功能不受影响。</p>
  </section>
</template>

<style scoped>
.ltx-page{max-width:720px;margin:0 auto;padding:42px 24px;color:var(--text)}
.eyebrow{color:var(--primary);font-size:10px;font-weight:750;letter-spacing:1.2px}
h1{margin:9px 0;font-size:25px}
p,li{color:var(--muted);font-size:13px;line-height:1.8}
.actions{display:flex;flex-wrap:wrap;gap:10px;margin:22px 0}
.actions a{display:inline-flex;align-items:center;padding:10px 14px;border:1px solid var(--line);border-radius:var(--radius-md);color:var(--text);text-decoration:none;font-size:12px}
.actions a.primary{border-color:var(--primary);background:var(--primary);color:var(--on-primary)}
ol{padding-left:20px}
.note{margin-top:24px;padding:12px;border-radius:var(--radius-md);background:var(--surface-2)}
</style>
