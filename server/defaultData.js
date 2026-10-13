/**
 * defaultData.js - Initial seeding of sample databases, dynamic schemas, and sample records
 */

const dbManager = require('./dbManager');

async function seedDefaultData() {
  try {
    const dbs = await dbManager.listDatabases();
    const hasEcommerce = dbs.some(d => d.name === 'ecommerce_db');

    if (!hasEcommerce) {
      console.log('Seeding initial databases and schemas...');

      // 1. Create ecommerce_db
      await dbManager.createDatabase('ecommerce_db');

      // === USERS COLLECTION ===
      const userSchema = {
        name: 'User Schema',
        enforcement: 'strict',
        strict: false,
        fields: {
          name: { type: 'string', required: true, min: 2, max: 50, description: 'Full Name' },
          email: { type: 'string', required: true, pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$', unique: true, description: 'Email Address' },
          role: { type: 'string', required: true, enum: ['admin', 'customer', 'vendor'], default: 'customer', description: 'User Role' },
          age: { type: 'number', min: 18, max: 120, description: 'Age in years' },
          active: { type: 'boolean', default: true, description: 'Account status' }
        }
      };

      await dbManager.createCollection('ecommerce_db', 'users', userSchema);
      await dbManager.insertMany('ecommerce_db', 'users', [
        { name: 'Alex Mercer', email: 'alex@example.com', role: 'admin', age: 34, active: true },
        { name: 'Samantha Vance', email: 'samantha@example.com', role: 'customer', age: 28, active: true },
        { name: 'David Zhao', email: 'david@example.com', role: 'customer', age: 41, active: true },
        { name: 'Elena Rostova', email: 'elena@example.com', role: 'vendor', age: 31, active: true },
        { name: 'Marcus Brody', email: 'marcus@example.com', role: 'customer', age: 24, active: false }
      ]);

      // === PRODUCTS COLLECTION ===
      const productSchema = {
        name: 'Product Schema',
        enforcement: 'strict',
        strict: false,
        fields: {
          title: { type: 'string', required: true, min: 3, max: 100, description: 'Product Title' },
          price: { type: 'number', required: true, min: 0.01, description: 'Unit Price (USD)' },
          category: { type: 'string', required: true, enum: ['Electronics', 'Fashion', 'Home', 'Books'], description: 'Product Category' },
          stock: { type: 'number', min: 0, default: 25, description: 'Inventory stock count' },
          tags: { type: 'array', itemType: 'string', description: 'Search keywords' },
          rating: { type: 'number', min: 1, max: 5, default: 4.5, description: 'Average review score' }
        }
      };

      await dbManager.createCollection('ecommerce_db', 'products', productSchema);
      await dbManager.insertMany('ecommerce_db', 'products', [
        { title: 'Quantum Mechanical Keyboard', price: 149.99, category: 'Electronics', stock: 50, tags: ['hardware', 'rgb', 'gaming'], rating: 4.8 },
        { title: 'Ergonomic Standing Desk Mat', price: 49.50, category: 'Home', stock: 120, tags: ['furniture', 'comfort'], rating: 4.6 },
        { title: 'Ultra-HD Curved OLED Monitor 34"', price: 899.00, category: 'Electronics', stock: 15, tags: ['screen', '4k', 'display'], rating: 4.9 },
        { title: 'Merino Wool Thermal Hoodie', price: 85.00, category: 'Fashion', stock: 40, tags: ['clothing', 'winter'], rating: 4.4 },
        { title: 'Designing Data-Intensive Applications', price: 42.00, category: 'Books', stock: 80, tags: ['tech', 'database', 'architecture'], rating: 5.0 },
        { title: 'Acoustic Noise-Cancelling Headphones', price: 299.99, category: 'Electronics', stock: 35, tags: ['audio', 'wireless'], rating: 4.7 }
      ]);

      // === ORDERS COLLECTION ===
      const orderSchema = {
        name: 'Order Schema',
        enforcement: 'strict',
        strict: false,
        fields: {
          customerEmail: { type: 'string', required: true, description: 'Customer Email' },
          totalAmount: { type: 'number', required: true, min: 0, description: 'Total Order Price' },
          status: { type: 'string', required: true, enum: ['pending', 'processing', 'completed', 'cancelled'], default: 'pending', description: 'Order Status' },
          itemCount: { type: 'number', min: 1, default: 1, description: 'Number of items' }
        }
      };

      await dbManager.createCollection('ecommerce_db', 'orders', orderSchema);
      await dbManager.insertMany('ecommerce_db', 'orders', [
        { customerEmail: 'samantha@example.com', totalAmount: 149.99, status: 'completed', itemCount: 1 },
        { customerEmail: 'david@example.com', totalAmount: 948.50, status: 'processing', itemCount: 2 },
        { customerEmail: 'marcus@example.com', totalAmount: 42.00, status: 'completed', itemCount: 1 },
        { customerEmail: 'samantha@example.com', totalAmount: 299.99, status: 'pending', itemCount: 1 }
      ]);

      // 2. Create analytics_db
      await dbManager.createDatabase('analytics_db');
      const eventSchema = {
        name: 'Analytics Event Schema',
        enforcement: 'strict',
        strict: false,
        fields: {
          eventName: { type: 'string', required: true, description: 'Event identifier' },
          device: { type: 'string', required: true, enum: ['desktop', 'mobile', 'tablet'], default: 'desktop', description: 'Client device' },
          country: { type: 'string', default: 'US', description: 'Country code' },
          durationSec: { type: 'number', min: 0, description: 'Session duration in seconds' },
          success: { type: 'boolean', default: true, description: 'Outcome' }
        }
      };

      await dbManager.createCollection('analytics_db', 'events', eventSchema);
      await dbManager.insertMany('analytics_db', 'events', [
        { eventName: 'page_view', device: 'desktop', country: 'US', durationSec: 140, success: true },
        { eventName: 'checkout_click', device: 'mobile', country: 'CA', durationSec: 45, success: true },
        { eventName: 'login_attempt', device: 'desktop', country: 'DE', durationSec: 12, success: true },
        { eventName: 'api_query', device: 'desktop', country: 'UK', durationSec: 3, success: true },
        { eventName: 'checkout_fail', device: 'mobile', country: 'US', durationSec: 90, success: false }
      ]);

      console.log('Seeding completed successfully!');
    }
  } catch (err) {
    console.error('Seeding error:', err);
  }
}

module.exports = { seedDefaultData };
