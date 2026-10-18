import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import { mapProduct, supabase } from './lib/supabase'

const emptyForm = {
  name: '',
  category: 'Electrónica',
  price: '',
  cost: '',
  stock: '',
  sold: '',
  sku: '',
}

function isHeadphoneProduct(name) {
  const normalized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')

  return (
    normalized.includes('audifon') ||
    normalized.includes('auricular') ||
    normalized.includes('headphone') ||
    normalized.includes('earphone')
  )
}

function App() {
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [shipping, setShipping] = useState({
    productPrice: '299',
    shippingType: 'metro',
  })

  const loadProducts = useCallback(async () => {
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      return
    }

    setProducts((data ?? []).map(mapProduct))
  }, [])

  useEffect(() => {
    let active = true

    async function init() {
      setLoading(true)
      await loadProducts()
      if (active) {
        setLoading(false)
      }
    }

    init()

    return () => {
      active = false
    }
  }, [loadProducts])

  const totals = useMemo(() => {
    const totalInventoryValue = products.reduce(
      (sum, product) => sum + Number(product.stock ?? 0) * Number(product.cost ?? 0),
      0,
    )
    const totalUnits = products.reduce((sum, product) => sum + Number(product.stock ?? 0), 0)
    const totalSold = products.reduce((sum, product) => sum + Number(product.sold ?? 0), 0)
    const lowStock = products.filter((product) => Number(product.stock ?? 0) <= 5).length
    const headphoneProducts = products.filter((product) => isHeadphoneProduct(product.name))
    const earphonesRevenue = headphoneProducts.reduce(
      (sum, product) => sum + Number(product.sold ?? 0) * Number(product.price ?? 0),
      0,
    )
    const earphonesSold = headphoneProducts.reduce(
      (sum, product) => sum + Number(product.sold ?? 0),
      0,
    )

    return {
      totalProducts: products.length,
      totalUnits,
      totalSold,
      totalInventoryValue,
      lowStock,
      earphonesRevenue,
      earphonesSold,
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

  const persistProduct = async (productData) => {
    if (editingId) {
      const { error: updateError } = await supabase
        .from('products')
        .update({
          name: productData.name,
          category: productData.category,
          price: productData.price,
          cost: productData.cost,
          stock: productData.stock,
          sold: productData.sold,
          sku: productData.sku,
        })
        .eq('id', editingId)

      if (updateError) {
        throw updateError
      }
      return
    }

    const { error: insertError } = await supabase.from('products').insert(productData)

    if (insertError) {
      throw insertError
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.name || !form.price || !form.stock) {
      return
    }

    const productData = {
      name: form.name.trim(),
      category: form.category,
      price: Number(form.price),
      cost: Number(form.cost || form.price * 0.65),
      stock: Number(form.stock || 0),
      sold: Number(form.sold || 0),
      sku: form.sku.trim() || `SKU-${Date.now().toString().slice(-6)}`,
    }

    setSaving(true)
    setError(null)

    try {
      await persistProduct(productData)
      await loadProducts()
      setForm(emptyForm)
      setEditingId(null)
    } catch (submitError) {
      setError(submitError.message ?? 'No se pudo guardar el producto.')
    } finally {
      setSaving(false)
    }
  }

  const updateProductInDb = async (productId, patch) => {
    const { error: updateError } = await supabase.from('products').update(patch).eq('id', productId)

    if (updateError) {
      throw updateError
    }
  }

  const updateStock = async (productId, delta) => {
    const product = products.find((item) => item.id === productId)
    if (!product) return

    setSaving(true)
    setError(null)

    try {
      await updateProductInDb(productId, {
        stock: Math.max(0, product.stock + delta),
      })
      await loadProducts()
    } catch (stockError) {
      setError(stockError.message ?? 'No se pudo actualizar el stock.')
    } finally {
      setSaving(false)
    }
  }

  const removeProduct = async (productId) => {
    setSaving(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase.from('products').delete().eq('id', productId)

      if (deleteError) {
        throw deleteError
      }

      if (editingId === productId) {
        setEditingId(null)
        setForm(emptyForm)
      }

      await loadProducts()
    } catch (deleteError) {
      setError(deleteError.message ?? 'No se pudo eliminar el producto.')
    } finally {
      setSaving(false)
    }
  }

  const recordSale = async (productId) => {
    const product = products.find((item) => item.id === productId)
    if (!product) return

    setSaving(true)
    setError(null)

    try {
      await updateProductInDb(productId, {
        sold: Number(product.sold ?? 0) + 1,
        stock: Math.max(0, Number(product.stock ?? 0) - 1),
      })
      await loadProducts()
    } catch (saleError) {
      setError(saleError.message ?? 'No se pudo registrar la venta.')
    } finally {
      setSaving(false)
    }
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

      {error && <p className="empty-state">{error}</p>}

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
            <small>
              {totals.earphonesSold} vendidos · precio × unidades
            </small>
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
              <button type="submit" className="primary-button full-width" disabled={saving}>
                {editingId ? 'Guardar cambios' : 'Agregar producto'}
              </button>
            </form>

            {editingId && (
              <button
                type="button"
                className="cancel-button"
                onClick={() => {
                  setEditingId(null)
                  setForm(emptyForm)
                }}
              >
                Cancelar edición
              </button>
            )}

            <div className="product-list">
              {loading ? (
                <p className="empty-state">Cargando productos desde Supabase…</p>
              ) : (
                products.map((product) => (
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
                      <button type="button" className="mini-button" disabled={saving} onClick={() => updateStock(product.id, -1)}>
                        -
                      </button>
                      <button type="button" className="mini-button" disabled={saving} onClick={() => updateStock(product.id, 1)}>
                        +
                      </button>
                      <button type="button" className="sale-button" disabled={saving} onClick={() => recordSale(product.id)}>
                        Vender
                      </button>
                      <button type="button" className="edit-button" disabled={saving} onClick={() => editProduct(product)}>
                        Editar
                      </button>
                      <button type="button" className="delete-button" disabled={saving} onClick={() => removeProduct(product.id)}>
                        Eliminar
                      </button>
                    </div>
                  </article>
                ))
              )}
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
