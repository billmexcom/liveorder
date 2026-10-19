import { Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type Language = 'EN' | 'HI';
type AppView = 'login' | 'menu' | 'checkout' | 'orders' | 'explore' | 'profile';
type OrderType = 'delivery' | 'takeaway';
type Category = 'all' | 'chef' | 'specials';
type PaymentMethod = 'upi' | 'cod';

export interface MenuItem {
  id: string;
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
  category: ('all' | 'chef' | 'specials')[];
  isVeg: boolean;
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
  customization?: string;
}

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
  activeCategory = signal<Category>('all');

  // Diner Details State (carried across screens)
  userName = signal<string>('Vishnu');
  phoneNumber = signal<string>('9669660675');
  tableCode = signal<string>('M-04');
  tableName = signal<string>('Grand Bay Bistro');
  deliveryAddress = signal<string>('Cyber City, Sec 4');
  
  // Passcode 4 digits for Login screen
  passcode = signal<string[]>(['4', '8', '2', '9']);
  isAutoFilled = signal<boolean>(true);

  // Scanner States
  isTorchOn = signal<boolean>(false);
  isScanning = signal<boolean>(true);
  isTableDetected = signal<boolean>(true);
  manualCodeMode = signal<boolean>(false);

  // Resend Countdown Timer
  resendSeconds = signal<number>(42);
  private timerInterval: any = null;

  // Modals & Feedback
  toastMessage = signal<string | null>(null);
  showSuccessModal = signal<boolean>(false);
  showWaiterModal = signal<boolean>(false);
  showDietaryModal = signal<boolean>(false);
  showCartDrawer = signal<boolean>(false);
  showCustomizeModal = signal<boolean>(false);
  selectedCustomizeItem = signal<MenuItem | null>(null);

  // Menu Items Database
  menuItems = signal<MenuItem[]>([
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
      category: ['all', 'chef', 'specials'],
      isVeg: true
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
      category: ['all'],
      isVeg: true
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
      category: ['all', 'chef'],
      isVeg: true
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
      category: ['all'],
      isVeg: true
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
      category: ['all', 'chef', 'specials'],
      isVeg: true
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
      category: ['all', 'specials'],
      isVeg: true
    }
  ]);

  // Cart Quantities Map: itemId -> quantity (Default matching screenshot: 1 Chach Rayta + 1 Masala Chach)
  cartQuantities = signal<Record<string, number>>({
    'chach-rayta': 1,
    'masala-chach': 1
  });

  // Checkout & Settlement States
  paymentMethod = signal<PaymentMethod>('upi');
  couponCode = signal<string>('NOCTURNE-10');
  discountAmount = signal<number>(10);
  isCouponApplied = signal<boolean>(true);
  isModifyingAddress = signal<boolean>(false);
  deliveryTerminal = signal<string>('Plot 42, Nanda Nagar, Sector 4, Indore, MP - 452011');
  invoiceEmail = signal<string>('9669660675@bhoj.com');
  orderPlacedSuccess = signal<boolean>(false);

  // Menu Search Query
  searchQuery = signal<string>('');

  // Filtered Menu Items
  filteredItems = computed(() => {
    const cat = this.activeCategory();
    const query = this.searchQuery().trim().toLowerCase();

    return this.menuItems().filter((item) => {
      const matchesCategory = cat === 'all' || item.category.includes(cat);
      if (!matchesCategory) return false;

      if (!query) return true;
      const matchName = item.name.toLowerCase().includes(query);
      const matchNameHi = item.nameHi.toLowerCase().includes(query);
      const matchDesc = item.description.toLowerCase().includes(query);
      const matchDescHi = item.descriptionHi.toLowerCase().includes(query);
      return matchName || matchNameHi || matchDesc || matchDescHi;
    });
  });

  // Total Cart Items Count
  totalCartCount = computed(() => {
    const quantities = this.cartQuantities();
    return Object.values(quantities).reduce((acc, qty) => acc + qty, 0);
  });

  // Total Cart Price (Subtotal)
  totalCartPrice = computed(() => {
    const quantities = this.cartQuantities();
    let total = 0;
    for (const item of this.menuItems()) {
      const qty = quantities[item.id] || 0;
      total += item.price * qty;
    }
    return total;
  });

  // Grand Total after discount
  grandTotal = computed(() => {
    const subtotal = this.totalCartPrice();
    const discount = this.isCouponApplied() ? this.discountAmount() : 0;
    return Math.max(0, subtotal - discount);
  });

  // Formatted countdown for Login Screen
  formattedTimer = computed(() => {
    const s = this.resendSeconds();
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}s`;
  });

  // Translation Dictionaries
  t = computed(() => {
    const isHi = this.currentLang() === 'HI';
    return {
      brand: 'BHOJ × BILLMEX',
      outletInfo: isHi ? 'ग्रैंड बे बिस्ट्रो • टेबल QR' : 'Grand Bay Bistro • Table QR',
      langToggle: isHi ? 'EN / हिन्दी' : 'EN / हिन्दी',
      tag: isHi ? 'डाइन-इन डिजिटल ऑर्डरिंग' : 'DINE-IN DIGITAL ORDERING',
      heading: isHi ? 'ऑर्डर करने के लिए टेबल QR स्कैन करें' : 'Scan Table QR to Order',
      subheading: isHi 
        ? 'अपनी टेबल पर रखे स्टैंडी पर लगे QR कोड पर कैमरा ले जाएं' 
        : 'Point your camera at the QR standee on your table',
      detected: isHi 
        ? `टेबल #${this.tableCode()} पहचानी गई • ${this.tableName()}` 
        : `Table #${this.tableCode()} Detected • ${this.tableName()}`,
      torch: isHi ? 'टॉर्च' : 'Torch',
      uploadQr: isHi ? 'QR अपलोड' : 'Upload QR',
      enterCode: isHi ? 'कोड दर्ज करें:' : 'Enter Code:',
      sectionTitle: isHi ? 'डाइनर विवरण और तत्काल सत्यापन' : 'DINER DETAILS & INSTANT VERIFICATION',
      tableBadge: `Table ${this.tableCode()}`,
      nameLabel: isHi ? 'आपका नाम / उपनाम' : 'Your Name / Nickname',
      mobileLabel: isHi ? 'मोबाइल नंबर (ऑर्डर बिल और ट्रैकिंग के लिए)' : 'Mobile Number (for order bill & tracking)',
      otpSent: isHi ? 'OTP भेजा गया' : 'OTP Sent',
      passcodeLabel: isHi ? '4-अंकों का पासकोड दर्ज करें' : 'Enter 4-Digit Passcode',
      autoFilled: isHi ? 'ऑटो-भरा गया' : 'Auto-Filled',
      resendIn: isHi ? 'पुनः भेजें' : 'Resend in',
      whatsappOtp: isHi ? 'WhatsApp OTP से भेजें' : 'Send via WhatsApp OTP',
      confirmBtn: isHi ? 'टेबल कन्फर्म करें और डिजिटल मेनू देखें' : 'Confirm Table & View Digital Menu',
      guestCheckout: isHi ? 'त्वरित अतिथि चेकआउट (साइन-इन छोड़ें)' : 'Quick Guest Checkout (Skip Sign-in)',
      perk1: isHi ? 'कोई वेटर देरी नहीं • तत्काल ऑर्डरिंग' : 'Zero Waiter Delay • Instant Ordering',
      perk2: isHi ? 'डायरेक्ट किचन डिस्पैच' : 'Direct Kitchen Dispatch',
      footerTitle: isHi ? 'भोज गेस्ट डाइनिंग' : 'BHOJ GUEST DINING',
      footerSubtitle: isHi 
        ? `${this.tableName()} (टेबल ${this.tableCode()})` 
        : `${this.tableName()} & Cafe (Table ${this.tableCode()})`,
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
    this.startTimer();
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  // User Profile Preferences & Rewards
  isPureVeg = signal<boolean>(true);
  isJainFriendly = signal<boolean>(false);
  spiceTolerance = signal<'Mild' | 'Medium' | 'Spicy'>('Medium');
  bhojCoins = signal<number>(420);

  // View Switcher
  setView(view: AppView): void {
    this.activeView.set(view);
    if (view === 'explore' || view === 'menu' || view === 'orders' || view === 'profile') {
      this.activeNavTab.set(view);
    }
  }

  setNavTab(tab: 'explore' | 'menu' | 'orders' | 'profile'): void {
    this.activeNavTab.set(tab);
    this.activeView.set(tab);
  }

  signOut(): void {
    this.activeView.set('login');
    this.showToast('Session ended. Please scan Table QR.');
  }

  setOrderType(type: OrderType): void {
    this.orderType.set(type);
    this.showToast(type === 'delivery' ? '🛵 Switched to Delivery Mode' : '🛍 Switched to Takeaway Mode');
  }

  setCategory(cat: Category): void {
    this.activeCategory.set(cat);
  }

  getItemQuantity(itemId: string): number {
    return this.cartQuantities()[itemId] || 0;
  }

  addToCart(item: MenuItem): void {
    const quantities = { ...this.cartQuantities() };
    quantities[item.id] = (quantities[item.id] || 0) + 1;
    this.cartQuantities.set(quantities);
    this.showToast(`Added ${item.name} to cart`);
  }

  incrementQuantity(item: MenuItem): void {
    const quantities = { ...this.cartQuantities() };
    quantities[item.id] = (quantities[item.id] || 0) + 1;
    this.cartQuantities.set(quantities);
  }

  decrementQuantity(item: MenuItem): void {
    const quantities = { ...this.cartQuantities() };
    const current = quantities[item.id] || 0;
    if (current > 1) {
      quantities[item.id] = current - 1;
    } else {
      delete quantities[item.id];
    }
    this.cartQuantities.set(quantities);
  }

  openCustomize(item: MenuItem): void {
    this.selectedCustomizeItem.set(item);
    this.showCustomizeModal.set(true);
  }

  closeCustomize(): void {
    this.showCustomizeModal.set(false);
    this.selectedCustomizeItem.set(null);
  }

  saveCustomization(): void {
    const item = this.selectedCustomizeItem();
    if (item) {
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

  confirmPayment(): void {
    this.orderPlacedSuccess.set(true);
    this.showToast('🎉 Settlement Authorized! Live Telemetry Active.');
  }

  closeOrderSuccess(): void {
    this.orderPlacedSuccess.set(false);
    this.activeNavTab.set('orders');
    this.activeView.set('orders');
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

  startTimer(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.resendSeconds.update((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
  }

  resendOtp(): void {
    if (this.resendSeconds() === 0) {
      this.resendSeconds.set(45);
      this.startTimer();
      this.showToast('📩 New 4-digit OTP dispatched to +91 ' + this.phoneNumber());
    }
  }

  sendWhatsAppOtp(): void {
    this.showToast('💬 OTP sent to your WhatsApp number!');
  }

  handleDigitInput(event: any, index: number): void {
    const input = event.target as HTMLInputElement;
    const val = input.value.slice(-1);
    
    const current = [...this.passcode()];
    current[index] = val;
    this.passcode.set(current);
    this.isAutoFilled.set(false);

    if (val && index < 3) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`) as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }
  }

  handleDigitKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace') {
      const current = [...this.passcode()];
      if (!current[index] && index > 0) {
        const prevInput = document.getElementById(`otp-input-${index - 1}`) as HTMLInputElement;
        if (prevInput) {
          prevInput.focus();
          const prevArray = [...this.passcode()];
          prevArray[index - 1] = '';
          this.passcode.set(prevArray);
        }
      } else {
        current[index] = '';
        this.passcode.set(current);
      }
    }
  }

  confirmAndOpenMenu(): void {
    this.showSuccessModal.set(false);
    this.activeView.set('menu');
    this.showToast('✨ Welcome to Grand Bay Bistro Digital Menu!');
  }

  guestCheckout(): void {
    this.activeView.set('menu');
    this.showToast('🚀 Proceeding as Guest on Table ' + this.tableCode());
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
}
