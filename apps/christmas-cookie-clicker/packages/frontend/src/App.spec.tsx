//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import App from '@/App';

describe('App', () => {
  it('renders without throwing', () => {
    expect(() => render(<App />)).not.toThrow();
  });

  it('mounts content into the document', () => {
    render(<App />);
    expect(document.body).not.toBeEmptyDOMElement();
  });

  it('adds cookies when the cookie is clicked', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Bak 1 koekjes' }));
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
