import { describe, expect, it } from 'vitest';
import { NativeTooltipProvider } from '../src/ui/tooltip/NativeTooltipProvider.js';

function makeTrigger(): HTMLElement {
  const el = document.createElement('span');
  document.body.appendChild(el);
  return el;
}

const bubble = (): HTMLElement | null => document.querySelector('.dl-tooltip-bubble');

describe('NativeTooltipProvider', () => {
  it('shows a bubble on hover and removes it on leave', () => {
    const provider = new NativeTooltipProvider();
    const trigger = makeTrigger();
    provider.attach(trigger, 'Some help');

    expect(bubble()).toBeNull();

    trigger.dispatchEvent(new Event('mouseenter'));
    expect(bubble()?.textContent).toBe('Some help');
    expect(bubble()?.getAttribute('role')).toBe('tooltip');

    trigger.dispatchEvent(new Event('mouseleave'));
    expect(bubble()).toBeNull();
  });

  it('shows on focus too, so the tooltip is keyboard reachable', () => {
    const provider = new NativeTooltipProvider();
    const trigger = makeTrigger();
    provider.attach(trigger, 'Help');

    trigger.dispatchEvent(new Event('focus'));
    expect(bubble()).not.toBeNull();

    trigger.dispatchEvent(new Event('blur'));
    expect(bubble()).toBeNull();
  });

  it('renders markup in the bubble', () => {
    const provider = new NativeTooltipProvider();
    const trigger = makeTrigger();
    provider.attach(trigger, 'a <b>bold</b> hint');

    trigger.dispatchEvent(new Event('mouseenter'));
    expect(bubble()?.querySelector('b')?.textContent).toBe('bold');
  });

  it('positions the bubble absolutely', () => {
    const provider = new NativeTooltipProvider();
    const trigger = makeTrigger();
    provider.attach(trigger, 'Help');

    trigger.dispatchEvent(new Event('mouseenter'));
    expect(bubble()?.style.left).toMatch(/px$/);
    expect(bubble()?.style.top).toMatch(/px$/);
  });

  it('updates the content of an already-attached trigger', () => {
    const provider = new NativeTooltipProvider();
    const trigger = makeTrigger();

    provider.attach(trigger, 'First');
    provider.attach(trigger, 'Second');

    trigger.dispatchEvent(new Event('mouseenter'));
    expect(bubble()?.textContent).toBe('Second');
  });

  it('updates a bubble that is already visible', () => {
    const provider = new NativeTooltipProvider();
    const trigger = makeTrigger();

    provider.attach(trigger, 'First');
    trigger.dispatchEvent(new Event('mouseenter'));
    provider.attach(trigger, 'Second');

    expect(bubble()?.textContent).toBe('Second');
  });

  it('shows only one bubble however many times hover fires', () => {
    const provider = new NativeTooltipProvider();
    const trigger = makeTrigger();
    provider.attach(trigger, 'Help');

    trigger.dispatchEvent(new Event('mouseenter'));
    trigger.dispatchEvent(new Event('mouseenter'));

    expect(document.querySelectorAll('.dl-tooltip-bubble')).toHaveLength(1);
  });

  it('detaches its listeners and removes any visible bubble', () => {
    const provider = new NativeTooltipProvider();
    const trigger = makeTrigger();

    provider.attach(trigger, 'Help');
    trigger.dispatchEvent(new Event('mouseenter'));
    provider.detach(trigger);

    expect(bubble()).toBeNull();

    trigger.dispatchEvent(new Event('mouseenter'));
    expect(bubble()).toBeNull();
  });

  it('tolerates detaching something it never attached', () => {
    expect(() => new NativeTooltipProvider().detach(makeTrigger())).not.toThrow();
  });
});
