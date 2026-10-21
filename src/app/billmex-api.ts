import { Injectable, Optional } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type OrderType = 'delivery' | 'takeaway';
export type PaymentMethod = 'upi' | 'cod';
export type OrderStatus = 'COOKING' | 'PREPARING' | 'DELIVERED';

export interface MenuItem {
  id: string;
  itemMasterId?: string;
  itemBeanId?: string;
  name: string;
  nameHi: string;
  tag?: string;
  tagType?: 'bestseller' | 'discount';
  discount?: string;
  description: string;
  descriptionHi: string;
  price: number;
  originalPrice?: number;
  likes: number;
  reviews?: number;
  rating: number;
  imageUrl: string;
  category: string[];
  categoryName?: string;
  subCategoryName?: string;
  bestSeller?: boolean;
  todaySpecial?: boolean;
  saifRecommended?: boolean;
  isVeg: boolean;
}

export interface OrderLine {
  itemId: string;
  quantity: number;
  name?: string;
  price?: number;
}

export interface Customer {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  authkey: string;
}

export interface BillPreview {
  subtotal: number;
  discount: number;
  total: number;
}

export interface BillmexOrder {
  id: string;
  customerId: string;
  items: OrderLine[];
  total: number;
  paymentMethod: PaymentMethod;
  orderType: OrderType;
  status: OrderStatus;
  createdAt: string;
  parcelNo?: number;
  statusList?: string[];
  rawDetails?: any;
}

export interface BillmexNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export const BILLMEX_LIVE_CONFIG = {
  baseApiUrl: 'http://billmex.in:8080/',
  rmsBaseUrl: 'https://rms.billmex.com/bhojrms/',
  defaultPosId: '35935c74d14d449a9dbbdf301a641ee4',
  payuUrl: 'https://secure.payu.in/_payment',
} as const;

export const PAYU_CONFIG = {
  merchantKey: 'fotpHB',
  merchantSalt: 'xqF8hgmb',
  payuPaymentUrl: 'https://secure.payu.in/_payment',
  callbackUrl: 'https://liveorder.billmex.com/#/order-detail/',
} as const;

export function getBaseApiUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin?.includes(':4200')) {
    return `${window.location.origin}/`;
  }
  return BILLMEX_LIVE_CONFIG.baseApiUrl;
}

export function getRmsBaseUrl(directUrl?: string): string {
  if (typeof window !== 'undefined' && window.location?.origin?.includes(':4200')) {
    return `${window.location.origin}/bhojrms/`;
  }
  return directUrl || BILLMEX_LIVE_CONFIG.rmsBaseUrl;
}

export const BILLMEX_API_ROUTES = {
  posData: '/bhojmain/app/pos/posData/{posId}',
  customerRegistration: '/bhojmain/app/customer/simreg/',
  verifyOtp: '/bhojmain/app/customer/votp',
  resendOtp: '/bhojmain/app/customer/resendOtp/{phone}',
  customerInfo: '/bhojmain/app/customer/getCustomerInfoById/{customerId}',
  pushToken: '/bhojmain/app/pos/{posId}?customerId={customerId}',
  itemMaster: '/bhoj/itemMaster/{posId}',
  itemLike: '/bhoj/itemMaster/like',
  previewBill: '/bhoj/order/previewBill',
  placeOrder: '/bhoj/order/placeOrder',
  initiateTransaction: '/bhojmain/order/v2/initiateOrderTransaction',
  updateTransaction: '/bhojmain/order/v2/updateTransactionStatus',
  orderById: '/bhoj/order/{orderId}',
  orderHistory: '/bhojmain/app/order/orderHistory?customerId={customerId}&pageNo={pageNo}',
  notifications: '/bhojmain/custnotification?page={page}',
} as const;

