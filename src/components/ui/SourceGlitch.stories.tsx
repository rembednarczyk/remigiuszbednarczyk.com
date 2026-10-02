import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef } from 'react';
import { expect } from 'storybook/test';
import { axe, toHaveNoViolations } from 'jest-axe';
import { SourceGlitch } from './SourceGlitch';

expect.extend(toHaveNoViolations);

const CODE = `<p className="text-cyan-400 font-mono">
  <Terminal size={18} /> Hello World, my name is
</p>
<h1 itemProp="name">{heroData.name}</h1>`;

function Demo() {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <div className="max-w-md bg-[#020617] p-8">
      <SourceGlitch code={CODE} triggerRef={ref}>
        <div>
          <button
            ref={ref}
            type="button"
            aria-label="Hello World, my name is — view the source behind this section"
            className="source-peek__trigger text-cyan-400 font-mono inline-flex items-center min-h-11 bg-transparent border-0 p-0 cursor-pointer"
          >
            Hello World, my name is
          </button>
          <h2 className="text-2xl font-bold text-white">Remigiusz Bednarczyk</h2>
          <p className="text-slate-400">Hover the greeting to overwrite this with its source.</p>
        </div>
      </SourceGlitch>
    </div>
  );
}

const meta = {
  title: 'UI/SourceGlitch',
  component: SourceGlitch,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof SourceGlitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  // The real trigger/children come from Demo via render; args satisfy the
  // typed story shape and are not read.
  args: { code: CODE, triggerRef: { current: null }, children: null },
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    // The trigger is a real, named button and the source stays out of the DOM
    // at rest; the axe run proves the peek adds no violation of its own.
    expect(await axe(canvasElement)).toHaveNoViolations();
  },
};
