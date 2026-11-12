import { createApp, h, nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import Tabs from './Tabs.vue'

const tabs = [
  { value: 'one', label: 'One' },
  { value: 'two', label: 'Two' },
  { value: 'three', label: 'Three' },
]

function mountTabs(initialValue = 'one') {
  const host = document.createElement('div')
  document.body.append(host)
  const emitted = []
  const app = createApp({
    setup() {
      const selected = ref(initialValue)
      return () => h(Tabs, {
        modelValue: selected.value,
        tabs,
        'onUpdate:modelValue': value => {
          emitted.push(value)
          selected.value = value
        },
      })
    },
  })
  app.mount(host)
  return { app, host, emitted }
}

describe('Tabs', () => {
  it('exposes the selected tab accessibly', () => {
    const mounted = mountTabs('two')
    const buttons = mounted.host.querySelectorAll('[role="tab"]')
    expect(buttons).toHaveLength(3)
    expect(buttons[1].getAttribute('aria-selected')).toBe('true')
    expect(buttons[0].getAttribute('tabindex')).toBe('-1')
    expect(buttons[1].getAttribute('tabindex')).toBe('0')
    mounted.app.unmount()
    mounted.host.remove()
  })

  it('emits the selected value when a tab is clicked', async () => {
    const mounted = mountTabs()
    mounted.host.querySelectorAll('[role="tab"]')[1].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(mounted.emitted).toEqual(['two'])
    mounted.app.unmount()
    mounted.host.remove()
  })

  it('supports arrow and Home/End keyboard navigation', async () => {
    const mounted = mountTabs()
    const buttons = mounted.host.querySelectorAll('[role="tab"]')
    buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    buttons[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    buttons[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    await nextTick()
    expect(mounted.emitted).toEqual(['two', 'three', 'one'])
    mounted.app.unmount()
    mounted.host.remove()
  })
})