const MOCK_MENU_ITEMS: MenuItem[] = [
  {
    id: 'chach-rayta',
    name: 'Chach Rayta',
    nameHi: 'छाछ रायता',
    tag: 'BESTSELLER',
    tagType: 'bestseller',
    description: 'Rich artisanal curd churned with hand-ground Himalayan rock salt & cracked cumin.',
    descriptionHi: 'हाथ से पिसे हिमालयन सेंधा नमक और भुने जीरे के साथ मथा हुआ स्वादिष्ट दही।',
    price: 30,
    likes: 142,
    reviews: 28,
    rating: 4.9,
    imageUrl: '/images/chach_rayta.jpg',
    category: ['all', 'chef', 'specials', 'bestseller', 'Dahi', 'Rayta & Chach'],
    categoryName: 'Dahi',
    subCategoryName: 'Rayta & Chach',
    bestSeller: true,
    todaySpecial: true,
    saifRecommended: true,
    isVeg: true,
  },
  {
    id: 'dahi-plain',
    name: 'Dahi Plain',
    nameHi: 'दही प्लेन (मटका)',
    description: 'Slow-fermented buffalo milk curd set in authentic clay pots with velvety texture.',
    descriptionHi: 'पारंपरिक मिट्टी की हांडी में जमाया हुआ मलाईदार शुद्ध भैंस का गाढ़ा दही।',
    price: 60,
    likes: 89,
    rating: 4.7,
    imageUrl: '/images/dahi_plain.jpg',
    category: ['all', 'Dahi'],
    categoryName: 'Dahi',
    subCategoryName: 'Dahi',
    isVeg: true,
  },
  {
    id: 'masala-chach',
    name: 'Masala Chach',
    nameHi: 'मसाला छाछ',
    description: 'Roasted cumin & young ginger digestive buttermilk infused with fresh mint.',
    descriptionHi: 'भुना जीरा, बारीक अदरक और ताजे पुदीने से भरपूर पाचक देशी छाछ।',
    price: 40,
    likes: 204,
    rating: 4.8,
    imageUrl: '/images/masala_chach.jpg',
    category: ['all', 'chef', 'Dahi', 'Rayta & Chach'],
    categoryName: 'Dahi',
    subCategoryName: 'Rayta & Chach',
    saifRecommended: true,
    isVeg: true,
  },
  {
    id: 'veg-rayta',
    name: 'Veg Rayta',
    nameHi: 'मिक्स वेज रायता',
    description: 'Crisp boondi, finely diced garden cucumber, and vine tomatoes tossed in spiced curd.',
    descriptionHi: 'कुरकुरी बूंदी, बारीक खीरा और रसीले टमाटरों से सजा हुआ चटपटा रायता।',
    price: 80,
    likes: 76,
    rating: 4.6,
    imageUrl: '/images/veg_rayta.jpg',
    category: ['all', 'Dahi', 'Rayta & Chach'],
    categoryName: 'Dahi',
    subCategoryName: 'Rayta & Chach',
    isVeg: true,
  },
  {
    id: 'paneer-butter-masala',
    name: 'Paneer Butter Masala',
    nameHi: 'पनीर बटर मसाला',
    tag: '15% OFF',
    tagType: 'discount',
    discount: '15% OFF',
    description: 'Tender fresh malai paneer simmered in silky tomato-cashew satin gravy with cream.',
    descriptionHi: 'रेशमी टमाटर और काजू की मखमली ग्रेवी में ताजे मलाई पनीर के टुकड़े।',
    price: 180,
    originalPrice: 210,
    likes: 342,
    rating: 4.9,
    imageUrl: '/images/paneer_butter_masala.jpg',
    category: ['all', 'chef', 'specials', 'Paneer'],
    categoryName: 'Paneer',
    subCategoryName: 'Paneer',
    todaySpecial: true,
    saifRecommended: true,
    isVeg: true,
  },
  {
    id: 'dal-tadka',
    name: 'Dal Tadka Double Jeera',
    nameHi: 'दाल तड़का डबल जीरा',
    description: 'Yellow lentils double-tempered in pure desi ghee, crushed garlic, and Kashmiri chili.',
    descriptionHi: 'शुद्ध देशी घी, भुने लहसुन और कश्मीरी लाल मिर्च के दोहरे तड़के वाली अरहर दाल।',
    price: 120,
    likes: 118,
    rating: 4.7,
    imageUrl: '/images/dal_tadka.jpg',
    category: ['all', 'specials', 'Dal'],
    categoryName: 'Dal',
    subCategoryName: 'Dal',
    todaySpecial: true,
    isVeg: true,
  },
];

export function getMockMenuItems(): MenuItem[] {
  return MOCK_MENU_ITEMS.map((item) => ({ ...item, category: [...item.category] }));
}

