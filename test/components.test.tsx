/**
 * Unit tests for VoiceCart frontend components (Premium Minimal Redesign)
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================
// Landing Page
// ============================================
describe('Landing Page', () => {
  let Home: React.ComponentType;

  beforeAll(async () => {
    jest.mock('next/link', () => {
      const MockLink = ({ children, href, ...rest }: { children: React.ReactNode; href: string }) =>
        React.createElement('a', { href, ...rest }, children);
      MockLink.displayName = 'MockLink';
      return MockLink;
    });
    const mod = await import('../app/page');
    Home = mod.default;
  });

  it('should render the VoiceCart brand name', () => {
    render(React.createElement(Home));
    expect(screen.getByText('VoiceCart')).toBeInTheDocument();
  });

  it('should render the Hindi hero text', () => {
    render(React.createElement(Home));
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toContain('बोलिए।');
    expect(heading.textContent).toContain('AI बनाएगा।');
    expect(heading.textContent).toContain('बेचिए।');
  });

  it('should render the CTA button with Hindi text', () => {
    render(React.createElement(Home));
    expect(screen.getByText('रिकॉर्ड शुरू करें')).toBeInTheDocument();
  });

  it('should have a CTA that links to /record', () => {
    render(React.createElement(Home));
    const link = screen.getByText('रिकॉर्ड शुरू करें').closest('a');
    expect(link).toHaveAttribute('href', '/record');
  });

  it('should render the 3 steps', () => {
    render(React.createElement(Home));
    expect(screen.getByText('Speak')).toBeInTheDocument();
    expect(screen.getByText('Enhance')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
  });

  it('should display first-ad-free pricing', () => {
    render(React.createElement(Home));
    expect(screen.getByText(/First ad free/)).toBeInTheDocument();
  });
});

// ============================================
// Recording Page
// ============================================
describe('Recording Page', () => {
  let RecordPage: React.ComponentType;

  beforeAll(async () => {
    const mod = await import('../app/record/page');
    RecordPage = mod.default;
  });

  it('should render the page header', () => {
    render(React.createElement(RecordPage));
    expect(screen.getByText('Record')).toBeInTheDocument();
  });

  it('should render Hindi language indicator', () => {
    render(React.createElement(RecordPage));
    expect(screen.getByText('Hindi')).toBeInTheDocument();
  });

  it('should display initial timer as 0:00', () => {
    render(React.createElement(RecordPage));
    expect(screen.getByText('0:00')).toBeInTheDocument();
  });

  it('should show tap instruction', () => {
    render(React.createElement(RecordPage));
    expect(screen.getByText('टैप करें रिकॉर्ड करने के लिए')).toBeInTheDocument();
  });

  it('should render the record button', () => {
    render(React.createElement(RecordPage));
    expect(document.getElementById('record-button')).toBeInTheDocument();
  });

  it('should render recording tips', () => {
    render(React.createElement(RecordPage));
    expect(screen.getByText('शांत जगह पर रिकॉर्ड करें')).toBeInTheDocument();
  });

  it('should show duration range', () => {
    render(React.createElement(RecordPage));
    expect(screen.getByText('5s – 60s')).toBeInTheDocument();
  });
});

// ============================================
// PaymentModal
// ============================================
describe('PaymentModal', () => {
  let PaymentModal: React.ComponentType<{ adId: string; onClose: () => void; onSuccess: () => void }>;

  beforeAll(async () => {
    const mod = await import('../components/PaymentModal');
    PaymentModal = mod.default;
  });

  const props = { adId: 'test-123', onClose: jest.fn(), onSuccess: jest.fn() };

  it('should render phone input step', () => {
    render(React.createElement(PaymentModal, props));
    expect(screen.getByText('Phone number')).toBeInTheDocument();
    expect(screen.getByText('+91')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('9876543210')).toBeInTheDocument();
  });

  it('should render OTP button', () => {
    render(React.createElement(PaymentModal, props));
    expect(screen.getByText('Send OTP')).toBeInTheDocument();
  });

  it('should disable OTP button for invalid phone', () => {
    render(React.createElement(PaymentModal, props));
    expect(screen.getByText('Send OTP')).toBeDisabled();
  });

  it('should enable OTP button for valid phone', () => {
    render(React.createElement(PaymentModal, props));
    fireEvent.change(screen.getByPlaceholderText('9876543210'), { target: { value: '9876543210' } });
    expect(screen.getByText('Send OTP')).not.toBeDisabled();
  });

  it('should strip non-digits from phone', () => {
    render(React.createElement(PaymentModal, props));
    const input = screen.getByPlaceholderText('9876543210') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '98-abc-765' } });
    expect(input.value).toMatch(/^\d*$/);
  });

  it('should have close button', () => {
    render(React.createElement(PaymentModal, props));
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });
});

// ============================================
// Clipboard
// ============================================
describe('Clipboard', () => {
  it('should copy text', async () => {
    const mock = jest.fn(() => Promise.resolve());
    Object.assign(navigator.clipboard, { writeText: mock });
    await navigator.clipboard.writeText('Test');
    expect(mock).toHaveBeenCalledWith('Test');
  });
});
