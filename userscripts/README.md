# LTX 批量番号存在性检测（油猴脚本）

这是一个独立运行在 LTX 官方网站页面中的批量检测脚本，不依赖 GitHub Pages 工具箱，也不需要 Gateway、弹窗或跨页面消息桥接。

## 安装

1. 安装 Tampermonkey 或 Violentmonkey 浏览器扩展。
2. 打开并安装 [LTX 批量番号检测脚本](https://raw.githubusercontent.com/shenshou/MyOnlineTools/main/userscripts/ltx-batch-checker.user.js)。
3. 打开 [LTX 官方网站](https://ltxlib.dpdns.org/)。
4. 页面右下角会出现「LTX 批量检测」面板。

脚本需要在 LTX 官方站点页面运行。若站点要求登录，请先按网站正常流程登录。

## 使用

- 每行输入一个番号；也支持空格、逗号、分号分隔（连续空白会作为一个分隔符）。
- 单批最多 300 个，脚本按顺序逐个查询；请求间隔可选 1、3、5、8、10、15 秒，默认 1 秒。
- 结果分为「存在」「不存在」「检测失败」；失败不会被当作不存在。
- 可停止批次或复制结果。
- 结果只保存在当前页面运行期间的内存中，不写入 localStorage、IndexedDB 或远程存储。

## 查询与请求策略

- 使用 LTX 官方页面的同源相对路径请求，并携带浏览器现有站点凭据。
- 按官方前端协议执行 ECDH P-256、HKDF-SHA256、AES-256-GCM 响应解密及 Gzip 解压。
- 只按 `item.code` 做规范化后的精确匹配，不把模糊搜索命中当作存在。
- 只有完整检查分页且分页元数据一致后，才会返回「不存在」。
- 遇到 HTTP 403 会停止剩余批次；遇到 HTTP 429 会遵循服务器的 `Retry-After`，不尝试绕过站点限制。

## 边界与限制

- 脚本不绕过登录、验证码、访问控制或站点风控；上游拒绝请求时会显示失败。
- 当前自动化检查只能验证脚本语法和仓库构建，不能替代真实浏览器中的 LTX 上游验证。
- LTX 站点可能调整 API、加密协议或访问策略，届时需要更新脚本。
- 脚本不读取或展示作品详情，只在内存中解密响应并检查番号字段。
- JavDB 相关代码和请求路径不属于本脚本范围，保持独立。


# JavDB 评论批量搜索（油猴脚本）

这是一个独立运行在 JavDB 页面中的评论批量搜索脚本。原在线工具箱「JavDB 评论搜索」页面继续保留，两者互不替代。

## 安装

1. 安装 Tampermonkey 或 Violentmonkey。
2. 打开并安装 [JavDB 评论批量搜索脚本](https://raw.githubusercontent.com/shenshou/MyOnlineTools/main/userscripts/javdb-review-batch.user.js)。
3. 正常登录 JavDB 后，打开 https://javdb.com/，页面右下角会出现「评论批量搜索」入口。

## 功能

- 批量输入番号，逐个搜索 JavDB 影片并获取评论。
- 影片搜索使用当前 JavDB 页面同源会话；评论继续使用现有 Reviews API 和签名逻辑。
- 默认 8 秒请求间隔，可选 5、8、10、15 秒。
- 支持评论关键词和起始日期筛选、单个番号评论展开、批量复制筛选结果。
- 支持暂停、继续、停止；成功获取的 movieId、评论页和评论内容会保存在当前标签页的 sessionStorage，刷新页面后可恢复。
- 断点续跑从失败步骤继续：已保存 movieId 时不会重新搜索，已成功获取的评论页不会重复请求。

## 错误与访问限制

- JavDB 搜索与 Reviews API 错误分开标识。
- HTTP 403 会暂停队列，不进行自动循环重试；如果检测到 Cloudflare Challenge，会明确提示。
- HTTP 429 遵循 Retry-After；超过自动等待上限时转为手动暂停。
- 网络错误及常见 5xx 最多有限重试 2 次，并采用递增等待。
- 脚本不会绕过验证码、登录要求或上游访问控制，也不保证可以消除 403。
- 脚本不读取、保存或要求用户提供账号密码、Cookie 或 Token。JavDB 登录 Cookie 由浏览器按同源规则自动处理；Reviews API 请求不携带 JavDB Cookie。

## 注意

- 自动化检查只能验证脚本语法、仓库测试和构建；实际 JavDB 登录态、搜索结果、评论接口及风控表现仍需在用户自己的浏览器中验证。
- 会话进度只保存在当前标签页的 sessionStorage，关闭标签页后通常会清除；浏览器存储容量不足时，页面会提示无法完整保存。
- JavDB 或 Reviews API 调整页面结构、接口或签名规则后，脚本可能需要更新。
