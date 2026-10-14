import { useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'inventory-plus-products'

const initialProducts = [
  { id: 1, name: 'Laptop Pro 14', category: 'Electrónica', price: 1200, cost: 850, stock: 12, sold: 5, sku: 'LP-14' },
  { id: 2, name: 'Auriculares BT', category: 'Accesorios', price: 189, cost: 90, stock: 4, sold: 2, sku: 'BT-01' },
  { id: 3, name: 'Monitor 27"', category: 'Oficina', price: 420, cost: 260, stock: 7, sold: 3, sku: 'MON-27' },
  { id: 4, name: 'Teclado mecánico', category: 'Accesorios', price: 95, cost: 45, stock: 2, sold: 1, sku: 'TEC-88' },
]

function App() {
  const [products, setProducts] = useState(() => {
    try {
      const savedProducts = localStorage.getItem(STORAGE_KEY)
      return savedProducts ? JSON.parse(savedProducts) : initialProducts
    } catch (error) {
      return initialProducts
    }
  })

  const [form, setForm] = useState({
    name: '',
    category: 'Electrónica',
    price: '',
    cost: '',
    stock: '',
    sold: '',
    sku: '',
  })

  const [editingId, setEditingId] = useState(null)

  const [shipping, setShipping] = useState({
    productPrice: '299',
    shippingType: 'metro',
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
  }, [products])

  const totals = useMemo(() => {
    const totalInventoryValue = products.reduce((sum, product) => sum + Number(product.stock ?? 0) * Number(product.cost ?? 0), 0)
    const totalUnits = products.reduce((sum, product) => sum + Number(product.stock ?? 0), 0)
    const totalSold = products.reduce((sum, product) => sum + Number(product.sold ?? 0), 0)
    const lowStock = products.filter((product) => Number(product.stock ?? 0) <= 5).length
    const earphonesRevenue = products
      .filter((product) => product.name.toLowerCase().includes('auriculares'))
      .reduce((sum, product) => sum + Number(product.sold ?? 0) * Number(product.price ?? 0), 0)

    return {
      totalProducts: products.length,
      totalUnits,
      totalSold,
      totalInventoryValue,
      lowStock,
      earphonesRevenue,
    }
  }, [products])

  const lowStockProducts = products.filter((product) => product.stock <= 5)

  const shippingSummary = useMemo(() => {
    const productPrice = Number(shipping.productPrice) || 0
    const shippingFee = shipping.shippingType === 'metro' ? 2.99 : 3.75
    const total = productPrice + shippingFee

    return {
      productPrice,
      shippingCost: shippingFee,
      total,
    }
  }, [shipping])

  const handleFieldChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleShippingChange = (event) => {
    const { name, value } = event.target
    setShipping((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!form.name || !form.price || !form.stock) {
      return
    }

    const productData = {
      id: editingId ?? Date.now(),
      name: form.name.trim(),
      category: form.category,
      price: Number(form.price),
      cost: Number(form.cost || form.price * 0.65),
      stock: Number(form.stock || 0),
      sold: Number(form.sold || 0),
      sku: form.sku.trim() || `SKU-${Date.now().toString().slice(-6)}`,
    }

    if (editingId) {
      setProducts((current) =>
        current.map((product) => (product.id === editingId ? productData : product)),
      )
    } else {
      setProducts((current) => [productData, ...current])
    }

    setForm({ name: '', category: 'Electrónica', price: '', cost: '', stock: '', sold: '', sku: '' })
    setEditingId(null)
  }

  const updateStock = (productId, delta) => {
    setProducts((current) =>
      current.map((product) =>
        product.id === productId
          ? { ...product, stock: Math.max(0, product.stock + delta) }
          : product,
      ),
    )
  }

  const removeProduct = (productId) => {
    setProducts((current) => current.filter((product) => product.id !== productId))
    if (editingId === productId) {
      setEditingId(null)
      setForm({ name: '', category: 'Electrónica', price: '', cost: '', stock: '', sold: '', sku: '' })
    }
  }

  const recordSale = (productId) => {
    setProducts((current) =>
      current.map((product) => {
        if (product.id !== productId) return product

        return {
          ...product,
          sold: Number(product.sold ?? 0) + 1,
          stock: Math.max(0, Number(product.stock ?? 0) - 1),
        }
      }),
    )
  }

  const editProduct = (product) => {
    setEditingId(product.id)
    setForm({
      name: product.name,
      category: product.category,
      price: String(product.price),
      cost: String(product.cost),
      stock: String(product.stock),
      sold: String(product.sold),
      sku: product.sku,
    })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Panel de negocio</p>
          <h1>Inventario Plus</h1>
        </div>
        <button type="button" className="primary-button">
          Exportar resumen
        </button>
      </header>

      <main className="dashboard">
        <section className="summary-grid">
          <article className="summary-card accent">
            <span>Total de productos</span>
            <strong>{totals.totalProducts}</strong>
            <small>Activos en catálogo</small>
          </article>
          <article className="summary-card">
            <span>En existencia</span>
            <strong>{totals.totalUnits}</strong>
            <small>Unidades disponibles</small>
          </article>
          <article className="summary-card">
            <span>Vendidos</span>
            <strong>{totals.totalSold}</strong>
            <small>Unidades salidas</small>
          </article>
          <article className="summary-card">
            <span>Stock bajo</span>
            <strong>{totals.lowStock}</strong>
            <small>Productos pendientes</small>
          </article>
          <article className="summary-card">
            <span>Valor de inventario</span>
            <strong>${totals.totalInventoryValue.toLocaleString()}</strong>
            <small>Costo estimado</small>
          </article>
          <article className="summary-card accent">
            <span>Recaudado audífonos</span>
            <strong>${totals.earphonesRevenue.toLocaleString()}</strong>
            <small>Precio × unidades vendidas</small>
          </article>
        </section>

        <section className="content-grid">
          <div className="panel products-panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Control</p>
                <h2>Productos</h2>
              </div>
              <span className="chip">{products.length} items</span>
            </div>

            <form className="product-form" onSubmit={handleSubmit}>
              <label>
                Nombre
                <input name="name" value={form.name} onChange={handleFieldChange} placeholder="Ej. Cámara 4K" />
              </label>
              <label>
                Categoría
                <select name="category" value={form.category} onChange={handleFieldChange}>
                  <option>Electrónica</option>
                  <option>Accesorios</option>
                  <option>Oficina</option>
                  <option>Hogar</option>
                </select>
              </label>
              <label>
                Precio
                <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleFieldChange} placeholder="0.00" />
              </label>
              <label>
                Costo
                <input name="cost" type="number" min="0" step="0.01" value={form.cost} onChange={handleFieldChange} placeholder="0.00" />
              </label>
              <label>
                En existencia
                <input name="stock" type="number" min="0" step="1" value={form.stock} onChange={handleFieldChange} placeholder="0" />
              </label>
              <label>
                Vendidos
                <input name="sold" type="number" min="0" step="1" value={form.sold} onChange={handleFieldChange} placeholder="0" />
              </label>
              <label>
                SKU
                <input name="sku" value={form.sku} onChange={handleFieldChange} placeholder="SKU-001" />
              </label>
              <button type="submit" className="primary-button full-width">
                {editingId ? 'Guardar cambios' : 'Agregar producto'}
              </button>
            </form>

            {editingId && (
              <button
                type="button"
                className="cancel-button"
                onClick={() => {
                  setEditingId(null)
                  setForm({ name: '', category: 'Electrónica', price: '', cost: '', stock: '', sold: '', sku: '' })
                }}
              >
                Cancelar edición
              </button>
            )}

            <div className="product-list">
              {products.map((product) => (
                <article key={product.id} className={`product-card ${product.stock <= 5 ? 'warning' : ''}`}>
                  <div className="product-main">
                    <div>
                      <p className="sku">{product.sku}</p>
                      <h3>{product.name}</h3>
                    </div>
                    <span className="category-badge">{product.category}</span>
                  </div>

                  <div className="product-meta">
                    <div>
                      <span>Precio</span>
                      <strong>${product.price.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span>En existencia</span>
                      <strong>{product.stock}</strong>
                    </div>
                    <div>
                      <span>Vendidos</span>
                      <strong>{product.sold}</strong>
                    </div>
                  </div>

                  <div className="product-actions">
                    <button type="button" className="mini-button" onClick={() => updateStock(product.id, -1)}>
                      -
                    </button>
                    <button type="button" className="mini-button" onClick={() => updateStock(product.id, 1)}>
                      +
                    </button>
                    <button type="button" className="sale-button" onClick={() => recordSale(product.id)}>
                      Vender
                    </button>
                    <button type="button" className="edit-button" onClick={() => editProduct(product)}>
                      Editar
                    </button>
                    <button type="button" className="delete-button" onClick={() => removeProduct(product.id)}>
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="panel calculator-panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Ventas</p>
                <h2>Precio + envío</h2>
              </div>
            </div>

            <div className="calculator-form">
              <label>
                Precio del producto
                <input name="productPrice" type="number" min="0" step="0.01" value={shipping.productPrice} onChange={handleShippingChange} />
              </label>
            </div>

            <div className="shipping-options">
              <label className={shipping.shippingType === 'metro' ? 'option active' : 'option'}>
                <input
                  type="radio"
                  name="shippingType"
                  value="metro"
                  checked={shipping.shippingType === 'metro'}
                  onChange={handleShippingChange}
                />
                <span>Área metropolitana</span>
                <strong>$2.99</strong>
              </label>

              <label className={shipping.shippingType === 'outside' ? 'option active' : 'option'}>
                <input
                  type="radio"
                  name="shippingType"
                  value="outside"
                  checked={shipping.shippingType === 'outside'}
                  onChange={handleShippingChange}
                />
                <span>Fuera del país</span>
                <strong>$3.75</strong>
              </label>
            </div>

            <div className="receipt">
              <div>
                <span>Subtotal</span>
                <strong>${shippingSummary.productPrice.toFixed(2)}</strong>
              </div>
              <div>
                <span>Envío neto</span>
                <strong>${shippingSummary.shippingCost.toFixed(2)}</strong>
              </div>
              <div className="total-row">
                <span>Precio final para ti</span>
                <strong>${shippingSummary.total.toFixed(2)}</strong>
              </div>
            </div>
          </aside>
        </section>

        <section className="panel alert-panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">Alertas</p>
              <h2>Stock bajo</h2>
            </div>
          </div>

          {lowStockProducts.length === 0 ? (
            <p className="empty-state">Todo está bien abastecido.</p>
          ) : (
            <ul className="alert-list">
              {lowStockProducts.map((product) => (
                <li key={product.id}>
                  <div>
                    <strong>{product.name}</strong>
                    <span>{product.category}</span>
                  </div>
                  <span className="stock-value">{product.stock} unidades</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
