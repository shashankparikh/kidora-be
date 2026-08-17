// icon/color are plain name strings, mapped to actual MUI icons/CSS classes
// on the frontend — same pattern privacyPolicyService/faqService use.
function getRefundPolicy() {

    return {
        hero: {
            title_line1: "Refund",
            title_highlight: "&",
            title_line2: "Replacement Policy",
            description: "At OopsyInk, every book is made especially for your child. We care about the magic we create together and want you to have the best experience.",
            updated_label: "Last Updated",
            updated_value: "August 2026",
            image: "/kids.png"
        },
        sections: [
            {
                id: "personalized",
                icon: "book",
                color: "violet",
                title: "1. Personalized Orders",
                description: "Because our books are custom-made using the details you provide, personalized books cannot be returned or refunded for change of mind once production has started."
            },
            {
                id: "damaged",
                icon: "shield",
                color: "green",
                title: "2. Damaged or Defective Books",
                description: "If your book arrives damaged, defective, or with a printing issue, please contact us within 7 days of delivery with your order details and photos. We'll arrange a replacement at no extra cost."
            },
            {
                id: "errors",
                icon: "edit",
                color: "pink",
                title: "3. Personalization Errors",
                description: "If we make an error in the personalization of your book, we'll correct it and arrange a replacement. We cannot offer a free replacement for incorrect information submitted by you."
            },
            {
                id: "cancellations",
                icon: "send",
                color: "blue",
                title: "4. Cancellations",
                description: "Orders can only be cancelled or changed before production begins. Once your personalized book has entered production, cancellation may no longer be possible."
            },
            {
                id: "refunds",
                icon: "wallet",
                color: "gold",
                title: "5. Refunds",
                description: "Where a refund is approved, it will be processed to the original payment method. The time taken for the amount to appear may vary depending on your bank or payment provider."
            },
            {
                id: "help",
                icon: "chat",
                color: "teal",
                title: "6. Need Help?",
                description: "If you have any questions about your order or our policy, we're here to help!"
            }
        ],
        contact: {
            email_label: "Email Us",
            email: "hello@oopsyink.com"
        },
        closing: {
            title_line1: "Every book is made especially for your little one,",
            title_line2: "and we'll always do our best to make things right."
        }
    };

}

module.exports = {
    getRefundPolicy
};
