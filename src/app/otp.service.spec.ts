import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OtpService } from './otp.service';

describe('OtpService', () => {
  let service: OtpService;
  let httpSpy: { post: any; get: any };

  beforeEach(() => {
    httpSpy = {
      post: vi.fn(),
      get: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        OtpService,
        { provide: HttpClient, useValue: httpSpy }
      ]
    });

    service = TestBed.inject(OtpService);
  });

  it('validates 10-digit Indian mobile numbers properly', () => {
    expect(service.validatePhoneNumber('9669660675').valid).toBe(true);
    expect(service.validatePhoneNumber('7890123456').valid).toBe(true);
    expect(service.validatePhoneNumber('8123456789').valid).toBe(true);
    expect(service.validatePhoneNumber('6234567890').valid).toBe(true);
    expect(service.validatePhoneNumber('12345').valid).toBe(false);
    expect(service.validatePhoneNumber('1234567890').valid).toBe(false); // starts with 1
    expect(service.validatePhoneNumber('').valid).toBe(false);
  });

  it('sends OTP and sets reactive state on success', async () => {
    httpSpy.post.mockReturnValue(of({
      status: 'success',
      response: {
        id: 'cust-uuid-123',
        fullName: 'Vishnu Test',
        mobileNumber: '9669660675',
        authkey: 'test-authkey'
      }
    }));

    const result = await service.sendOtp('9669660675', 'Vishnu Test');
    expect(result.success).toBe(true);
    expect(result.customerId).toBe('cust-uuid-123');
    expect(service.otpSent()).toBe(true);
    expect(service.activeCustomerId()).toBe('cust-uuid-123');
    expect(service.resendCooldown()).toBe(30);
    expect(service.lastChannel()).toBe('sms');
    expect(httpSpy.post).toHaveBeenCalledWith(
      expect.stringContaining('/bhojmain/app/customer/simreg/'),
      { fullName: 'Vishnu Test', mobileNumber: '9669660675' }
    );
    service.resetOtpState();
  });

  it('sends WhatsApp OTP requests with the selected channel', async () => {
    httpSpy.post.mockReturnValue(of({
      status: 'success',
      response: {
        id: 'cust-uuid-123',
        fullName: 'Vishnu Test',
        mobileNumber: '9669660675',
        authkey: 'test-authkey'
      }
    }));

    const result = await service.sendOtp('9669660675', 'Vishnu Test', 'whatsapp');

    expect(result.message).toContain('via WhatsApp');
    expect(service.lastChannel()).toBe('whatsapp');
    expect(httpSpy.post).toHaveBeenCalledWith(
      expect.stringContaining('/bhojmain/app/customer/simreg/'),
      { fullName: 'Vishnu Test', mobileNumber: '9669660675' }
    );
    service.resetOtpState();
  });

  it('uses the customer ID returned by registration when it is named customerId', async () => {
    httpSpy.post
      .mockReturnValueOnce(of({
        status: 'success',
        response: { customerId: 'server-customer-id', fullName: 'Vishnu Test', mobileNumber: '9669660675' }
      }))
      .mockReturnValueOnce(of({
        status: 'success',
        response: { id: 'server-customer-id', fullName: 'Vishnu Test', mobileNumber: '9669660675' }
      }));

    const sent = await service.sendOtp('9669660675', 'Vishnu Test');
    const customer = await service.verifyOtp('123456', '9669660675', 'Vishnu Test');

    expect(sent.customerId).toBe('server-customer-id');
    expect(httpSpy.post).toHaveBeenLastCalledWith(
      expect.stringContaining('/bhojmain/app/customer/votp'),
      { id: 'server-customer-id', otp: '123456' }
    );
    expect(customer.id).toBe('server-customer-id');
    service.resetOtpState();
  });

  it('rejects a successful OTP response that lacks a customer ID instead of using a fake ID', async () => {
    httpSpy.post.mockReturnValue(of({
      status: 'success',
      response: { fullName: 'Vishnu Test', mobileNumber: '9669660675' }
    }));

    await expect(service.sendOtp('9669660675', 'Vishnu Test')).rejects.toThrow('server did not return a customer ID');
    expect(service.otpSent()).toBe(false);
    expect(service.activeCustomerId()).toBeNull();
  });

  it('resends OTP using the selected delivery channel', async () => {
    service.activeCustomerId.set('cust-uuid-123');
    service.lastPhone.set('9669660675');
    httpSpy.get.mockReturnValue(of({ status: 'success' }));

    const result = await service.resendOtp('9669660675', 'Vishnu Test', 'whatsapp');

    expect(result.message).toContain('via WhatsApp');
    expect(service.lastChannel()).toBe('whatsapp');
    expect(httpSpy.get).toHaveBeenCalledWith(
      expect.stringContaining('/bhojmain/app/customer/resendOtp/cust-uuid-123'),
      expect.anything()
    );
    service.resetOtpState();
  });

  it('handles backend registration failure gracefully', async () => {
    httpSpy.post.mockReturnValue(of({
      status: 'error',
      response: 'Registration limit reached'
    }));

    await expect(service.sendOtp('9669660675', 'Vishnu Test')).rejects.toThrow('Registration limit reached');
    expect(service.errorMessage()).toBe('Registration limit reached');
    expect(service.otpSent()).toBe(false);
  });

  it('verifies 6-digit OTP code successfully', async () => {
    service.activeCustomerId.set('cust-uuid-123');
    service.lastPhone.set('9669660675');

    httpSpy.post.mockReturnValue(of({
      status: 'success',
      response: {
        id: 'cust-uuid-123',
        fullName: 'Vishnu Test',
        mobileNumber: '9669660675',
        authkey: 'verified-key'
      }
    }));

    const customer = await service.verifyOtp('123456', '9669660675', 'Vishnu Test');
    expect(customer.id).toBe('cust-uuid-123');
    expect(customer.name).toBe('Vishnu Test');
    expect(service.activeCustomer()?.authkey).toBe('verified-key');
  });

  it('rejects incomplete or non-6-digit OTP codes', async () => {
    await expect(service.verifyOtp('123', '9669660675')).rejects.toThrow('complete 6-digit OTP code');
    await expect(service.verifyOtp('', '9669660675')).rejects.toThrow('complete 6-digit OTP code');
  });

  it('throws descriptive error when OTP does not match on backend', async () => {
    service.activeCustomerId.set('cust-uuid-123');
    service.lastPhone.set('9669660675');

    httpSpy.post.mockReturnValue(of({
      status: 'error',
      response: "OTP doesn't match"
    }));

    await expect(service.verifyOtp('999999', '9669660675')).rejects.toThrow("OTP doesn't match");
    expect(service.errorMessage()).toContain("OTP doesn't match");
  });

  it('resets state on logout', () => {
    service.activeCustomerId.set('cust-uuid-123');
    service.otpSent.set(true);
    service.logout();

    expect(service.otpSent()).toBe(false);
    expect(service.activeCustomerId()).toBeNull();
    expect(service.activeCustomer()).toBeNull();
    expect(service.resendCooldown()).toBe(0);
    expect(service.lastChannel()).toBe('sms');
  });
});
