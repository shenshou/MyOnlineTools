export const categories = [
  { id: 'text', name: '文本工具', icon: 'FileText' },
  { id: 'developer', name: '开发工具', icon: 'Code2' },
  { id: 'convert', name: '编码转换', icon: 'ArrowLeftRight' },
]
export const tools = [
  { id:'json', name:'JSON 格式化', desc:'格式化、压缩与校验 JSON 数据', category:'developer', icon:'Braces', color:'violet', tags:['JSON','格式化','压缩'] },
  { id:'base64', name:'Base64 编解码', desc:'文本与 Base64 字符串互相转换', category:'convert', icon:'Binary', color:'blue', tags:['Base64','编码'] },
  { id:'url', name:'URL 编码', desc:'URL 组件编码与解码', category:'convert', icon:'Link', color:'cyan', tags:['URL','编码'] },
  { id:'text-stats', name:'文本统计', desc:'统计字数、字符数、行数与词数', category:'text', icon:'ChartNoAxesColumn', color:'orange', tags:['字数','字符'] },
  { id:'case', name:'大小写转换', desc:'在 camelCase、snake_case 等格式间转换', category:'text', icon:'CaseSensitive', color:'pink', tags:['大小写','命名'] },
  { id:'color', name:'颜色转换', desc:'HEX、RGB、HSL 颜色格式互转', category:'convert', icon:'Palette', color:'pink', tags:['HEX','RGB','颜色'] },
  { id:'regex', name:'正则表达式测试', desc:'实时匹配文本并查看匹配结果', category:'developer', icon:'Regex', color:'orange', tags:['Regex','匹配'] },
  { id:'magnet', name:'磁力链接补全', desc:'批量为缺少前缀的 BTIH 哈希补全磁力链接', category:'convert', icon:'Magnet', color:'cyan', tags:['Magnet','BTIH','批量'] },
]
