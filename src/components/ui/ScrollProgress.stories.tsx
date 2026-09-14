import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ScrollProgress } from './ScrollProgress';

expect.extend(toHaveNoViolations);

const meta = {
  title: 'UI/ScrollProgress',
  component: ScrollProgress,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ScrollProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="h-[200vh] w-full relative bg-[#020617] p-10 text-slate-400">
      <p>The gradient bar pins to the top edge and fills as the page scrolls.</p>
      <ScrollProgress />
    </div>
  ),
  play: async ({ canvasElement }) => {
    // The bar is aria-hidden decoration; the property worth asserting in the
    // axe run is that it introduces no violation of its own.
    expect(await axe(canvasElement)).toHaveNoViolations();
  },
};
