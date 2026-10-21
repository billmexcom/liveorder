import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('loads Billmex mock menu and exposes the demo mode', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.menuItems()).toHaveLength(6);
    expect(compiled.textContent).toContain('Demo mode: mock APIs only');
    expect(compiled.textContent).toContain('BHOJ × BILLMEX');
  });

  it('verifies the demo OTP before opening the menu', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    await fixture.componentInstance.confirmAndOpenMenu();

    expect(fixture.componentInstance.activeView()).toBe('menu');
    expect(fixture.componentInstance.customer()?.customerId).toBe('customer-1');
    expect(fixture.componentInstance.apiError()).toBeNull();
  });

  it('keeps the login view and surfaces an invalid OTP error', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.passcode.set(['0', '0', '0', '0']);

    await fixture.componentInstance.confirmAndOpenMenu();

    expect(fixture.componentInstance.activeView()).toBe('login');
    expect(fixture.componentInstance.apiError()).toContain('Demo OTP is 4829');
  });

  it('creates a mock order and updates the order history', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.totalCartCount()).toBe(0);
    fixture.componentInstance.addToCart('chach-rayta');
    fixture.componentInstance.addToCart('masala-chach');

    await fixture.componentInstance.confirmPayment();

    expect(fixture.componentInstance.orderPlacedSuccess()).toBe(true);
    expect(fixture.componentInstance.currentOrder()?.id).toBe('BH-9921');
    expect(fixture.componentInstance.currentOrder()?.total).toBe(70);
    expect(fixture.componentInstance.orders()).toHaveLength(1);
    expect(fixture.componentInstance.notifications().length).toBeGreaterThan(1);
  });
});
