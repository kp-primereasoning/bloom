/**
 * Florist Products Page
 *
 * Allows florists to manage their product catalog and map products to subscription tiers.
 * Products are stored locally for now (Shopify integration coming in future update).
 */

import { useState, useEffect } from 'react';

interface Product {
  id: string;
  name: string;
  description: string;
  tier: 'ESSENTIAL' | 'SIGNATURE' | 'STATEMENT';
  price: number;
  imageUrl?: string;
}

const STORAGE_KEY = 'bloom_florist_products';

const TIER_CONFIG = {
  ESSENTIAL: {
    label: 'Essential',
    description: 'Simple, elegant arrangements for everyday enjoyment',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-200',
  },
  SIGNATURE: {
    label: 'Signature',
    description: 'Fuller arrangements with premium seasonal flowers',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-200',
  },
  STATEMENT: {
    label: 'Statement',
    description: 'Luxurious designs with rare and exotic blooms',
    color: 'purple',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    borderColor: 'border-purple-200',
  },
};

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Spring Garden Mix',
    description: 'A cheerful mix of seasonal spring flowers',
    tier: 'ESSENTIAL',
    price: 35,
  },
  {
    id: '2',
    name: 'Rose Elegance',
    description: 'Classic roses with eucalyptus and greenery',
    tier: 'SIGNATURE',
    price: 65,
  },
  {
    id: '3',
    name: 'Grand Orchid Display',
    description: 'Stunning phalaenopsis orchids in premium vessel',
    tier: 'STATEMENT',
    price: 125,
  },
];

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    name: '',
    description: '',
    tier: 'SIGNATURE',
    price: 0,
  });

  // Load products on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setProducts(JSON.parse(saved));
      } catch {
        setProducts(DEFAULT_PRODUCTS);
      }
    } else {
      setProducts(DEFAULT_PRODUCTS);
    }
  }, []);

  // Save products to localStorage
  const saveProducts = (updated: Product[]) => {
    setProducts(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleAdd = () => {
    setFormData({ name: '', description: '', tier: 'SIGNATURE', price: 0 });
    setIsAdding(true);
    setEditingId(null);
  };

  const handleEdit = (product: Product) => {
    setFormData({
      name: product.name,
      description: product.description,
      tier: product.tier,
      price: product.price,
    });
    setEditingId(product.id);
    setIsAdding(false);
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;

    if (editingId) {
      // Update existing
      const updated = products.map((p) =>
        p.id === editingId ? { ...p, ...formData } : p
      );
      saveProducts(updated);
      setEditingId(null);
    } else {
      // Add new
      const newProduct: Product = {
        id: Date.now().toString(),
        ...formData,
      };
      saveProducts([...products, newProduct]);
      setIsAdding(false);
    }
    setFormData({ name: '', description: '', tier: 'SIGNATURE', price: 0 });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', description: '', tier: 'SIGNATURE', price: 0 });
  };

  const handleDelete = (id: string) => {
    const updated = products.filter((p) => p.id !== id);
    saveProducts(updated);
  };

  const getProductsByTier = (tier: 'ESSENTIAL' | 'SIGNATURE' | 'STATEMENT') =>
    products.filter((p) => p.tier === tier);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Product Catalog</h1>
            <p className="text-gray-500">
              Manage your floral arrangements and map them to subscription tiers.
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Product
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <div className="bg-white rounded-lg shadow-sm border border-indigo-200 p-6">
          <h3 className="font-medium text-gray-900 mb-4">
            {editingId ? 'Edit Product' : 'Add New Product'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Product Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Spring Garden Mix"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                Price ($)
              </label>
              <input
                type="number"
                id="price"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the arrangement"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="tier" className="block text-sm font-medium text-gray-700 mb-1">
                Subscription Tier
              </label>
              <select
                id="tier"
                value={formData.tier}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tier: e.target.value as 'ESSENTIAL' | 'SIGNATURE' | 'STATEMENT',
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="ESSENTIAL">Essential</option>
                <option value="SIGNATURE">Signature</option>
                <option value="STATEMENT">Statement</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.name.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
            >
              {editingId ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </div>
      )}

      {/* Products by Tier */}
      {(['ESSENTIAL', 'SIGNATURE', 'STATEMENT'] as const).map((tier) => {
        const tierProducts = getProductsByTier(tier);
        const config = TIER_CONFIG[tier];

        return (
          <div key={tier} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${config.bgColor} ${config.textColor}`}
              >
                {config.label}
              </span>
              <span className="text-sm text-gray-500">({tierProducts.length} products)</span>
            </div>
            <p className="text-gray-500 text-sm mb-4">{config.description}</p>

            {tierProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tierProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`border ${config.borderColor} rounded-lg p-4 hover:shadow-md transition-shadow`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{product.name}</h4>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {product.description}
                        </p>
                        <p className="text-lg font-semibold text-gray-900 mt-2">
                          ${product.price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="flex-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center">
                <p className="text-gray-500 text-sm">No products in this tier yet.</p>
                <button
                  onClick={() => {
                    setFormData({ name: '', description: '', tier, price: 0 });
                    setIsAdding(true);
                  }}
                  className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                >
                  Add your first {config.label} product
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Summary Card */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-3">Catalog Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          {(['ESSENTIAL', 'SIGNATURE', 'STATEMENT'] as const).map((tier) => {
            const config = TIER_CONFIG[tier];
            const count = getProductsByTier(tier).length;
            return (
              <div key={tier} className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className={`text-sm ${config.textColor}`}>{config.label}</p>
              </div>
            );
          })}
        </div>
        <p className="text-sm text-gray-500 mt-4 text-center">
          Total: {products.length} products in your catalog
        </p>
      </div>
    </div>
  );
}
