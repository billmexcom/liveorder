import { BillmexMockApi, BILLMEX_API_ROUTES } from './billmex-api';

describe('BillmexMockApi', () => {
  let api: BillmexMockApi;

  beforeEach(() => {
    api = new BillmexMockApi();
    api.reset();
  });

  it('documents the discovered Billmex route contract', () => {
    expect(BILLMEX_API_ROUTES.customerRegistration).toBe('/bhojmain/app/customer/simreg/');
    expect(BILLMEX_API_ROUTES.placeOrder).toBe('/bhoj/order/placeOrder');
    expect(BILLMEX_API_ROUTES.orderHistory).toContain('customerId={customerId}');
    expect(BILLMEX_API_ROUTES.notifications).toBe('/bhojmain/custnotification?page={page}');
  });

  it('returns a defensive menu copy and mock POS configuration', async () => {
    const menu = await api.getItemMaster();
    menu[0].name = 'Changed only in caller';

    expect((await api.getItemMaster())[0].name).toBe('Chach Rayta');
    await expect(api.getPosData('POS-DEMO')).resolves.toEqual({
      posId: 'POS-DEMO',
      name: 'Grand Bay Bistro',
      publicUrl: 'mock://pos/',
    });
  });

  it('validates customer registration and OTP verification', async () => {
    await expect(api.customerSimreg('9669660675', 'Vishnu')).resolves.toEqual({ sent: true });
    await expect(api.customerVotp('9669660675', '4829', 'Vishnu')).resolves.toMatchObject({
      customerId: 'customer-1',
      name: 'Vishnu',
    });
    await expect(api.customerVotp('9669660675', '0000', 'Vishnu')).rejects.toThrow('Demo OTP is 4829.');
    await expect(api.resendOtp('123')).rejects.toThrow('valid 10-digit phone');
  });

  it('previews a bill, transitions payment, creates an order and returns its history', async () => {
    const items = [
      { itemId: 'chach-rayta', quantity: 1 },
      { itemId: 'masala-chach', quantity: 1 },
    ];
    await expect(api.previewBill(items, 'NOCTURNE-10')).resolves.toEqual({
      subtotal: 70,
      discount: 10,
      total: 60,
    });
    await expect(api.previewBill([], '')).rejects.toThrow('Add at least one item');

    const transaction = await api.initiateOrderTransaction(60);
    await expect(api.updateTransactionStatus(transaction.transactionId)).resolves.toEqual({ status: 'success' });
    await expect(api.updateTransactionStatus(transaction.transactionId)).rejects.toThrow('transaction was not found');

    const order = await api.placeOrder({
      customerId: 'customer-1',
      items,
      paymentMethod: 'upi',
      orderType: 'delivery',
      couponCode: 'NOCTURNE-10',
    });
    expect(order).toMatchObject({ id: 'BH-9921', total: 60, status: 'COOKING' });
    await expect(api.getOrderById(order.id)).resolves.toMatchObject({ id: order.id });
    await expect(api.getOrderHistory('customer-1')).resolves.toHaveLength(1);
    await expect(api.getOrderHistory('other-customer')).resolves.toHaveLength(0);
    expect(await api.getNotifications()).toHaveLength(2);
  });

  it('supports POS/customer metadata, push-token registration and likes', async () => {
    const customer = await api.customerVotp('9669660675', '4829', 'Vishnu');
    await expect(api.getCustomerInfoById(customer.customerId)).resolves.toMatchObject(customer);
    await expect(api.registerPushToken(customer.customerId, 'demo-token')).resolves.toEqual({ registered: true });
    await expect(api.likeMasterBean('chach-rayta')).resolves.toEqual({ likes: 143 });
    await expect(api.likeMasterBean('missing')).rejects.toThrow('Menu item was not found');
  });
});
