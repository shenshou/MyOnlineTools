export const categories = [
  { id: 'text', name: '文本工具', icon: 'FileText' },
  { id: 'developer', name: '开发工具', icon: 'Code2' },
  { id: 'convert', name: '编码转换', icon: 'ArrowLeftRight' },
  { id: 'generator', name: '生成工具', icon: 'WandSparkles' },
]
export const tools = [
  { id:'json', name:'JSON 格式化', desc:'格式化、压缩与校验 JSON 数据', category:'developer', icon:'Braces', color:'violet', tags:['JSON','格式化','压缩'] },
  { id:'base64', name:'Base64 编解码', desc:'文本与 Base64 字符串互相转换', category:'convert', icon:'Binary', color:'blue', tags:['Base64','编码'] },
  { id:'url', name:'URL 编码', desc:'URL 组件编码与解码', category:'convert', icon:'Link', color:'cyan', tags:['URL','编码'] },
  { id:'text-stats', name:'文本统计', desc:'统计字数、字符数、行数与词数', category:'text', icon:'ChartNoAxesColumn', color:'orange', tags:['字数','字符'] },
  { id:'case', name:'大小写转换', desc:'在 camelCase、snake_case 等格式间转换', category:'text', icon:'CaseSensitive', color:'pink', tags:['大小写','命名'] },
  { id:'dedupe', name:'文本去重', desc:'删除重复行，保留原始顺序', category:'text', icon:'ListFilter', color:'green', tags:['去重','行'] },
  { id:'sort-lines', name:'文本行排序', desc:'按字母或数字顺序排列文本行', category:'text', icon:'ArrowDownAZ', color:'blue', tags:['排序','行'] },
  { id:'color', name:'颜色转换', desc:'HEX、RGB、HSL 颜色格式互转', category:'convert', icon:'Palette', color:'pink', tags:['HEX','RGB','颜色'] },
  { id:'uuid', name:'UUID 生成', desc:'快速生成随机 UUID v4', category:'generator', icon:'Fingerprint', color:'violet', tags:['UUID','随机'] },
  { id:'password', name:'密码生成器', desc:'生成自定义长度的随机安全密码', category:'generator', icon:'KeyRound', color:'green', tags:['密码','随机'] },
  { id:'hash', name:'哈希计算', desc:'计算文本的 SHA-1 / SHA-256 / SHA-512', category:'developer', icon:'ShieldCheck', color:'cyan', tags:['SHA','Hash'] },
  { id:'regex', name:'正则表达式测试', desc:'实时匹配文本并查看匹配结果', category:'developer', icon:'Regex', color:'orange', tags:['Regex','匹配'] },
  { id:'html', name:'HTML 实体转换', desc:'HTML 特殊字符转义与反转义', category:'text', icon:'Code', color:'blue', tags:['HTML','实体'] },
]
