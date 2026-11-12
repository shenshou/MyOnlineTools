# 共享 UI 组件

项目内部的 Vue 3 基础组件，不依赖第三方 UI 框架。组件通过 `src/components/ui/index.js` 统一导出；样式使用 `src/styles/tokens.css` 中的设计令牌。

## 使用约定

- 优先使用 `v-model` 与 `update:modelValue` 同步受控值。
- 组件只负责通用展示和交互；业务规则、数据请求和持久化留在页面或业务 composable。
- 原生 HTML 属性可透传的组件会明确标注；不要假设所有组件都支持任意属性。
- `Button` 默认 `type="button"`，避免在表单中意外触发表单提交。
- 弹窗、提示等全局交互由对应 composable 提供状态与操作 API。
- 示例假设已从 `@/components/ui` 导入组件；请按项目实际别名或相对路径调整。

## 组件索引

| 组件 | 用途 | 主要接口 |
| --- | --- | --- |
| Button | 操作按钮 | Props、`click`、默认插槽 |
| Input | 单行输入 | Props、`update:modelValue` |
| Textarea | 多行输入 | Props、`update:modelValue` |
| Select | 原生下拉选择 | Props、`update:modelValue` |
| Tabs | 标签切换 | `modelValue`、`tabs`、`update:modelValue` |
| Dropdown | 操作菜单 | `items`、`select` |
| Tooltip | 悬浮提示 | `text`、默认插槽 |
| Modal | 对话框容器 | Props、`update:modelValue`、`close`、三个插槽 |
| ConfirmDialog | 全局确认对话框 | `useConfirm()` |
| ToastContainer | 全局消息容器 | `useToast()` |
| EmptyState | 空状态 | Props、`action`、默认插槽 |
| Loading | 加载状态 | Props |

---

## Button

用于触发操作。支持加载状态、禁用状态、块级宽度和不同视觉变体。

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| variant | String | `primary` | `primary`、`secondary`、`ghost`、`danger` |
| size | String | `md` | `sm`、`md`、`lg` |
| type | String | `button` | 原生 button type |
| disabled | Boolean | `false` | 禁用按钮 |
| loading | Boolean | `false` | 显示加载指示并自动禁用 |
| block | Boolean | `false` | 按钮占满容器宽度 |

### Events

| Event | 参数 | 说明 |
| --- | --- | --- |
| click | 原生 MouseEvent | 点击时触发；按钮禁用或加载时不会触发 |

### Slots

- `default`：按钮内容，通常为文本或图标加文本。

### 示例

```vue
<script setup>
import { ref } from 'vue'
import { Button } from '@/components/ui'

const saving = ref(false)
function save() {
  saving.value = true
  // 执行保存操作
}
</script>

<template>
  <Button variant="primary" :loading="saving" @click="save">
    保存
  </Button>
  <Button variant="secondary" size="sm">取消</Button>
</template>
```

## Input

带可选标签、提示和错误文案的单行输入组件。通过 `v-model` 双向绑定字符串或数字；输入事件实际发出的值为字符串。未声明为 Props 的原生属性（如 `name`、`autocomplete`、`maxlength`）会透传到内部 input。

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | String \| Number | `''` | 输入值 |
| label | String | 无 | 字段标签；为空时不渲染标签文本 |
| hint | String | 无 | 辅助说明；仅在没有 error 时显示 |
| error | String | 无 | 错误文案；存在时设置 `aria-invalid="true"` |
| placeholder | String | 无 | 占位文本 |
| type | String | `text` | 原生 input type |
| disabled | Boolean | `false` | 禁用输入 |
| required | Boolean | `false` | 原生必填属性 |

### Events

| Event | 参数 | 说明 |
| --- | --- | --- |
| update:modelValue | String | 输入内容变化时触发 |

### Slots

无。

### 示例

```vue
<Input
  v-model="keyword"
  label="关键词"
  placeholder="输入要搜索的内容"
  hint="支持名称和描述搜索"
  maxlength="80"
/>
```

## Textarea

