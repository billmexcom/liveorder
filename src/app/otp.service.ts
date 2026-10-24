import { Injectable, signal, computed, Optional } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Customer, getBaseApiUrl } from './billmex-api';

export interface OtpSendResponse {
  success: boolean;
  customerId: string;
  mobileNumber: string;
  fullName: string;
  message: string;
  resendCooldownSeconds: number;
}

export interface OtpVerifyResponse {
  success: boolean;
  customer: Customer;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OtpService {
  // Reactive Signals for UI State
  readonly otpSent = signal<boolean>(false);
  readonly isSending = signal<boolean>(false);
  readonly isVerifying = signal<boolean>(false);
  readonly resendCooldown = signal<number>(0);
  readonly activeCustomerId = signal<string | null>(null);
  readonly lastPhone = signal<string>('');
  readonly lastChannel = signal<'sms' | 'whatsapp'>('sms');
  readonly activeCustomer = signal<Customer | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly canResend = computed(() => {
    return this.otpSent() && this.resendCooldown() === 0 && !this.isSending();
  });

  readonly formattedCooldown = computed(() => {
    const s = this.resendCooldown();
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}s`;
  });

  private cooldownTimer: any = null;

  constructor(@Optional() private readonly http: HttpClient) {
    this.restoreSession();
  }

  /**
   * Validate standard 10-digit mobile number
   */
  validatePhoneNumber(phone: string): { valid: boolean; cleaned: string; error?: string } {
    const cleaned = (phone || '').replace(/\D/g, '');
    if (!cleaned) {
      return { valid: false, cleaned: '', error: 'Please enter your 10-digit mobile number.' };
    }
    if (cleaned.length !== 10) {
      return { valid: false, cleaned, error: 'Mobile number must be exactly 10 digits.' };
    }
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      return { valid: false, cleaned, error: 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.' };
    }
    return { valid: true, cleaned };
  }

  /**
   * Send OTP via Billmex simreg customer registration endpoint
   */
  async sendOtp(phone: string, name?: string, channel: 'sms' | 'whatsapp' = 'sms'): Promise<OtpSendResponse> {
    const phoneCheck = this.validatePhoneNumber(phone);
    if (!phoneCheck.valid) {
      this.errorMessage.set(phoneCheck.error || 'Invalid phone number');
      throw new Error(phoneCheck.error || 'Invalid phone number');
    }

    const cleanPhone = phoneCheck.cleaned;
    const cleanName = (name || '').trim() || 'Guest Diner';

    this.isSending.set(true);
    this.errorMessage.set(null);

    try {
      if (this.http) {
        const url = `${getBaseApiUrl()}bhojmain/app/customer/simreg/`;
        const res = await firstValueFrom(
          this.http.post<any>(url, {
            fullName: cleanName,
            mobileNumber: cleanPhone
          })
        );

        if (res && res.status === 'success' && res.response) {
          const responseId = res.response.id || res.response.customerId;
          const custId = typeof responseId === 'string' || typeof responseId === 'number'
            ? String(responseId).trim()
            : '';
          if (!custId) {
            throw new Error('OTP request succeeded but the server did not return a customer ID. Please try again.');
          }
          const authKey = res.response.authkey || '';
          const customerData: Customer = {
            id: custId,
            customerId: custId,
            name: res.response.fullName || cleanName,
            phone: res.response.mobileNumber || cleanPhone,
            authkey: authKey
          };

          this.activeCustomerId.set(custId);
          this.lastPhone.set(cleanPhone);
          this.lastChannel.set(channel);
          this.otpSent.set(true);
          this.startCooldownTimer(30);

          return {
            success: true,
            customerId: custId,
            mobileNumber: cleanPhone,
            fullName: customerData.name,
            message: channel === 'whatsapp'
              ? `OTP sent to +91 ${cleanPhone} via WhatsApp`
              : `OTP sent successfully to +91 ${cleanPhone}`,
            resendCooldownSeconds: 30
          };
        } else if (res && res.status === 'error') {
          const msg = res.response || 'Customer OTP request failed.';
          this.errorMessage.set(msg);
          throw new Error(msg);
        }

        throw new Error(res?.message || 'The server returned an invalid response while requesting your OTP. Please try again.');
      }

      // Offline / Test environment fallback
      const mockId = `live-cust-${cleanPhone}`;
      this.activeCustomerId.set(mockId);
      this.lastPhone.set(cleanPhone);
      this.lastChannel.set(channel);
      this.otpSent.set(true);
      this.startCooldownTimer(30);

      return {
        success: true,
        customerId: mockId,
        mobileNumber: cleanPhone,
        fullName: cleanName,
        message: channel === 'whatsapp'
          ? `OTP sent to +91 ${cleanPhone} via WhatsApp`
          : `OTP sent to +91 ${cleanPhone} via SMS`,
        resendCooldownSeconds: 30
      };
    } catch (err: any) {
      const msg = err?.error?.response || err?.error?.message || err?.message || 'Failed to send OTP. Please check network connection.';
      this.errorMessage.set(msg);
      throw new Error(msg);
    } finally {
      this.isSending.set(false);
    }
  }

  /**
   * Resend OTP using customerId if available, or re-initiates simreg
   */
  async resendOtp(phone?: string, name?: string, channel: 'sms' | 'whatsapp' = 'sms'): Promise<OtpSendResponse> {
    if (this.resendCooldown() > 0) {
      throw new Error(`Please wait ${this.resendCooldown()}s before requesting a new OTP.`);
    }

    const currentCustId = this.activeCustomerId();
    const targetPhone = phone || this.lastPhone();

    // If we have an active customerId, use Billmex resendOtp endpoint
    if (currentCustId && this.http) {
      this.isSending.set(true);
      this.errorMessage.set(null);
      try {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        const url = `${getBaseApiUrl()}bhojmain/app/customer/resendOtp/${encodeURIComponent(currentCustId)}`;
        const res = await firstValueFrom(this.http.get<any>(url, { headers }));

        if (res && res.status === 'success') {
          this.lastChannel.set(channel);
          this.startCooldownTimer(30);
          return {
            success: true,
            customerId: currentCustId,
            mobileNumber: targetPhone,
            fullName: name || 'Guest Diner',
            message: channel === 'whatsapp'
              ? `OTP resent to +91 ${targetPhone} via WhatsApp`
              : `OTP resent to +91 ${targetPhone} via SMS`,
            resendCooldownSeconds: 30
          };
        } else if (res && res.status === 'error') {
          // If customerId expired or not found, fall back to sendOtp
          console.warn('resendOtp failed on backend, falling back to simreg:', res.response);
        }
      } catch (e) {
        console.warn('resendOtp error, falling back to simreg:', e);
      } finally {
        this.isSending.set(false);
      }
    }

    // Fallback or initial send
    return this.sendOtp(targetPhone, name, channel);
  }

  /**
   * Verify the 6-digit OTP code with Billmex votp endpoint
   */
  async verifyOtp(otp: string, phone?: string, name?: string): Promise<Customer> {
    const cleanOtp = (otp || '').replace(/\D/g, '').trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      const err = 'Please enter the complete 6-digit OTP code.';
      this.errorMessage.set(err);
      throw new Error(err);
    }

    this.isVerifying.set(true);
    this.errorMessage.set(null);

    try {
      let custId = this.activeCustomerId();
      const targetPhone = phone || this.lastPhone();

      // If customerId is not yet cached, ensure customer registration is invoked first
      if (!custId && targetPhone && this.http) {
        const sendResult = await this.sendOtp(targetPhone, name);
        custId = sendResult.customerId;
      }

      if (!custId) {
        const err = 'Please click "Send OTP" first to receive a verification code.';
        this.errorMessage.set(err);
        throw new Error(err);
      }

      if (this.http) {
        let res: any;
        try {
          const url = `${getBaseApiUrl()}bhojmain/app/customer/votp`;
          res = await firstValueFrom(
            this.http.post<any>(url, {
              id: custId,
              otp: cleanOtp
            })
          );
        } catch (e: any) {
          const msg = e?.error?.response || e?.error?.message || e?.message || "Invalid OTP code";
          this.errorMessage.set(msg);
          throw new Error(msg);
        }

        if (res && res.status === 'success' && res.response) {
          const customer: Customer = {
            id: res.response.id || custId,
            customerId: res.response.id || custId,
            name: res.response.fullName || name || 'Customer',
            phone: res.response.mobileNumber || targetPhone,
            authkey: res.response.authkey || ''
          };

          this.activeCustomer.set(customer);
          this.saveCustomerSession(customer);
          this.stopCooldownTimer();

          return customer;
        }

        if (res && res.status === 'error') {
          const msg = res.response || "Invalid OTP. Please check the 6-digit code received on your phone.";
          this.errorMessage.set(msg);
          throw new Error(msg);
        }
      }

      // Offline / Test environment fallback
      const verifiedCustomer: Customer = {
        id: custId,
        customerId: custId,
        name: name || 'Customer',
        phone: targetPhone,
        authkey: 'test-verified-authkey'
      };

      this.activeCustomer.set(verifiedCustomer);
      this.saveCustomerSession(verifiedCustomer);
      this.stopCooldownTimer();

      return verifiedCustomer;
    } catch (err: any) {
      const msg = err?.message || "OTP verification failed. Please check the code and try again.";
      this.errorMessage.set(msg);
      throw (err instanceof Error ? err : new Error(msg));
    } finally {
      this.isVerifying.set(false);
    }
  }

  /**
   * Reset the current OTP form state
   */
  resetOtpState(): void {
    this.otpSent.set(false);
    this.stopCooldownTimer();
    this.resendCooldown.set(0);
    this.errorMessage.set(null);
  }

  /**
   * Sign out and clear stored session
   */
  logout(): void {
    this.resetOtpState();
    this.activeCustomerId.set(null);
    this.lastChannel.set('sms');
    this.activeCustomer.set(null);
    this.clearCustomerSession();
  }

  private startCooldownTimer(seconds: number): void {
    this.stopCooldownTimer();
    this.resendCooldown.set(seconds);
    this.cooldownTimer = setInterval(() => {
      const current = this.resendCooldown();
      if (current <= 1) {
        this.resendCooldown.set(0);
        this.stopCooldownTimer();
      } else {
        this.resendCooldown.set(current - 1);
      }
    }, 1000);
  }

  private stopCooldownTimer(): void {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
  }

  private saveCustomerSession(customer: Customer): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem('customer', JSON.stringify(customer));
        localStorage.setItem('customerLoggedIn', 'true');
      } catch (e) {
        console.warn('Failed to save customer session to localStorage:', e);
      }
    }
  }

  private clearCustomerSession(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem('customer');
        localStorage.removeItem('customerLoggedIn');
      } catch (e) {
        console.warn('Failed to clear customer session from localStorage:', e);
      }
    }
  }

  private restoreSession(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem('customer');
        const isLoggedIn = localStorage.getItem('customerLoggedIn') === 'true';
        if (stored && isLoggedIn) {
          const parsed = JSON.parse(stored);
          if (parsed?.id && parsed.id !== 'customer-1' && parsed?.authkey && parsed.authkey !== 'mock-auth-key') {
            this.activeCustomer.set(parsed);
            this.activeCustomerId.set(parsed.id);
            this.lastPhone.set(parsed.phone || parsed.mobileNumber || '');
          }
        }
      } catch {
        this.clearCustomerSession();
      }
    }
  }
}
