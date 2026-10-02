import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { axe, toHaveNoViolations } from 'jest-axe';
import { SourceGlitch } from './SourceGlitch';

expect.extend(toHaveNoViolations);

const meta = {
  title: 'UI/SourceGlitch',
  component: SourceGlitch,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof SourceGlitch>;

export default meta;
type Story = StoryObj<typeof meta>;

const CODE = `<p className="text-cyan-400 font-mono">
  <Terminal size={18} /> Hello World, my name is
</p>
<h1 itemProp="name">{heroData.name}</h1>`;

export const Default: Story = {
  args: {
    file: 'HeroSection.tsx',
    code: CODE,
    children: (
      <div className="max-w-md rounded-2xl border border-white/10 bg-[#0a1128]/60 p-8">
        <p className="font-mono text-cyan-400 text-sm">Hello World, my name is</p>
        <h2 className="text-2xl font-bold text-white">Remigiusz Bednarczyk</h2>
        <p className="text-slate-400">The section a visitor sees before they peek.</p>
      </div>
    ),
  },
  play: async ({ canvasElement }) => {
    // The trigger is a real, named button; the axe run proves the peek adds
    // no violation of its own to the section it wraps.
    expect(await axe(canvasElement)).toHaveNoViolations();
  },
};
