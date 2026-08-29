import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { SlideOver } from '../src/components/SlideOver';
import { Field } from '../src/components/UI';

function Harness() {
  const [name, setName] = useState('');

  return (
    <SlideOver open title="Edit area" description="Update the area name." onClose={() => {}}>
      <form className="stacked-form">
        <Field label="Area name">
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
      </form>
    </SlideOver>
  );
}

describe('SlideOver focus behavior', () => {
  test('typing in a drawer field keeps focus in the active input', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = await screen.findByLabelText(/area name/i);

    await user.click(input);
    await user.type(input, 'Kitchen');

    expect(input).toHaveFocus();
    expect(screen.getByRole('button', { name: /close form/i })).not.toHaveFocus();
    expect(input).toHaveValue('Kitchen');
  });
});