带可选标签、提示和错误文案的多行文本输入组件。未声明为 Props 的原生属性会透传到内部 textarea。

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | String | `''` | 文本内容 |
| label | String | 无 | 字段标签 |
| hint | String | 无 | 辅助说明；仅在没有 error 时显示 |
| error | String | 无 | 错误文案；存在时设置 `aria-invalid="true"` |
| placeholder | String | 无 | 占位文本 |
| rows | String \| Number | `3` | 初始显示行数 |
| disabled | Boolean | `false` | 禁用输入 |
| required | Boolean | `false` | 原生必填属性 |

### Events

| Event | 参数 | 说明 |
| --- | --- | --- |
| update:modelValue | String | 输入内容变化时触发 |

### Slots

无。

### 示例

```vue
<Textarea
  v-model="description"
  label="备注"
  :rows="5"
  placeholder="补充说明"
/>
```

## Select

基于原生 select 的选择组件。选项支持基本值数组或对象数组；对象格式为 `{ value, label }`。注意原生 select 的值会以字符串形式从 change 事件发出。

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | String \| Number | `''` | 当前选中值 |
| options | Array | `[]` | 字符串/数字选项，或 `{ value, label }` 对象 |
| label | String | 无 | 字段标签 |
| disabled | Boolean | `false` | 禁用选择 |

### Events

| Event | 参数 | 说明 |
| --- | --- | --- |
| update:modelValue | String | 选择变化时触发 |

### Slots

无。

### 示例

```vue
<Select
  v-model="category"
  label="分类"
  :options="[
    { value: 'dev', label: '开发工具' },
    { value: 'text', label: '文本工具' },
  ]"
/>
```

## Tabs

受控标签切换组件。父组件通过 `modelValue` 指定当前值，并监听更新事件。支持左右方向键循环切换，以及 Home/End 跳转首尾标签。

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | String \| Number | 必填 | 当前激活标签的 value |
| tabs | Array | `[]` | 标签数组，每项包含 `value` 和 `label` |

### Events

| Event | 参数 | 说明 |
| --- | --- | --- |
| update:modelValue | String \| Number | 点击或键盘切换时触发 |

### Slots

无。标签内容由 `tabs[].label` 提供。

### 示例

```vue
<Tabs
  v-model="activeTab"
  :tabs="[
    { value: 'cards', label: '卡片' },
    { value: 'list', label: '列表' },
  ]"
/>
```

## Dropdown

简单的操作菜单。点击触发按钮打开/关闭菜单，选择菜单项后自动关闭并发出该项的 value。

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| items | Array | `[]` | 菜单项数组，每项包含 `value`、`label`，可选 `disabled` |
| label | String | `更多` | 菜单触发按钮文字 |

### Events

| Event | 参数 | 说明 |
| --- | --- | --- |
| select | String \| Number（菜单项 value） | 选择可用菜单项时触发 |

### Slots

无。

### 示例

```vue
<Dropdown
  label="操作"
  :items="[
    { value: 'export', label: '导出' },
    { value: 'delete', label: '删除', disabled: true },
  ]"
  @select="handleAction"
/>
```

## Tooltip

为默认插槽内容提供悬浮/键盘聚焦提示。提示文本通过 `text` 属性传入。

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| text | String | 必填 | 提示内容 |

### Events

无。

### Slots

- `default`：触发提示的内容，建议放置可聚焦控件或其他有明确交互的元素。

### 示例

```vue
<Tooltip text="复制到剪贴板">
  <button type="button" aria-label="复制">复制</button>
</Tooltip>
```

## Modal

通用对话框容器。内容通过 Teleport 渲染到 body；打开时锁定 body 滚动、记录并在关闭时恢复焦点；支持 Tab 焦点循环、Escape 和遮罩关闭。关闭行为由 `update:modelValue` 通知父组件，父组件应同步更新绑定值。

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| modelValue | Boolean | `false` | 是否显示对话框 |
| title | String | 无 | 默认标题；也用于 dialog 的 aria-label |
| size | String | `md` | `sm`、`md`、`lg`、`xl` |
| closeOnOverlay | Boolean | `true` | 是否允许点击遮罩关闭 |
| closeOnEsc | Boolean | `true` | 是否允许 Escape 关闭 |

### Events

| Event | 参数 | 说明 |
| --- | --- | --- |
| update:modelValue | Boolean | 请求更新显示状态 |
| close | 无 | 组件执行关闭动作时触发 |

### Slots

