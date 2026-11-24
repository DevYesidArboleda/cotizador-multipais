import { TestBed } from '@angular/core/testing';
import { NOW } from '../../core/clock';
import { PAYMENT_LATENCY_MS, PaymentSimulationService, RANDOM_BYTES } from './payment-simulation.service';

function setup() {
  TestBed.configureTestingModule({
    providers: [
      { provide: PAYMENT_LATENCY_MS, useValue: 1000 },
      { provide: RANDOM_BYTES, useValue: () => Uint8Array.from([0x7b, 0x2e]) },
      { provide: NOW, useValue: () => new Date(2026, 10, 23, 12) },
    ],
  });
  return TestBed.inject(PaymentSimulationService);
}
const request = (mode: 'approved' | 'rejected') => ({ country: 'co', planDocumentId: 'p', finalPrice: 1000, mode });

describe('[R-03.10] PaymentSimulationService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('[R-03.10] espera la latencia simulada y aprueba con número de cotización', async () => {
    const service = setup();
    const promise = service.pay(request('approved'));
    let settled = false;
    void promise.then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await promise).toEqual({ status: 'approved', quoteNumber: 'COT-CO-20261123-7B2E' });
  });

  it('[R-03.10] el modo rechazado devuelve SIMULATED_REJECTION', async () => {
    const service = setup();
    const promise = service.pay(request('rejected'));
    await vi.advanceTimersByTimeAsync(1000);
    expect(await promise).toEqual({ status: 'rejected', code: 'SIMULATED_REJECTION' });
  });

  it('[R-03.10] no hace llamadas de red', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const service = setup();
    const promise = service.pay(request('approved'));
    await vi.advanceTimersByTimeAsync(1000);
    await promise;
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('[R-03.11][AC-03.8] guardia de doble envío', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('[R-03.11][AC-03.8] dos llamadas concurrentes ejecutan UNA simulación y comparten resultado', async () => {
    const service = setup();
    const a = service.pay(request('approved'));
    const b = service.pay(request('approved'));
    await vi.advanceTimersByTimeAsync(1000);
    const [ra, rb] = await Promise.all([a, b]);
    expect(service.executions).toBe(1);
    expect(ra).toEqual(rb);
  });

  it('[R-03.11] tras aprobar, una llamada posterior no ejecuta nada y devuelve el mismo número', async () => {
    const service = setup();
    const first = service.pay(request('approved'));
    await vi.advanceTimersByTimeAsync(1000);
    const approved = await first;
    const again = await service.pay(request('approved'));
    expect(service.executions).toBe(1);
    expect(again).toEqual(approved);
  });

  it('[R-03.11][R-03.12] tras un rechazo se puede reintentar y aprobar', async () => {
    const service = setup();
    const first = service.pay(request('rejected'));
    await vi.advanceTimersByTimeAsync(1000);
    expect((await first).status).toBe('rejected');
    const retry = service.pay(request('approved'));
    await vi.advanceTimersByTimeAsync(1000);
    expect((await retry).status).toBe('approved');
    expect(service.executions).toBe(2);
  });
});

describe('[F-03.1][R-03.19] aislamiento del estado de pago por país', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  const req = (country: string, mode: 'approved' | 'rejected') => ({ country, planDocumentId: 'p', finalPrice: 1, mode });

  it('[F-03.1][R-03.13][R-03.19] tras aprobar en co, un pago en cl ejecuta una nueva simulación con COT-CL', async () => {
    const service = setup();
    const co = service.pay(req('co', 'approved'));
    await vi.advanceTimersByTimeAsync(1000);
    expect(await co).toMatchObject({ status: 'approved', quoteNumber: expect.stringMatching(/^COT-CO-/) });
    const cl = service.pay(req('cl', 'approved'));
    await vi.advanceTimersByTimeAsync(1000);
    expect(await cl).toMatchObject({ status: 'approved', quoteNumber: expect.stringMatching(/^COT-CL-/) });
    expect(service.executions).toBe(2);
  });

  it('[F-03.1][R-03.12] tras aprobar en co, el modo rechazado en cl rechaza y espera la latencia', async () => {
    const service = setup();
    const co = service.pay(req('co', 'approved'));
    await vi.advanceTimersByTimeAsync(1000);
    await co;
    const cl = service.pay(req('cl', 'rejected'));
    let settled = false;
    void cl.then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await cl).toEqual({ status: 'rejected', code: 'SIMULATED_REJECTION' });
  });

  it('[F-03.1][R-03.11] la promesa en vuelo de un país no se comparte con otro; el mismo país sigue sin duplicar', async () => {
    const service = setup();
    const a = service.pay(req('co', 'approved'));
    const b = service.pay(req('cl', 'rejected'));
    const c = service.pay(req('co', 'approved'));
    await vi.advanceTimersByTimeAsync(1000);
    expect((await b).status).toBe('rejected');
    expect(await a).toEqual(await c);
    expect(service.executions).toBe(2);
  });

  it('[F-03.1][R-03.15] reset(country) limpia solo ese país', async () => {
    const service = setup();
    const co = service.pay(req('co', 'approved'));
    await vi.advanceTimersByTimeAsync(1000);
    await co;
    service.reset('co');
    const again = service.pay(req('co', 'approved'));
    await vi.advanceTimersByTimeAsync(1000);
    await again;
    expect(service.executions).toBe(2);
  });
});
