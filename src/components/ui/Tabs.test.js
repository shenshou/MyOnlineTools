import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Tabs from './Tabs.vue'

const tabs = [
  { value: 'one', label: 'One' },
  { value: 'two', label: 'Two' },
  { value: 'three', label: 'Three' },
]

describe('Tabs', () => {
  it('exposes the selected tab accessibly', () => {
    const wrapper = mount(Tabs, { props: { modelValue: 'two', tabs } })
    const buttons = wrapper.findAll('[role="tab"]')
    expect(buttons).toHaveLength(3)
    expect(buttons[1].attributes('aria-selected')).toBe('true')
    expect(buttons[0].attributes('tabindex')).toBe('-1')
    expect(buttons[1].attributes('tabindex')).toBe('0')
  })

  it('emits the selected value when a tab is clicked', async () => {
    const wrapper = mount(Tabs, { props: { modelValue: 'one', tabs } })
    await wrapper.findAll('[role="tab"]')[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['two']])
  })

  it('supports arrow and Home/End keyboard navigation', async () => {
    const wrapper = mount(Tabs, { attachTo: document.body, props: { modelValue: 'one', tabs } })
    const buttons = wrapper.findAll('[role="tab"]')
    await buttons[0].trigger('keydown', { key: 'ArrowRight' })
    await buttons[1].trigger('keydown', { key: 'End' })
    await buttons[2].trigger('keydown', { key: 'Home' })
    expect(wrapper.emitted('update:modelValue')).toEqual([['two'], ['three'], ['one']])
    wrapper.unmount()
  })
})
