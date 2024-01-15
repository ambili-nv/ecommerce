const asynchandler = require('express-async-handler');
const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const OrderItems = require('../models/orderItemModel');
const User = require('../models/userModel');
const Order = require('../models/orderModel');
const Address = require('../models/addressModel');
const { generateUniqueOrderID } = require('../utils/generateUniqueId');
const Crypto = require('crypto');
const Wallet = require('../models/walletModel');
const WalletTransaction = require('../models/walletTransactionModel');
const Coupon = require('../models/couponModel');

//Get user cart items
exports.getCartItems = asynchandler(async (userId) => {
    return await Cart.findOne({ user: userId }).populate('products.product');
});

//Calculate the total price of cart items

// exports.calculateTotalPrice = asynchandler(
//   async (cartItems, userid, payWithWallet, coupon) => {
//     const wallet = await Wallet.findOne({ user: userid });
//     console.log(wallet,"Users wallet");
//     let subtotal = 0;
//     for (const product of cartItems.products) {
//       const productTotal =
//         parseFloat(product.product.salePrice) * product.quantity;
//       subtotal += productTotal;
//       console.log(productTotal,"productTotal");
//     }

//     let total;
//     let usedFromWallet = 0;
//     if (wallet && payWithWallet) {
//       let discount = 0;
//       total = subtotal;

//       if (coupon) {
//         discount = ((total * coupon.value) / 100).toFixed(2);
//         if (discount > coupon.maxAmount) {
//           discount = coupon.maxAmount;
//           total -= discount;
//         } else {
//           total -= discount;
//         }
//       }

//       if (total <= wallet.balance) {
//         usedFromWallet = total;
//         wallet.balance -= total;
//         total = 0;
//       } else {
//         usedFromWallet = wallet.balance;
//         total = subtotal - wallet.balance - discount;
//         wallet.balance = 0;
//       }
//       return {
//         subtotal,
//         total,
//         usedFromWallet,
//         walletBalance: wallet.balance,
//         discount: discount ? discount :0,
//       };
//     } else {
//       total = subtotal;
//       let discount = 0;
//       if (coupon) {
//         discount = ((total * coupon.value) / 100).toFixed(2);
//         if (discount > coupon.maxAmount) {
//           discount = coupon.maxAmount;
//           total -= discount;
//         } else {
//           total -= discount;
//         }
//       }
//       return {
//         subtotal,
//         total,
//         usedFromWallet,
//         walletBalance: wallet ? wallet.balance : 0,
//         discount: discount ? discount : 0,
//       };
//     }
//   }
// );

exports.calculateTotalPrice = asynchandler(async (cartItems, userid, coupon) => {
    let subtotal = 0;
    for (const product of cartItems.products) {
        const productTotal = parseFloat(product.product.salePrice) * product.quantity;
        subtotal += productTotal;
    }

    let total;
    total = subtotal;
    let discount = 0;
    if (coupon) {
        discount = ((total * coupon.value) / 100).toFixed(2);
        if (discount > coupon.maxAmount) {
            discount = coupon.maxAmount;
            total -= discount;
        } else {
            total -= discount;
        }
    }
    return {
        subtotal,
        total,
        discount: discount ? discount : 0,
    };
});

//Place order

// exports.placeOrder = asynchandler(
//   async (userId, addressId, payment_method, code, isWallet, coupons) => {
//     const cartItems = await exports.getCartItems(userId);
//     const coupon = await Coupon.findOne({ code: code });
//     console.log("inside helper coupon"+coupon);
//     console.log(payment_method);

//     if (!cartItems) {
//       throw new Error("cart not found");
//     }
//     const orders = [];
//     let total = 0;

//     for (const cartItem of cartItems.products) {
//       const productTotal =
//         parseFloat(cartItem.product.salePrice) * cartItem.quantity;

//       total = total + productTotal;

//       const item = await OrderItems.create({
//         quantity: cartItem.quantity,
//         price: cartItem.product.salePrice,
//         product: cartItem.product._id,
//       });
//       orders.push(item);
//     }
//     let discount;
//     if (coupon) {
//       discount = ((total * coupon.value) / 100).toFixed(2);
//       if (discount > coupon.maxAmount) {
//         discount = coupon.maxAmount;
//         total = total - discount;
//       } else {
//         total = total - discount;
//       }
//     }

//     const address = await Address.findById(addressId);

//     const existingOrderIds = await Order.find().select("orderId");
//     //Create the order
//     const newOrder = await Order.create({
//       orderId: "OD" + generateUniqueOrderID(existingOrderIds),
//       user: userId,
//       orderItems: orders,
//       shippingAddress: address.name,
//       city: address.city,
//       street: address.street,
//       state: address.state,
//       zip: address.pincode,
//       phone: address.mobile,
//       totalPrice: total,
//       payment_method: payment_method,
//       coupon: coupon,
//       discount: discount,
//     });
//     return newOrder;
//   }
// );

exports.placeOrder = asynchandler(async (userId, addressId, payment_method, code, isWallet, coupons) => {
    const cartItems = await exports.getCartItems(userId);
    const coupon = await Coupon.findOne({ code: code });

    if (!cartItems) {
        throw new Error('cart not found');
    }
    const orders = [];
    let total = 0;

    for (const cartItem of cartItems.products) {
        const productTotal = parseFloat(cartItem.product.salePrice) * cartItem.quantity;

        total = total + productTotal;

        const item = await OrderItems.create({
            quantity: cartItem.quantity,
            price: cartItem.product.salePrice,
            product: cartItem.product._id,
        });
        orders.push(item);
    }
    let discount;
    if (coupon) {
        discount = ((total * coupon.value) / 100).toFixed(2);
        if (discount > coupon.maxAmount) {
            discount = coupon.maxAmount;
            total = total - discount;
        } else {
            total = total - discount;
        }
    }
    // const updateProduct = await Product.findById(cartItem.product._id);
    // updateProduct.quantity -= cartItem.quantity;
    // updateProduct.sold += cartItem.quantity;
    // await updateProduct.save();

    const address = await Address.findById(addressId);

    const existingOrderIds = await Order.find().select('orderId');
    //Create the order
    const newOrder = await Order.create({
        orderId: 'OD' + generateUniqueOrderID(existingOrderIds),
        user: userId,
        orderItems: orders,
        shippingAddress: address.name,
        city: address.city,
        street: address.street,
        state: address.state,
        zip: address.pincode,
        phone: address.mobile,
        totalPrice: total,
        payment_method: payment_method,
        coupon: coupon,
        discount: discount,
    });
    return newOrder;
});

//varify using Razorpay method

exports.verifyPayment = asynchandler(async (razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId) => {
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = Crypto.createHmac('sha256', process.env.RAZORPAY_SECRET_KEY).update(sign.toString()).digest('hex');

    if (razorpay_signature === expectedSign) {
        // console.log(true);
        return { message: 'success', orderId: orderId };
    } else {
        throw new Error('Payment verification failed');
    }
});
