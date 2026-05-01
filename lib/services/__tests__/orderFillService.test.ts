import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pollOrderFill } from '../orderFillService';

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function makeClobResponse(status: string, sizeMatched = '0', originalSize = '100') {
  return {
    ok: true,
    json: async () => ({ status, size_matched: sizeMatched, original_size: originalSize }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('pollOrderFill', () => {
  it('emits PENDING immediately before first poll', async () => {
    mockFetch.mockResolvedValue(makeClobResponse('OPEN'));
    const updates: string[] = [];

    const promise = pollOrderFill('order-1', (r) => updates.push(r.status));
    // PENDING fires synchronously before any await
    expect(updates[0]).toBe('PENDING');

    // Advance timers and flush promises to complete
    await vi.runAllTimersAsync();
    await promise.catch(() => {});
  });

  it('resolves when order reaches FILLED state', async () => {
    mockFetch
      .mockResolvedValueOnce(makeClobResponse('OPEN'))
      .mockResolvedValueOnce(makeClobResponse('MATCHED'))
      .mockResolvedValueOnce(makeClobResponse('FILLED', '100', '100'));

    const updates: string[] = [];
    const promise = pollOrderFill('order-1', (r) => updates.push(r.status));

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.status).toBe('FILLED');
    expect(result.fillFraction).toBe(1);
    expect(updates).toContain('FILLED');
  });

  it('resolves when order is CANCELLED', async () => {
    mockFetch.mockResolvedValue(makeClobResponse('CANCELLED'));

    const promise = pollOrderFill('order-1', () => {});
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.status).toBe('CANCELLED');
  });

  it('resolves when order is REJECTED with reason', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'REJECTED', error: 'Insufficient balance' }),
    });

    const promise = pollOrderFill('order-1', () => {});
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.status).toBe('REJECTED');
    expect(result.rejectReason).toBe('Insufficient balance');
  });

  it('stops polling when AbortController is aborted before first poll', async () => {
    mockFetch.mockResolvedValue(makeClobResponse('OPEN'));
    const controller = new AbortController();
    const updates: string[] = [];

    // Abort immediately — before the 3s sleep fires
    controller.abort();

    const result = await pollOrderFill('order-1', (r) => updates.push(r.status), controller.signal);

    // Should return UNKNOWN — aborted before any fetch
    expect(result.status).toBe('UNKNOWN');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('calculates fill fraction correctly for partial fill', async () => {
    mockFetch.mockResolvedValue(makeClobResponse('MATCHED', '50', '100'));

    const updates: Array<{ status: string; fillFraction: number }> = [];
    const promise = pollOrderFill('order-1', (r) => updates.push({ status: r.status, fillFraction: r.fillFraction }));

    await vi.runAllTimersAsync();
    await promise.catch(() => {});

    const matchedUpdate = updates.find((u) => u.status === 'MATCHED');
    expect(matchedUpdate).toBeDefined();
    expect(matchedUpdate?.fillFraction).toBe(0.5);
  });

  it('returns UNKNOWN when fetch returns non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false });

    const updates: string[] = [];
    const promise = pollOrderFill('order-1', (r) => updates.push(r.status));

    await vi.runAllTimersAsync();
    await promise.catch(() => {});

    // Should have emitted PENDING then UNKNOWN (null response)
    expect(updates[0]).toBe('PENDING');
    expect(updates).toContain('UNKNOWN');
  });
});
