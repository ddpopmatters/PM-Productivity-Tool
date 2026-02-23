import { render } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';

/**
 * Custom render that wraps components with BrowserRouter by default.
 * Use `initialEntries` option to use MemoryRouter with specific routes.
 */
export function renderWithRouter(ui, { initialEntries, ...options } = {}) {
  const Wrapper = initialEntries
    ? ({ children }) => <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    : ({ children }) => <BrowserRouter>{children}</BrowserRouter>;

  return render(ui, { wrapper: Wrapper, ...options });
}

export { render };
export { screen, waitFor, act, within, fireEvent } from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';
