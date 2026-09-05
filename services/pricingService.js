const storyThemes = require("../data/storyThemes");

// The only server-side source of truth for what a book costs — see
// BACKLOG.md P0.5. Never trust a `total` supplied by the client; this is
// what closes the "anyone can create a total: 0 order" hole. Moved here
// (out of orderService.js) now that payments — not just order records —
// need to know the price up front, before an order even exists.
function getThemePrice(themeId) {

    const theme = storyThemes.find((candidate) => candidate.id === themeId);

    if (!theme) {
        throw new Error("This storybook's theme is missing or unrecognized; cannot price the order.");
    }

    return theme.price;

}

// Mirrors Kidora-fe's src/constants/addOns.ts exactly. There is no
// backend catalog for add-ons yet (they're a frontend-only constant), so
// this list and the pricing below are kept in sync by hand — if a new
// add-on is added on the frontend, it must be added here too, or
// computeOrderTotal will reject it as unknown and the checkout will
// error out (fails closed, not open, which is the safe direction).
const KNOWN_ADD_ON_IDS = ["non-tearable", "extra-copy", "digital-copy"];

// Mirrors Kidora-fe's src/constants/pricing.ts COUPONS map.
const COUPONS = {
    SUBSCRIBER10: 0.1
};

// extra-copy's price is 65% of the *base* price on the frontend (see
// addOns.ts), not a flat number, so it has to be computed against this
// order's own theme price rather than hardcoded — today every theme
// happens to price the same as the frontend's BASE_PRICE constant, but
// this keeps the two in sync if that ever changes.
function getAddOnPrice(addOnId, basePrice) {

    switch (addOnId) {
        case "non-tearable":
            return 270;
        case "extra-copy":
            return Math.round(basePrice * 0.65 * 100) / 100;
        case "digital-copy":
            return 149;
        default:
            throw new Error(`Unknown add-on: ${addOnId}`);
    }

}

// Reproduces OrderSummaryCard.tsx's total calculation line for line:
// subtotal = base + add-ons, discount = subtotal * couponRate (rounded to
// paise), total = subtotal - discount. Throws on anything it can't price
// confidently (unknown theme, unknown add-on, unknown/expired coupon)
// rather than silently under-charging — a rejected checkout is much
// cheaper than a wrong one.
function computeOrderTotal({ themeId, addOnIds = [], couponCode }) {

    const basePrice = getThemePrice(themeId);

    const uniqueAddOnIds = [...new Set(addOnIds)];
    const invalidAddOnId = uniqueAddOnIds.find((id) => !KNOWN_ADD_ON_IDS.includes(id));

    if (invalidAddOnId) {
        throw new Error(`Unknown add-on: ${invalidAddOnId}`);
    }

    const addOnsTotal = uniqueAddOnIds.reduce(
        (sum, id) => sum + getAddOnPrice(id, basePrice),
        0
    );

    const subtotal = basePrice + addOnsTotal;

    let discountRate = 0;

    if (couponCode) {

        const normalizedCode = couponCode.trim().toUpperCase();
        discountRate = COUPONS[normalizedCode] || 0;

        if (!discountRate) {
            throw new Error("That coupon code isn't valid.");
        }

    }

    const discountAmount = Math.round(subtotal * discountRate * 100) / 100;
    const total = Math.round((subtotal - discountAmount) * 100) / 100;

    return {
        basePrice,
        addOnsTotal,
        subtotal,
        discountAmount,
        total
    };

}

module.exports = {
    getThemePrice,
    computeOrderTotal
};