export function mapLiveBeansToMenuItems(categoryBeans: any[]): MenuItem[] {
  const items: MenuItem[] = [];
  const seenIds = new Set<string>();

  for (const cat of categoryBeans || []) {
    const catName = (cat.name || '').trim();
    for (const sub of cat.subCategoryBeans || []) {
      const subName = (sub.name || '').trim();
      for (const bean of sub.bhojItemMasterBeans || []) {
        if (!bean.id || seenIds.has(bean.id)) continue;
        seenIds.add(bean.id);

        const beanDetail = bean.itemBeanList?.[0] || {};
        const price = Number(beanDetail.price) || 0;
        const altName = beanDetail.altName || bean.name;

        const categories: string[] = ['all'];
        if (catName) categories.push(catName);
        if (subName && subName !== catName) categories.push(subName);
        if (bean.saifRecommended) categories.push('chef');
        if (bean.todaySpecial) categories.push('specials');
        if (bean.bestSeller) categories.push('bestseller');

        items.push({
          id: bean.id,
          itemMasterId: bean.id,
          itemBeanId: beanDetail.id || bean.id,
          name: bean.name,
          nameHi: altName,
          categoryName: catName || 'General',
          subCategoryName: subName || catName || 'General',
          tag: bean.bestSeller ? 'BESTSELLER' : (bean.todaySpecial ? 'SPECIAL' : undefined),
          tagType: bean.bestSeller ? 'bestseller' : undefined,
          description: bean.description || bean.name,
          descriptionHi: bean.description || altName,
          price: price,
          originalPrice: bean.todaySpecial ? Math.round(price * 1.15) : undefined,
          likes: Number(bean.likeCount) || 0,
          reviews: 12,
          rating: Number(bean.overAllRating) || 4.8,
          imageUrl: bean.imageUrl || '/images/chach_rayta.jpg',
          category: categories,
          bestSeller: !!bean.bestSeller,
          todaySpecial: !!bean.todaySpecial,
          saifRecommended: !!bean.saifRecommended,
          isVeg: bean.isVeg ?? true,
        });
      }
    }
  }

  return items.length > 0 ? items : getMockMenuItems();
}

const MOCK_CUSTOMER: Customer = {
  id: 'customer-1',
  customerId: 'customer-1',
  name: 'Vishnu',
  phone: '9669660675',
  authkey: 'mock-auth-key',
};

@Injectable({ providedIn: 'root' })
export class BillmexMockApi {
  readonly mode = 'mock' as const;
  isLiveConnected = false;
  activeCustomer: any = null;
  activePos: any = null;
  basePosUrl = BILLMEX_LIVE_CONFIG.rmsBaseUrl;
  activeMenuItems: MenuItem[] = [];

  private orders: BillmexOrder[] = [];
  private transactions = new Set<string>();
  private orderSequence = 9921;
  private transactionSequence = 1;

  constructor(@Optional() private readonly http?: HttpClient) {}

  async getPosData(posId: string): Promise<{ posId: string; name: string; publicUrl: string }> {
    if (this.http && posId !== 'POS-DEMO') {
      try {
        const url = `${getBaseApiUrl()}bhojmain/app/pos/posData/${posId}`;
        const res = await firstValueFrom(this.http.get<any>(url));
        if (res && res.status === 'success' && res.response) {
          this.activePos = res.response;
          this.basePosUrl = res.response.publicUrl || BILLMEX_LIVE_CONFIG.rmsBaseUrl;
          this.isLiveConnected = true;
          return {
            posId: res.response.posId,
            name: res.response.posName || 'Grand Bay Bistro',
            publicUrl: this.basePosUrl,
          };
        }
      } catch (e) {
        console.warn('Live getPosData failed, falling back:', e);
      }
    }
    return { posId, name: 'Grand Bay Bistro', publicUrl: 'mock://pos/' };
  }

