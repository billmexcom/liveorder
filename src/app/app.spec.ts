import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { App } from './app';
import { BillmexMockApi } from './billmex-api';
import { OtpService } from './otp.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('loads Billmex menu and brand header without mock banners', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.menuItems().length).toBeGreaterThan(0);
    expect(compiled.textContent).not.toContain('Demo mode: mock APIs only');
    expect(compiled.textContent).toContain('BHOJ × BILLMEX');
  });

  it('shows SMS first and WhatsApp below the phone field and sends through either channel', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.componentInstance.phoneNumber.set('9669660675');
    const sendOtpSpy = vi.spyOn(fixture.componentInstance, 'sendOtp').mockResolvedValue();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('LIVE API CONNECTED');
    expect(compiled.textContent).not.toContain('Enter 10-digit number');
    expect(compiled.querySelector('input[type="text"]')?.getAttribute('placeholder')).toBe('Your name');
    expect(compiled.querySelector('input[type="tel"]')?.getAttribute('placeholder')).toBe('Mobile number');

    const smsButton = compiled.querySelector<HTMLButtonElement>('#btn-send-sms-otp');
    const whatsappButton = compiled.querySelector<HTMLButtonElement>('#btn-send-whatsapp-otp');
    expect(smsButton?.textContent).toContain('SMS OTP');
    expect(whatsappButton?.textContent).toContain('WhatsApp OTP');
    expect(
      Boolean(smsButton && whatsappButton &&
        (smsButton.compareDocumentPosition(whatsappButton) & Node.DOCUMENT_POSITION_FOLLOWING))
    ).toBe(true);

    smsButton?.click();
    await fixture.whenStable();
    whatsappButton?.click();
    await fixture.whenStable();

    expect(sendOtpSpy).toHaveBeenNthCalledWith(1, 'sms');
    expect(sendOtpSpy).toHaveBeenNthCalledWith(2, 'whatsapp');
  });

  it('verifies the OTP before opening the menu', async () => {
    const fixture = TestBed.createComponent(App);
    const otpService = TestBed.inject(OtpService);
    vi.spyOn(otpService, 'verifyOtp').mockResolvedValue({
      id: 'customer-1',
      customerId: 'customer-1',
      name: 'Vishnu',
      phone: '9669660675',
      authkey: 'live-auth-key'
    });

    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.userName.set('Vishnu');
    fixture.componentInstance.phoneNumber.set('9669660675');
    fixture.componentInstance.passcode.set(['1', '2', '3', '4', '5', '6']);
    await fixture.componentInstance.confirmAndOpenMenu();

    expect(fixture.componentInstance.activeView()).toBe('menu');
    expect(fixture.componentInstance.customer()?.customerId).toBe('customer-1');
    expect(fixture.componentInstance.apiError()).toBeNull();
  });

  it('keeps the login view and surfaces an invalid OTP error', async () => {
    const fixture = TestBed.createComponent(App);
    const otpService = TestBed.inject(OtpService);
    vi.spyOn(otpService, 'verifyOtp').mockRejectedValue(new Error("OTP doesn't match"));

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.userName.set('Vishnu');
    fixture.componentInstance.phoneNumber.set('9669660675');
    fixture.componentInstance.passcode.set(['0', '0', '0', '0', '0', '0']);

    await fixture.componentInstance.confirmAndOpenMenu();

    expect(fixture.componentInstance.activeView()).toBe('login');
    expect(fixture.componentInstance.apiError()).toContain("OTP doesn't match");
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

  it('saves item remark and spice level into cart and order instructions', async () => {
    const fixture = TestBed.createComponent(App);
    const api = TestBed.inject(BillmexMockApi);
    const placeOrderSpy = vi.spyOn(api, 'placeOrder');
    fixture.detectChanges();
    await fixture.whenStable();

    const app = fixture.componentInstance;
    const item = app.menuItems()[0];
    app.openCustomize(item);
    app.customizeSpice.set('Spicy');
    app.customizeRemark.set('less salt');
    app.saveCustomization();

    expect(app.getItemQuantity(item.id)).toBe(1);
    expect(app.itemCustomizations()[item.id]).toEqual({
      spiceLevel: 'Spicy',
      remark: 'less salt'
    });

    app.paymentMethod.set('cod');
    await app.confirmPayment();

    expect(placeOrderSpy).toHaveBeenCalledWith(expect.objectContaining({
      items: [expect.objectContaining({
        itemId: item.id,
        quantity: 1,
        spiceLevel: 'Spicy',
        remark: 'less salt'
      })],
      orderRemark: `${item.name}: Spicy spice, less salt`
    }));
  });

  it('focuses the menu search from the header and places add control at the top of a dish card', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.componentInstance.activeView.set('menu');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const searchButton = compiled.querySelector<HTMLButtonElement>('button[aria-label="Search menu"]');
    const dishCard = compiled.querySelector('article');

    expect(searchButton).not.toBeNull();
    expect(compiled.querySelector('#menuSearchInput')).toBeNull();
    expect(dishCard?.querySelector('button')?.textContent).toContain('ADD +');
    searchButton?.click();
    fixture.detectChanges();
    const searchInput = compiled.querySelector<HTMLInputElement>('#menuSearchInput');
    expect(searchInput).not.toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.activeElement).toBe(searchInput);

    compiled.querySelector<HTMLButtonElement>('button[aria-label="Close menu search"]')?.click();
    fixture.detectChanges();
    expect(compiled.querySelector('#menuSearchInput')).toBeNull();
  });

  it('renders profile details from the signed-in diner without requesting a missing profile record', async () => {
    const fixture = TestBed.createComponent(App);
    const api = TestBed.inject(BillmexMockApi);
    const customerLookup = vi.spyOn(api, 'getCustomerInfoById');
    const app = fixture.componentInstance;
    app.customer.set({
      id: 'customer-abc',
      customerId: 'customer-abc',
      name: 'Anshul',
      phone: '9879879870',
      authkey: 'auth-key'
    });
    app.userName.set('Anshul');
    app.phoneNumber.set('9879879870');
    app.activeView.set('profile');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Anshul');
    expect(compiled.textContent).toContain('+91 9879879870');
    expect(compiled.textContent).toContain('DINING SESSION');
    expect(compiled.textContent).not.toContain('420 Coins');
    expect(customerLookup).not.toHaveBeenCalled();
  });
});
