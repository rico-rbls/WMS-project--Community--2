import { describe, it, expect, beforeEach } from 'vitest'
import {
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  getShipments,
  createShipment,
  updateShipment,
  deleteShipment,
} from '../services/api'

beforeEach(() => {
  localStorage.clear()
})

describe('Inventory API', () => {
  it('creates, updates, deletes inventory item', async () => {
    const created = await createInventoryItem({
      name: 'Widget',
      category: 'Electronics',
      quantity: 10,
      location: 'A-1',
      brand: 'Acme',
      pricePerPiece: 5,
      supplierId: 'SUP-001',
      quantityPurchased: 20,
      quantitySold: 10,
      reorderRequired: false,
    })
    let list = await getInventory()
    expect(list.find(i => i.id === created.id)).toBeTruthy()

    const updated = await updateInventoryItem({ id: created.id, quantity: 15 })
    list = await getInventory()
    expect(list.find(i => i.id === created.id)?.quantity).toBe(15)

    await deleteInventoryItem(created.id)
    list = await getInventory()
    expect(list.find(i => i.id === created.id)).toBeFalsy()
  })
})

describe('Suppliers API', () => {
  it('creates and updates supplier', async () => {
    const s = await createSupplier({ name: 'SupplierCo', contact: 'John', email: 'j@s.co', phone: '123', category: 'Electronics' })
    let list = await getSuppliers()
    expect(list.find(x => x.id === s.id)).toBeTruthy()
    await updateSupplier({ id: s.id, status: 'Inactive' })
    list = await getSuppliers()
    expect(list.find(x => x.id === s.id)?.status).toBe('Inactive')
    await deleteSupplier(s.id)
    list = await getSuppliers()
    expect(list.find(x => x.id === s.id)).toBeFalsy()
  })
})

describe('Orders API', () => {
  it('creates and updates order', async () => {
    const o = await createOrder({ customer: 'Alice', items: 2, total: '100.00', status: 'Pending', date: '2025-10-15' })
    let list = await getOrders()
    expect(list.find(x => x.id === o.id)).toBeTruthy()
    await updateOrder({ id: o.id, status: 'Processing' })
    list = await getOrders()
    expect(list.find(x => x.id === o.id)?.status).toBe('Processing')
    await deleteOrder(o.id)
    list = await getOrders()
    expect(list.find(x => x.id === o.id)).toBeFalsy()
  })
})

describe('Shipments API', () => {
  it('creates and updates shipment', async () => {
    const s = await createShipment({ orderId: 'ORD-1', destination: 'City', carrier: 'UPS', status: 'Pending', eta: '2025-10-20' })
    let list = await getShipments()
    expect(list.find(x => x.id === s.id)).toBeTruthy()
    await updateShipment({ id: s.id, status: 'In Transit' })
    list = await getShipments()
    expect(list.find(x => x.id === s.id)?.status).toBe('In Transit')
    await deleteShipment(s.id)
    list = await getShipments()
    expect(list.find(x => x.id === s.id)).toBeFalsy()
  })
})
