const { getBook } = require("../utils/bookHelper");
const orderStore = require("../db/orderStore");

// Base price lives on the frontend today (constants/pricing.ts) since
// there's no payment gateway wired up yet to verify it server-side — see
// checkout.paymentComingSoon. `total` is trusted from the client for now;
// once real payment processing exists, computing/verifying the total here
// (from the book + add-ons) should replace this.
function createOrder({ userId, bookId, total }) {

    const book = getBook(bookId);

    if (!book) {
        throw new Error("Book not found.");
    }

    if (book.userId && book.userId !== userId) {
        throw new Error("This storybook belongs to a different account.");
    }

    if (!book.story) {
        throw new Error("This storybook isn't ready yet.");
    }

    const coverImageUrl = book.story.pages?.[0]?.illustration ?? null;

    return orderStore.createOrder({
        userId,
        bookId,
        bookTitle: book.story.title ?? "Their Storybook",
        coverImageUrl,
        storyTheme: book.theme || null,
        childName: book.child?.name || null,
        total: Number(total) || 0
    });

}

function listOrdersForUser(userId) {
    return orderStore.listOrdersForUser(userId);
}

function getOrderForUser(orderId, userId) {
    return orderStore.getOrderByIdForUser(orderId, userId);
}

module.exports = {
    createOrder,
    listOrdersForUser,
    getOrderForUser
};
