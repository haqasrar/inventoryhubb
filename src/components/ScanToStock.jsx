import { useRef, useState } from 'react'
import { useInventory } from '../context/useInventory'
import { findByBarcode } from '../utils/barcode'
import { beepSuccess } from '../utils/feedback'
import BarcodeScanner from './BarcodeScanner'
import ProductForm from './ProductForm'
import RestockDialog from './RestockDialog'

/**
 * One scan, the app decides: a barcode already in stock is a delivery, so it opens
 * "add stock"; a barcode it has never seen is a new line, so it opens "add product"
 * with the code filled in. After either is saved or cancelled it returns to the
 * camera, so a whole delivery can be checked in one item after another. The X on the
 * camera closes the whole thing.
 */
export default function ScanToStock({ onClose }) {
  const { products, addProduct } = useInventory()

  const [mode, setMode] = useState('scanning') // scanning | adding | restocking
  const [code, setCode] = useState('')
  const [product, setProduct] = useState(null)

  // Returning from the form remounts a fresh camera with no memory, so the item still
  // in frame would fire again. Remembering the last handled code here bridges that gap.
  const lastRef = useRef({ code: '', at: 0 })

  function handleScan(scanned) {
    const now = Date.now()
    if (scanned === lastRef.current.code && now - lastRef.current.at < 2500) return
    lastRef.current = { code: scanned, at: now }

    const existing = findByBarcode(products, scanned)
    beepSuccess()
    if (existing) {
      setProduct(existing)
      setMode('restocking')
    } else {
      setCode(scanned)
      setMode('adding')
    }
  }

  const backToScanning = () => setMode('scanning')

  if (mode === 'adding') {
    return (
      <ProductForm
        product={null}
        presetBarcode={code}
        onSubmit={addProduct}
        onClose={backToScanning}
      />
    )
  }

  if (mode === 'restocking') {
    return <RestockDialog product={product} onClose={backToScanning} />
  }

  return (
    <BarcodeScanner title="Scan to add or restock" onScan={handleScan} onClose={onClose} />
  )
}
