const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 3000;

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('Error connecting to MongoDB Atlas:', err.message));

const ProductSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: String,
    price: Number,
    rating: Number,
    company: String,
    discount: Number,
    category: String
});

const Product = mongoose.model('Product', ProductSchema);

const companyName = "goMart";
const ownerName = "Saurabh";
const rollNo = "2100290110148";
const ownerEmail = "saurabh.2125csit1064@kiet.edu";
const accessCode = "XrTUlG";

const REGISTER_URL = "http://20.244.56.144/test/register";
const AUTH_URL = "http://20.244.56.144/test/auth";

let authData = {
    clientID: "37bb493c-73d3-47ea-8675-21f66ef96735",
    clientSecret: "XOyo10RPasKWODAN"
};

async function registerCompany() {
    try {
        const response = await axios.post(REGISTER_URL, {
            companyName,
            ownerName,
            rollNo,
            ownerEmail,
            accessCode
        });
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 409) {
            console.log('Company already registered, proceeding to get auth token.');
        } else {
            console.error('Registration failed:', error.message);
            throw error;
        }
    }
}

async function getAuthToken() {
    try {
        const response = await axios.post(AUTH_URL, {
            companyName,
            clientID: authData.clientID,
            clientSecret: authData.clientSecret,
            ownerName,
            ownerEmail,
            rollNo
        });
        return response.data;
    } catch (error) {
        console.error('Auth token retrieval failed:', error.message);
        throw error;
    }
}

async function fetchProductsFromAPIs(categoryName) {
    
    const eComAPIs = [
        `http://example.com/api/products?category=${categoryName}`,
        `http://example2.com/api/products?category=${categoryName}`
    ];

    let allProducts = [];

    for (const api of eComAPIs) {
        try {
            const response = await axios.get(api, {
                headers: {
                    'Authorization': `Bearer ${authData.access_token}`
                }
            });
            allProducts = allProducts.concat(response.data);
        } catch (error) {
            console.error(`Error fetching products from ${api}:`, error.message);
        }
    }

    return allProducts;
}

async function saveProductsToDB(products, categoryName) {
    for (const product of products) {
        const productId = uuidv4();
        await Product.create({ ...product, id: productId, category: categoryName });
    }
}

app.get('/categories/:categoryName/products', async (req, res) => {
    try {
        const { categoryName } = req.params;
        let { n = 10, page = 1, sort_by = 'rating', order = 'desc' } = req.query;
        n = parseInt(n);
        page = parseInt(page);

        if (n > 10) {
            page = Math.max(page, 1);
        } else {
            page = 1;
        }

        const sortOrder = order === 'desc' ? -1 : 1;
        const products = await Product.find({ category: categoryName })
            .sort({ [sort_by]: sortOrder })
            .skip((page - 1) * n)
            .limit(n);

        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/categories/:categoryName/products/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const product = await Product.findOne({ id: productId });

        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ error: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, async () => {
    try {
        await registerCompany();
        authData = { ...authData, ...await getAuthToken() };
        const products = await fetchProductsFromAPIs('exampleCategory');
        await saveProductsToDB(products, 'exampleCategory');
        console.log(`Server is running on port ${PORT}`);
    } catch (error) {
        console.error('Failed to initialize:', error.message);
    }
});