| Slot | 作用 | 作用域参数 |
| --- | --- | --- |
| default | 对话框主体内容 | 无 |
| header | 自定义标题区域；提供后替代默认标题内容 | 无 |
| footer | 底部操作区域 | `close`：关闭对话框的方法 |

### 示例

```vue
<Modal v-model="open" title="编辑项目" size="md">
  <p>对话框主体内容</p>
  <template #footer="{ close }">
    <Button variant="secondary" @click="close">取消</Button>
    <Button @click="save">保存</Button>
  </template>
</Modal>
```

## ConfirmDialog

全局 Promise 风格确认对话框。将 `ConfirmDialog` 挂载一次（通常放在 App 根组件），业务组件通过 `useConfirm()` 发起确认。调用返回 `Promise<boolean>`；确认时为 true，取消、关闭或被下一次确认请求替代时为 false。

### 组件 Props / Events / Slots

无公开 Props、Events 或 Slots。对话框文案和外观由 composable 的 options 控制。

### Composable API

`useConfirm()` 返回：

- `confirm(options)`：打开确认框并返回 Promise。
- `state`：当前对话框响应式状态，通常只由全局 ConfirmDialog 消费。
- `finish(confirmed)`：结束当前确认流程，通常只由 ConfirmDialog 内部调用。

`confirm(options)` 支持：

| Option | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| title | String | `请确认操作` | 标题 |
| message | String | `''` | 正文 |
| confirmText | String | `确认` | 确认按钮文字 |
| cancelText | String | `取消` | 取消按钮文字 |
| tone | String | `primary` | `danger` 时使用危险按钮样式，其余使用 primary |

### 示例

```vue
<script setup>
import { useConfirm } from '@/composables/useConfirm'

const { confirm } = useConfirm()

async function removeItem() {
  const accepted = await confirm({
    title: '删除项目',
    message: '删除后无法恢复，确定继续吗？',
    tone: 'danger',
    confirmText: '删除',
  })
  if (accepted) {
    // 执行删除
  }
}
</script>
```

## ToastContainer

全局非阻塞消息容器。将 `ToastContainer` 挂载一次（通常放在 App 根组件），业务代码通过 `useToast()` 添加或关闭消息。

### 组件 Props / Events / Slots

无公开 Props、Events 或 Slots。

### Composable API

`useToast()` 返回：

- `showToast(message, type, duration)`：显示消息并返回 toast id。
- `dismissToast(id)`：关闭指定消息。
- `toasts`：当前消息的响应式数组，通常只由 ToastContainer 消费。

参数说明：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| message | String（其他值会转为字符串） | 必填 | 消息内容 |
| type | String | `info` | `success`、`warning`、`error`、`info` |
| duration | Number | `3000` | 自动关闭毫秒数；小于等于 0 时不自动关闭 |

### 示例

```vue
<script setup>
import { useToast } from '@/composables/useToast'

const { showToast } = useToast()

function save() {
  showToast('保存成功', 'success')
}
</script>
```

## EmptyState

空内容提示区域，可显示标题、描述、可选操作按钮和额外插槽内容。

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| title | String | `暂无内容` | 标题 |
| description | String | 无 | 描述文本 |
| actionLabel | String | 无 | 提供时显示操作按钮 |

### Events

| Event | 参数 | 说明 |
| --- | --- | --- |
| action | 无 | 点击 actionLabel 对应按钮时触发 |

### Slots

- `default`：可选的补充内容，显示在操作按钮之后。

### 示例

```vue
<EmptyState
  title="没有找到网站"
  description="尝试更换关键词或清除筛选条件"
  action-label="清除筛选"
  @action="clearFilters"
/>
```

## Loading

行内或块级加载指示器。

### Props

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| label | String | `正在加载…` | 加载状态文字 |
| block | Boolean | `false` | true 时作为块级元素并增加上下留白 |

### Events

无。

### Slots

无。

### 示例

```vue
<Loading label="正在读取数据…" />
<Loading block label="正在加载列表…" />
```

## 全局挂载建议

全局反馈容器通常在应用根组件中各挂载一次：

```vue
<template>
  <RouterView />
  <ToastContainer />
  <ConfirmDialog />
</template>
```

避免在每个页面重复挂载，否则可能出现重复提示或多个确认框实例。