  async customerSimreg(phone: string, name: string): Promise<{ sent: boolean; customerId?: string }> {
    this.validatePhone(phone);
    if (!name.trim()) throw new Error('Enter your name before requesting an OTP.');

    if (this.http) {
      try {
        const url = `${getBaseApiUrl()}bhojmain/app/customer/simreg/`;
        const res = await firstValueFrom(this.http.post<any>(url, {
          fullName: name.trim(),
          mobileNumber: phone
        }));
        if (res && res.status === 'success' && res.response) {
          this.activeCustomer = res.response;
          this.isLiveConnected = true;
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem('customer', JSON.stringify(res.response));
          }
          return { sent: true, customerId: res.response.id };
        }
      } catch (e) {
        console.warn('Live customerSimreg failed, falling back:', e);
      }
    }
    return { sent: true };
  }

  async customerVotp(phone: string, otp: string, name: string): Promise<Customer> {
    this.validatePhone(phone);
    if (!name.trim()) throw new Error('Enter your name to verify the OTP.');

    if (otp !== '4829') {
      if (!this.activeCustomer && typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('customer');
        if (stored) {
          try {
            this.activeCustomer = JSON.parse(stored);
          } catch {
            // ignore
          }
        }
      }
      if (!this.activeCustomer?.id && this.http) {
        await this.customerSimreg(phone, name);
      }
      if (this.http && this.activeCustomer?.id) {
        try {
          const url = `${getBaseApiUrl()}bhojmain/app/customer/votp`;
          const res = await firstValueFrom(this.http.post<any>(url, {
            id: this.activeCustomer.id,
            otp
          }));
          if (res && res.status === 'success' && res.response) {
            this.activeCustomer = res.response;
            this.isLiveConnected = true;
            if (typeof window !== 'undefined' && window.localStorage) {
              localStorage.setItem('customer', JSON.stringify(res.response));
            }
            return {
              id: res.response.id,
              customerId: res.response.id,
              name: res.response.fullName || name.trim(),
              phone: res.response.mobileNumber || phone,
              authkey: res.response.authkey || 'mock-auth-key'
            };
          } else if (res && res.response) {
            throw new Error(`${res.response}. Demo OTP is 4829.`);
          }
        } catch (e: any) {
          const msg = e?.message || '';
          throw new Error(msg.includes('Demo OTP is 4829') ? msg : `${msg ? msg + '. ' : ''}Demo OTP is 4829.`);
        }
      }
      throw new Error('Demo OTP is 4829.');
    }

    return {
      ...MOCK_CUSTOMER,
      name: name.trim(),
      phone,
    };
  }

  async resendOtp(phone: string): Promise<{ sent: boolean }> {
    this.validatePhone(phone);
    if (this.http) {
      try {
        const url = `${getBaseApiUrl()}bhojmain/app/customer/resendOtp/${phone}`;
        await firstValueFrom(this.http.get<any>(url));
      } catch (e) {
        console.warn('Live resendOtp call failed:', e);
      }
    }
    return { sent: true };
  }

  async getCustomerInfoById(customerId: string): Promise<Customer> {
    if (this.http && this.activeCustomer?.authkey) {
      try {
        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'cAuthKey': this.activeCustomer.authkey
        });
        const url = `${getBaseApiUrl()}bhojmain/app/customer/getCustomerInfoById/${customerId}`;
        const res = await firstValueFrom(this.http.get<any>(url, { headers }));
        if (res && res.status === 'success' && res.response) {
          return {
            id: res.response.id,
            customerId: res.response.id,
            name: res.response.fullName,
            phone: res.response.mobileNumber,
            authkey: res.response.authkey
          };
        }
      } catch (e) {
        console.warn('Live getCustomerInfoById failed:', e);
      }
    }

    if (customerId !== MOCK_CUSTOMER.customerId && customerId !== this.activeCustomer?.id) {
      throw new Error('Customer was not found in the demo data.');
    }
    return { ...MOCK_CUSTOMER };
  }

  async registerPushToken(customerId: string, token: string): Promise<{ registered: boolean }> {
    if (!customerId || !token) throw new Error('Customer and notification token are required.');

    if (this.http) {
      try {
        const posId = this.activePos?.posId || BILLMEX_LIVE_CONFIG.defaultPosId;
        const url = `${getBaseApiUrl()}bhojmain/app/pos/${posId}?customerId=${customerId}`;
        await firstValueFrom(this.http.get<any>(url));
      } catch (e) {
        console.warn('Live registerPushToken call failed:', e);
      }
    }

    return { registered: true };
  }

  async getItemMaster(posId?: string): Promise<MenuItem[]> {
    if (this.http) {
      const targetPosId = posId || this.activePos?.posId || BILLMEX_LIVE_CONFIG.defaultPosId;
      const basePos = getRmsBaseUrl(this.basePosUrl);
      const custId = this.activeCustomer?.id || '920a474d2fd54c7783cfe0db975391cf';
      const auth = this.activeCustomer?.authkey || 'lk4kqdGI4QkrzpCNWc6sZfmwIX8UexhIkxZKpxxXlK96dUdXZ31kLS0ekZJZOyjxFylbBw8MF376Es84qCeOgITkPvvuUdUaDP37';

      try {
        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'customerId': custId,
          'cAuthKey': auth
        });
        const url = `${basePos}bhoj/itemMaster/${targetPosId}`;
        const res = await firstValueFrom(this.http.get<any>(url, { headers }));
        if (res && res.status === 'success' && res.response?.categoryBeans?.length) {
          this.isLiveConnected = true;
          this.activeMenuItems = mapLiveBeansToMenuItems(res.response.categoryBeans);
          return this.activeMenuItems;
        }
      } catch (e) {
        console.warn('Live getItemMaster failed, using mock menu:', e);
      }
    }
    return getMockMenuItems();
  }

  async likeMasterBean(itemId: string): Promise<{ likes: number }> {
    if (this.http && this.basePosUrl && this.activeCustomer?.id) {
      try {
        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'customerId': this.activeCustomer.id,
          'cAuthKey': this.activeCustomer.authkey
        });
        const url = `${getRmsBaseUrl(this.basePosUrl)}bhoj/itemMaster/like`;
        await firstValueFrom(this.http.post<any>(url, { itemId, customerId: this.activeCustomer.id }, { headers }));
      } catch (e) {
        console.warn('Live like failed, falling back:', e);
      }
    }

    const item = (this.activeMenuItems.length ? this.activeMenuItems : MOCK_MENU_ITEMS).find((c) => c.id === itemId);
    if (!item) throw new Error('Menu item was not found.');
    item.likes += 1;
    return { likes: item.likes };
  }

  async previewBill(items: OrderLine[], couponCode: string): Promise<BillPreview> {
    if (!items.length) throw new Error('Add at least one item before checkout.');

    if (this.http && this.activeCustomer?.authkey) {
      try {
        const orderDetailsBeanList = items.map((line) => {
          const item = this.activeMenuItems.find((i) => i.id === line.itemId || i.itemBeanId === line.itemId);
          return {
            itemId: item?.itemBeanId || line.itemId,
            itemMasterId: item?.itemMasterId || line.itemId,
            quantity: line.quantity,
            splitValue: 1,
            baseTasteLevelId: [],
            addonList: []
          };
        });

        const payload = {
          posId: this.activePos?.posId || BILLMEX_LIVE_CONFIG.defaultPosId,
          customerId: this.activeCustomer.id || this.activeCustomer.customerId,
          orderRemark: '',
          paymentType: 'COD',
          transectionId: '',
          paymentId: '',
          orderTypeId: this.activePos?.orderTypeList?.[0]?.id || '01bd7374084811e6a93cc81f66433dc4',
          deliveryAddress: this.activeCustomer.address || 'indore',
          orderDetailsBeanList
        };

        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'cAuthKey': this.activeCustomer.authkey
        });
        const url = `${getRmsBaseUrl(this.basePosUrl)}bhoj/order/previewBill`;
        const res = await firstValueFrom(this.http.post<any>(url, payload, { headers }));
        if (res && res.status === 'success' && res.response?.billDetailsBeanList) {
          const bill = res.response.billDetailsBeanList;
          const subtotal = Number(bill['Sub Total']) || 0;
          const discount = Number(bill['Total Discount']) || (couponCode === 'NOCTURNE-10' ? Math.min(10, subtotal) : 0);
          const total = Number(bill['Grand Total']) || Math.max(0, subtotal - discount);
          return { subtotal, discount, total };
        }
      } catch (e) {
        console.warn('Live previewBill failed, using local calculation:', e);
      }
    }

    const subtotal = items.reduce((total, line) => {
      const item = (this.activeMenuItems.length ? this.activeMenuItems : MOCK_MENU_ITEMS).find(
        (candidate) => candidate.id === line.itemId || candidate.itemBeanId === line.itemId
      );
      if (!item || !Number.isInteger(line.quantity) || line.quantity < 1) {
        throw new Error('The cart contains an invalid item or quantity.');
      }
      return total + item.price * line.quantity;
    }, 0);
    const discount = couponCode === 'NOCTURNE-10' ? Math.min(10, subtotal) : 0;
    return { subtotal, discount, total: subtotal - discount };
  }

  async placeOrder(input: {
    customerId: string;
    items: OrderLine[];
    paymentMethod: PaymentMethod;
    orderType: OrderType;
    couponCode: string;
    tableCode?: string;
    deliveryAddress?: string;
    orderRemark?: string;
  }): Promise<BillmexOrder> {
    if (!input.customerId) throw new Error('A customer is required to place an order.');
    const bill = await this.previewBill(input.items, input.couponCode);

    if (this.http) {
      if (!this.activeCustomer && typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('customer');
        if (stored) {
          try {
            this.activeCustomer = JSON.parse(stored);
          } catch {
            // ignore
          }
        }
      }

      const custId = this.activeCustomer?.id || this.activeCustomer?.customerId || input.customerId || '920a474d2fd54c7783cfe0db975391cf';
      const auth = this.activeCustomer?.authkey || 'lk4kqdGI4QkrzpCNWc6sZfmwIX8UexhIkxZKpxxXlK96dUdXZ31kLS0ekZJZOyjxFylbBw8MF376Es84qCeOgITkPvvuUdUaDP37';
      const posId = this.activePos?.posId || BILLMEX_LIVE_CONFIG.defaultPosId;

      try {
        const orderDetailsBeanList = input.items.map((line) => {
          const item = this.activeMenuItems.find((i) => i.id === line.itemId || i.itemBeanId === line.itemId || i.itemMasterId === line.itemId);
          return {
            itemId: item?.itemBeanId || line.itemId,
            itemMasterId: item?.itemMasterId || line.itemId,
            quantity: Number(line.quantity) || 1,
            splitValue: 1,
            baseTasteLevelId: [],
            addonList: []
          };
        });

        const tableNum = input.tableCode ? (parseInt(input.tableCode.replace(/\D/g, ''), 10) || 0) : 0;
        const orderTypeUpper = input.orderType === 'takeaway' ? 'TAKEAWAY' : (input.tableCode ? 'TABLE' : 'NONE');

        const payload = {
          posId,
          customerId: custId,
          orderRemark: input.orderRemark || '',
          paymentType: input.paymentMethod === 'upi' ? 'ONLINE' : 'COD',
          transectionId: '',
          paymentId: '',
          no: tableNum,
          type: orderTypeUpper,
          paidAmount: Number(bill.total),
          orderTypeId: this.activePos?.orderTypeList?.[0]?.id || '01bd7374084811e6a93cc81f66433dc4',
          deliveryAddress: this.activeCustomer?.address || input.deliveryAddress || 'indore',
          orderDetailsBeanList
        };

        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'cAuthKey': auth
        });
        const url = `${getRmsBaseUrl(this.basePosUrl)}bhoj/order/placeOrder`;
        const res = await firstValueFrom(this.http.post<any>(url, payload, { headers }));
        if (res && res.status === 'success' && res.response?.id) {
          const liveOrder: BillmexOrder = {
            id: res.response.id,
            customerId: custId,
            items: input.items.map((l) => ({ ...l })),
            total: Number(res.response.grandTotal) || bill.total,
            paymentMethod: input.paymentMethod,
            orderType: input.orderType,
            status: (res.response.orderStatus?.toUpperCase() as OrderStatus) || 'COOKING',
            createdAt: res.response.date ? new Date(res.response.date).toISOString() : new Date().toISOString(),
            parcelNo: res.response.parcelNo || res.response.parcel_no,
            rawDetails: res.response,
          };
          this.orders.unshift(liveOrder);
          this.isLiveConnected = true;
          return { ...liveOrder, items: liveOrder.items.map((l) => ({ ...l })) };
        } else if (res && res.response) {
          console.warn('Live placeOrder error response:', res.response);
        }
      } catch (e) {
        console.warn('Live placeOrder failed, creating local order:', e);
      }
    }

    const order: BillmexOrder = {
      id: `BH-${this.orderSequence++}`,
      customerId: input.customerId,
      items: input.items.map((line) => ({ ...line })),
      total: bill.total,
      paymentMethod: input.paymentMethod,
      orderType: input.orderType,
      status: 'COOKING',
      createdAt: new Date().toISOString(),
    };
    this.orders.unshift(order);
    return { ...order, items: order.items.map((line) => ({ ...line })) };
  }

  async initiateOrderTransaction(amount: number, orderId?: string): Promise<{ transactionId: string; status: 'pending'; payuData?: any }> {
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Payment amount must be positive.');

    const cust = this.activeCustomer || (typeof window !== 'undefined' && window.localStorage ? JSON.parse(localStorage.getItem('customer') || '{}') : {});
    const auth = cust?.authkey || 'lk4kqdGI4QkrzpCNWc6sZfmwIX8UexhIkxZKpxxXlK96dUdXZ31kLS0ekZJZOyjxFylbBw8MF376Es84qCeOgITkPvvuUdUaDP37';
    const posId = this.activePos?.posId || BILLMEX_LIVE_CONFIG.defaultPosId;

    if (this.http) {
      try {
        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'cAuthKey': auth
        });
        const url = `${getBaseApiUrl()}bhojmain/order/v2/initiateOrderTransaction`;
        const res = await firstValueFrom(this.http.post<any>(url, {
          posId,
          amount: Number(amount),
          orderJson: '',
          appType: 'USER_APP',
          orderId: orderId || `ORD-${Date.now()}`
        }, { headers }));

        if (res && res.status === 'success' && res.response) {
          const txnId = res.response;
          this.transactions.add(txnId);
          return {
            transactionId: txnId,
            status: 'pending',
            payuData: {
              key: PAYU_CONFIG.merchantKey,
              txnid: txnId,
              amount: amount.toFixed(2),
              productinfo: 'Bhoj_user',
              firstname: cust.fullName?.split(' ')[0] || 'Customer',
              email: cust.email || 'customer@bhoj.com',
              phone: cust.mobileNumber || '9999999999',
              surl: PAYU_CONFIG.callbackUrl,
              furl: PAYU_CONFIG.callbackUrl,
            }
          };
        }
      } catch (e) {
        console.warn('Live initiateOrderTransaction failed, falling back:', e);
      }
    }

    const transactionId = `DEMO-TXN-${this.transactionSequence++}`;
    this.transactions.add(transactionId);
    return { transactionId, status: 'pending' };
  }

  async updateTransactionStatus(transactionId: string): Promise<{ status: 'success' }> {
    const cust = this.activeCustomer || (typeof window !== 'undefined' && window.localStorage ? JSON.parse(localStorage.getItem('customer') || '{}') : {});
    const auth = cust?.authkey || 'lk4kqdGI4QkrzpCNWc6sZfmwIX8UexhIkxZKpxxXlK96dUdXZ31kLS0ekZJZOyjxFylbBw8MF376Es84qCeOgITkPvvuUdUaDP37';

    if (this.http && !transactionId.startsWith('DEMO-')) {
      try {
        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'cAuthKey': auth
        });
        const url = `${getBaseApiUrl()}bhojmain/order/v2/updateTransactionStatus`;
        await firstValueFrom(this.http.post<any>(url, {
          paymentGateway: 'PAYU',
          txnId: transactionId,
          paymentId: `PAY-${Date.now()}`,
          status: 'SUCCESS',
          terminalId: '',
          transactionDetail: JSON.stringify({ status: 'SUCCESS', txnid: transactionId })
        }, { headers }));
      } catch (e) {
        console.warn('Live updateTransactionStatus failed:', e);
      }
    }

    if (!this.transactions.has(transactionId)) throw new Error('Payment transaction was not found.');
    this.transactions.delete(transactionId);
    return { status: 'success' };
  }

  async getOrderById(orderId: string): Promise<BillmexOrder> {
    const cust = this.activeCustomer || (typeof window !== 'undefined' && window.localStorage ? JSON.parse(localStorage.getItem('customer') || '{}') : {});
    const auth = cust?.authkey || 'lk4kqdGI4QkrzpCNWc6sZfmwIX8UexhIkxZKpxxXlK96dUdXZ31kLS0ekZJZOyjxFylbBw8MF376Es84qCeOgITkPvvuUdUaDP37';

    if (this.http && !orderId.startsWith('BH-')) {
      try {
        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'cAuthKey': auth
        });
        const url = `${getRmsBaseUrl(this.basePosUrl)}bhoj/order/${orderId}`;
        const res = await firstValueFrom(this.http.get<any>(url, { headers }));
        if (res && res.status === 'success' && res.response) {
          const resp = res.response;
          const status = (resp.orderStatus === 'Delivered' ? 'DELIVERED' : (resp.orderStatus === 'Preparing' ? 'PREPARING' : 'COOKING')) as OrderStatus;

          const items: OrderLine[] = [];
          for (const bean of resp.orderDetailsBeanList || []) {
            if (bean.itemList && bean.itemList.length) {
              for (const sub of bean.itemList) {
                items.push({
                  itemId: sub.itemId || sub.id || bean.itemMasterId,
                  quantity: Number(sub.quantity) || 1,
                  name: sub.itemName || bean.itemMasterName,
                  price: Number(sub.price) || 0
                });
              }
            } else {
              items.push({
                itemId: bean.itemId || bean.itemMasterId,
                quantity: Number(bean.quantity) || 1,
                name: bean.itemName || bean.itemMasterName,
                price: Number(bean.price) || 0
              });
            }
          }

          const liveOrder: BillmexOrder = {
            id: resp.id,
            customerId: resp.customerId || cust.id || '920a474d2fd54c7783cfe0db975391cf',
            items: items.length ? items : (this.orders.find((o) => o.id === orderId)?.items || []),
            total: Number(resp.grandTotal) || 0,
            paymentMethod: (resp.paymentType === 'ONLINE' ? 'upi' : 'cod') as PaymentMethod,
            orderType: (resp.orderType || 'delivery') as OrderType,
            status,
            createdAt: resp.date ? new Date(resp.date).toISOString() : new Date().toISOString(),
            parcelNo: resp.parcel_no || resp.parcelNo,
            statusList: resp.statusList || [],
            rawDetails: resp
          };
          const existingIdx = this.orders.findIndex((o) => o.id === orderId);
          if (existingIdx >= 0) {
            this.orders[existingIdx] = liveOrder;
          } else {
            this.orders.unshift(liveOrder);
          }
          return { ...liveOrder, items: liveOrder.items.map((line) => ({ ...line })) };
        }
      } catch (e) {
        console.warn('Live getOrderById failed, using local orders:', e);
      }
    }

    const order = this.orders.find((candidate) => candidate.id === orderId);
    if (!order) throw new Error('Order was not found.');
    return { ...order, items: order.items.map((line) => ({ ...line })) };
  }

  async getOrderHistory(customerId: string): Promise<BillmexOrder[]> {
    if (this.http && this.activeCustomer?.authkey) {
      try {
        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'cAuthKey': this.activeCustomer.authkey
        });
        const url = `${getBaseApiUrl()}bhojmain/app/order/orderHistory?customerId=${customerId}&pageNo=1`;
        const res = await firstValueFrom(this.http.get<any>(url, { headers }));
        if (res && res.status === 'success' && Array.isArray(res.response)) {
          return res.response.map((o: any) => ({
            id: o.id || o.orderId,
            customerId: o.customerId || customerId,
            items: o.items || [],
            total: o.total || o.grandTotal || 0,
            paymentMethod: o.paymentMethod || 'upi',
            orderType: o.orderType || 'delivery',
            status: o.status || 'COOKING',
            createdAt: o.createdAt || new Date().toISOString()
          }));
        }
      } catch (e) {
        // Fallback to local memory orders
      }
    }

    const effectiveCustId = this.activeCustomer?.id || this.activeCustomer?.customerId;
    return this.orders
      .filter((order) => {
        if (!customerId || customerId === 'customer-1') return true;
        return order.customerId === customerId || (effectiveCustId && order.customerId === effectiveCustId);
      })
      .map((order) => ({ ...order, items: order.items.map((line) => ({ ...line })) }));
  }

  async getNotifications(): Promise<BillmexNotification[]> {
    if (this.http && this.activeCustomer?.authkey) {
      try {
        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'cAuthKey': this.activeCustomer.authkey
        });
        const url = `${getBaseApiUrl()}bhojmain/custnotification?page=1`;
        const res = await firstValueFrom(this.http.get<any>(url, { headers }));
        if (res && res.status === 'success' && res.response?.notificationList) {
          this.isLiveConnected = true;
          return res.response.notificationList.map((n: any) => ({
            id: n.id,
            title: n.title || 'Notification',
            message: n.message || '',
            createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString(),
            read: false
          }));
        }
      } catch (e) {
        console.warn('Live notifications failed, using mock notifications:', e);
      }
    }

    return [
      {
        id: 'welcome',
        title: 'Welcome to Billmex',
        message: 'Your dining session is ready.',
        createdAt: new Date().toISOString(),
        read: false,
      },
      ...this.orders.map((order) => ({
        id: `order-${order.id}`,
        title: `Order ${order.id} is ${order.status.toLowerCase()}`,
        message: `Your order total is ₹${order.total.toFixed(2)}.`,
        createdAt: order.createdAt,
        read: false,
      })),
    ];
  }

  reset(): void {
    this.orders = [];
    this.transactions.clear();
    this.orderSequence = 9921;
    this.transactionSequence = 1;
    MOCK_MENU_ITEMS[0].likes = 142;
    this.isLiveConnected = false;
    this.activeCustomer = null;
    this.activePos = null;
    this.activeMenuItems = [];
  }

  private validatePhone(phone: string): void {
    if (!/^\d{10}$/.test(phone)) throw new Error('Enter a valid 10-digit phone number.');
  }
}
