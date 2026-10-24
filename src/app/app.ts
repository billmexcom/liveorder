import { Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  BillmexMockApi,
  BILLMEX_LIVE_CONFIG,
  type BillmexNotification,
  type BillmexOrder,
  type Customer,
  type MenuItem,
  type OrderType,
  type PaymentMethod,
  getMockMenuItems,
} from './billmex-api';
import { OtpService } from './otp.service';

type Language = 'EN' | 'HI';
type AppView = 'login' | 'menu' | 'checkout' | 'orders' | 'explore' | 'profile';
export interface MenuCategoryTab {
  id: string;
  name: string;
  count: number;
  icon?: string;
  isSpecial?: boolean;
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
  lineTotal: number;
}

type SpiceLevel = 'Normal' | 'Medium' | 'Spicy';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  // Navigation View State (Order: 'login' -> 'menu' -> 'checkout')
  activeView = signal<AppView>('login');

  // Bottom Navigation Active Tab
  activeNavTab = signal<'explore' | 'menu' | 'orders' | 'profile'>('menu');

  // Language State
  currentLang = signal<Language>('EN');

  // Order Type State (Delivery vs Takeaway)
  orderType = signal<OrderType>('delivery');

  // Category Filter
  activeCategory = signal<string>('all');

  // Diner Details State (carried across screens)
  userName = signal<string>('');
  phoneNumber = signal<string>('');
  tableCode = signal<string>('T-01');
  tableName = signal<string>('');
  deliveryAddress = signal<string>('Cyber City, Sec 4');
  
  // 6-digit OTP for Billmex verification
  passcode = signal<string[]>(['', '', '', '', '', '']);

  // Reactive state delegated to OtpService
  otpSent = computed(() => this.otpService.otpSent());
  otpSending = computed(() => this.otpService.isSending());
  resendSeconds = computed(() => this.otpService.resendCooldown());
  canResendOtp = computed(() => this.otpService.canResend());
  formattedTimer = computed(() => this.otpService.formattedCooldown());

  // Scanner States
  isTorchOn = signal<boolean>(false);
  isScanning = signal<boolean>(true);
  isTableDetected = signal<boolean>(true);
  manualCodeMode = signal<boolean>(false);

  // Modals & Feedback
  toastMessage = signal<string | null>(null);
  showSuccessModal = signal<boolean>(false);
  showWaiterModal = signal<boolean>(false);
  showDietaryModal = signal<boolean>(false);
  showCartDrawer = signal<boolean>(false);
  showCustomizeModal = signal<boolean>(false);
  selectedCustomizeItem = signal<MenuItem | null>(null);
  customizeSpice = signal<SpiceLevel>('Normal');
  customizeRemark = signal<string>('');
  itemCustomizations = signal<Record<string, { spiceLevel: SpiceLevel; remark: string }>>({});
  readonly spiceLevels: readonly SpiceLevel[] = ['Normal', 'Medium', 'Spicy'];

  isLiveConnected = signal<boolean>(false);
  demoMode = computed(() => !this.isLiveConnected());
  menuItems = signal<MenuItem[]>(getMockMenuItems());
  orders = signal<BillmexOrder[]>([]);
  notifications = signal<BillmexNotification[]>([]);
  customer = signal<Customer | null>(null);
  currentOrder = signal<BillmexOrder | null>(null);
  apiError = signal<string | null>(null);
  apiLoading = signal(false);

  // Cart Quantities Map: itemId -> quantity (Starts completely empty for user to choose dishes)
  cartQuantities = signal<Record<string, number>>({});

  // Checkout & Settlement States
  paymentMethod = signal<PaymentMethod>('upi');
  couponCode = signal<string>('NOCTURNE-10');
  discountAmount = signal<number>(10);
  isCouponApplied = signal<boolean>(false);
  isModifyingAddress = signal<boolean>(false);
  deliveryTerminal = signal<string>('Plot 42, Nanda Nagar, Sector 4, Indore, MP - 452011');
  invoiceEmail = signal<string>('9669660675@bhoj.com');
  orderPlacedSuccess = signal<boolean>(false);
  lastPlacedOrderTotal = signal<number>(0);

  // Menu Search Query
  searchQuery = signal<string>('');
  isMenuSearchVisible = signal<boolean>(false);
  profileInitial = computed(() => this.userName().trim().charAt(0).toUpperCase() || 'G');

  // Dynamic Menu Categories derived from loaded menu items
  categories = computed<MenuCategoryTab[]>(() => {
    const items = this.menuItems();
    const isHi = this.currentLang() === 'HI';
    const result: MenuCategoryTab[] = [
      { id: 'all', name: isHi ? 'सभी व्यंजन' : 'All Items', count: items.length, icon: '•' },
    ];

    const chefCount = items.filter((i) => i.category.includes('chef') || i.saifRecommended).length;
    if (chefCount > 0) {
      result.push({
        id: 'chef',
        name: isHi ? 'शेफ की पसंद' : 'Chef Recommended',
        count: chefCount,
        icon: '👨‍🍳',
        isSpecial: true,
      });
    }

    const specialsCount = items.filter((i) => i.category.includes('specials') || i.todaySpecial).length;
    if (specialsCount > 0) {
      result.push({
        id: 'specials',
        name: isHi ? 'आज का स्पेशल' : "Today's Special",
        count: specialsCount,
        icon: '✪',
        isSpecial: true,
      });
    }

    const bestsellerCount = items.filter((i) => i.category.includes('bestseller') || i.bestSeller).length;
    if (bestsellerCount > 0) {
      result.push({
        id: 'bestseller',
        name: isHi ? 'बेस्ट सेलर' : 'Best Seller',
        count: bestsellerCount,
        icon: '🔥',
        isSpecial: true,
      });
    }

    // Collect all unique categories from the loaded menu items
    const catCounts = new Map<string, number>();
    for (const item of items) {
      const name = item.categoryName || item.category.find((c) => !['all', 'chef', 'specials', 'bestseller'].includes(c));
      if (name && name !== 'UnCategorized Item Master' && name !== 'General') {
        catCounts.set(name, (catCounts.get(name) || 0) + 1);
      }
    }

    for (const [name, count] of catCounts.entries()) {
      result.push({
        id: name,
        name: name,
        count: count,
      });
    }

    return result;
  });

  // Filtered Menu Items
  filteredItems = computed(() => {
    const cat = this.activeCategory();
    const query = this.searchQuery().trim().toLowerCase();

    return this.menuItems().filter((item) => {
      let matchesCategory = false;
      if (cat === 'all') {
        matchesCategory = true;
      } else if (cat === 'chef') {
        matchesCategory = item.category.includes('chef') || !!item.saifRecommended;
      } else if (cat === 'specials') {
        matchesCategory = item.category.includes('specials') || !!item.todaySpecial;
      } else if (cat === 'bestseller') {
        matchesCategory = item.category.includes('bestseller') || !!item.bestSeller;
      } else {
        matchesCategory =
          item.category.includes(cat) ||
          item.categoryName === cat ||
          item.subCategoryName === cat;
      }

      if (!matchesCategory) return false;

      if (!query) return true;
      const matchName = item.name.toLowerCase().includes(query);
      const matchNameHi = item.nameHi.toLowerCase().includes(query);
      const matchDesc = item.description.toLowerCase().includes(query);
      const matchDescHi = item.descriptionHi.toLowerCase().includes(query);
      return matchName || matchNameHi || matchDesc || matchDescHi;
    });
  });

  // Active Cart Items with normalized resolution across live RMS & mock IDs
  cartItems = computed<CartItem[]>(() => {
    const quantities = this.cartQuantities();
    const items = this.menuItems();
    const mockItems = getMockMenuItems();
    const list: CartItem[] = [];

    const clean = (s: string) => s.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();

    for (const [key, qty] of Object.entries(quantities)) {
      if (qty <= 0) continue;
      // 1. Exact ID / Bean ID match in loaded items
      let item = items.find((i) => i.id === key || i.itemBeanId === key || i.itemMasterId === key);
      // 2. Normalized name match in loaded items
      if (!item) {
        const cleanedKey = clean(key);
        item = items.find((i) => {
          const cleanedName = clean(i.name);
          return cleanedName === cleanedKey || cleanedName.includes(cleanedKey) || cleanedKey.includes(cleanedName);
        });
      }
      // 3. Fallback to mock items (for offline / unit test suite)
      if (!item) {
        item = mockItems.find((i) => i.id === key);
      }
      if (item) {
        list.push({
          item,
          quantity: qty,
          lineTotal: item.price * qty
        });
      }
    }
    return list;
  });

  // Total Cart Items Count
  totalCartCount = computed(() => {
    return this.cartItems().reduce((acc, ci) => acc + ci.quantity, 0);
  });

  // Total Cart Price (Subtotal)
  totalCartPrice = computed(() => {
    return this.cartItems().reduce((acc, ci) => acc + ci.lineTotal, 0);
  });

  // Grand Total after discount
  grandTotal = computed(() => {
    const subtotal = this.totalCartPrice();
    if (subtotal <= 0) return 0;
    const discount = this.isCouponApplied() ? Math.min(this.discountAmount(), subtotal) : 0;
    return Math.max(0, subtotal - discount);
  });

  // Translation Dictionaries
  t = computed(() => {
    const isHi = this.currentLang() === 'HI';
    const storeName = this.tableName() || (isHi ? 'डिजिटल डाइनिंग' : 'Billmex Dining');
    return {
      brand: 'BHOJ × BILLMEX',
      outletInfo: `${storeName} • ${isHi ? 'टेबल QR' : 'Table QR'}`,
      langToggle: isHi ? 'EN / हिन्दी' : 'EN / हिन्दी',
      tag: isHi ? 'डाइन-इन डिजिटल ऑर्डरिंग' : 'DINE-IN DIGITAL ORDERING',
      heading: isHi ? 'ऑर्डर करने के लिए टेबल QR स्कैन करें' : 'Scan Table QR to Order',
      subheading: isHi 
        ? 'अपनी टेबल पर रखे स्टैंडी पर लगे QR कोड पर कैमरा ले जाएं' 
        : 'Point your camera at the QR standee on your table',
      detected: isHi 
        ? `टेबल #${this.tableCode()} पहचानी गई • ${storeName}`
        : `Table #${this.tableCode()} Detected • ${storeName}`,
      torch: isHi ? 'टॉर्च' : 'Torch',
      uploadQr: isHi ? 'QR अपलोड' : 'Upload QR',
      enterCode: isHi ? 'कोड दर्ज करें:' : 'Enter Code:',
      tableBadge: `Table ${this.tableCode()}`,
      namePlaceholder: isHi ? 'अपना नाम' : 'Your name',
      mobilePlaceholder: isHi ? 'मोबाइल नंबर' : 'Mobile number',
      otpSent: isHi ? 'OTP भेजा गया' : 'OTP Sent',
      passcodeLabel: isHi ? '6-अंकों का OTP दर्ज करें' : 'Enter 6-Digit OTP',
      resendIn: isHi ? 'पुनः भेजें' : 'Resend in',
      smsSendOtp: isHi ? 'SMS OTP भेजें' : 'SMS OTP',
      whatsappSendOtp: isHi ? 'WhatsApp OTP भेजें' : 'WhatsApp OTP',
      confirmBtn: isHi ? 'OTP सत्यापित करें और मेनू देखें' : 'Verify OTP & View Digital Menu',
      perk1: isHi ? 'कोई वेटर देरी नहीं • तत्काल ऑर्डरिंग' : 'Zero Waiter Delay • Instant Ordering',
      perk2: isHi ? 'डायरेक्ट किचन डिस्पैच' : 'Direct Kitchen Dispatch',
      footerTitle: isHi ? 'भोज गेस्ट डाइनिंग' : 'BHOJ GUEST DINING',
      footerSubtitle: `${storeName} (Table ${this.tableCode()})`,
      callWaiter: isHi ? 'वेटर को बुलाएं / सहायता' : 'Call Waiter / Support',
      dietary: isHi ? 'आहार और एलर्जी' : 'Dietary & Allergens',
      poweredBy: isHi ? 'BILLMEX द्वारा संचालित' : 'Powered by BILLMEX',
      
      // Menu Screen Translations
      deliverTo: isHi ? 'डिलीवरी पता' : 'DELIVER TO',
      instantKitchen: isHi ? 'फास्ट लाइन 0: त्वरित रसोई' : 'Fast Line 0: Instant Kitchen',
      delivery: isHi ? 'डिलीवरी' : 'Delivery',
      takeaway: isHi ? 'टेकअवे' : 'Takeaway',
      kitchenLoad: isHi ? 'किचन लोड' : 'KITCHEN LOAD',
      speedCycle: isHi ? '82% स्पीड साइकिल' : '82% Speed Cycle',
      allItems: isHi ? 'सभी व्यंजन' : 'All Items',
      chefRecommended: isHi ? 'शेफ की पसंद' : 'Chef Recommended',
      todaysSpecial: isHi ? 'आज का स्पेशल' : "Today's Special",
      searchPlaceholder: isHi ? 'व्यंजन खोजें (उदा. रायता, दाल, पनीर)...' : 'Search dishes (e.g. rayta, dal, paneer)...',
      noDishesFound: isHi ? 'आपकी खोज से मेल खाता कोई व्यंजन नहीं मिला' : 'No dishes match your search query',
      clearSearch: isHi ? 'सर्च हटाएं' : 'Clear search',
      searchMatches: isHi ? 'परिणाम' : 'dishes found',
      add: isHi ? 'जोड़ें +' : 'ADD +',
      customize: isHi ? 'कस्टमाइज़' : 'Customize',
      viewCart: isHi ? 'कार्ट देखें' : 'View Cart',
      freeExpress: isHi ? 'मुफ्त एक्सप्रेस प्रेषण' : 'Free express dispatch',
      exploreTab: isHi ? 'एक्सप्लोर' : 'Explore',
      menuTab: isHi ? 'मेनू' : 'Menu',
      ordersTab: isHi ? 'ऑर्डर' : 'Orders',
      profileTab: isHi ? 'प्रोफाइल' : 'Profile'
    };
  });

  ngOnInit(): void {
    void this.loadInitialData();
  }

  ngOnDestroy(): void {}

  clearSearch(): void {
    this.searchQuery.set('');
  }

  toggleMenuSearch(): void {
    const showSearch = !this.isMenuSearchVisible();
    this.isMenuSearchVisible.set(showSearch);
    if (showSearch && typeof document !== 'undefined') {
      setTimeout(() => document.getElementById('menuSearchInput')?.focus());
    } else {
      this.clearSearch();
    }
  }

  // User Profile Preferences & Rewards
  isPureVeg = signal<boolean>(true);
  isJainFriendly = signal<boolean>(false);
  spiceTolerance = signal<'Mild' | 'Medium' | 'Spicy'>('Medium');
  bhojCoins = signal<number>(420);

  // View Switcher
  setView(view: AppView): void {
    if (view !== 'login' && !this.customer()) {
      this.showToast('⚠️ Please verify OTP with your mobile number first.');
      this.activeView.set('login');
      return;
    }
    this.activeView.set(view);
    if (view === 'explore' || view === 'menu' || view === 'orders' || view === 'profile') {
      this.activeNavTab.set(view);
    }
    void this.loadViewData(view);
  }

  setNavTab(tab: 'explore' | 'menu' | 'orders' | 'profile'): void {
    if (!this.customer()) {
      this.showToast('⚠️ Please verify OTP with your mobile number first.');
      this.activeView.set('login');
      return;
    }
    if (tab !== 'menu') {
      this.isMenuSearchVisible.set(false);
      this.clearSearch();
    }
    this.activeNavTab.set(tab);
    this.activeView.set(tab);
    void this.loadViewData(tab);
  }

  signOut(): void {
    this.otpService.logout();
    this.customer.set(null);
    this.passcode.set(['', '', '', '', '', '']);
    this.activeView.set('login');
    this.showToast('Signed out successfully. Please sign in with OTP.');
  }

  setOrderType(type: OrderType): void {
    this.orderType.set(type);
    this.showToast(type === 'delivery' ? '🛵 Switched to Delivery Mode' : '🛍 Switched to Takeaway Mode');
  }

  isDraggingNav = false;
  navStartX = 0;
  navScrollLeft = 0;
  hasNavMoved = false;

  setCategory(cat: string, event?: Event): void {
    if (this.hasNavMoved) {
      this.hasNavMoved = false;
      return;
    }
    this.activeCategory.set(cat);
    if (event?.currentTarget) {
      const target = event.currentTarget as HTMLElement;
      target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  scrollCategoryNav(offset: number): void {
    const nav = document.getElementById('category-nav-bar');
    if (nav) {
      nav.scrollBy({ left: offset, behavior: 'smooth' });
    }
  }

  onNavWheel(e: WheelEvent): void {
    const nav = document.getElementById('category-nav-bar');
    if (nav) {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      nav.scrollLeft += delta;
    }
  }

  onNavMouseDown(e: MouseEvent, nav: HTMLElement): void {
    this.isDraggingNav = true;
    this.hasNavMoved = false;
    this.navStartX = e.pageX - nav.offsetLeft;
    this.navScrollLeft = nav.scrollLeft;
  }

  onNavMouseMove(e: MouseEvent, nav: HTMLElement): void {
    if (!this.isDraggingNav) return;
    const x = e.pageX - nav.offsetLeft;
    const walk = (x - this.navStartX) * 1.5;
    if (Math.abs(walk) > 4) {
      this.hasNavMoved = true;
    }
    nav.scrollLeft = this.navScrollLeft - walk;
  }

  onNavMouseUp(): void {
    this.isDraggingNav = false;
  }

  getActiveCategoryName(): string {
    const active = this.activeCategory();
    const found = this.categories().find((c) => c.id === active);
    return found ? found.name : active;
  }

  getItemQuantity(itemId: string): number {
    const quantities = this.cartQuantities();
    if (quantities[itemId] !== undefined) return quantities[itemId];
    const ci = this.cartItems().find(
      (c) => c.item.id === itemId || c.item.itemBeanId === itemId || c.item.itemMasterId === itemId
    );
    return ci ? ci.quantity : 0;
  }

  updateItemQuantity(item: MenuItem, delta: number): void {
    const quantities = { ...this.cartQuantities() };
    let matchedKey = item.id;
    if (quantities[matchedKey] === undefined) {
      const clean = (s: string) => s.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
      const cleanTarget = clean(item.name);
      for (const k of Object.keys(quantities)) {
        if (clean(k) === cleanTarget || cleanTarget.includes(clean(k))) {
          matchedKey = k;
          break;
        }
      }
    }

    const current = quantities[matchedKey] || 0;
    const next = current + delta;
    if (next <= 0) {
      delete quantities[matchedKey];
      delete quantities[item.id];
      this.itemCustomizations.update((customizations) => {
        const updated = { ...customizations };
        delete updated[item.id];
        return updated;
      });
      this.showToast(`Removed ${item.name} from cart`);
    } else {
      delete quantities[matchedKey];
      quantities[item.id] = next;
    }
    this.cartQuantities.set(quantities);
  }

  addToCart(itemOrId: MenuItem | string): void {
    let item: MenuItem | undefined;
    if (typeof itemOrId === 'string') {
      item = this.menuItems().find((i) => i.id === itemOrId) || getMockMenuItems().find((i) => i.id === itemOrId);
    } else {
      item = itemOrId;
    }
    if (item) {
      this.updateItemQuantity(item, 1);
      this.showToast(`Added ${item.name} to cart`);
    }
  }

  async likeItem(item: MenuItem): Promise<void> {
    try {
      const result = await this.api.likeMasterBean(item.id);
      this.menuItems.update((items) =>
        items.map((candidate) => candidate.id === item.id ? { ...candidate, likes: result.likes } : candidate),
      );
    } catch (error) {
      this.reportApiError(error);
    }
  }

  incrementQuantity(item: MenuItem): void {
    this.updateItemQuantity(item, 1);
  }

  decrementQuantity(item: MenuItem): void {
    this.updateItemQuantity(item, -1);
  }

  clearCart(): void {
    this.cartQuantities.set({});
    this.itemCustomizations.set({});
    this.showToast('Cart cleared');
  }

  openCustomize(item: MenuItem): void {
    const customization = this.itemCustomizations()[item.id];
    this.selectedCustomizeItem.set(item);
    this.customizeSpice.set(customization?.spiceLevel ?? 'Normal');
    this.customizeRemark.set(customization?.remark ?? '');
    this.showCustomizeModal.set(true);
  }

  closeCustomize(): void {
    this.showCustomizeModal.set(false);
    this.selectedCustomizeItem.set(null);
  }

  saveCustomization(): void {
    const item = this.selectedCustomizeItem();
    if (item) {
      this.itemCustomizations.update((customizations) => ({
        ...customizations,
        [item.id]: {
          spiceLevel: this.customizeSpice(),
          remark: this.customizeRemark().trim()
        }
      }));
      this.addToCart(item);
      this.closeCustomize();
    }
  }

  openCart(): void {
    this.activeView.set('checkout');
  }

  closeCart(): void {
    this.showCartDrawer.set(false);
  }

  setPaymentMethod(method: PaymentMethod): void {
    this.paymentMethod.set(method);
    this.showToast(method === 'upi' ? '⚡ Online UPI / Cards Selected (Zero Surcharge)' : '💵 Cash on Fleet Arrival (COD) Selected');
  }

  toggleModifyAddress(): void {
    this.isModifyingAddress.update((prev) => !prev);
  }

  updateAddress(newAddress: string): void {
    if (newAddress.trim()) {
      this.deliveryTerminal.set(newAddress.trim());
      this.isModifyingAddress.set(false);
      this.showToast('📍 Delivery Hub Terminal updated!');
    }
  }

  async confirmPayment(): Promise<void> {
    if (this.apiLoading()) return;
    const items = this.cartItems().map((ci) => {
      const customization = this.itemCustomizations()[ci.item.id];
      return {
        itemId: ci.item.id,
        quantity: ci.quantity,
        ...(customization ? customization : {})
      };
    });
    const orderRemark = this.cartItems()
      .flatMap((ci) => {
        const customization = this.itemCustomizations()[ci.item.id];
        if (!customization) return [];
        const details = [
          `${customization.spiceLevel} spice`,
          customization.remark
        ].filter(Boolean);
        return details.length ? [`${ci.item.name}: ${details.join(', ')}`] : [];
      })
      .join('; ');
    if (items.length === 0) {
      this.showToast('⚠️ Please add at least 1 item to cart.');
      return;
    }
    const customerId = this.customer()?.customerId ?? 'customer-1';
    this.apiLoading.set(true);
    this.apiError.set(null);

    try {
      const order = await this.api.placeOrder({
        customerId,
        items,
        paymentMethod: this.paymentMethod(),
        orderType: this.orderType(),
        couponCode: this.isCouponApplied() ? this.couponCode() : '',
        tableCode: this.tableCode(),
        deliveryAddress: this.deliveryTerminal(),
        orderRemark,
      });

      if (this.paymentMethod() === 'upi') {
        const transaction = await this.api.initiateOrderTransaction(order.total, order.id);
        await this.api.updateTransactionStatus(transaction.transactionId);
      }

      const finalTotal = order.total || this.grandTotal();
      this.lastPlacedOrderTotal.set(finalTotal);
      this.currentOrder.set(await this.api.getOrderById(order.id));
      await this.refreshOrders();
      await this.refreshNotifications();
      this.orderPlacedSuccess.set(true);
      this.cartQuantities.set({});
      this.itemCustomizations.set({});

      const isLive = !order.id.startsWith('BH-');
      this.showToast(isLive ? `🎉 Order #${order.id.slice(-6).toUpperCase()} placed with kitchen!` : `Order #${order.id} confirmed!`);
    } catch (error) {
      this.reportApiError(error);
    } finally {
      this.apiLoading.set(false);
    }
  }

  closeOrderSuccess(): void {
    this.orderPlacedSuccess.set(false);
    this.activeNavTab.set('orders');
    this.activeView.set('orders');
    void this.loadViewData('orders');
  }

  getOrderItemName(itemId: string): string {
    const item = this.menuItems().find((candidate) => candidate.id === itemId || candidate.itemBeanId === itemId || candidate.itemMasterId === itemId);
    return item?.name ?? 'Dish item';
  }

  getOrderItemPrice(itemId: string): number {
    const item = this.menuItems().find((candidate) => candidate.id === itemId || candidate.itemBeanId === itemId || candidate.itemMasterId === itemId);
    return item?.price ?? 0;
  }

  placeOrder(): void {
    this.activeView.set('checkout');
  }

  toggleLanguage(): void {
    this.currentLang.set(this.currentLang() === 'EN' ? 'HI' : 'EN');
  }

  toggleTorch(): void {
    this.isTorchOn.update((prev) => !prev);
    this.showToast(this.isTorchOn() ? '⚡ Torch turned ON' : 'Torch turned OFF');
  }

  triggerUpload(): void {
    this.showToast('📷 QR Image simulated: Validated Table M-04');
    this.isTableDetected.set(true);
  }

  toggleManualCode(): void {
    this.manualCodeMode.update((prev) => !prev);
  }

  setManualTable(code: string): void {
    if (code.trim()) {
      this.tableCode.set(code.trim().toUpperCase());
      this.manualCodeMode.set(false);
      this.showToast(`Table updated to ${this.tableCode()}`);
    }
  }

  onPhoneChange(val: string): void {
    const cleaned = (val || '').replace(/\D/g, '').slice(0, 10);
    this.phoneNumber.set(cleaned);
    if (this.otpService.otpSent() && cleaned !== this.otpService.lastPhone()) {
      this.otpService.resetOtpState();
      this.passcode.set(['', '', '', '', '', '']);
    }
  }

  clearOtp(): void {
    this.passcode.set(['', '', '', '', '', '']);
    if (typeof document !== 'undefined') {
      const firstInput = document.getElementById('otp-input-0') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
        firstInput.select();
      }
    }
  }

  async sendOtp(channel: 'sms' | 'whatsapp' = 'sms'): Promise<void> {
    const phone = this.phoneNumber().trim();
    const phoneCheck = this.otpService.validatePhoneNumber(phone);
    if (!phoneCheck.valid) {
      this.showToast(`⚠️ ${phoneCheck.error}`);
      return;
    }
    const name = this.userName().trim() || 'Guest Diner';
    this.apiError.set(null);
    try {
      const res = await this.otpService.sendOtp(phoneCheck.cleaned, name, channel);
      this.showToast(`✅ ${res.message}`);
      if (typeof document !== 'undefined') {
        setTimeout(() => {
          const firstInput = document.getElementById('otp-input-0') as HTMLInputElement;
          if (firstInput) {
            firstInput.focus();
            firstInput.select();
          }
        }, 150);
      }
    } catch (err: any) {
      this.reportApiError(err);
    }
  }

  async resendOtp(): Promise<void> {
    if (!this.canResendOtp()) {
      if (this.resendSeconds() > 0) {
        this.showToast(`⏳ Please wait ${this.resendSeconds()}s before resending.`);
      }
      return;
    }
    const phone = this.phoneNumber().trim();
    const name = this.userName().trim() || 'Guest Diner';
    try {
      const res = await this.otpService.resendOtp(phone, name, this.otpService.lastChannel());
      this.showToast(`✅ ${res.message}`);
    } catch (err: any) {
      this.reportApiError(err);
    }
  }

  async sendWhatsAppOtp(): Promise<void> {
    await this.sendOtp('whatsapp');
  }

  handleDigitInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const rawVal = input.value || '';
    const digitsOnly = rawVal.replace(/\D/g, '');

    // Support paste or multiple characters typed
    if (digitsOnly.length > 1) {
      this.distributeOtpDigits(digitsOnly, index);
      return;
    }

    const digit = digitsOnly.slice(-1);
    const current = [...this.passcode()];
    current[index] = digit;
    this.passcode.set(current);
    input.value = digit;

    if (digit && index < 5 && typeof document !== 'undefined') {
      const nextInput = document.getElementById(`otp-input-${index + 1}`) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  }

  handlePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') || '';
    const digits = pasted.replace(/\D/g, '').slice(0, 6);
    if (digits) {
      this.distributeOtpDigits(digits, 0);
    }
  }

  private distributeOtpDigits(digitsStr: string, startIndex: number = 0): void {
    const digits = digitsStr.split('');
    const current = [...this.passcode()];
    for (let i = 0; i < digits.length && (startIndex + i) < 6; i++) {
      current[startIndex + i] = digits[i];
    }
    this.passcode.set(current);

    if (typeof document !== 'undefined') {
      const targetIdx = Math.min(startIndex + digits.length, 5);
      const targetInput = document.getElementById(`otp-input-${targetIdx}`) as HTMLInputElement;
      if (targetInput) {
        targetInput.focus();
        targetInput.select();
      }
    }
  }

  handleDigitKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace') {
      const current = [...this.passcode()];
      if (current[index]) {
        current[index] = '';
        this.passcode.set(current);
      } else if (index > 0 && typeof document !== 'undefined') {
        current[index - 1] = '';
        this.passcode.set(current);
        const prevInput = document.getElementById(`otp-input-${index - 1}`) as HTMLInputElement;
        if (prevInput) {
          prevInput.focus();
          prevInput.select();
        }
      }
    } else if (event.key === 'ArrowLeft' && index > 0 && typeof document !== 'undefined') {
      const prevInput = document.getElementById(`otp-input-${index - 1}`) as HTMLInputElement;
      if (prevInput) prevInput.focus();
    } else if (event.key === 'ArrowRight' && index < 5 && typeof document !== 'undefined') {
      const nextInput = document.getElementById(`otp-input-${index + 1}`) as HTMLInputElement;
      if (nextInput) nextInput.focus();
    } else if (event.key === 'Enter') {
      const otpCode = this.passcode().join('').trim();
      if (otpCode.length === 6) {
        void this.confirmAndOpenMenu();
      }
    }
  }

  async confirmAndOpenMenu(): Promise<void> {
    if (this.apiLoading() || this.otpService.isVerifying()) return;
    const phone = this.phoneNumber().trim();
    const phoneCheck = this.otpService.validatePhoneNumber(phone);
    if (!phoneCheck.valid) {
      this.showToast(`⚠️ ${phoneCheck.error}`);
      return;
    }
    const otpCode = this.passcode().join('').trim();
    if (!otpCode || otpCode.length !== 6) {
      this.showToast('⚠️ Please enter the complete 6-digit OTP code.');
      return;
    }
    this.apiLoading.set(true);
    this.apiError.set(null);
    try {
      const customer = await this.otpService.verifyOtp(
        otpCode,
        phoneCheck.cleaned,
        this.userName().trim() || 'Customer',
      );
      this.customer.set(customer);
      if (customer.name) this.userName.set(customer.name);
      try {
        await this.api.getCustomerInfoById(customer.customerId);
        await this.api.registerPushToken(customer.customerId, `fcm-token-${Date.now()}`);
      } catch (e) {
        console.warn('Customer info / token registration sync:', e);
      }
      this.isLiveConnected.set(true);
      this.showSuccessModal.set(false);
      this.activeView.set('menu');
      this.activeNavTab.set('menu');
      this.showToast(`✅ Welcome, ${customer.name}! Session verified.`);
    } catch (error) {
      this.reportApiError(error);
    } finally {
      this.apiLoading.set(false);
    }
  }

  callWaiter(): void {
    this.showWaiterModal.set(true);
  }

  openDietary(): void {
    this.showDietaryModal.set(true);
  }

  showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set(null);
      }
    }, 3000);
  }

  private async loadInitialData(): Promise<void> {
    try {
      let posId: string = BILLMEX_LIVE_CONFIG.defaultPosId;
      if (typeof window !== 'undefined' && window.location) {
        const params = new URLSearchParams(window.location.search);
        posId = params.get('posId') || BILLMEX_LIVE_CONFIG.defaultPosId;
        const queryTable = params.get('table') || params.get('tableCode') || params.get('tableNo');
        if (queryTable) {
          this.tableCode.set(queryTable);
        }
      }
      const posData = await this.api.getPosData(posId);
      if (posData?.name) {
        this.tableName.set(posData.name);
      }
      const storedCustomer = this.otpService.activeCustomer();
      if (storedCustomer) {
        this.customer.set(storedCustomer);
        if (storedCustomer.name) this.userName.set(storedCustomer.name);
        if (storedCustomer.phone) this.phoneNumber.set(storedCustomer.phone);
      }
      this.isLiveConnected.set(this.api.isLiveConnected);
      await this.loadMenu();
      this.isLiveConnected.set(this.api.isLiveConnected);
      await this.refreshOrders();
      await this.refreshNotifications();
    } catch (error) {
      this.reportApiError(error);
    }
  }

  private async loadViewData(view: AppView): Promise<void> {
    try {
      if (view === 'menu' || view === 'explore') await this.loadMenu();
      if (view === 'orders') {
        await this.refreshOrders();
        const latestOrder = this.orders()[0];
        this.currentOrder.set(latestOrder ? await this.api.getOrderById(latestOrder.id) : null);
      }
      if (view === 'profile') {
        await this.refreshNotifications();
      }
    } catch (error) {
      this.reportApiError(error);
    }
  }

  private async loadMenu(): Promise<void> {
    this.menuItems.set(await this.api.getItemMaster());
  }

  private async refreshOrders(): Promise<void> {
    this.orders.set(await this.api.getOrderHistory(this.customer()?.customerId ?? 'customer-1'));
  }

  private async refreshNotifications(): Promise<void> {
    this.notifications.set(await this.api.getNotifications());
  }

  private reportApiError(error: unknown): void {
    const message = error instanceof Error ? error.message : 'API request failed.';
    this.apiError.set(message);
    this.showToast(message);
  }

  constructor(
    private readonly api: BillmexMockApi,
    readonly otpService: OtpService
  ) {}
}
